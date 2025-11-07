import React, { useState } from 'react';
import { Box, Typography, IconButton, Collapse, Paper } from '@mui/material';
import { ExpandMore, ExpandLess, ContentCopy, GetApp } from '@mui/icons-material';
import type { DetectedField } from '../../../utils/entityFieldDetector';

interface TextViewerProps {
  entity: any;
  fieldName: string;
  fieldValue: any;
  detectedField: DetectedField;
  options?: Record<string, any>;
  structured?: boolean;
}

export const TextViewer: React.FC<TextViewerProps> = ({
  entity,
  fieldName,
  fieldValue,
  structured = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '-';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  };

  const handleCopy = async () => {
    try {
      const textToCopy = formatValue(fieldValue);
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const content = formatValue(fieldValue);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity.entity_id}_${fieldName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formattedValue = formatValue(fieldValue);
  const isLongText = formattedValue.length > 200;
  const isMultiline = formattedValue.includes('\n') || structured;

  if (structured && typeof fieldValue === 'object') {
    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Structured Data
          </Typography>
          <Box>
            <IconButton size="small" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
              <ContentCopy fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleDownload} title="Download as JSON">
              <GetApp fontSize="small" />
            </IconButton>
            {isLongText && (
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </Box>
        </Box>

        <Collapse in={!isLongText || expanded}>
          <Box
            component="pre"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              backgroundColor: 'grey.50',
              p: 1,
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: 400,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {formattedValue}
          </Box>
        </Collapse>

        {isLongText && !expanded && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {formattedValue.slice(0, 200)}...
          </Typography>
        )}
      </Paper>
    );
  }

  // Simple text display
  if (isMultiline || isLongText) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton size="small" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
            <ContentCopy fontSize="small" />
          </IconButton>
          {isLongText && (
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>

        <Collapse in={!isLongText || expanded}>
          <Typography
            variant="body2"
            component="div"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: isMultiline ? 'monospace' : 'inherit'
            }}
          >
            {formattedValue}
          </Typography>
        </Collapse>

        {isLongText && !expanded && (
          <Typography variant="body2" color="text.secondary">
            {formattedValue.slice(0, 200)}...
          </Typography>
        )}
      </Box>
    );
  }

  // Single line text
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2">
        {formattedValue}
      </Typography>
      <IconButton size="small" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
        <ContentCopy fontSize="small" />
      </IconButton>
    </Box>
  );
};