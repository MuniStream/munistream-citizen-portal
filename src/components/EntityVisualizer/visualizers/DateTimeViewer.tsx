import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Event, Schedule } from '@mui/icons-material';
import { FieldType, type DetectedField } from '../../../utils/entityFieldDetector';

interface DateTimeViewerProps {
  entity: any;
  fieldName: string;
  fieldValue: string;
  detectedField: DetectedField;
  options?: Record<string, any>;
}

export const DateTimeViewer: React.FC<DateTimeViewerProps> = ({
  fieldValue,
  detectedField,
  options = {}
}) => {
  const parseDate = (value: string): Date | null => {
    try {
      return new Date(value);
    } catch {
      return null;
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays === -1) return 'Tomorrow';
    if (diffInDays > 0) return `${diffInDays} days ago`;
    return `In ${Math.abs(diffInDays)} days`;
  };

  const date = parseDate(fieldValue);
  if (!date || isNaN(date.getTime())) {
    return (
      <Typography variant="body2" color="text.secondary">
        Invalid date: {fieldValue}
      </Typography>
    );
  }

  const isDateTime = detectedField.type === FieldType.DATETIME;
  const showRelative = options.showRelative !== false;
  const variant = options.variant || 'default'; // 'default', 'chip', 'detailed'

  if (variant === 'chip') {
    return (
      <Chip
        icon={isDateTime ? <Schedule /> : <Event />}
        label={isDateTime ? formatDateTime(date) : formatDate(date)}
        variant="outlined"
        size="small"
      />
    );
  }

  if (variant === 'detailed') {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          {isDateTime ? <Schedule fontSize="small" /> : <Event fontSize="small" />}
          <Typography variant="body2">
            {isDateTime ? formatDateTime(date) : formatDate(date)}
          </Typography>
        </Box>

        {showRelative && (
          <Typography variant="caption" color="text.secondary">
            {getRelativeTime(date)}
          </Typography>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          ISO: {date.toISOString()}
        </Typography>
      </Box>
    );
  }

  // Default variant
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isDateTime ? <Schedule fontSize="small" /> : <Event fontSize="small" />}
      <Box>
        <Typography variant="body2">
          {isDateTime ? formatDateTime(date) : formatDate(date)}
        </Typography>
        {showRelative && (
          <Typography variant="caption" color="text.secondary">
            {getRelativeTime(date)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};