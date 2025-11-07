import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

// Individual visualizer components
import { PDFViewer } from './visualizers/PDFViewer';
import { ImageViewer } from './visualizers/ImageViewer';
import { QRCodeDisplay } from './visualizers/QRCodeDisplay';
import { URLPreview } from './visualizers/URLPreview';
import { MapViewer } from './visualizers/MapViewer';
import { DateTimeViewer } from './visualizers/DateTimeViewer';
import { BooleanViewer } from './visualizers/BooleanViewer';
import { TextViewer } from './visualizers/TextViewer';

// Type detection utility
import { detectFieldType, FieldType, type DetectedField } from '../../utils/entityFieldDetector';

export interface EntityFieldVisualizationConfig {
  type: string;
  template?: string;
  options?: Record<string, any>;
}

export interface EntityFieldVisualizerProps {
  entity: any;
  fieldName: string;
  fieldValue: any;
  visualizationConfig?: EntityFieldVisualizationConfig;
  className?: string;
  showLabel?: boolean;
}

export const EntityFieldVisualizer: React.FC<EntityFieldVisualizerProps> = ({
  entity,
  fieldName,
  fieldValue,
  visualizationConfig,
  className,
  showLabel = true
}) => {
  const [detectedField, setDetectedField] = useState<DetectedField | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Use provided config or auto-detect
      let fieldType: FieldType;
      let metadata: any = {};

      if (visualizationConfig) {
        // Use provided visualization config
        fieldType = visualizationConfig.type as FieldType;
        metadata = {
          ...visualizationConfig.options,
          template: visualizationConfig.template
        };
      } else {
        // Auto-detect field type
        const detected = detectFieldType(fieldValue, fieldName);
        fieldType = detected.type;
        metadata = detected.metadata || {};
      }

      setDetectedField({
        type: fieldType,
        value: fieldValue,
        metadata
      });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze field');
      setLoading(false);
    }
  }, [fieldValue, fieldName, visualizationConfig]);

  if (loading) {
    return (
      <Box className={className} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Analyzing field...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 1 }}>
        {error}
      </Alert>
    );
  }

  if (!detectedField) {
    return (
      <Typography variant="body2" color="text.secondary">
        No data to display
      </Typography>
    );
  }

  const renderVisualizer = () => {
    // Handle arrays by rendering each element with its own visualizer
    if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {fieldValue.map((item, index) => (
            <EntityFieldVisualizer
              key={index}
              entity={entity}
              fieldName={`${fieldName}[${index}]`}
              fieldValue={item}
              showLabel={false}
            />
          ))}
        </Box>
      );
    }

    const commonProps = {
      entity,
      fieldName,
      fieldValue,
      detectedField,
      options: detectedField.metadata || {}
    };

    switch (detectedField.type) {
      case FieldType.PDF:
        return <PDFViewer {...commonProps} />;

      case FieldType.IMAGE:
        return <ImageViewer {...commonProps} />;

      case FieldType.QR_DATA:
      case FieldType.SIGNATURE:
        return <QRCodeDisplay {...commonProps} />;

      case FieldType.URL:
        return <URLPreview {...commonProps} />;

      case FieldType.ADDRESS:
        return <MapViewer {...commonProps} />;

      case FieldType.DATE:
      case FieldType.DATETIME:
        return <DateTimeViewer {...commonProps} />;

      case FieldType.BOOLEAN:
        return <BooleanViewer {...commonProps} />;

      case FieldType.DOCUMENT_REFERENCE:
        return <TextViewer {...commonProps} />;

      case FieldType.JSON:
        // For JSON data, we'll let the frontend handle PDF generation
        return <TextViewer {...commonProps} structured={true} />;

      default:
        return <TextViewer {...commonProps} />;
    }
  };

  const formatFieldName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Box className={className}>
      {showLabel && (
        <Typography
          variant="body2"
          component="label"
          sx={{
            fontWeight: 'medium',
            color: 'text.secondary',
            display: 'block',
            mb: 0.5
          }}
        >
          {formatFieldName(fieldName)}
        </Typography>
      )}

      <Box sx={{ mt: showLabel ? 1 : 0 }}>
        {renderVisualizer()}
      </Box>
    </Box>
  );
};