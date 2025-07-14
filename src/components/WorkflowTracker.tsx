import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Button,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  PlayCircle,
  Error,
  Refresh,
  Schedule,
  ContentCopy,
  Share
} from '@mui/icons-material';
import { workflowService, type WorkflowInstanceProgress } from '../services/workflowService';

interface WorkflowTrackerProps {
  instanceId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const WorkflowTracker: React.FC<WorkflowTrackerProps> = ({
  instanceId,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<WorkflowInstanceProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchProgress = async () => {
    try {
      setError(null);
      const progressData = await workflowService.trackWorkflowInstance(instanceId);
      setProgress(progressData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [instanceId]);

  useEffect(() => {
    if (!autoRefresh || !progress) return;

    const interval = setInterval(fetchProgress, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, progress]);

  const handleRefresh = () => {
    setLoading(true);
    fetchProgress();
  };

  const handleCopyInstanceId = () => {
    navigator.clipboard.writeText(instanceId);
    // Could add a toast notification here
  };

  const handleShare = () => {
    const url = `${window.location.origin}/track/${instanceId}`;
    navigator.clipboard.writeText(url);
    // Could add a toast notification here
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'running': return 'primary';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />;
      case 'in_progress': return <PlayCircle color="primary" />;
      case 'failed': return <Error color="error" />;
      default: return <RadioButtonUnchecked color="disabled" />;
    }
  };

  if (loading && !progress) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" py={4}>
            <LinearProgress sx={{ width: '100%' }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error && !progress) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <Button onClick={handleRefresh} size="small">
              {t('common.retry')}
            </Button>
          }>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            {t('workflow.no_progress_data')}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="between" alignItems="start" mb={3}>
          <Box flex={1}>
            <Typography variant="h6" gutterBottom>
              {progress.workflow_name}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Chip 
                label={t(`status.${progress.status}`)} 
                color={getStatusColor(progress.status)}
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                {t('workflow.instance_id')}: {instanceId.slice(0, 8)}...
              </Typography>
              <Tooltip title={t('common.copy')}>
                <IconButton size="small" onClick={handleCopyInstanceId}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.share')}>
                <IconButton size="small" onClick={handleShare}>
                  <Share fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="text.secondary">
              {t('workflow.last_updated')}: {lastUpdated.toLocaleTimeString()}
            </Typography>
            <Tooltip title={t('common.refresh')}>
              <IconButton size="small" onClick={handleRefresh} disabled={loading}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box mb={3}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={1}>
            <Typography variant="body2" fontWeight="medium">
              {t('workflow.progress')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress.completed_steps} / {progress.total_steps} {t('common.steps')}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress.progress_percentage} 
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary" mt={0.5}>
            {progress.progress_percentage.toFixed(1)}% {t('workflow.complete')}
          </Typography>
        </Box>

        <Divider />

        {/* Timeline */}
        <Box mt={3}>
          <Typography variant="subtitle1" gutterBottom>
            {t('workflow.step_progress')}
          </Typography>
          
          <Stepper orientation="vertical">
            {progress.step_progress.map((step, index) => (
              <Step key={step.step_id} active={step.status === 'in_progress'} completed={step.status === 'completed'}>
                <StepLabel 
                  icon={getStepIcon(step.status)}
                  error={step.status === 'failed'}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {step.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {step.description}
                    </Typography>
                  </Box>
                </StepLabel>
                
                <StepContent>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                    <Box display="flex" gap={2} alignItems="center">
                      <Chip 
                        label={t(`status.${step.status}`)} 
                        size="small"
                        color={getStatusColor(step.status)}
                        variant="outlined"
                      />
                      
                      {step.started_at && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Schedule fontSize="small" color="disabled" />
                          <Typography variant="caption" color="text.secondary">
                            {t('workflow.started')}: {new Date(step.started_at).toLocaleString()}
                          </Typography>
                        </Box>
                      )}
                      
                      {step.completed_at && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <CheckCircle fontSize="small" color="success" />
                          <Typography variant="caption" color="text.secondary">
                            {t('workflow.completed')}: {new Date(step.completed_at).toLocaleString()}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Footer Info */}
        <Box mt={3}>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              {progress.message}
            </Typography>
          </Alert>
          
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            {t('workflow.created')}: {new Date(progress.created_at).toLocaleString()}
            {progress.completed_at && (
              <span> • {t('workflow.completed')}: {new Date(progress.completed_at).toLocaleString()}</span>
            )}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};