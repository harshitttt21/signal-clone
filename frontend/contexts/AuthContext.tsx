"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api, UserOut } from "@/lib/api";
import { socketClient } from "@/lib/socket";

interface AuthContextValue {
  user: UserOut | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, user: UserOut) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("signal_token");
    const storedUser = localStorage.getItem("signal_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      socketClient.connect(storedToken);
    }
    setLoading(false);
  }, []);

  const setSession = (newToken: string, newUser: UserOut) => {
    localStorage.setItem("signal_token", newToken);
    localStorage.setItem("signal_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    socketClient.connect(newToken);
  };

  const logout = () => {
    localStorage.removeItem("signal_token");
    localStorage.removeItem("signal_user");
    socketClient.disconnect();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
