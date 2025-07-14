import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  PlayArrow,
  Schedule,
  Assignment,
  CheckCircle,
  Info
} from '@mui/icons-material';
import type { WorkflowDefinition } from '../types/workflow';
import { workflowService, type WorkflowInstance } from '../services/workflowService';

interface WorkflowStartProps {
  workflow: WorkflowDefinition;
  open: boolean;
  onClose: () => void;
  onStarted: (instance: WorkflowInstance) => void;
}

export const WorkflowStart: React.FC<WorkflowStartProps> = ({
  workflow,
  open,
  onClose,
  onStarted
}) => {
  const { t } = useTranslation();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartWorkflow = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const instance = await workflowService.startWorkflow(workflow.id);
      onStarted(instance);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start workflow');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PlayArrow color="primary" />
          <Typography variant="h6">
            {t('workflow.start_title')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box space={3}>
          {/* Workflow Overview */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {workflow.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {workflow.description}
            </Typography>
            
            <Box display="flex" gap={1} mt={2}>
              <Chip 
                label={workflow.category} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                icon={<Schedule />}
                label={workflow.estimatedDuration} 
                size="small" 
                variant="outlined" 
              />
            </Box>
          </Box>

          <Divider />

          {/* Requirements */}
          <Box>
            <Typography variant="subtitle1" gutterBottom display="flex" alignItems="center" gap={1}>
              <Assignment />
              {t('workflow.requirements')}
            </Typography>
            <List dense>
              {workflow.requirements.map((requirement, index) => (
                <ListItem key={index} disableGutters>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={requirement}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider />

          {/* Process Steps Preview */}
          <Box>
            <Typography variant="subtitle1" gutterBottom display="flex" alignItems="center" gap={1}>
              <Info />
              {t('workflow.process_steps')} ({workflow.steps.length} {t('common.steps')})
            </Typography>
            <List dense>
              {workflow.steps.slice(0, 5).map((step, index) => (
                <ListItem key={step.id} disableGutters>
                  <ListItemIcon>
                    <Typography variant="caption" color="primary" fontWeight="bold">
                      {index + 1}
                    </Typography>
                  </ListItemIcon>
                  <ListItemText 
                    primary={step.name}
                    secondary={step.description}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Chip 
                    label={step.estimatedDuration} 
                    size="small" 
                    variant="outlined"
                  />
                </ListItem>
              ))}
              {workflow.steps.length > 5 && (
                <ListItem disableGutters>
                  <ListItemText 
                    primary={`... ${t('workflow.and_more_steps', { count: workflow.steps.length - 5 })}`}
                    primaryTypographyProps={{ variant: 'body2', fontStyle: 'italic' }}
                  />
                </ListItem>
              )}
            </List>
          </Box>

          {/* Important Notice */}
          <Alert severity="info" icon={<Info />}>
            <Typography variant="body2">
              {t('workflow.start_notice')}
            </Typography>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isStarting}>
          {t('common.cancel')}
        </Button>
        <Button 
          onClick={handleStartWorkflow}
          variant="contained"
          startIcon={isStarting ? <CircularProgress size={20} /> : <PlayArrow />}
          disabled={isStarting}
        >
          {isStarting ? t('workflow.starting') : t('workflow.start_process')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};