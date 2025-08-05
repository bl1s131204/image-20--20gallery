import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  Grid,
  List,
  Plus,
  Palette,
  HardDrive,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "./ThemeProvider";
import { useAppStore } from "@/lib/store";
import { SortControls } from "./SortControls";
import { GoogleDriveImport } from "./GoogleDriveImport";
import { DataManager } from "./DataManager";
import { AuthModal } from "./AuthModal";
import { UserProfile } from "./UserProfile";
import { useAuthStore } from "@/lib/authStore";
import {
  linkLocalFolder,
  isFileSystemAccessSupported,
  getFileSystemAccessError,
} from "@/lib/localFolderManager";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { toast } from "./ui/use-toast";

export function Header() {
  const { theme, setTheme, themes } = useTheme();
  const {
    searchQuery,
    setSearchQuery,
    showFilters,
    toggleFilters,
    selectedTags,
    folders,
    selectedFolder,
    setSelectedFolder,
    addImages,
    loadUserData,
  } = useAppStore();
  const { user, isAuthenticated } = useAuthStore();

  const [searchFocused, setSearchFocused] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data when authenticated
  useEffect(() => {
    if (user && isAuthenticated) {
      loadUserData(user.id);
    }
  }, [user, isAuthenticated, loadUserData]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      addImages(files);
    }
  };

  const handleLinkLocalFolder = async () => {
    if (!isFileSystemAccessSupported()) {
      toast({
        title: "Cannot Link Folder",
        description: getFileSystemAccessError(),
        variant: "destructive",
      });
      return;
    }

    try {
      const folder = await linkLocalFolder();
      if (folder) {
        toast({
          title: "Folder Linked",
          description: `Successfully linked "${folder.name}" with ${folder.imageCount} images.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to link folder",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-2 sm:px-4">
        <div className="flex h-14 items-center justify-between gap-2">
          {/* Logo - Compact */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">TG</span>
              </div>
              <h1 className="font-bold text-base hidden lg:block">TagEngine</h1>
            </Link>
          </div>

          {/* Search Bar - Compact */}
          <div className="flex-1 max-w-xs sm:max-w-sm mx-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={`pl-7 pr-7 h-8 text-sm transition-all duration-200 ${
                  searchFocused ? "ring-2 ring-primary" : ""
                } ${theme === "neon" ? "border-neon/30" : ""} ${
                  theme === "cyberpunk" ? "border-cyberpunk-pink/30" : ""
                }`}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0 text-xs"
                  onClick={() => setSearchQuery("")}
                >
                  ×
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons - Compact and Responsive */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Primary Actions - Always Visible */}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={toggleFilters}
              className={`h-8 px-2 ${theme === "neon" && showFilters ? "animate-glow" : ""}`}
            >
              <Filter className="h-3 w-3" />
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                  {selectedTags.length}
                </Badge>
              )}
            </Button>

            {/* Compact Menu for Secondary Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <Grid className="h-3 w-3" />
                  <span className="hidden md:inline ml-1 text-xs">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Folder Selection */}
                <DropdownMenuItem onClick={() => setSelectedFolder(null)}>
                  <Grid className="h-4 w-4 mr-2" />
                  All Folders ({folders.length})
                </DropdownMenuItem>
                {folders.slice(0, 3).map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    📁 {folder.name} ({folder.images.length})
                  </DropdownMenuItem>
                ))}

                {/* Theme Options */}
                <DropdownMenuItem>
                  <Palette className="h-4 w-4 mr-2" />
                  Theme: {themes.find(t => t.value === theme)?.label}
                </DropdownMenuItem>

                {/* Import Options */}
                <DropdownMenuItem>
                  <HardDrive className="h-4 w-4 mr-2" />
                  Link Local Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Controls - Compact */}
            <div className="hidden sm:block">
              <SortControls />
            </div>

            {/* Add Images - Essential Action */}
            <Button
              size="sm"
              className="h-8 px-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="h-3 w-3" />
              <span className="hidden lg:inline ml-1 text-xs">Add</span>
            </Button>

            {/* User Profile - Always Visible */}
            <UserProfile />

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onOpenChange={setShowAuthModal}
        defaultMode="login"
      />
    </header>
  );
}
