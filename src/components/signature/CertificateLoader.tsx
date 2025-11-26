/**
 * Certificate Loader Component
 *
 * Allows users to upload and validate X.509 certificates and private keys for digital signing.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  Security,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Warning,
  Info,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { SignatureService, type CertificateInfo } from '../../services/signatureService';

interface CertificateLoaderProps {
  onCertificateLoaded: (certificateFile: File, privateKeyFile: File, passphrase?: string, certificateInfo?: CertificateInfo) => void;
  loading?: boolean;
  error?: string | null;
}

interface FileUploadState {
  file: File | null;
  content: ArrayBuffer | null;
  error: string | null;
}

export const CertificateLoader: React.FC<CertificateLoaderProps> = ({
  onCertificateLoaded,
  loading = false,
  error: externalError = null,
}) => {
  const [certificateFile, setCertificateFile] = useState<FileUploadState>({
    file: null,
    content: null,
    error: null,
  });

  const [privateKeyFile, setPrivateKeyFile] = useState<FileUploadState>({
    file: null,
    content: null,
    error: null,
  });

  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [showCertificateDetails, setShowCertificateDetails] = useState(false);

  const signatureService = new SignatureService();

  // Handle certificate file upload
  const handleCertificateUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setValidationLoading(true);
      setCertificateFile({ file, content: null, error: null });
      setCertificateInfo(null);

      // Read file content
      const content = await readFileAsArrayBuffer(file);

      // Validate certificate
      const info = await signatureService.loadCertificate(content);

      setCertificateFile({ file, content, error: null });
      setCertificateInfo(info);
    } catch (error) {
      const errorMessage = (error as Error)?.message || 'Failed to load certificate';
      setCertificateFile({ file, content: null, error: errorMessage });
      setCertificateInfo(null);
    } finally {
      setValidationLoading(false);
    }
  }, [signatureService]);

  // Handle private key file upload
  const handlePrivateKeyUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsArrayBuffer(file);
      setPrivateKeyFile({ file, content, error: null });
    } catch (error) {
      const errorMessage = (error as Error)?.message || 'Failed to read private key file';
      setPrivateKeyFile({ file, content: null, error: errorMessage });
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (certificateFile.file && privateKeyFile.file && certificateInfo?.valid) {
      onCertificateLoaded(
        certificateFile.file,
        privateKeyFile.file,
        passphrase || undefined,
        certificateInfo
      );
    }
  }, [certificateFile.file, privateKeyFile.file, passphrase, certificateInfo, onCertificateLoaded]);

  // Utility function to read file as ArrayBuffer
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  // Check if form is valid and ready to submit
  const isFormValid = certificateFile.file &&
                     privateKeyFile.file &&
                     certificateInfo?.valid &&
                     !validationLoading;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
        Cargar Certificado Digital
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Selecciona tu certificado X.509 y llave privada para firmar digitalmente este documento.
      </Typography>

      {externalError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {externalError}
        </Alert>
      )}

      {/* Certificate Upload */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            1. Certificado (.cer, .crt, .pem)
          </Typography>

          <input
            accept=".cer,.crt,.pem,.cert"
            style={{ display: 'none' }}
            id="certificate-upload"
            type="file"
            onChange={handleCertificateUpload}
            disabled={loading}
          />

          <label htmlFor="certificate-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUpload />}
              disabled={loading || validationLoading}
              fullWidth
              sx={{ mb: 2 }}
            >
              {certificateFile.file ? certificateFile.file.name : 'Seleccionar Certificado'}
            </Button>
          </label>

          {validationLoading && <LinearProgress sx={{ mb: 2 }} />}

          {certificateFile.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {certificateFile.error}
            </Alert>
          )}

          {certificateInfo && (
            <Box>
              <Alert
                severity={certificateInfo.valid ? 'success' : 'error'}
                sx={{ mb: 2 }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <span>
                    {certificateInfo.valid ? 'Certificado válido' : 'Certificado inválido'}
                  </span>
                  <IconButton
                    size="small"
                    onClick={() => setShowCertificateDetails(!showCertificateDetails)}
                  >
                    {showCertificateDetails ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
              </Alert>

              <Collapse in={showCertificateDetails}>
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Detalles del Certificado
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Sujeto"
                        secondary={certificateInfo.subject}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Emisor"
                        secondary={certificateInfo.issuer}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Válido desde"
                        secondary={new Date(certificateInfo.validFrom).toLocaleDateString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Válido hasta"
                        secondary={new Date(certificateInfo.validTo).toLocaleDateString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Huella digital"
                        secondary={certificateInfo.fingerprint}
                      />
                    </ListItem>
                  </List>

                  {certificateInfo.warnings.length > 0 && (
                    <Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" color="warning.main" gutterBottom>
                        Advertencias:
                      </Typography>
                      {certificateInfo.warnings.map((warning, index) => (
                        <Alert severity="warning" key={index} sx={{ mb: 1 }}>
                          {warning}
                        </Alert>
                      ))}
                    </Box>
                  )}

                  {certificateInfo.errors.length > 0 && (
                    <Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" color="error.main" gutterBottom>
                        Errores:
                      </Typography>
                      {certificateInfo.errors.map((error, index) => (
                        <Alert severity="error" key={index} sx={{ mb: 1 }}>
                          {error}
                        </Alert>
                      ))}
                    </Box>
                  )}
                </Paper>
              </Collapse>

              <Box display="flex" gap={1}>
                {certificateInfo.keyUsage.map((usage, index) => (
                  <Chip
                    key={index}
                    label={usage}
                    size="small"
                    color={usage === 'digitalSignature' ? 'success' : 'default'}
                    icon={usage === 'digitalSignature' ? <CheckCircle /> : <Info />}
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Private Key Upload */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            2. Llave Privada (.key, .pem)
          </Typography>

          <input
            accept=".key,.pem"
            style={{ display: 'none' }}
            id="private-key-upload"
            type="file"
            onChange={handlePrivateKeyUpload}
            disabled={loading}
          />

          <label htmlFor="private-key-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUpload />}
              disabled={loading}
              fullWidth
              sx={{ mb: 2 }}
            >
              {privateKeyFile.file ? privateKeyFile.file.name : 'Seleccionar Llave Privada'}
            </Button>
          </label>

          {privateKeyFile.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {privateKeyFile.error}
            </Alert>
          )}

          {privateKeyFile.file && !privateKeyFile.error && (
            <Alert severity="success">
              <CheckCircle sx={{ mr: 1 }} />
              Llave privada cargada correctamente
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Passphrase Input */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            3. Contraseña (Opcional)
          </Typography>

          <TextField
            fullWidth
            type={showPassphrase ? 'text' : 'password'}
            label="Contraseña de la llave privada"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            disabled={loading}
            helperText="Solo si tu llave privada está protegida por contraseña"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    edge="end"
                  >
                    {showPassphrase ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={!isFormValid || loading}
        onClick={handleSubmit}
        startIcon={<Security />}
      >
        {loading ? 'Procesando...' : 'Continuar con la Firma'}
      </Button>

      {!certificateInfo?.valid && certificateFile.file && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Warning sx={{ mr: 1 }} />
          El certificado debe ser válido para continuar con la firma digital.
        </Alert>
      )}
    </Box>
  );
};

export default CertificateLoader;