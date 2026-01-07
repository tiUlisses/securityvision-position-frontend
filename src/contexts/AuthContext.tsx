// src/contexts/AuthContext.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
  } from "react";
  import { apiGet, apiPost } from "../api/client";
  import { connectMqttClient, disconnectMqttClient } from "../services/mqttClient";
  
  interface AuthUser {
    id: number;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    is_superuser: boolean;
    created_at: string;
    updated_at: string;
  }
  
  interface LoginInput {
    email: string;
    password: string;
  }
  
  interface SignupInput {
    fullName: string;
    email: string;
    password: string;
  }
  
  interface AuthContextValue {
    user: AuthUser | null;
    isLoading: boolean;
    login: (input: LoginInput) => Promise<void>;
    signup: (input: SignupInput) => Promise<void>;
    logout: () => void;
  }
  
  const AuthContext = createContext<AuthContextValue | undefined>(undefined);
  
  const TOKEN_KEY = "svpos_token";
  
  export const AuthProvider: React.FC<{ children: ReactNode }> = ({
    children,
  }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
  
    // Carrega usuário atual se houver token salvo
    useEffect(() => {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem(TOKEN_KEY)
          : null;
  
      if (!token) {
        setIsLoading(false);
        return;
      }
  
      (async () => {
        try {
          const me = await apiGet<AuthUser>("/auth/me");
          setUser(me);
        } catch (err) {
          console.error("Falha ao carregar usuário atual, limpando token:", err);
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(TOKEN_KEY);
          }
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      })();
    }, []);

    useEffect(() => {
      if (user) {
        connectMqttClient();
      } else {
        disconnectMqttClient();
      }
    }, [user]);
  
    const login = async ({ email, password }: LoginInput) => {
      const tokenResp = await apiPost<{ access_token: string; token_type: string }>(
        "/auth/login",
        { email, password }
      );
  
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TOKEN_KEY, tokenResp.access_token);
      }
  
      const me = await apiGet<AuthUser>("/auth/me");
      setUser(me);
    };
  
    const signup = async ({ fullName, email, password }: SignupInput) => {
        await apiPost<AuthUser>("/auth/signup", {
          email,
          full_name: fullName,
          password,
          role: "ADMIN",
          is_active: true,
          is_superuser: true,
        });
      
        await login({ email, password });
      };
  
    const logout = () => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(TOKEN_KEY);
      }
      setUser(null);
    };
  
    const value: AuthContextValue = {
      user,
      isLoading,
      login,
      signup,
      logout,
    };
  
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };
  
  export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
      throw new Error("useAuth must be used within an AuthProvider");
    }
    return ctx;
  }
  
