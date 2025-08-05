import React, { useState } from "react";
import {
  User,
  LogIn,
  UserPlus,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Trash2,
  Clock,
  Shield,
} from "lucide-react";
import { useUserStore } from "@/lib/userStore";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";

interface UserAuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: 'login' | 'register';
}

export function UserAuthModal({ isOpen, onOpenChange, defaultMode = 'login' }: UserAuthModalProps) {
  const { theme } = useTheme();
  const { login, register, guestLogin, isLoading, getAllUsers, deleteUser, getUserByUsername } = useUserStore();
  
  const [activeTab, setActiveTab] = useState(defaultMode);
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showUsersList, setShowUsersList] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  const ADMIN_PASSWORD = "1590";

  const resetForm = () => {
    setFormData({ username: "", displayName: "" });
    setError("");
    setSuccess("");
    setShowUsersList(false);
    setAdminPassword("");
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const validateUsername = (username: string): boolean => {
    if (username.length < 3) {
      setError("Username must be at least 3 characters long");
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim()) {
      setError("Username is required");
      return;
    }

    if (!validateUsername(formData.username)) return;
    
    setError("");
    setSuccess("");

    try {
      const success = await login(formData.username);

      if (!success) {
        setError("User not found. Please check your username or register a new account.");
        return;
      }

      setSuccess("Login successful!");
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during login");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim()) {
      setError("Username is required");
      return;
    }

    if (!validateUsername(formData.username)) return;

    // Check if user already exists
    const existingUser = getUserByUsername(formData.username);
    if (existingUser) {
      setError("Username already exists. Please choose a different username.");
      return;
    }
    
    setError("");
    setSuccess("");

    try {
      const success = await register(
        formData.username, 
        formData.displayName.trim() || formData.username
      );

      if (!success) {
        setError("Registration failed. Please try again.");
        return;
      }

      setSuccess("Registration successful! You are now logged in.");
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during registration");
    }
  };

  const handleGuestLogin = async () => {
    setError("");
    setSuccess("");

    try {
      const success = await guestLogin();

      if (!success) {
        setError("Guest login failed. Please try again.");
        return;
      }

      setSuccess("Guest login successful!");
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during guest login");
    }
  };

  const handleShowUsers = () => {
    if (showUsersList) {
      setShowUsersList(false);
      setAdminPassword("");
      return;
    }
    setIsVerifyingPassword(true);
  };

  const verifyAdminPassword = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setShowUsersList(true);
      setIsVerifyingPassword(false);
      setError("");
    } else {
      setError("Incorrect password");
      setAdminPassword("");
    }
  };

  const handleUserSelect = (username: string) => {
    setFormData(prev => ({ ...prev, username }));
    setShowUsersList(false);
    setAdminPassword("");
    setActiveTab('login');
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      const success = deleteUser(userId);
      if (success) {
        setSuccess("User deleted successfully");
      } else {
        setError("Failed to delete user");
      }
    }
  };

  const allUsers = getAllUsers();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            TagEngine Authentication
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
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
            </form>

            <Separator />

            {/* Guest Login */}
            <Button
              variant="outline"
              onClick={handleGuestLogin}
              className="w-full"
              disabled={isLoading}
            >
              <User className="h-4 w-4 mr-2" />
              Continue as Guest
            </Button>

            {/* Show Users Button */}
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShowUsers}
                className="w-full text-xs"
              >
                <Users className="h-3 w-3 mr-2" />
                Show Saved Users
              </Button>

              {/* Password Verification */}
              {isVerifyingPassword && (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="password"
                      placeholder="Enter password (1590)"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={verifyAdminPassword}
                      className="flex-1"
                    >
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsVerifyingPassword(false);
                        setAdminPassword("");
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Users List */}
              {showUsersList && (
                <Card className="border-muted">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Saved Users</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {allUsers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No users found</p>
                    ) : (
                      allUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleUserSelect(user.username)}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{user.username}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {user.lastLogin.toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(user.id);
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Choose a unique username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  3+ characters, letters, numbers, and underscores only
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name (Optional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Your display name"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-background border-r-transparent rounded-full" />
                    Creating Account...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Create Account
                  </div>
                )}
              </Button>
            </form>

            <Card className="border-muted">
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground space-y-2">
                  <p className="font-medium">What you get:</p>
                  <div className="space-y-1">
                    <p>• Personal image gallery with private data</p>
                    <p>• Custom folder management</p>
                    <p>• Personalized tag system</p>
                    <p>• Theme preferences saved</p>
                    <p>• Data persists across sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
      </DialogContent>
    </Dialog>
  );
}
