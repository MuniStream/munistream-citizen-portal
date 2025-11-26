/**
 * Digital Signing Dialog Component
 *
 * Complete workflow for digital signing including certificate loading,
 * data preview, signing, and submission.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Close,
  Security,
  CheckCircle,
  Error as ErrorIcon,
  Verified,
} from '@mui/icons-material';
import { CertificateLoader } from './CertificateLoader';
import { SignatureService, type CertificateInfo, type SignableData, type SubmissionResponse } from '../../services/signatureService';

interface SigningDialogProps {
  open: boolean;
  onClose: () => void;
  instanceId: string;
  signatureField: string;
  title?: string;
  description?: string;
  onSigningComplete?: (result: SubmissionResponse) => void;
}

const SigningStep = {
  LOAD_CERTIFICATE: 0,
  PREVIEW_DATA: 1,
  SIGNING: 2,
  COMPLETE: 3,
} as const;

type SigningStepType = typeof SigningStep[keyof typeof SigningStep];

export const SigningDialog: React.FC<SigningDialogProps> = ({
  open,
  onClose,
  instanceId,
  signatureField,
  title = 'Firma Digital',
  description = 'Complete el proceso de firma digital para este documento.',
  onSigningComplete,
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState<SigningStepType>(SigningStep.LOAD_CERTIFICATE);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState<string | undefined>();
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo | null>(null);
  const [signableData, setSignableData] = useState<SignableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingResult, setSigningResult] = useState<SubmissionResponse | null>(null);

  const signatureService = new SignatureService();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep(SigningStep.LOAD_CERTIFICATE);
      setCertificateFile(null);
      setPrivateKeyFile(null);
      setPassphrase(undefined);
      setCertificateInfo(null);
      setSignableData(null);
      setError(null);
      setSigningResult(null);
    }
  }, [open]);

  // Handle certificate loading completion
  const handleCertificateLoaded = useCallback(async (
    certFile: File,
    keyFile: File,
    pass?: string,
    certInfo?: CertificateInfo
  ) => {
    setCertificateFile(certFile);
    setPrivateKeyFile(keyFile);
    setPassphrase(pass);
    setCertificateInfo(certInfo || null);

    // Fetch signable data
    try {
      setLoading(true);
      setError(null);

      const data = await signatureService.getSignableData(instanceId, signatureField);
      setSignableData(data);
      setCurrentStep(SigningStep.PREVIEW_DATA);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get signable data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [instanceId, signatureField, signatureService]);

  // Handle signing process
  const handleSign = useCallback(async () => {
    if (!certificateFile || !privateKeyFile || !signableData) {
      setError('Missing required files or data');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCurrentStep(SigningStep.SIGNING);

      // Complete the signing workflow
      const result = await signatureService.completeSigningWorkflow(
        instanceId,
        signatureField,
        certificateFile,
        privateKeyFile,
        passphrase
      );

      setSigningResult(result);
      setCurrentStep(SigningStep.COMPLETE);

      // Notify parent component
      if (onSigningComplete) {
        onSigningComplete(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signing failed';
      setError(errorMessage);
      setCurrentStep(SigningStep.PREVIEW_DATA); // Go back to allow retry
    } finally {
      setLoading(false);
    }
  }, [
    certificateFile,
    privateKeyFile,
    signableData,
    instanceId,
    signatureField,
    passphrase,
    signatureService,
    onSigningComplete,
  ]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (!loading) {
      onClose();
    }
  }, [loading, onClose]);

  // Render certificate loader step
  const renderCertificateLoader = () => (
    <CertificateLoader
      onCertificateLoaded={handleCertificateLoaded}
      loading={loading}
      error={error}
    />
  );

  // Render data preview step
  const renderDataPreview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Datos a Firmar
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Revisa los datos que serán incluidos en la firma digital:
      </Typography>

      {signableData && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, maxHeight: 300, overflow: 'auto' }}>
          <pre style={{ fontSize: '12px', margin: 0, wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(signableData.signable_data, null, 2)}
          </pre>
        </Paper>
      )}

      {certificateInfo && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Certificado a Utilizar:
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Verified color="success" />
            <Typography variant="body2">
              {certificateInfo.subject}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Válido hasta: {new Date(certificateInfo.validTo).toLocaleDateString()}
          </Typography>
        </Box>
      )}

      {signableData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Tiempo límite:</strong> {new Date(signableData.expires_at).toLocaleString()}
          </Typography>
        </Alert>
      )}
    </Box>
  );

  // Render signing in progress step
  const renderSigning = () => (
    <Box textAlign="center" py={4}>
      <CircularProgress size={60} sx={{ mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Firmando Documento...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Por favor espera mientras se procesa tu firma digital.
      </Typography>
    </Box>
  );

  // Render completion step
  const renderComplete = () => (
    <Box textAlign="center" py={2}>
      {signingResult?.success ? (
        <>
          <CheckCircle color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            ¡Firma Completada!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tu documento ha sido firmado digitalmente de forma exitosa.
          </Typography>

          {signingResult.verification_result && (
            <Alert
              severity={signingResult.verification_result.valid ? 'success' : 'warning'}
              sx={{ mt: 2 }}
            >
              <Typography variant="body2">
                <strong>Verificación:</strong>{' '}
                {signingResult.verification_result.valid
                  ? 'Firma verificada correctamente'
                  : 'La firma fue almacenada pero la verificación automática falló'}
              </Typography>
            </Alert>
          )}
        </>
      ) : (
        <>
          <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Error en la Firma
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {signingResult?.message || 'Ocurrió un error durante el proceso de firma.'}
          </Typography>
        </>
      )}
    </Box>
  );

  // Get step content
  const getStepContent = () => {
    switch (currentStep) {
      case SigningStep.LOAD_CERTIFICATE:
        return renderCertificateLoader();
      case SigningStep.PREVIEW_DATA:
        return renderDataPreview();
      case SigningStep.SIGNING:
        return renderSigning();
      case SigningStep.COMPLETE:
        return renderComplete();
      default:
        return null;
    }
  };

  // Get step labels
  const steps = [
    'Cargar Certificado',
    'Revisar Datos',
    'Firmando',
    'Completado'
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Security color="primary" />
            <Typography variant="h6">{title}</Typography>
          </Box>
          <IconButton onClick={handleClose} disabled={loading}>
            <Close />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {/* Progress Stepper */}
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  error={error !== null && index === currentStep}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Step Content */}
        {getStepContent()}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={loading}
          color="inherit"
        >
          {currentStep === SigningStep.COMPLETE && signingResult?.success ? 'Cerrar' : 'Cancelar'}
        </Button>

        {currentStep === SigningStep.PREVIEW_DATA && (
          <Button
            onClick={handleSign}
            disabled={loading}
            variant="contained"
            startIcon={<Security />}
          >
            Firmar Documento
          </Button>
        )}

        {currentStep === SigningStep.LOAD_CERTIFICATE && (
          <Button
            onClick={() => setCurrentStep(SigningStep.PREVIEW_DATA)}
            disabled={!signableData || loading}
            variant="contained"
          >
            Continuar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SigningDialog;