import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Divider,
  Stack,
  Button
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  Verified,
  Security,
  Description,
  DateRange,
  Business,
  Refresh
} from '@mui/icons-material';
import { Header } from '../components/Header';
import { verificationService, type VerificationResult } from '../services/verificationService';

export const VerificationPage: React.FC = () => {
  const { entityId } = useParams<{ entityId: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const checksum = searchParams.get('checksum');

  const fetchVerification = async () => {
    if (!entityId) return;

    try {
      setIsLoading(true);
      const verificationResult = await verificationService.verifyEntity(entityId, checksum || undefined);
      setResult(verificationResult);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Verification failed:', error);
      // Error handling is done in the service
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, [entityId, checksum]);

  const handleRefresh = () => {
    fetchVerification();
  };

  const getStatusIcon = () => {
    if (!result) return <Info />;

    if (result.valid) {
      return <CheckCircle sx={{ color: 'success.main' }} />;
    } else {
      return <Error sx={{ color: 'error.main' }} />;
    }
  };


  const getVerificationMessage = () => {
    if (!result) return t('verification.unknown');

    if (result.error) {
      return result.error;
    }

    if (result.valid) {
      return t('verification.valid_document');
    } else {
      return t('verification.invalid_document');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('verification.not_available');
    try {
      return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const InfoItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | React.ReactNode;
    color?: 'success' | 'error' | 'warning' | 'info';
  }> = ({ icon, label, value, color = 'info' }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
      <Box sx={{ mr: 2, mt: 0.5, color: `${color}.main` }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography variant="body1">
          {value}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box>
      <Header />

      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Security />
          {t('verification.title', 'Verificación de Documento')}
        </Typography>

        {/* Main Verification Status */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              {getStatusIcon()}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">
                  {getVerificationMessage()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('verification.entity_id')}: {entityId}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={handleRefresh}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={16} /> : <Refresh />}
                size="small"
              >
                {t('common.refresh', 'Actualizar')}
              </Button>
            </Stack>

            {/* Security Status */}
            {result && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Chip
                  icon={result.checksum_valid ? <CheckCircle /> : <Error />}
                  label={result.checksum_valid ? t('verification.integrity_valid') : t('verification.integrity_invalid')}
                  color={result.checksum_valid ? 'success' : 'error'}
                  variant="outlined"
                  size="small"
                />
                <Chip
                  icon={result.verified ? <Verified /> : <Warning />}
                  label={result.verified ? t('verification.officially_verified') : t('verification.not_verified')}
                  color={result.verified ? 'success' : 'warning'}
                  variant="outlined"
                  size="small"
                />
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Document Details */}
        {result && !isLoading && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description />
                {t('verification.document_details', 'Detalles del Documento')}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <Box sx={{ flex: 1 }}>
                  <InfoItem
                    icon={<Description />}
                    label={t('verification.document_name')}
                    value={result.name}
                  />

                  <InfoItem
                    icon={<Business />}
                    label={t('verification.issuing_authority')}
                    value={result.authority}
                  />

                  <InfoItem
                    icon={<Description />}
                    label={t('verification.document_type')}
                    value={result.document_type}
                  />
                </Box>

                <Box sx={{ flex: 1 }}>
                  <InfoItem
                    icon={<DateRange />}
                    label={t('verification.issue_date')}
                    value={formatDate(result.created_at)}
                  />

                  {result.verification_date && (
                    <InfoItem
                      icon={<Verified />}
                      label={t('verification.verification_date')}
                      value={formatDate(result.verification_date)}
                    />
                  )}

                  {result.verified_by && (
                    <InfoItem
                      icon={<Business />}
                      label={t('verification.verified_by')}
                      value={result.verified_by}
                    />
                  )}
                </Box>
              </Stack>

              {/* Security Information */}
              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security />
                {t('verification.security_info', 'Información de Seguridad')}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <InfoItem
                    icon={<Security />}
                    label={t('verification.checksum_verification')}
                    value={result.checksum_provided ?
                      (result.checksum_valid ? t('verification.passed') : t('verification.failed')) :
                      t('verification.not_provided')
                    }
                    color={result.checksum_provided ? (result.checksum_valid ? 'success' : 'error') : 'warning'}
                  />
                </Box>

                <Box sx={{ flex: 1 }}>
                  <InfoItem
                    icon={<Info />}
                    label={t('verification.last_updated')}
                    value={formatDate(lastUpdated.toISOString())}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Validation Errors */}
        {result && result.validation_errors && result.validation_errors.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('verification.validation_errors')}:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {result.validation_errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Help Text */}
        <Paper sx={{ p: 2, mt: 3, backgroundColor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary">
            <Info sx={{ verticalAlign: 'middle', mr: 1, fontSize: 'inherit' }} />
            {t('verification.help_text', 'Este sistema permite verificar la autenticidad de documentos oficiales mediante códigos QR. Los documentos válidos muestran una marca de verificación verde y han pasado todas las validaciones de seguridad.')}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};