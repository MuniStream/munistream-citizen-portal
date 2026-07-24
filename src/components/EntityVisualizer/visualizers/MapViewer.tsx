import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Paper, IconButton, Chip } from '@mui/material';
import { LocationOn, OpenInNew, ContentCopy } from '@mui/icons-material';
import type { DetectedField } from '../../../utils/entityFieldDetector';

interface MapViewerProps {
  entity: any;
  fieldName: string;
  fieldValue: string;
  detectedField: DetectedField;
  options?: Record<string, any>;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  fieldValue,
  options = {}
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fieldValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleOpenInMaps = () => {
    const encodedAddress = encodeURIComponent(fieldValue);
    const mapsUrl = `https://www.google.com/maps/search/${encodedAddress}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const formatAddress = (address: string) => {
    // Basic address formatting - capitalize first letter of each word
    return address
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <LocationOn color="primary" fontSize="small" />
        <Typography variant="subtitle2" color="text.secondary">
          {t('viewers.address')}
        </Typography>
        <Chip label={t('viewers.geocoded')} size="small" variant="outlined" color="primary" />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {formatAddress(fieldValue)}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          {t('viewers.clickToViewOnMap')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton size="small" onClick={handleOpenInMaps} title={t('viewers.openInGoogleMaps')}>
          <OpenInNew fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={handleCopy} title={copied ? t('viewers.copied') : t('viewers.copyAddress')}>
          <ContentCopy fontSize="small" />
        </IconButton>
      </Box>

      {options.showCoordinates && options.coordinates && (
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {t('viewers.coordinates')}: {options.coordinates.lat}, {options.coordinates.lng}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};