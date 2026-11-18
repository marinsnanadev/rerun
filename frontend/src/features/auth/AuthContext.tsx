import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { api, onSessionExpired, type Credentials, type User } from '../../api';

type AuthState =
  | { status: 'loading' }
  /** `expired` is set when a sign-in was lost while the app was open. */
  | { status: 'anonymous'; expired?: boolean }
  | { status: 'authenticated'; user: User };

interface AuthContextValue {
  state: AuthState;
  signIn(credentials: Credentials): Promise<void>;
  signUp(credentials: Credentials): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  // When the server stops recognizing the session, send the person back to the sign-in screen.
  useEffect(
    () =>
      onSessionExpired(() =>
        setState((current) =>
          current.status === 'authenticated' ? { status: 'anonymous', expired: true } : current,
        ),
      ),
    [],
  );

  // Restore the session, if there is one, when the app opens.
  useEffect(() => {
    let active = true;

    api.auth
      .me()
      .then((user) => {
        if (active) setState({ status: 'authenticated', user });
      })
      .catch(() => {
        if (active) setState({ status: 'anonymous' });
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (credentials: Credentials) => {
    const user = await api.auth.login(credentials);
    setState({ status: 'authenticated', user });
  }, []);

  const signUp = useCallback(async (credentials: Credentials) => {
    const user = await api.auth.register(credentials);
    setState({ status: 'authenticated', user });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setState({ status: 'anonymous' });
    }
  }, []);

  const value = useMemo(
    () => ({ state, signIn, signUp, signOut }),
    [state, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return context;
}
