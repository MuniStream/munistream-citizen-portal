import React, { useState } from 'react';
import { Box, Paper, IconButton, CircularProgress, Typography } from '@mui/material';
import { GetApp, ZoomIn, ZoomOut, FullscreenExit, Fullscreen } from '@mui/icons-material';
import type { DetectedField } from '../../../utils/entityFieldDetector';

interface ImageViewerProps {
  entity: any;
  fieldName: string;
  fieldValue: string;
  detectedField: DetectedField;
  options?: Record<string, any>;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  entity,
  fieldName,
  fieldValue,
  detectedField,
  options = {}
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const maxWidth = options.maxWidth || 400;
  const maxHeight = options.maxHeight || 300;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fieldValue;
    link.download = `${entity.entity_id}_${fieldName}.${detectedField.metadata?.fileExtension || 'img'}`;
    link.target = '_blank';
    link.click();
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const toggleFullscreen = () => setFullscreen(prev => !prev);

  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="error">
          Failed to load image: {fieldValue}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 1, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {detectedField.metadata?.fileExtension?.toUpperCase() || 'Image'}
        </Typography>

        <Box>
          <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 0.25}>
            <ZoomOut fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 3}>
            <ZoomIn fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={toggleFullscreen}>
            {fullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
          </IconButton>
          <IconButton size="small" onClick={handleDownload}>
            <GetApp fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'relative',
          overflow: 'auto',
          maxWidth: fullscreen ? '90vw' : maxWidth,
          maxHeight: fullscreen ? '90vh' : maxHeight,
          ...(fullscreen && {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            backgroundColor: 'background.paper',
            boxShadow: 24
          })
        }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}

        <img
          src={fieldValue}
          alt={fieldName}
          style={{
            width: '100%',
            height: 'auto',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease-in-out',
            display: loading ? 'none' : 'block'
          }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      </Box>

      {zoom !== 1 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
          Zoom: {(zoom * 100).toFixed(0)}%
        </Typography>
      )}
    </Paper>
  );
};