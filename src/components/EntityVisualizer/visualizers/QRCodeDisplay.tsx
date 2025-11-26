import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, CircularProgress } from '@mui/material';
import { GetApp, ContentCopy } from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import type { DetectedField } from '../../../utils/entityFieldDetector';

interface QRCodeDisplayProps {
  entity: any;
  fieldName: string;
  fieldValue: any;
  detectedField: DetectedField;
  options?: Record<string, any>;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  entity,
  fieldName,
  fieldValue,
  detectedField,
  options = {}
}) => {
  const [qrData, setQrData] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Prepare QR data based on field type
    let dataToEncode: string;

    // Helper function to limit data size for QR codes
    const limitDataSize = (data: any, maxLength: number = 800): any => {
      const dataStr = String(data);
      if (dataStr.length > maxLength) {
        return `${dataStr.substring(0, maxLength)}...`;
      }
      return data;
    };

    if (detectedField.type === 'signature') {
      // For signatures, just include verification URL - don't include full signature
      dataToEncode = `${window.location.origin}/verify/${entity.entity_id}?field=${fieldName}`;
    } else if (detectedField.type === 'qr_data') {
      // Use the value directly but limit size
      dataToEncode = String(limitDataSize(fieldValue));
    } else {
      // For other types, create a verification payload with limited data
      dataToEncode = JSON.stringify({
        type: 'field_verification',
        entity_id: entity.entity_id,
        field: fieldName,
        value: limitDataSize(fieldValue, 300), // Smaller limit for field values
        timestamp: new Date().toISOString()
      });
    }

    setQrData(dataToEncode);
    setLoading(false);
  }, [entity, fieldName, fieldValue, detectedField.type]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy QR data:', err);
    }
  };

  const handleDownload = () => {
    // Get the QR code canvas and convert to image
    const canvas = document.querySelector(`#qr-${fieldName}`) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${entity.entity_id}_${fieldName}_qr.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const qrSize = options.size || 200;
  const showData = options.showData !== false;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Generating QR code...
        </Typography>
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', maxWidth: qrSize + 50 }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {detectedField.type === 'signature' ? 'Signature QR' : 'Verification QR'}
        </Typography>
      </Box>

      <Box sx={{ display: 'inline-block', mb: 2 }}>
        <QRCodeSVG
          id={`qr-${fieldName}`}
          value={qrData}
          size={qrSize}
          level="M"
          includeMargin={true}
          style={{
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 1 }}>
        <IconButton size="small" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy data'}>
          <ContentCopy fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={handleDownload} title="Download QR image">
          <GetApp fontSize="small" />
        </IconButton>
      </Box>

      {showData && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            wordBreak: 'break-all',
            maxWidth: qrSize,
            fontSize: '0.7rem'
          }}
        >
          {qrData.length > 100 ? `${qrData.slice(0, 100)}...` : qrData}
        </Typography>
      )}
    </Paper>
  );
};