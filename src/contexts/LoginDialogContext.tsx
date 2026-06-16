import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { LoginDialog } from '../components/auth/LoginDialog';
import keycloakService from '../services/keycloak';
import { getIdentityProviders, type IdentityProvider } from '../services/api';
import tenantConfig from '../config/tenant';

interface LoginDialogContextType {
  openLogin: () => void;
  closeLogin: () => void;
}

const LoginDialogContext = createContext<LoginDialogContextType | undefined>(undefined);

export const useLoginDialog = (): LoginDialogContextType => {
  const context = useContext(LoginDialogContext);
  if (!context) {
    throw new Error('useLoginDialog must be used within LoginDialogProvider');
  }
  return context;
};

// A login option is either the hosted email/password flow or a specific IdP.
export type LoginOption =
  | { type: 'password' }
  | { type: 'idp'; alias: string; displayName: string };

/** Compute the available login options given the configured IdPs. */
export const resolveLoginOptions = (
  providers: IdentityProvider[],
  hidePasswordWithIdp: boolean
): LoginOption[] => {
  const passwordEnabled = !(hidePasswordWithIdp && providers.length > 0);
  const options: LoginOption[] = providers.map((p) => ({
    type: 'idp' as const,
    alias: p.alias,
    displayName: p.displayName,
  }));
  if (passwordEnabled) {
    options.push({ type: 'password' });
  }
  return options;
};

/** Trigger a single login option directly (redirects away). */
export const triggerLoginOption = (option: LoginOption): void => {
  if (option.type === 'idp') {
    keycloakService.loginWithIdp(option.alias);
  } else {
    keycloakService.login();
  }
};

interface LoginDialogProviderProps {
  children: ReactNode;
}

export const LoginDialogProvider: React.FC<LoginDialogProviderProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<IdentityProvider[]>([]);
  const providersLoaded = useRef(false);
  const inFlight = useRef<Promise<IdentityProvider[]> | null>(null);

  const fetchProviders = useCallback((): Promise<IdentityProvider[]> => {
    if (providersLoaded.current) return Promise.resolve(providers);
    if (inFlight.current) return inFlight.current;
    const p = getIdentityProviders()
      .then((list) => {
        providersLoaded.current = true;
        setProviders(list);
        return list;
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = p;
    return p;
  }, [providers]);

  // Prefetch on mount so the decision on click is instant.
  useEffect(() => {
    fetchProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLogin = useCallback(async () => {
    const list = await fetchProviders();
    const options = resolveLoginOptions(list, tenantConfig.hidePasswordWithIdp);

    // Single option: skip the overlay and go straight to that landing page.
    if (options.length === 1) {
      triggerLoginOption(options[0]);
      return;
    }
    // No options should not happen, but fall back to the hosted login.
    if (options.length === 0) {
      keycloakService.login();
      return;
    }
    setOpen(true);
  }, [fetchProviders]);

  const closeLogin = useCallback(() => setOpen(false), []);

  const value = React.useMemo(() => ({ openLogin, closeLogin }), [openLogin, closeLogin]);

  const passwordEnabled = !(tenantConfig.hidePasswordWithIdp && providers.length > 0);

  return (
    <LoginDialogContext.Provider value={value}>
      {children}
      <LoginDialog
        open={open}
        onClose={closeLogin}
        providers={providers}
        passwordEnabled={passwordEnabled}
      />
    </LoginDialogContext.Provider>
  );
};

export default LoginDialogContext;
