import React, { useState, useRef, useCallback, useEffect } from 'react';

interface SelfieCaptureProps {
  title: string;
  description: string;
  onSubmit: (data: Record<string, any>) => void;
  isSubmitting?: boolean;
}

export const SelfieCapture: React.FC<SelfieCaptureProps> = ({
  title,
  description,
  onSubmit,
  isSubmitting = false
}) => {
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check camera permission status
  const checkCameraPermission = async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('Camera permission state:', permission.state);
        // Only set denied if explicitly denied, otherwise allow user to try
        if (permission.state === 'denied') {
          setPermissionStatus('denied');
          setErrorMessage('Los permisos de cámara están denegados en tu navegador. Por favor, permite el acceso a la cámara en la configuración del navegador.');
        } else {
          setPermissionStatus('unknown'); // Keep as unknown to allow user to try
        }
      } else {
        console.log('Permission API not available');
        setPermissionStatus('unknown');
      }
    } catch (error) {
      console.log('Error checking camera permission:', error);
      setPermissionStatus('unknown'); // Allow user to try if there's an error
    }
  };

  useEffect(() => {
    // Don't check permissions initially - let user try to access camera
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    console.log('State change - isStreaming:', isStreaming, 'capturedFile:', !!capturedFile, 'permissionStatus:', permissionStatus);
  }, [isStreaming, capturedFile, permissionStatus]);

  const startCamera = useCallback(async () => {
    setErrorMessage('');
    console.log('Starting camera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920, min: 1280 }, // Higher resolution
          height: { ideal: 1080, min: 720 }, // Higher resolution
          aspectRatio: { ideal: 1.77777778 }, // 16:9
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      console.log('Got camera stream:', stream);

      if (videoRef.current) {
        console.log('Video ref exists, setting srcObject');
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        // Wait for video to be ready before showing it
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, showing stream');
          setIsStreaming(true);
          setPermissionStatus('granted');
        };

        // Also try setting streaming immediately as fallback
        setTimeout(() => {
          console.log('Timeout fallback, setting isStreaming to true');
          setIsStreaming(true);
          setPermissionStatus('granted');
        }, 1000);
      } else {
        console.log('No video ref available');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setPermissionStatus('denied');

      // Check actual permission status after error
      checkCameraPermission();

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setErrorMessage('Permisos de cámara denegados. Por favor, permite el acceso a la cámara y recarga la página.');
        } else if (error.name === 'NotFoundError') {
          setErrorMessage('No se encontró ninguna cámara en tu dispositivo.');
        } else if (error.name === 'NotSupportedError') {
          setErrorMessage('Tu navegador no soporta acceso a la cámara.');
        } else {
          setErrorMessage(`Error al acceder a la cámara: ${error.message}`);
        }
      } else {
        setErrorMessage('Error desconocido al acceder a la cámara.');
      }
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !streamRef.current) return;

    const canvas = document.createElement('canvas');

    // Use a minimum size to ensure high quality
    const minWidth = 1024; // Increased from 800 to 1024
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;

    if (videoWidth < minWidth) {
      // Scale up if video is too small
      const scale = minWidth / videoWidth;
      canvas.width = minWidth;
      canvas.height = videoHeight * scale;
    } else {
      // Use at least 1024px width
      canvas.width = Math.max(videoWidth, minWidth);
      canvas.height = videoHeight * (canvas.width / videoWidth);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = Date.now();
        const file = new File([blob], `selfie_${timestamp}.jpg`, { type: 'image/jpeg' });
        (file as any).dataURL = canvas.toDataURL('image/jpeg', 0.98); // Maximum quality
        setCapturedFile(file);

        // Stop camera after capture
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setIsStreaming(false);
      }
    }, 'image/jpeg', 0.98); // Maximum quality compression
  }, []);

  const retakePhoto = useCallback(() => {
    setCapturedFile(null);
    startCamera();
  }, [startCamera]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (capturedFile) {
      const timestamp = new Date().toISOString();
      const metadata = {
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        capture_method: 'getUserMedia',
        capture_source: 'canvas',
        media_devices_available: true,
        captured_at: timestamp,
        timestamp_unix: Date.now(),
        stream_active: true,
        live_capture: true,
        browser_fingerprint: {
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          color_depth: window.screen.colorDepth,
          pixel_ratio: window.devicePixelRatio
        }
      };

      onSubmit({
        _files: {
          selfie_image: capturedFile
        },
        metadata: JSON.stringify(metadata)
      });
    }
  };

  return (
    <div className="selfie-capture-container" style={{
      textAlign: 'center',
      padding: '2rem',
      backgroundColor: '#e3f2fd',
      borderRadius: '8px',
      margin: '1rem 0',
      border: '2px solid #2196f3'
    }}>
      <div style={{ marginBottom: '1.5rem', fontSize: '3rem' }}>🤳</div>
      <h4 style={{ marginBottom: '1rem', color: '#333' }}>{title}</h4>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        {description}
      </p>

      {errorMessage && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '1rem',
          borderRadius: '4px',
          margin: '1rem 0',
          border: '1px solid #ef5350'
        }}>
          ❌ {errorMessage}
        </div>
      )}

      {!isStreaming && !capturedFile && (
        <div>
          <button
            type="button"
            onClick={startCamera}
            style={{
              padding: '1rem 2rem',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              marginBottom: '1rem'
            }}
          >
            📷 Activar Cámara
          </button>
          <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '1rem' }}>
            {permissionStatus === 'denied'
              ? 'Los permisos están denegados. Haz clic en el candado 🔒 en la barra de direcciones para permitir el acceso.'
              : 'Al hacer clic, tu navegador solicitará permiso para acceder a la cámara.'}
          </p>
        </div>
      )}

      {/* Video element always present but hidden when not streaming */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: isStreaming ? '100%' : '0',
          height: isStreaming ? 'auto' : '0',
          maxWidth: '500px',
          minHeight: isStreaming ? '300px' : '0',
          borderRadius: '8px',
          border: isStreaming ? '3px solid #2196f3' : 'none',
          marginBottom: isStreaming ? '1.5rem' : '0',
          display: isStreaming ? 'block' : 'none',
          objectFit: 'cover'
        }}
      />

      {isStreaming && (
        <div style={{ marginBottom: '2rem' }}>
          <button
            type="button"
            onClick={capturePhoto}
            style={{
              padding: '1rem 2rem',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            📸 Capturar Foto
          </button>
        </div>
      )}

      {capturedFile && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '2rem' }}>
            <img
              src={(capturedFile as any).dataURL}
              alt="Selfie captured"
              style={{
                maxWidth: '300px',
                maxHeight: '300px',
                borderRadius: '8px',
                border: '2px solid #ddd'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={retakePhoto}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🔄 Retomar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Selfie'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};