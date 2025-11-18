import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  PlayArrow as ContinueIcon,
  Assignment as WorkflowIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { workflowService } from '../services/workflowService';

interface WorkflowInstance {
  instance_id: string;
  workflow_id: string;
  workflow_name?: string;
  status: string;
  current_step?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  progress_percentage?: number;
  context?: Record<string, any>;
}

export const MyInstancesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchInstances = async () => {
    try {
      setError(null);
      const response = await workflowService.getMyInstances();
      setInstances(response.instances || []);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch instances';
      setError(errorMessage);
      console.error('Error fetching instances:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchInstances();
    }
  }, [isAuthenticated]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchInstances();
  };

  const handleViewInstance = (instanceId: string) => {
    navigate(`/instances/${instanceId}`);
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'running': return 'info';
      case 'in_progress': return 'info';
      case 'waiting': return 'warning';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'running': return '🔄';
      case 'in_progress': return '🔄';
      case 'waiting': return '⏸️';
      case 'paused': return '⏸️';
      default: return '⏳';
    }
  };

  const filteredInstances = instances.filter(instance => {
    const matchesSearch = !searchQuery ||
      instance.workflow_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.workflow_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.instance_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || instance.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'all', label: t('status.all') },
    { value: 'running', label: t('status.running') },
    { value: 'completed', label: t('status.completed') },
    { value: 'paused', label: t('status.paused') },
    { value: 'waiting', label: t('status.waiting') },
    { value: 'failed', label: t('status.failed') }
  ];

  if (!isAuthenticated) {
    return (
      <div>
        <Header variant="default" />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="warning">
            {t('auth.loginRequired')}
          </Alert>
        </Container>
      </div>
    );
  }

  return (
    <div>
      <Header variant="default" />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            📋 {t('navigation.myInstances')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('instances.subtitle')}
          </Typography>
        </Box>

        {/* Search and Filter Controls */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
                <Box sx={{ flex: 1, minWidth: { xs: '100%', md: '300px' } }}>
                  <TextField
                    fullWidth
                    placeholder={t('instances.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                    }}
                  />
                </Box>
                <Box sx={{ minWidth: { xs: '100%', md: '200px' } }}>
                  <FormControl fullWidth>
                    <InputLabel>{t('instances.filterByStatus')}</InputLabel>
                    <Select
                      value={statusFilter}
                      label={t('instances.filterByStatus')}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      {statusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: { xs: '100%', md: '150px' } }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('instances.totalInstances', { count: filteredInstances.length })}
                  </Typography>
                </Box>
                <Box sx={{ minWidth: { xs: '100%', md: '120px' } }}>
                  <Button
                    variant="outlined"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                    fullWidth
                  >
                    {t('common.refresh')}
                  </Button>
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary">
                {t('instances.lastRefresh')}: {lastRefresh.toLocaleTimeString()}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && instances.length === 0 && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              {t('common.loading')}...
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
            <Button onClick={handleRefresh} sx={{ ml: 2 }}>
              {t('common.retry')}
            </Button>
          </Alert>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredInstances.length === 0 && instances.length === 0 && (
          <Card>
            <CardContent>
              <Box textAlign="center" py={6}>
                <WorkflowIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('instances.noInstances')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {t('instances.noInstancesDescription')}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate('/services')}
                  startIcon={<WorkflowIcon />}
                >
                  {t('instances.startNewWorkflow')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* No Results from Filter */}
        {!isLoading && !error && filteredInstances.length === 0 && instances.length > 0 && (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('instances.noResults')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('instances.noResultsDescription')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Instances Grid */}
        {!isLoading && filteredInstances.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
            {filteredInstances.map((instance) => (
                <Card
                  key={instance.instance_id}
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: (theme) => theme.shadows[8],
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                  onClick={() => handleViewInstance(instance.instance_id)}
                >
                  <CardContent>
                    {/* Header with Status */}
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" component="h3" sx={{ flexGrow: 1, pr: 1 }}>
                        {instance.workflow_name || instance.workflow_id}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${getStatusIcon(instance.status)} ${t(`status.${instance.status}`)}`}
                        color={getStatusColor(instance.status)}
                        sx={{ minWidth: 100 }}
                      />
                    </Box>

                    {/* Instance ID */}
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('instances.instanceId')}: {instance.instance_id.slice(0, 8)}...
                    </Typography>

                    {/* Current Step */}
                    {instance.current_step && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('instances.currentStep')}: {instance.current_step.replace('_', ' ')}
                      </Typography>
                    )}

                    {/* Progress Bar */}
                    {instance.progress_percentage !== undefined && (
                      <Box sx={{ mt: 2, mb: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body2" color="text.secondary">
                            {t('workflow.progress')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {Math.round(instance.progress_percentage)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={instance.progress_percentage}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Dates */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('workflow.started')}
                        </Typography>
                        <Typography variant="body2">
                          {new Date(instance.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('workflow.lastUpdated')}
                        </Typography>
                        <Typography variant="body2">
                          {new Date(instance.updated_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Action Buttons */}
                    <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
                      <Tooltip title={t('instances.viewDetails')}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewInstance(instance.instance_id);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>

                      {(instance.status === 'waiting' || instance.status === 'paused') && (
                        <Tooltip title={t('instances.continue')}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewInstance(instance.instance_id);
                            }}
                          >
                            <ContinueIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </CardContent>
                </Card>
            ))}
          </Box>
        )}

        {/* Summary Stats */}
        {!isLoading && instances.length > 0 && (
          <Card sx={{ mt: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('instances.summary')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {instances.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('instances.total')}
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {instances.filter(i => i.status === 'completed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('status.completed')}
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {instances.filter(i => ['running', 'in_progress'].includes(i.status)).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('instances.active')}
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {instances.filter(i => ['waiting', 'paused'].includes(i.status)).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('instances.needsAction')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>
    </div>
  );
};