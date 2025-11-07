import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './StepInfoContainer.css';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Description as DocumentIcon,
  ArrowForward as ArrowIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface EntityRequirement {
  instructions?: string;
  workflow_id?: string;
  display_name?: string;
  description?: string;
}

interface StepInfoContainerProps {
  title?: string;
  entityRequirements?: EntityRequirement[];
  className?: string;
  children?: React.ReactNode;
}

export const StepInfoContainer: React.FC<StepInfoContainerProps> = ({
  title,
  entityRequirements = [],
  className = '',
  children
}) => {
  const { t } = useTranslation();

  if (!entityRequirements.length && !children) {
    return null;
  }

  return (
    <Paper
      elevation={1}
      className={`step-info-container ${className}`}
      sx={{
        p: 2,
        mb: 2,
        borderLeft: '4px solid',
        borderLeftColor: 'primary.main',
        bgcolor: 'grey.50'
      }}
    >
      {title && (
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" />
          {title}
        </Typography>
      )}

      {entityRequirements.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            {t('workflows.requirements')}:
          </Typography>

          <List dense>
            {entityRequirements.map((req, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon>
                  <DocumentIcon color="action" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={req.display_name || 'Documento requerido'}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                      {req.workflow_id && (
                        <Button
                          component={Link}
                          to={`/services/${req.workflow_id}`}
                          size="small"
                          variant="outlined"
                          endIcon={<ArrowIcon />}
                          sx={{ ml: 1 }}
                        >
                          Obtener documento
                        </Button>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      {req.instructions && (
                        <Typography variant="body2" color="text.secondary">
                          {req.instructions}
                        </Typography>
                      )}
                      {req.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {req.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {children && (
        <Box sx={{ mt: entityRequirements.length > 0 ? 2 : 0 }}>
          {children}
        </Box>
      )}
    </Paper>
  );
};

export default StepInfoContainer;