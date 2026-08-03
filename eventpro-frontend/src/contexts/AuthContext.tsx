import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, UserRole, LoginRequest, SignUpRequest } from "@/types/api";
import { apiService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getUserFacingApiError } from "@/lib/api-errors";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (data: SignUpRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const userData = await apiService.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("accessToken");
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (data: SignUpRequest) => {
    try {
      await apiService.signUp(data);
      toast({
        title: "Success",
        description: "Account created! You can now log in.",
      });
    } catch (error: unknown) {
      toast({
        title: "Sign up failed",
        description: getUserFacingApiError(error, "We couldn't create your account. Please review your information and try again."),
        variant: "destructive",
      });
      throw error;
    }
  };

  const login = async (data: LoginRequest) => {
    try {
      const result = await apiService.login(data);
      localStorage.setItem("accessToken", result.accessToken);
      setUser(result.user);

      toast({
        title: "Welcome back!",
        description: `Logged in as ${result.user.email}`,
      });
    } catch (error: unknown) {
      console.error("Login failed:", error);
      toast({
        title: "Login failed",
        description: getUserFacingApiError(error, "Invalid credentials. Please check your email and password."),
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    apiService.clearCsrfToken();
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
  };

  const refreshUser = async () => {
    try {
      const userData = await apiService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signUp,
        login,
        logout,
        refreshUser,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
