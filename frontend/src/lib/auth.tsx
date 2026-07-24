import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest, clearToken, getStoredToken, storeToken } from "@/lib/api";

export type UserRole = "admin" | "instructor" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  preferences?: Record<string, boolean | string>;
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string, role: UserRole, remember?: boolean) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    role: Exclude<UserRole, "admin">,
  ) => Promise<void>;
  updateUser: (user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
type AuthResponse = { token: string; user: User };

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getStoredToken()) {
      setLoading(false);
      return;
    }
    apiRequest<{ user: User }>("/auth/me")
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const expireSession = () => {
      setUser(null);
      queryClient.removeQueries({ queryKey: ["lms-data"] });
    };
    window.addEventListener("auth-expired", expireSession);
    return () => window.removeEventListener("auth-expired", expireSession);
  }, [queryClient]);

  const login = async (email: string, password: string, role: UserRole, remember = true) => {
    const result = await apiRequest<AuthResponse>("/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });
    storeToken(result.token, remember);
    queryClient.removeQueries({ queryKey: ["lms-data"] });
    setUser(result.user);
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: Exclude<UserRole, "admin">,
  ) => {
    const result = await apiRequest<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    });
    storeToken(result.token, true);
    queryClient.removeQueries({ queryKey: ["lms-data"] });
    setUser(result.user);
  };

  const logout = () => {
    clearToken();
    queryClient.removeQueries({ queryKey: ["lms-data"] });
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    queryClient.invalidateQueries({ queryKey: ["lms-data"] });
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, updateUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be inside AuthProvider");
  return context;
}
