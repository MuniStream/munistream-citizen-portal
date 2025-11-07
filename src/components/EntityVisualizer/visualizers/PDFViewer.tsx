import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, CircularProgress } from '@mui/material';
import { GetApp, OpenInNew, PictureAsPdf } from '@mui/icons-material';
import { Document, Page, pdfjs } from 'react-pdf';
import type { DetectedField } from '../../../utils/entityFieldDetector';
import api from '../../../services/api';

// TODO: Fix CSS imports for react-pdf
// import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
// import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker to use local version
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

interface PDFViewerProps {
  entity: any;
  fieldName: string;
  fieldValue: string;
  detectedField: DetectedField;
  options?: Record<string, any>;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  entity,
  fieldName,
  fieldValue
}) => {
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);

  useEffect(() => {
    const fetchPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        const encodedFileUrl = encodeURIComponent(fieldValue);
        const response = await api.get(
          `/entities/${entity.entity_id}/files/fetch?file_url=${encodedFileUrl}`,
          { responseType: 'blob' }
        );

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfData(url);
      } catch (err) {
        console.error('Failed to fetch PDF:', err);
        setError('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    if (fieldValue && entity.entity_id) {
      fetchPDF();
    }

    return () => {
      if (pdfData) {
        URL.revokeObjectURL(pdfData);
      }
    };
  }, [fieldValue, entity.entity_id]);

  const handleDownload = async () => {
    if (pdfData) {
      const link = document.createElement('a');
      link.href = pdfData;
      link.download = `${entity.entity_id}_${fieldName}.pdf`;
      link.click();
    }
  };

  const handleOpen = () => {
    if (pdfData) {
      window.open(pdfData, '_blank');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const filename = fieldValue.startsWith('http')
    ? new URL(fieldValue).pathname.split('/').pop()
    : fieldValue;

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Loading PDF...
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
        <PictureAsPdf color="error" sx={{ fontSize: 48 }} />
        <Typography variant="subtitle2" color="error" gutterBottom>
          PDF Error
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          PDF Document
        </Typography>
        <Box>
          <IconButton onClick={handleOpen} title="Open PDF" size="small">
            <OpenInNew />
          </IconButton>
          <IconButton onClick={handleDownload} title="Download PDF" size="small">
            <GetApp />
          </IconButton>
        </Box>
      </Box>

      <Typography variant="body2" color="text.primary" sx={{ mb: 2, wordBreak: 'break-all' }}>
        {filename}
      </Typography>

      <Box sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        maxHeight: 400,
        display: 'flex',
        justifyContent: 'center'
      }}>
        {pdfData && (
          <Document
            file={pdfData}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<CircularProgress />}
          >
            <Page pageNumber={1} width={300} />
          </Document>
        )}
      </Box>

      {numPages > 1 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
          Page 1 of {numPages}
        </Typography>
      )}
    </Paper>
  );
};