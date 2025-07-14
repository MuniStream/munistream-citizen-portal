import i18n from '../i18n';

/**
 * Get the current locale for API requests
 */
export const getCurrentLocale = (): string => {
  return i18n.language || 'en';
};

/**
 * Add locale parameter to URLSearchParams if not already present
 */
export const addLocaleToParams = (params: URLSearchParams): URLSearchParams => {
  if (!params.has('locale')) {
    params.append('locale', getCurrentLocale());
  }
  return params;
};

/**
 * Create URLSearchParams with locale included
 */
export const createParamsWithLocale = (additionalParams?: Record<string, string>): URLSearchParams => {
  const params = new URLSearchParams();
  params.append('locale', getCurrentLocale());
  
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
  }
  
  return params;
};