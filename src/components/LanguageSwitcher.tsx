import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FormControl, 
  Select, 
  MenuItem,
  Box,
  Typography
} from '@mui/material';
import { LanguageRounded } from '@mui/icons-material';

interface LanguageSwitcherProps {
  variant?: 'full' | 'compact';
  size?: 'small' | 'medium';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'compact',
  size = 'small' 
}) => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (event: any) => {
    const newLanguage = event.target.value;
    i18n.changeLanguage(newLanguage);
    
    // Update URL parameter to persist language choice
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLanguage);
    window.history.replaceState({}, '', url.toString());
  };

  const languages = [
    { 
      code: 'en', 
      name: 'English', 
      nativeName: 'English',
      flag: '🇺🇸' 
    },
    { 
      code: 'es', 
      name: 'Spanish', 
      nativeName: 'Español',
      flag: '🇪🇸' 
    }
  ];

  if (variant === 'full') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LanguageRounded color="action" />
        <Typography variant="body2" color="text.secondary">
          {t('common.language')}:
        </Typography>
        <FormControl size={size} sx={{ minWidth: 120 }}>
          <Select
            value={i18n.language}
            onChange={handleLanguageChange}
            displayEmpty
            sx={{
              '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }
            }}
          >
            {languages.map((language) => (
              <MenuItem key={language.code} value={language.code}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{language.flag}</span>
                  <span>{language.nativeName}</span>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  }

  // Compact variant
  return (
    <FormControl size={size}>
      <Select
        value={i18n.language}
        onChange={handleLanguageChange}
        displayEmpty
        sx={{
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            paddingY: 0.5
          },
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none'
          }
        }}
      >
        {languages.map((language) => (
          <MenuItem key={language.code} value={language.code}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{language.flag}</span>
              {variant === 'compact' ? (
                <span style={{ fontSize: '0.875rem' }}>
                  {language.code.toUpperCase()}
                </span>
              ) : (
                <span>{language.nativeName}</span>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};