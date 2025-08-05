import React, { useState } from "react";
import {
  User,
  Settings,
  LogOut,
  Shield,
  Database,
  Palette,
  Bell,
  ChevronDown,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import { useTheme } from "./ThemeProvider";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "./ui/use-toast";

export function UserProfile() {
  const { theme } = useTheme();
  const { user, logout, updateUser } = useAuthStore();
  const [showSettings, setShowSettings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
  });

  if (!user) return null;

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const handleSaveProfile = () => {
    if (!editForm.displayName.trim()) {
      toast({
        title: "Error",
        description: "Display name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    updateUser({
      displayName: editForm.displayName.trim(),
      email: editForm.email.trim(),
    });

    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile has been updated successfully.",
    });
  };

  const handleCancelEdit = () => {
    setEditForm({
      displayName: user?.displayName || "",
      email: user?.email || "",
    });
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getAccountAge = () => {
    const days = Math.floor(
      (new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return months === 1 ? "1 month ago" : `${months} months ago`;
    }
    
    const years = Math.floor(days / 365);
    return years === 1 ? "1 year ago" : `${years} years ago`;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1 px-2 py-1 h-8"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.avatar} alt={user.displayName} />
            <AvatarFallback className="text-xs">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium truncate max-w-[80px]">
              {user.displayName}
            </p>
          </div>
          <ChevronDown className="h-3 w-3 hidden md:block" />
        </Button>
      </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar} alt={user.displayName} />
                <AvatarFallback>
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Profile Settings
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Shield className="h-4 w-4 mr-2" />
            Privacy & Security
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Database className="h-4 w-4 mr-2" />
            Data Management
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Profile Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar} alt={user.displayName} />
                <AvatarFallback className="text-lg">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.displayName}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Change Photo
                </Button>
              </div>
            </div>

            <Separator />

            {/* Profile Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Profile Information</h3>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveProfile}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  {isEditing ? (
                    <Input
                      id="displayName"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        displayName: e.target.value
                      }))}
                      placeholder="Enter your display name"
                    />
                  ) : (
                    <p className="text-sm py-2 px-3 bg-muted rounded-md">
                      {user.displayName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        email: e.target.value
                      }))}
                      placeholder="Enter your email"
                    />
                  ) : (
                    <p className="text-sm py-2 px-3 bg-muted rounded-md">
                      {user.email}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Username</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm py-2 px-3 bg-muted rounded-md flex-1">
                      @{user.username}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      Fixed
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Account Statistics */}
            <div className="space-y-3">
              <h3 className="font-medium">Account Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Member since</p>
                  <p className="font-medium">{getAccountAge()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last login</p>
                  <p className="font-medium">
                    {user.lastLogin.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-3">
              <h3 className="font-medium">Preferences</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Theme</span>
                  <Badge variant="outline">{user.preferences.theme}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Auto-save</span>
                  <Badge variant={user.preferences.autoSave ? "default" : "secondary"}>
                    {user.preferences.autoSave ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Default View</span>
                  <Badge variant="outline">{user.preferences.defaultView}</Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
