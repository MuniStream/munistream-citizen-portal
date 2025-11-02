import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  SwipeableDrawer,
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Collapse,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Description,
  Assignment,
  ExpandLess,
  ExpandMore,
  Home,
  Close,
  Dashboard,
  Folder,
  AccountTree,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { workflowService } from '../../services/workflowService';
import type { WorkflowDefinition } from '../../types/workflow';

interface NavigationDrawerProps {
  open: boolean;
  onClose: (event: React.KeyboardEvent | React.MouseEvent) => void;
  isMobile?: boolean;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  open,
  onClose,
  isMobile = true,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme() as any;
  const { isAuthenticated } = useAuth();
  const [documentWorkflows, setDocumentWorkflows] = useState<WorkflowDefinition[]>([]);
  const [processWorkflows, setProcessWorkflows] = useState<WorkflowDefinition[]>([]);
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [processesOpen, setProcessesOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const drawerTheme = theme.header?.drawer || {};
  const drawerWidth = drawerTheme.width || 280;

  useEffect(() => {
    if (open) {
      loadWorkflows();
    }
  }, [open]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const [docs, allWorkflows] = await Promise.all([
        workflowService.getDocumentWorkflows(),
        workflowService.getPublicWorkflows()
      ]);

      setDocumentWorkflows(docs);
      // Filter process workflows (non-documents)
      const processes = allWorkflows.filter((w: WorkflowDefinition) =>
        w.workflow_type === 'PROCESS' ||
        (w.workflow_type !== 'DOCUMENT' && !docs.find((d: WorkflowDefinition) => d.id === w.id))
      );
      setProcessWorkflows(processes);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose({} as React.MouseEvent);
  };

  const DrawerComponent = isMobile ? SwipeableDrawer : Drawer;
  const drawerProps: any = isMobile
    ? { onOpen: () => {}, onClose, disableSwipeToOpen: false }
    : { onClose };

  return (
    <DrawerComponent
      anchor="right"
      open={open}
      {...drawerProps}
      PaperProps={{
        sx: {
          width: drawerWidth,
          backgroundColor: drawerTheme.backgroundColor,
          color: drawerTheme.textColor,
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          backgroundColor: drawerTheme.headerBackground || theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {t('navigation.menu')}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'inherit' }}
        >
          <Close />
        </IconButton>
      </Box>

      <Box sx={{ overflow: 'auto', flex: 1 }}>
        {/* Main Navigation */}
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate('/services')}>
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary={t('navigation.home')} />
            </ListItemButton>
          </ListItem>

          {isAuthenticated && (
            <>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleNavigate('/dashboard')}>
                  <ListItemIcon>
                    <Dashboard />
                  </ListItemIcon>
                  <ListItemText primary={t('navigation.dashboard')} />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton onClick={() => handleNavigate('/my-entities')}>
                  <ListItemIcon>
                    <Folder />
                  </ListItemIcon>
                  <ListItemText primary={t('navigation.myEntities')} />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton onClick={() => handleNavigate('/instances')}>
                  <ListItemIcon>
                    <Assignment />
                  </ListItemIcon>
                  <ListItemText primary={t('navigation.myInstances')} />
                </ListItemButton>
              </ListItem>
            </>
          )}
        </List>

        <Divider sx={{ borderColor: theme.header?.menu?.dividerColor }} />

        {/* Process Workflows Section - FIRST */}
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => setProcessesOpen(!processesOpen)}>
              <ListItemIcon>
                <AccountTree />
              </ListItemIcon>
              <ListItemText primary={t('navigation.workflows')} />
              {processWorkflows.length > 0 && (
                <Chip
                  label={processWorkflows.length}
                  size="small"
                  sx={{ mr: 1 }}
                />
              )}
              {processesOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={processesOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {processWorkflows.map((workflow) => (
                <ListItem key={workflow.id} disablePadding>
                  <ListItemButton
                    sx={{
                      pl: 4,
                      '&:hover': {
                        backgroundColor: theme.header?.menu?.hoverColor,
                      }
                    }}
                    onClick={() => handleNavigate(`/services/${workflow.id}`)}
                  >
                    <ListItemText
                      primary={workflow.name}
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              {processWorkflows.length === 0 && !loading && (
                <ListItem>
                  <ListItemText
                    primary={t('workflows.noProcessWorkflows')}
                    sx={{ pl: 2, opacity: 0.6 }}
                  />
                </ListItem>
              )}
            </List>
          </Collapse>
        </List>

        {/* Document Workflows Section - SECOND */}
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => setDocumentsOpen(!documentsOpen)}>
              <ListItemIcon>
                <Description />
              </ListItemIcon>
              <ListItemText primary={t('navigation.documentProcesses')} />
              {documentWorkflows.length > 0 && (
                <Chip
                  label={documentWorkflows.length}
                  size="small"
                  sx={{ mr: 1 }}
                />
              )}
              {documentsOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={documentsOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {documentWorkflows.map((workflow) => (
                <ListItem key={workflow.id} disablePadding>
                  <ListItemButton
                    sx={{
                      pl: 4,
                      '&:hover': {
                        backgroundColor: theme.header?.menu?.hoverColor,
                      }
                    }}
                    onClick={() => handleNavigate(`/services/${workflow.id}`)}
                  >
                    <ListItemText
                      primary={workflow.name}
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              {documentWorkflows.length === 0 && !loading && (
                <ListItem>
                  <ListItemText
                    primary={t('workflows.noDocumentWorkflows')}
                    sx={{ pl: 2, opacity: 0.6 }}
                  />
                </ListItem>
              )}
            </List>
          </Collapse>
        </List>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          borderTop: 1,
          borderColor: theme.header?.menu?.dividerColor,
          p: 2,
          backgroundColor: drawerTheme.sectionBackground,
        }}
      >
        <Typography variant="caption" sx={{ opacity: 0.6 }}>
          © 2024 {t('app.name')}
        </Typography>
      </Box>
    </DrawerComponent>
  );
};