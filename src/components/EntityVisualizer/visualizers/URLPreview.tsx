import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Chip } from '@mui/material';
import { OpenInNew, Link as LinkIcon, ContentCopy } from '@mui/icons-material';
import type { DetectedField } from '../../../utils/entityFieldDetector';

interface URLPreviewProps {
  entity: any;
  fieldName: string;
  fieldValue: string;
  detectedField: DetectedField;
  options?: Record<string, any>;
}

export const URLPreview: React.FC<URLPreviewProps> = ({
  fieldValue
}) => {
  const [copied, setCopied] = useState(false);
  const [urlInfo, setUrlInfo] = useState<{
    hostname: string;
    protocol: string;
    isSecure: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const url = new URL(fieldValue);
      setUrlInfo({
        hostname: url.hostname,
        protocol: url.protocol,
        isSecure: url.protocol === 'https:'
      });
    } catch {
      setUrlInfo(null);
    }
  }, [fieldValue]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fieldValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleOpen = () => {
    window.open(fieldValue, '_blank', 'noopener,noreferrer');
  };

  const truncateUrl = (url: string, maxLength = 60) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <LinkIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" color="text.secondary">
          URL Link
        </Typography>
        {urlInfo && (
          <Chip
            label={urlInfo.isSecure ? 'HTTPS' : 'HTTP'}
            size="small"
            color={urlInfo.isSecure ? 'success' : 'warning'}
            variant="outlined"
          />
        )}
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography
          variant="body2"
          sx={{
            wordBreak: 'break-all',
            color: 'primary.main',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
          onClick={handleOpen}
          title={fieldValue}
        >
          {truncateUrl(fieldValue)}
        </Typography>

        {urlInfo && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Domain: {urlInfo.hostname}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton size="small" onClick={handleOpen} title="Open in new tab">
          <OpenInNew fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy URL'}>
          <ContentCopy fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};