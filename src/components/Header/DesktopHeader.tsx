import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Container,
  Typography,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Description,
  AccountTree,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { HeaderLogo } from './HeaderLogo';
import { ProfileMenu } from './ProfileMenu';
import { LanguageSwitcher } from '../LanguageSwitcher';
import keycloakService from '../../services/keycloak';
import { workflowService } from '../../services/workflowService';
import type { WorkflowDefinition } from '../../types/workflow';

interface DesktopHeaderProps {
  showBackLink?: boolean;
  backLinkTo?: string;
  backLinkText?: string;
  variant?: 'default' | 'detail' | 'catalog';
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  showBackLink = false,
  backLinkTo = '/services',
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme() as any;
  const { isAuthenticated, user } = useAuth();
  const [documentsAnchor, setDocumentsAnchor] = useState<null | HTMLElement>(null);
  const [workflowsAnchor, setWorkflowsAnchor] = useState<null | HTMLElement>(null);
  const [documentWorkflows, setDocumentWorkflows] = useState<WorkflowDefinition[]>([]);
  const [processWorkflows, setProcessWorkflows] = useState<WorkflowDefinition[]>([]);

  const headerTheme = theme.header || {};

  const handleDocumentsOpen = async (event: React.MouseEvent<HTMLElement>) => {
    setDocumentsAnchor(event.currentTarget);
    if (documentWorkflows.length === 0) {
      const docs = await workflowService.getDocumentWorkflows();
      setDocumentWorkflows(docs);
    }
  };

  const handleWorkflowsOpen = async (event: React.MouseEvent<HTMLElement>) => {
    setWorkflowsAnchor(event.currentTarget);
    if (processWorkflows.length === 0) {
      const [docs, allWorkflows] = await Promise.all([
        workflowService.getDocumentWorkflows(),
        workflowService.getPublicWorkflows()
      ]);
      // Filter process workflows (non-documents) - same logic as NavigationDrawer
      const processes = allWorkflows.filter((w: WorkflowDefinition) =>
        w.workflow_type === 'PROCESS' ||
        (w.workflow_type !== 'DOCUMENT' && !docs.find((d: WorkflowDefinition) => d.id === w.id))
      );
      setProcessWorkflows(processes);
    }
  };

  const handleClose = () => {
    setDocumentsAnchor(null);
    setWorkflowsAnchor(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  return (
    <AppBar
      position="sticky"
      elevation={headerTheme.elevation ?? 4}
      sx={{
        backgroundColor: headerTheme.backgroundColor || theme.palette.primary.main,
        color: headerTheme.textColor || theme.palette.primary.contrastText,
        borderBottom: headerTheme.borderBottom,
      }}
    >
      <Container maxWidth={false}>
        <Toolbar
          sx={{
            minHeight: `${headerTheme.height || 64}px !important`,
            display: 'flex',
            justifyContent: 'space-between',
            py: 1
          }}
        >
          {/* Logo/Brand - Left */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HeaderLogo
              variant="desktop"
              showSubtitle={!showBackLink}
              linkTo={showBackLink ? backLinkTo : '/services'}
            />
          </Box>

          {/* Center Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              component={Link}
              to="/services"
              color="inherit"
              sx={{ textTransform: 'none' }}
            >
              {t('navigation.home')}
            </Button>

            {/* Workflows Dropdown - FIRST */}
            <Button
              color="inherit"
              onClick={handleWorkflowsOpen}
              endIcon={<KeyboardArrowDown />}
              startIcon={<AccountTree />}
              sx={{ textTransform: 'none' }}
            >
              {t('navigation.workflows')}
            </Button>

            {/* Documents Dropdown - SECOND */}
            <Button
              color="inherit"
              onClick={handleDocumentsOpen}
              endIcon={<KeyboardArrowDown />}
              startIcon={<Description />}
              sx={{ textTransform: 'none' }}
            >
              {t('navigation.documents')}
            </Button>

            {isAuthenticated && (
              <>
                <Button
                  component={Link}
                  to="/my-entities"
                  color="inherit"
                  sx={{ textTransform: 'none' }}
                >
                  {t('navigation.myEntities')}
                </Button>
                <Button
                  component={Link}
                  to="/instances"
                  color="inherit"
                  sx={{ textTransform: 'none' }}
                >
                  {t('navigation.myInstances')}
                </Button>
              </>
            )}
          </Box>

          {/* Right Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LanguageSwitcher variant="compact" />

            {isAuthenticated ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ textAlign: 'right', mr: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {user?.firstName} {user?.lastName}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {user?.email}
                  </Typography>
                </Box>
                <ProfileMenu isMobile={false} />
              </Box>
            ) : (
              <Button
                onClick={() => keycloakService.login()}
                variant="outlined"
                color="inherit"
              >
                {t('auth.login')}
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>

      {/* Documents Menu */}
      <Menu
        anchorEl={documentsAnchor}
        open={Boolean(documentsAnchor)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            backgroundColor: theme.header?.menu?.backgroundColor,
            color: theme.header?.menu?.textColor,
            minWidth: 250,
            mt: 1
          }
        }}
      >
        {documentWorkflows.map((workflow) => (
          <MenuItem
            key={workflow.id}
            onClick={() => handleNavigate(`/services/${workflow.id}`)}
            sx={{
              '&:hover': {
                backgroundColor: theme.header?.menu?.hoverColor,
              }
            }}
          >
            {workflow.name}
          </MenuItem>
        ))}
        {documentWorkflows.length === 0 && (
          <MenuItem disabled>
            <Typography variant="caption">{t('workflows.noDocumentWorkflows')}</Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Workflows Menu */}
      <Menu
        anchorEl={workflowsAnchor}
        open={Boolean(workflowsAnchor)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            backgroundColor: theme.header?.menu?.backgroundColor,
            color: theme.header?.menu?.textColor,
            minWidth: 250,
            mt: 1
          }
        }}
      >
        {processWorkflows.map((workflow) => (
          <MenuItem
            key={workflow.id}
            onClick={() => handleNavigate(`/services/${workflow.id}`)}
            sx={{
              '&:hover': {
                backgroundColor: theme.header?.menu?.hoverColor,
              }
            }}
          >
            {workflow.name}
          </MenuItem>
        ))}
        {processWorkflows.length === 0 && (
          <MenuItem disabled>
            <Typography variant="caption">{t('workflows.noProcessWorkflows')}</Typography>
          </MenuItem>
        )}
      </Menu>
    </AppBar>
  );
};