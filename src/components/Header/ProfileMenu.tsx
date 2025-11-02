import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  Box,
  Typography,
  ListItemIcon,
  ListItemText,
  Badge
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  Person,
  Folder,
  Assignment,
  Settings,
  VerifiedUser
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileMenuProps {
  isMobile?: boolean;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ isMobile = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme() as any;
  const { user, logout, isAuthenticated } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  // Get first letter of name for avatar
  const getInitials = () => {
    if (user.firstName) {
      return `${user.firstName[0]}${user.lastName?.[0] || ''}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || 'U';
  };

  const profileTheme = theme.header?.profile || {};

  return (
    <>
      <IconButton
        onClick={handleClick}
        size={isMobile ? "medium" : "large"}
        sx={{
          ml: isMobile ? 0 : 1,
          p: isMobile ? 0.5 : 1,
        }}
      >
        <Badge
          color="error"
          variant="dot"
          invisible={user.emailVerified !== false}
          overlap="circular"
        >
          {user ? (
            <Avatar
              sx={{
                width: isMobile ? 32 : 40,
                height: isMobile ? 32 : 40,
                bgcolor: profileTheme.avatarBackground || theme.palette.primary.main,
                color: profileTheme.avatarColor || theme.palette.primary.contrastText,
                fontSize: isMobile ? '0.9rem' : '1rem',
              }}
            >
              {getInitials()}
            </Avatar>
          ) : (
            <AccountCircle
              sx={{
                width: isMobile ? 32 : 40,
                height: isMobile ? 32 : 40,
                color: theme.palette.primary.contrastText
              }}
            />
          )}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 240,
            backgroundColor: profileTheme.menuBackground,
            color: profileTheme.menuTextColor,
          }
        }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {user.firstName} {user.lastName}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {user.email}
          </Typography>
          {!user.emailVerified && (
            <Typography variant="caption" sx={{ display: 'block', color: 'warning.main', mt: 0.5 }}>
              <VerifiedUser fontSize="small" sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
              {t('profile.emailNotVerified')}
            </Typography>
          )}
        </Box>

        <Divider sx={{ borderColor: theme.header?.menu?.dividerColor }} />

        {/* Navigation Items */}
        <MenuItem onClick={() => handleNavigate('/profile')}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('navigation.myProfile')}</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleNavigate('/my-entities')}>
          <ListItemIcon>
            <Folder fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('navigation.myEntities')}</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleNavigate('/instances')}>
          <ListItemIcon>
            <Assignment fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('navigation.myInstances')}</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleNavigate('/settings')}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('navigation.settings')}</ListItemText>
        </MenuItem>

        <Divider sx={{ borderColor: theme.header?.menu?.dividerColor }} />

        {/* Logout */}
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('auth.logout')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};