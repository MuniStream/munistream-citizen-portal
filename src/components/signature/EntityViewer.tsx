/**
 * Entity Viewer Component
 *
 * Displays entities with digital signatures and provides access to signed PDFs.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  PictureAsPdf,
  Download,
  Verified,
  Warning,
  Error as ErrorIcon,
  Security,
  Info,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import axios from 'axios';

interface EntityData {
  id: string;
  type: string;
  name: string;
  data: Record<string, any>;
  created_at: string;
  has_signature: boolean;
  signature_info?: {
    algorithm: string;
    signer: string;
    timestamp: string;
    verified?: boolean;
  };
}

interface EntityViewerProps {
  entity: EntityData;
  apiBaseUrl?: string;
}


interface VerificationResult {
  valid: boolean;
  verification_timestamp: string;
  signature_info: Record<string, any>;
  verification_results: Record<string, any>;
  overall_valid: boolean;
}

export const EntityViewer: React.FC<EntityViewerProps> = ({
  entity,
  apiBaseUrl = '/api/v1',
}) => {
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');

  // Load HTML content on component mount
  useEffect(() => {
    const loadHtmlContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(
          `${apiBaseUrl}/signatures/entities/${entity.id}/html`
        );

        setHtmlContent(response.data);
      } catch (error) {
        const errorMessage = axios.isAxiosError(error)
          ? error.response?.data?.detail || error.message
          : 'Failed to load document HTML';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadHtmlContent();
  }, [entity.id, apiBaseUrl]);

  // Print HTML view
  const handlePrintHtml = useCallback(() => {
    const iframe = document.querySelector('#entity-html-iframe') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  }, []);

  // Download PDF
  const handleDownload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${apiBaseUrl}/signatures/entities/${entity.id}/pdf`,
        {
          responseType: 'blob',
          params: {
            include_signatures: entity.has_signature,
          },
        }
      );

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entity.name || entity.type}_${entity.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.detail || error.message
        : 'Failed to download PDF';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [entity.id, entity.name, entity.type, entity.has_signature, apiBaseUrl]);

  // Verify signature
  const handleVerifySignature = useCallback(async () => {
    if (!entity.has_signature) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(
        `${apiBaseUrl}/signatures/entities/${entity.id}/verify-signature`
      );

      setVerificationResult(response.data);
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.detail || error.message
        : 'Failed to verify signature';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [entity.id, entity.has_signature, apiBaseUrl]);


  // Get signature status color and icon
  const getSignatureStatus = () => {
    if (!entity.has_signature) {
      return {
        color: 'default' as const,
        icon: <Info />,
        label: 'Sin firma',
      };
    }

    if (entity.signature_info?.verified === true) {
      return {
        color: 'success' as const,
        icon: <Verified />,
        label: 'Verificada',
      };
    }

    if (entity.signature_info?.verified === false) {
      return {
        color: 'error' as const,
        icon: <ErrorIcon />,
        label: 'Error',
      };
    }

    return {
      color: 'warning' as const,
      icon: <Warning />,
      label: 'Pendiente',
    };
  };

  const signatureStatus = getSignatureStatus();

  return (
    <Box>
      {!htmlContent ? (
        /* Cuando NO hay visualizador - mostrar información completa */
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  📊 Información de la Entidad
                </Typography>
                <Typography variant="h5" gutterBottom>
                  {entity.name || `${entity.type} ${entity.id}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tipo: {entity.type} • Creado: {new Date(entity.created_at).toLocaleDateString()}
                </Typography>
              </Box>

              <Box display="flex" gap={1}>
                <Chip
                  icon={signatureStatus.icon}
                  label={signatureStatus.label}
                  color={signatureStatus.color}
                  size="small"
                />
                {entity.has_signature && (
                  <Chip
                    icon={<Security />}
                    label="Firmado"
                    color="primary"
                    size="small"
                  />
                )}
              </Box>
            </Box>

            {entity.signature_info && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Información de Firma:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Security />
                    </ListItemIcon>
                    <ListItemText
                      primary="Algoritmo"
                      secondary={entity.signature_info.algorithm}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Verified />
                    </ListItemIcon>
                    <ListItemText
                      primary="Firmante"
                      secondary={entity.signature_info.signer}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Schedule />
                    </ListItemIcon>
                    <ListItemText
                      primary="Fecha de firma"
                      secondary={new Date(entity.signature_info.timestamp).toLocaleString()}
                    />
                  </ListItem>
                </List>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {verificationResult && (
              <Alert
                severity={verificationResult.overall_valid ? 'success' : 'error'}
                sx={{ mb: 2 }}
              >
                <Typography variant="body2">
                  <strong>Verificación:</strong>{' '}
                  {verificationResult.overall_valid
                    ? 'Firma válida y verificada'
                    : 'Firma inválida o no se pudo verificar'}
                </Typography>
                <Typography variant="caption" display="block">
                  Verificado el: {new Date(verificationResult.verification_timestamp).toLocaleString()}
                </Typography>
              </Alert>
            )}

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Cargando...
                </Typography>
              </Box>
            )}

            {!loading && !htmlContent && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  No hay visualizador disponible para esta entidad. Solo se puede descargar como PDF.
                </Typography>
              </Alert>
            )}
          </CardContent>

          <CardActions>
            <Button
              startIcon={<Download />}
              onClick={handleDownload}
              disabled={loading}
              variant="contained"
            >
              Descargar PDF
            </Button>

            {entity.has_signature && (
              <Button
                startIcon={<CheckCircle />}
                onClick={handleVerifySignature}
                disabled={loading}
                color="primary"
              >
                Verificar Firma
              </Button>
            )}

            {loading && <CircularProgress size={20} />}
          </CardActions>
        </Card>
      ) : (
        /* Cuando hay visualizador - iframe arriba completamente */
        <>
          {/* HTML Iframe hasta arriba */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', mb: 2 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                Cargando documento...
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '800px',
                border: '2px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                mb: 2,
                p: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                backgroundColor: '#f5f5f5'
              }}
            >
              <iframe
                id="entity-html-iframe"
                srcDoc={htmlContent}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: 'white'
                }}
                title={`Documento - ${entity.name}`}
              />
            </Box>
          )}

          {/* Controles y información abajo del iframe */}
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  {entity.name || `${entity.type} ${entity.id}`}
                </Typography>
                <Box display="flex" gap={1}>
                  <Chip
                    icon={signatureStatus.icon}
                    label={signatureStatus.label}
                    color={signatureStatus.color}
                    size="small"
                  />
                  {entity.has_signature && (
                    <Chip
                      icon={<Security />}
                      label="Firmado"
                      color="primary"
                      size="small"
                    />
                  )}
                </Box>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {verificationResult && (
                <Alert
                  severity={verificationResult.overall_valid ? 'success' : 'error'}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body2">
                    <strong>Verificación:</strong>{' '}
                    {verificationResult.overall_valid
                      ? 'Firma válida y verificada'
                      : 'Firma inválida o no se pudo verificar'}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Verificado el: {new Date(verificationResult.verification_timestamp).toLocaleString()}
                  </Typography>
                </Alert>
              )}
            </CardContent>

            <CardActions>
              <Button
                startIcon={<PictureAsPdf />}
                onClick={handlePrintHtml}
                disabled={loading}
                variant="outlined"
              >
                Imprimir/Guardar PDF
              </Button>

              <Button
                startIcon={<Download />}
                onClick={handleDownload}
                disabled={loading}
                variant="contained"
              >
                Descargar PDF
              </Button>

              {entity.has_signature && (
                <Button
                  startIcon={<CheckCircle />}
                  onClick={handleVerifySignature}
                  disabled={loading}
                  color="primary"
                >
                  Verificar Firma
                </Button>
              )}

              {loading && <CircularProgress size={20} />}
            </CardActions>
          </Card>

          {/* Metadatos mínimos */}
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Metadatos del Documento
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1 }}>
                <Typography variant="caption">
                  <strong>ID:</strong> {entity.id}
                </Typography>
                <Typography variant="caption">
                  <strong>Tipo:</strong> {entity.type}
                </Typography>
                <Typography variant="caption">
                  <strong>Creado:</strong> {new Date(entity.created_at).toLocaleString()}
                </Typography>
                <Typography variant="caption">
                  <strong>Estado de Firma:</strong> {entity.has_signature ? 'Firmado' : 'Sin Firma'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default EntityViewer;