/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";

import { ApiError, apiFetch } from "@/lib/api";
import type { RegisterData, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyAdminMfa: (challengeId: string, code: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (path: string, options?: RequestInit) => Promise<unknown>;
  refreshUser: () => Promise<void>;
}

interface LoginResult {
  mfaRequired: boolean;
  challengeId?: string;
  message?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function refreshSession(): Promise<boolean> {
  try {
    await apiFetch("/auth/token/refresh/", {
      method: "POST",
      body: JSON.stringify({}),
    });
    return true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const authFetch = useCallback(
    async (path: string, options?: RequestInit): Promise<unknown> => {
      try {
        return await apiFetch(path, options);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const refreshed = await refreshSession();
          if (refreshed) return apiFetch(path, options);
          setUser(null);
        }
        throw error;
      }
    },
    [],
  );

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = (await apiFetch("/auth/session/")) as {
          authenticated: boolean;
          can_refresh: boolean;
        };
        if (session.authenticated) {
          setUser((await apiFetch("/auth/me/")) as User);
        } else if (session.can_refresh && (await refreshSession())) {
          setUser((await apiFetch("/auth/me/")) as User);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = (await apiFetch("/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })) as { requires_mfa?: boolean; challenge_id?: string; detail?: string };
      if (result.requires_mfa && result.challenge_id) {
        return {
          mfaRequired: true,
          challengeId: result.challenge_id,
          message: result.detail,
        };
      }
      setUser((await authFetch("/auth/me/")) as User);
      return { mfaRequired: false };
    },
    [authFetch],
  );

  const verifyAdminMfa = useCallback(
    async (challengeId: string, code: string) => {
      await apiFetch("/auth/token/mfa/", {
        method: "POST",
        body: JSON.stringify({ challenge_id: challengeId, code }),
      });
      setUser((await authFetch("/auth/me/")) as User);
    },
    [authFetch],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      await apiFetch("/auth/register/", {
        method: "POST",
        body: JSON.stringify(data),
      });
      await login(data.email, data.password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {
      // La session locale est fermée même si le serveur est momentanément indisponible.
    } finally {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    setUser((await authFetch("/auth/me/")) as User);
  }, [authFetch]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verifyAdminMfa,
        register,
        logout,
        authFetch,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé sous <AuthProvider>");
  return ctx;
}
