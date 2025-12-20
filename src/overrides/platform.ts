// Platform barrel — re-exports available to tenant TSX component overrides.
// Import from this file in your Header.tsx / Footer.tsx:
//   import { SessionSlot, useAuth, Box } from './platform';

// Slot components
export { SessionSlot } from '../components/HtmlInjector/slots/SessionSlot';
export { NavSlot } from '../components/HtmlInjector/slots/NavSlot';
export { LanguageSwitcher } from '../components/LanguageSwitcher';

// Auth
export { useAuth } from '../contexts/AuthContext';
export type { User, AuthState } from '../contexts/AuthContext';

// Theme
export { useThemeConfig } from '../contexts/ThemeContext';

// React Router
export { useNavigate, useLocation, Link } from 'react-router-dom';

// i18n
export { useTranslation } from 'react-i18next';

// MUI components
export {
  Box,
  Container,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';

// MUI hooks
export { useTheme, useMediaQuery } from '@mui/material';

// Services
export { workflowService } from '../services/workflowService';
export type { WorkflowDefinition } from '../services/workflowService';
