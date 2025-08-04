import React, { useState } from "react";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import { useTheme } from "./ThemeProvider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onOpenChange, defaultMode = 'login' }: AuthModalProps) {
  const { theme } = useTheme();
  const { login, register, isLoading } = useAuthStore();
  
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    displayName: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetForm = () => {
    setFormData({ username: "", email: "", password: "", displayName: "" });
    setError("");
    setSuccess("");
    setShowPassword(false);
  };

  const handleModeSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    resetForm();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(""); // Clear error on input change
  };

  const validateForm = (): boolean => {
    if (mode === 'register') {
      if (!formData.username.trim()) {
        setError("Username is required");
        return false;
      }
      if (formData.username.length < 3) {
        setError("Username must be at least 3 characters");
        return false;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        setError("Username can only contain letters, numbers, and underscores");
        return false;
      }
      if (!formData.email.trim()) {
        setError("Email is required");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError("Invalid email format");
        return false;
      }
      if (!formData.displayName.trim()) {
        setError("Display name is required");
        return false;
      }
    }
    
    if (!formData.username.trim()) {
      setError("Username or email is required");
      return false;
    }
    if (!formData.password.trim()) {
      setError("Password is required");
      return false;
    }
    if (mode === 'register' && formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setError("");
    setSuccess("");

    try {
      let success = false;
      
      if (mode === 'login') {
        success = await login({
          username: formData.username,
          password: formData.password,
        });
        
        if (!success) {
          setError("Invalid username/email or password");
          return;
        }
      } else {
        success = await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
        });
        
        if (!success) {
          setError("Username or email already exists");
          return;
        }
      }

      if (success) {
        setSuccess(mode === 'login' ? "Login successful!" : "Account created successfully!");
        setTimeout(() => {
          onOpenChange(false);
          resetForm();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'login' ? (
              <LogIn className="h-5 w-5" />
            ) : (
              <UserPlus className="h-5 w-5" />
            )}
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username/Email Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {mode === 'login' ? 'Username or Email' : 'Username'}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={mode === 'login' ? 'Enter username or email' : 'Choose a username'}
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="pl-10"
                disabled={isLoading}
                autoComplete={mode === 'login' ? 'username' : 'off'}
              />
            </div>
          </div>

          {/* Email Field (Register only) */}
          {mode === 'register' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          {/* Display Name Field (Register only) */}
          {mode === 'register' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="How should we call you?"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'login' ? 'Enter your password' : 'Create a password (min 6 chars)'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="pl-10 pr-10"
                disabled={isLoading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className={`w-full ${
              theme === "neon" ? "hover:shadow-glow-neon" : ""
            } ${
              theme === "cyberpunk" ? "border-cyberpunk-blue/50 hover:border-cyberpunk-pink" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-background border-r-transparent rounded-full" />
                {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {mode === 'login' ? (
                  <LogIn className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </div>
            )}
          </Button>

          <Separator />

          {/* Mode Switch */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
            </p>
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto font-medium"
              onClick={() => handleModeSwitch(mode === 'login' ? 'register' : 'login')}
              disabled={isLoading}
            >
              {mode === 'login' ? 'Create one here' : 'Sign in instead'}
            </Button>
          </div>

          {/* Demo Users (for testing) */}
          {mode === 'login' && (
            <Card className="border-muted">
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground space-y-2">
                  <p className="font-medium">Demo Accounts:</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>admin / admin123</span>
                      <Badge variant="outline" className="text-xs">Admin</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>demo / demo123</span>
                      <Badge variant="outline" className="text-xs">User</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
