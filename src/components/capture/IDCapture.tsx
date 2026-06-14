import React, { useState, useRef, useCallback, useEffect } from 'react';

interface IDCaptureProps {
  title: string;
  description: string;
  onSubmit: (data: Record<string, any>) => void;
  isSubmitting?: boolean;
  allowFileUpload?: boolean;
}

export const IDCapture: React.FC<IDCaptureProps> = ({
  title,
  description,
  onSubmit,
  isSubmitting = false,
  allowFileUpload = false
}) => {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontUploaded, setFrontUploaded] = useState(false);
  const [backUploaded, setBackUploaded] = useState(false);
  const [currentSide, setCurrentSide] = useState<'front' | 'back' | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFileUpload = useCallback((side: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage('');
    if (!file.type.startsWith('image/')) {
      setErrorMessage('El archivo debe ser una imagen (JPG, PNG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      (file as any).dataURL = reader.result as string;
      if (side === 'front') { setFrontFile(file); setFrontUploaded(true); }
      else { setBackFile(file); setBackUploaded(true); }
    };
    reader.readAsDataURL(file);
  }, []);

  // Check camera permission status
  const checkCameraPermission = async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('Camera permission state:', permission.state);
        if (permission.state === 'denied') {
          setPermissionStatus('denied');
          setErrorMessage('Los permisos de cámara están denegados en tu navegador. Por favor, permite el acceso a la cámara en la configuración del navegador.');
        } else {
          setPermissionStatus('unknown');
        }
      } else {
        console.log('Permission API not available');
        setPermissionStatus('unknown');
      }
    } catch (error) {
      console.log('Error checking camera permission:', error);
      setPermissionStatus('unknown');
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = useCallback(async (side: 'front' | 'back') => {
    setErrorMessage('');
    setCurrentSide(side);
    console.log(`Starting camera for ${side}...`);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera for documents
          width: { ideal: 1920, min: 1280 }, // Higher resolution
          height: { ideal: 1080, min: 720 }, // Higher resolution
          aspectRatio: { ideal: 1.33333333 }, // 4:3 better for documents
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      console.log(`Got camera stream for ${side}:`, stream);

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
    if (!videoRef.current || !streamRef.current || !currentSide) return;

    const canvas = document.createElement('canvas');

    // Use a minimum size to ensure high quality
    const minWidth = 1024; // High resolution for document capture
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
        const file = new File([blob], `document_${currentSide}_${timestamp}.jpg`, { type: 'image/jpeg' });
        (file as any).dataURL = canvas.toDataURL('image/jpeg', 0.98); // Maximum quality

        if (currentSide === 'front') {
          setFrontFile(file);
        } else {
          setBackFile(file);
        }

        // Stop camera after capture
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setIsStreaming(false);
        setCurrentSide(null);
      }
    }, 'image/jpeg', 0.98); // Maximum quality compression
  }, [currentSide]);

  const cancelCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setCurrentSide(null);
    setErrorMessage('');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (frontFile && backFile) {
      const timestamp = new Date().toISOString();
      const anyUploaded = frontUploaded || backUploaded;
      // Si algún lado proviene de archivo subido no es captura en vivo; el
      // backend (allow_file_upload) omite las validaciones de captura en vivo.
      const metadata = anyUploaded
        ? {
            user_agent: navigator.userAgent,
            platform: navigator.platform,
            capture_method: 'file_upload',
            capture_source: 'file',
            media_devices_available: false,
            captured_at: timestamp,
            timestamp_unix: Date.now(),
            live_capture: false,
            document_sides: ['front', 'back']
          }
        : {
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
            document_sides: ['front', 'back'],
            browser_fingerprint: {
              language: navigator.language,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              color_depth: window.screen.colorDepth,
              pixel_ratio: window.devicePixelRatio
            }
          };

      onSubmit({
        _files: {
          document_front: frontFile,
          document_back: backFile
        },
        metadata: JSON.stringify(metadata)
      });
    }
  };

  const handleRetake = (side: 'front' | 'back') => {
    if (side === 'front') {
      setFrontFile(null);
      setFrontUploaded(false);
      if (frontInputRef.current) frontInputRef.current.value = '';
    } else {
      setBackFile(null);
      setBackUploaded(false);
      if (backInputRef.current) backInputRef.current.value = '';
    }
  };

  return (
    <div className="id-capture-container" style={{
      textAlign: 'center',
      padding: '2rem',
      backgroundColor: '#fff3e0',
      borderRadius: '8px',
      margin: '1rem 0',
      border: '2px solid #ff9800'
    }}>
      <div style={{ marginBottom: '1.5rem', fontSize: '3rem' }}>📄</div>
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

      {/* Video element always present but hidden when not streaming */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: isStreaming && currentSide ? '100%' : '0',
          height: isStreaming && currentSide ? 'auto' : '0',
          maxWidth: '500px',
          minHeight: isStreaming && currentSide ? '300px' : '0',
          borderRadius: '8px',
          border: isStreaming && currentSide ? '3px solid #ff9800' : 'none',
          marginBottom: isStreaming && currentSide ? '1.5rem' : '0',
          display: isStreaming && currentSide ? 'block' : 'none',
          objectFit: 'cover'
        }}
      />

      {/* Camera streaming view */}
      {isStreaming && currentSide && (
        <div style={{ marginBottom: '2rem' }}>
          <h5 style={{ marginBottom: '1rem', color: '#555' }}>
            {currentSide === 'front' ? 'Capturando Frente del Documento' : 'Capturando Reverso del Documento'}
          </h5>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
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
              📸 Capturar {currentSide === 'front' ? 'Frente' : 'Reverso'}
            </button>
            <button
              type="button"
              onClick={cancelCapture}
              style={{
                padding: '1rem 2rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1.1rem'
              }}
            >
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Document capture interface */}
      {!isStreaming && (
        <div style={{
          display: 'flex',
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          gap: '2rem',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2rem'
        }}>
          {/* Front capture */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h5 style={{ marginBottom: '1rem', color: '#555' }}>📄 Frente del Documento</h5>
            {!frontFile ? (
              <button
                type="button"
                onClick={() => startCamera('front')}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  width: '100%',
                  maxWidth: '250px'
                }}
              >
                📷 Activar Cámara (Frente)
              </button>
            ) : null}
            {!frontFile && allowFileUpload && (
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => frontInputRef.current?.click()}
                  style={{
                    padding: '0.85rem 1.5rem',
                    backgroundColor: '#fff',
                    color: '#ff9800',
                    border: '2px solid #ff9800',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    width: '100%',
                    maxWidth: '250px'
                  }}
                >
                  📁 Subir archivo (Frente)
                </button>
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload('front', e)}
                  style={{ display: 'none' }}
                />
              </div>
            )}
            {frontFile && (
              <div>
                <img
                  src={(frontFile as any).dataURL}
                  alt="Document front"
                  style={{
                    maxWidth: '300px',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    border: '2px solid #4caf50'
                  }}
                />
                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => handleRetake('front')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Retomar Frente
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Back capture */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h5 style={{ marginBottom: '1rem', color: '#555' }}>📄 Reverso del Documento</h5>
            {!backFile ? (
              <button
                type="button"
                onClick={() => startCamera('back')}
                disabled={!frontFile}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: frontFile ? '#ff9800' : '#bdbdbd',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: frontFile ? 'pointer' : 'not-allowed',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  width: '100%',
                  maxWidth: '250px'
                }}
              >
                📷 Activar Cámara (Reverso)
              </button>
            ) : null}
            {!backFile && allowFileUpload && (
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => backInputRef.current?.click()}
                  disabled={!frontFile}
                  style={{
                    padding: '0.85rem 1.5rem',
                    backgroundColor: '#fff',
                    color: frontFile ? '#ff9800' : '#bdbdbd',
                    border: `2px solid ${frontFile ? '#ff9800' : '#bdbdbd'}`,
                    borderRadius: '8px',
                    cursor: frontFile ? 'pointer' : 'not-allowed',
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    width: '100%',
                    maxWidth: '250px'
                  }}
                >
                  📁 Subir archivo (Reverso)
                </button>
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload('back', e)}
                  style={{ display: 'none' }}
                />
              </div>
            )}
            {backFile && (
              <div>
                <img
                  src={(backFile as any).dataURL}
                  alt="Document back"
                  style={{
                    maxWidth: '300px',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    border: '2px solid #4caf50'
                  }}
                />
                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => handleRetake('back')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Retomar Reverso
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit section */}
      {frontFile && backFile && !isStreaming && (
        <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '1rem 2rem',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Enviando...' : '✅ Enviar Documento'}
          </button>
        </form>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '6px',
        fontSize: '0.9rem',
        color: '#666'
      }}>
        <strong>📋 Instrucciones:</strong>
        <ul style={{ textAlign: 'left', marginTop: '0.5rem', paddingLeft: '1rem' }}>
          <li>🔆 Asegúrate de tener buena iluminación</li>
          <li>📐 Mantén el documento plano y centrado en la pantalla</li>
          <li>👀 Verifica que todo el texto sea legible antes de capturar</li>
          <li>➡️ Primero captura el frente, luego el reverso del documento</li>
          <li>📱 Usa la cámara trasera para mejor calidad</li>
        </ul>

        {permissionStatus === 'denied' && (
          <p style={{ color: '#c62828', marginTop: '1rem', fontWeight: 'bold' }}>
            🔒 Los permisos están denegados. Haz clic en el candado en la barra de direcciones para permitir el acceso a la cámara.
          </p>
        )}
      </div>
    </div>
  );
};