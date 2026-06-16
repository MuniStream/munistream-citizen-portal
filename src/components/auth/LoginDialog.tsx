import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Button,
  Typography,
  Divider,
  IconButton,
  Link as MuiLink,
} from '@mui/material';
import { Close, Email, AccountBalance, Login as LoginIcon } from '@mui/icons-material';
import keycloakService from '../../services/keycloak';
import type { IdentityProvider } from '../../services/api';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  providers: IdentityProvider[];
  passwordEnabled: boolean;
}

// Icons for well-known identity provider aliases. Unknown providers fall back
// to a generic icon so any configured IdP still renders correctly.
const IDP_ICONS: Record<string, React.ReactNode> = {
  llavemx: <AccountBalance fontSize="small" />,
};

export const LoginDialog: React.FC<LoginDialogProps> = ({
  open,
  onClose,
  providers,
  passwordEnabled,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ pr: 6, pb: 0 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
          {t('auth.loginDialog.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('auth.loginDialog.subtitle')}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12, color: 'text.secondary' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Identity provider buttons */}
          {providers.map((idp) => (
            <Button
              key={idp.alias}
              variant="outlined"
              size="large"
              fullWidth
              startIcon={IDP_ICONS[idp.alias] ?? <LoginIcon fontSize="small" />}
              onClick={() => keycloakService.loginWithIdp(idp.alias)}
              sx={{ textTransform: 'none', justifyContent: 'center', py: 1.2 }}
            >
              {t('auth.loginDialog.continueWith', { provider: idp.displayName })}
            </Button>
          ))}

          {providers.length > 0 && passwordEnabled && (
            <Divider sx={{ my: 0.5, color: 'text.secondary', fontSize: 13 }}>
              {t('auth.loginDialog.or')}
            </Divider>
          )}

          {/* Email / password -> hosted Keycloak login page */}
          {passwordEnabled && (
            <>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<Email fontSize="small" />}
                onClick={() => keycloakService.login()}
                sx={{ textTransform: 'none', py: 1.2 }}
              >
                {t('auth.loginDialog.emailPassword')}
              </Button>

              {/* Footer links (password-based actions) */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                  mt: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {t('auth.loginDialog.noAccount')}{' '}
                  <MuiLink
                    component="button"
                    type="button"
                    underline="hover"
                    onClick={() => keycloakService.register()}
                    sx={{ fontWeight: 600 }}
                  >
                    {t('auth.loginDialog.createAccount')}
                  </MuiLink>
                </Typography>
                <MuiLink
                  component="button"
                  type="button"
                  underline="hover"
                  variant="body2"
                  onClick={() => keycloakService.resetPassword()}
                >
                  {t('auth.loginDialog.forgotPassword')}
                </MuiLink>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
