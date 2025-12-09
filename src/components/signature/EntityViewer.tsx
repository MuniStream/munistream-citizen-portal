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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Link,
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
  Wallet,
  Apple,
  Android,
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
  const [walletLoading, setWalletLoading] = useState(false);

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

  // Detect platform
  const detectPlatform = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    }
    return 'desktop';
  };

  // Handle Apple Wallet
  const handleAddToAppleWallet = useCallback(async () => {
    try {
      setWalletLoading(true);
      setError(null);

      const response = await axios.get(
        `${apiBaseUrl}/entities/${entity.id}/wallet/apple`,
        { responseType: 'blob' }
      );

      // Create download link for .pkpass file
      const blob = new Blob([response.data], { type: 'application/vnd.apple.pkpass' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entity.name || entity.type}_${entity.id}.pkpass`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.detail || error.message
        : 'Error al agregar a Apple Wallet';
      setError(errorMessage);
    } finally {
      setWalletLoading(false);
    }
  }, [entity.id, entity.name, entity.type, apiBaseUrl]);

  // Handle Google Wallet
  const handleAddToGoogleWallet = useCallback(async () => {
    try {
      setWalletLoading(true);
      setError(null);

      const response = await axios.get(
        `${apiBaseUrl}/entities/${entity.id}/wallet/google`
      );

      // Open Google Wallet save URL
      if (response.data.save_url) {
        window.open(response.data.save_url, '_blank');
      } else {
        throw new Error('No se pudo generar el enlace de Google Wallet');
      }
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.detail || error.message
        : 'Error al agregar a Google Wallet';
      setError(errorMessage);
    } finally {
      setWalletLoading(false);
    }
  }, [entity.id, apiBaseUrl]);

  // Handle wallet button click
  const handleWalletAction = useCallback(() => {
    const platform = detectPlatform();

    if (platform === 'ios') {
      handleAddToAppleWallet();
    } else if (platform === 'android') {
      handleAddToGoogleWallet();
    } else {
      // Desktop - show options or default to Apple
      handleAddToAppleWallet();
    }
  }, [handleAddToAppleWallet, handleAddToGoogleWallet]);

  const getWalletButtonText = () => {
    const platform = detectPlatform();
    if (platform === 'ios') {
      return 'Agregar a Apple Wallet';
    } else if (platform === 'android') {
      return 'Agregar a Google Wallet';
    }
    return 'Agregar a Wallet';
  };

  const getWalletIcon = () => {
    const platform = detectPlatform();
    if (platform === 'ios') {
      return <Apple />;
    } else if (platform === 'android') {
      return <Android />;
    }
    return <Wallet />;
  };


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

  // Helper function to detect and format catalog data
  const getCatalogData = () => {
    const catalogSections: { title: string; data: Record<string, any> }[] = [];

    // Look for catalog data keys
    const catalogKeys = Object.keys(entity.data).filter(key =>
      key.includes('_catastral_data') ||
      key.includes('_folio_data') ||
      key.includes('clave_catastral_data') ||
      key.includes('folio_real_data')
    );

    catalogKeys.forEach(key => {
      const data = entity.data[key];
      if (data && typeof data === 'object') {
        const title = key.replace('_data', '').replace('_', ' ').toUpperCase();
        catalogSections.push({ title, data });
      }
    });

    return catalogSections;
  };

  // Helper function to detect related entities
  const getRelatedEntities = () => {
    const relatedKeys = Object.keys(entity.data).filter(key =>
      key.includes('_ids') && Array.isArray(entity.data[key])
    );

    const relatedEntities: { type: string; ids: string[] }[] = [];

    relatedKeys.forEach(key => {
      const ids = entity.data[key];
      if (ids.length > 0) {
        const type = key.replace('_ids', '').replace('_', ' ');
        relatedEntities.push({ type, ids });
      }
    });

    return relatedEntities;
  };

  // Helper function to detect and format S3 file URLs
  const getS3Files = () => {
    const fileGroups: { title: string; files: Array<{ name: string; url: string; size?: number }> }[] = [];

    // Look for S3 URLs in various fields
    const data = entity.data;

    // Check for uploaded_files array
    if (data.uploaded_files && Array.isArray(data.uploaded_files)) {
      const files = data.uploaded_files.map((file: any) => ({
        name: file.filename || 'Archivo',
        url: `/files/download/${file.s3_key}`,
        size: file.size
      }));

      if (files.length > 0) {
        fileGroups.push({
          title: 'ARCHIVOS SUBIDOS',
          files
        });
      }
    }

    // Check for files in signable_data (admin workflow files)
    if (data.signable_data?.data) {
      const signableFiles: Array<{ name: string; url: string; size?: number }> = [];

      Object.keys(data.signable_data.data).forEach(key => {
        if (key.includes('_result') && Array.isArray(data.signable_data.data[key])) {
          data.signable_data.data[key].forEach((file: any) => {
            if (file.download_url) {
              signableFiles.push({
                name: file.filename || 'Archivo',
                url: file.download_url,
                size: file.size
              });
            }
          });
        }
      });

      if (signableFiles.length > 0) {
        fileGroups.push({
          title: 'ARCHIVOS DEL FLUJO',
          files: signableFiles
        });
      }
    }

    // Check for direct s3_urls and s3_keys
    if (data.s3_urls && Array.isArray(data.s3_urls) && data.s3_keys && Array.isArray(data.s3_keys)) {
      const directFiles = data.s3_keys.map((key: string, index: number) => ({
        name: key.split('/').pop() || `Archivo ${index + 1}`,
        url: `/files/download/${key}`,
        size: undefined
      }));

      if (directFiles.length > 0) {
        fileGroups.push({
          title: 'DOCUMENTOS',
          files: directFiles
        });
      }
    }

    return fileGroups;
  };

  return (
    <Box>
      {/* HTML Visualizer (if available) */}
      {htmlContent && (
        <>
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
        </>
      )}

      {/* Complete Entity Information (always shown) */}
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

          {!htmlContent && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                No hay visualizador disponible para esta entidad. Solo se puede descargar como PDF.
              </Typography>
            </Alert>
          )}

          {/* Catalog Data Section */}
          {getCatalogData().length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                📊 Datos del Catálogo
              </Typography>
              {getCatalogData().map((section, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    {section.title}
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableBody>
                        {Object.entries(section.data).map(([field, value]) => (
                          <TableRow key={field}>
                            <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                              {field.replace('_', ' ').toUpperCase()}
                            </TableCell>
                            <TableCell>
                              {String(value)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </Box>
          )}

          {/* Related Entities Section */}
          {getRelatedEntities().length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                🔗 Entidades Relacionadas
              </Typography>
              {getRelatedEntities().map((relation, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    {relation.type.toUpperCase()}
                  </Typography>
                  <List dense>
                    {relation.ids.map((entityId, i) => (
                      <ListItem key={i}>
                        <ListItemIcon>
                          📄
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Link
                              href={`/entity/${entityId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                            >
                              {entityId}
                            </Link>
                          }
                          secondary={`${relation.type} relacionado`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </Box>
          )}

          {/* S3 Files Section */}
          {getS3Files().length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                📎 Archivos Adjuntos
              </Typography>
              {getS3Files().map((group, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    {group.title}
                  </Typography>
                  <List dense>
                    {group.files.map((file, i) => (
                      <ListItem key={i}>
                        <ListItemIcon>
                          📄
                        </ListItemIcon>
                        <ListItemText
                          primary={file.name}
                          secondary={file.size ? `Tamaño: ${Math.round(file.size / 1024)} KB` : 'Archivo adjunto'}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={async () => {
                            try {
                              const response = await fetch(`${apiBaseUrl}${file.url}`);
                              if (!response.ok) {
                                throw new Error('Error al descargar archivo');
                              }
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = file.name;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            } catch (err) {
                              console.error('Error downloading file:', err);
                              setError('Error al descargar el archivo');
                            }
                          }}
                          sx={{ ml: 1 }}
                        >
                          Descargar
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>

        <CardActions>
          {htmlContent && (
            <Button
              startIcon={<PictureAsPdf />}
              onClick={handlePrintHtml}
              disabled={loading}
              variant="outlined"
            >
              Imprimir/Guardar PDF
            </Button>
          )}

          <Button
            startIcon={<Download />}
            onClick={handleDownload}
            disabled={loading}
            variant="contained"
          >
            Descargar PDF
          </Button>

          <Button
            startIcon={getWalletIcon()}
            onClick={handleWalletAction}
            disabled={walletLoading}
            variant="outlined"
            color="secondary"
          >
            {getWalletButtonText()}
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

          {(loading || walletLoading) && <CircularProgress size={20} />}
        </CardActions>
      </Card>
    </Box>
  );
};

export default EntityViewer;