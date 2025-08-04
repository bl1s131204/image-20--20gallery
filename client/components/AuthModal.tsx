import React, { useState } from "react";
import {
  User,
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
  

  const [formData, setFormData] = useState({
    userId: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetForm = () => {
    setFormData({ userId: "" });
    setError("");
    setSuccess("");
  };



  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(""); // Clear error on input change
  };

  const validateForm = (): boolean => {
    if (!formData.userId.trim()) {
      setError("User ID is required");
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
      const success = await login({
        userId: formData.userId,
      });

      if (!success) {
        setError("Invalid User ID. Use '1312yoga' to access the system.");
        return;
      }

      setSuccess("Login successful!");
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Welcome to TagEngine
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User ID Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">User ID</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter User ID: 1312yoga"
                value={formData.userId}
                onChange={(e) => handleInputChange('userId', e.target.value)}
                className="pl-10"
                disabled={isLoading}
                autoComplete="username"
              />
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
                Signing In...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </div>
            )}
          </Button>

          {/* Access Information */}
          <Card className="border-muted">
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground space-y-2">
                <p className="font-medium">Access Instructions:</p>
                <div className="space-y-1">
                  <p>• Use User ID: <strong>1312yoga</strong></p>
                  <p>• No password required</p>
                  <p>• Direct access to your personal gallery</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </DialogContent>
    </Dialog>
  );
}
