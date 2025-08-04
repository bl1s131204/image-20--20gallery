import React, { useState, useRef } from "react";
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
  } = useAppStore();

  const [searchFocused, setSearchFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  TG
                </span>
              </div>
              <h1 className="font-bold text-lg hidden sm:block">TagEngine</h1>
            </Link>

            <nav className="hidden md:flex items-center gap-4">
              <Link to="/folders">
                <Button variant="ghost" size="sm">
                  <Grid className="h-4 w-4 mr-2" />
                  Folders
                </Button>
              </Link>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-4">
            <div
              className={`relative transition-all duration-200 ${
                searchFocused ? "scale-105" : ""
              }`}
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search images, tags, folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={`pl-10 transition-all duration-200 ${
                  theme === "neon" ? "shadow-glow" : ""
                } ${theme === "cyberpunk" ? "border-cyberpunk-pink/50" : ""}`}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  ×
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Filter Toggle */}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={toggleFilters}
              className={`transition-all duration-200 ${
                theme === "neon" && showFilters ? "animate-glow" : ""
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Filters</span>
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  {selectedTags.length}
                </Badge>
              )}
            </Button>

            {/* Folder Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Grid className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">
                    {selectedFolder
                      ? folders.find((f) => f.id === selectedFolder)?.name ||
                        "Folder"
                      : "All Folders"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setSelectedFolder(null)}>
                  <Grid className="h-4 w-4 mr-2" />
                  All Folders
                </DropdownMenuItem>
                {folders.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <span className="w-4 h-4 mr-2 flex-shrink-0">📁</span>
                    {folder.name}
                    <Badge variant="secondary" className="ml-auto">
                      {folder.images.length}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {themes.map((themeOption) => (
                  <DropdownMenuItem
                    key={themeOption.value}
                    onClick={() => setTheme(themeOption.value)}
                    className={theme === themeOption.value ? "bg-accent" : ""}
                  >
                    <span className="mr-2">{themeOption.icon}</span>
                    {themeOption.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sorting Controls */}
            <SortControls />

            {/* Google Drive Import */}
            <GoogleDriveImport />

            {/* Data Manager */}
            <DataManager />

            {/* Link Local Folder Button */}
            {isFileSystemAccessSupported() && (
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex"
                onClick={handleLinkLocalFolder}
              >
                <HardDrive className="h-4 w-4 mr-2" />
                Link Folder
              </Button>
            )}

            {/* Authentication Controls */}
            {isAuthenticated ? (
              <>
                {/* Add Images Button (for authenticated users) */}
                <Button
                  size="sm"
                  className="hidden sm:flex"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Images
                </Button>

                {/* User Profile */}
                <UserProfile />
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAuthModal(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}

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
