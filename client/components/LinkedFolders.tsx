import React, { useState, useEffect } from "react";
import {
  FolderPlus,
  HardDrive,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Image as ImageIcon,
  Lock,
  Unlock,
  MoreVertical,
  Shield,
  AlertOctagon,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useAppStore } from "@/lib/store";
import {
  LinkedFolder,
  linkLocalFolder,
  loadLinkedFolders,
  removeLinkedFolder,
  readFolderImages,
  updateFolderName,
  validateFolderAccess,
  isFileSystemAccessSupported,
  getFileSystemAccessError,
  initializeDatabase,
  getFolderStats,
} from "@/lib/localFolderManager";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { toast } from "./ui/use-toast";

export function LinkedFolders() {
  const { theme } = useTheme();
  const { addImages, images: currentImages, clearImages } = useAppStore();
  const [linkedFolders, setLinkedFolders] = useState<LinkedFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<LinkedFolder | null>(
    null,
  );
  const [editingFolder, setEditingFolder] = useState<LinkedFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState<LinkedFolder | null>(
    null,
  );
  const [folderStatus, setFolderStatus] = useState<
    Record<string, "valid" | "invalid" | "checking">
  >({});
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [pendingFolder, setPendingFolder] = useState<LinkedFolder | null>(null);
  const [folderAction, setFolderAction] = useState<"replace" | "combine">(
    "combine",
  );
  const [showIframeWarning, setShowIframeWarning] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Initialize and load folders
  useEffect(() => {
    const initFolders = async () => {
      try {
        await initializeDatabase();
        const folders = await loadLinkedFolders();
        setLinkedFolders(folders);

        // Check folder access status
        folders.forEach((folder) => checkFolderAccess(folder));
      } catch (error) {
        console.error("Failed to load linked folders:", error);
        toast({
          title: "Error",
          description: "Failed to load linked folders",
          variant: "destructive",
        });
      }
    };

    initFolders();
  }, []);

  const checkFolderAccess = async (folder: LinkedFolder) => {
    setFolderStatus((prev) => ({ ...prev, [folder.id]: "checking" }));

    try {
      const isValid = await validateFolderAccess(folder);
      setFolderStatus((prev) => ({
        ...prev,
        [folder.id]: isValid ? "valid" : "invalid",
      }));
    } catch (error) {
      setFolderStatus((prev) => ({ ...prev, [folder.id]: "invalid" }));
    }
  };

  const handleLinkFolder = async () => {
    if (isLocked) {
      setShowPasswordDialog(true);
      return;
    }

    if (!isFileSystemAccessSupported()) {
      toast({
        title: "Cannot Link Folder",
        description: getFileSystemAccessError(),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newFolder = await linkLocalFolder();
      if (newFolder) {
        setLinkedFolders((prev) => [...prev, newFolder]);
        setFolderStatus((prev) => ({ ...prev, [newFolder.id]: "valid" }));
        toast({
          title: "Folder Linked",
          description: `Successfully linked "${newFolder.name}" with ${newFolder.imageCount} images.`,
        });
      }
    } catch (error) {
      console.error("Failed to link folder:", error);

      // Check if it's a specific iframe security error
      if (error instanceof Error && (
        error.message.includes('Cross origin sub frames') ||
        error.message.includes('must be handling a user gesture') ||
        error.message.includes('not allowed') ||
        error.name === 'SecurityError'
      )) {
        // Show iframe warning for specific security errors
        setShowIframeWarning(true);
      } else {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to link folder",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewFolder = async (folder: LinkedFolder) => {
    // If there are existing images, ask user what to do
    if (currentImages.length > 0) {
      setPendingFolder(folder);
      setShowActionDialog(true);
      return;
    }

    // If no existing images, just load the folder
    await loadFolderImages(folder);
  };

  const loadFolderImages = async (folder: LinkedFolder) => {
    setIsLoading(true);
    try {
      const folderImages = await readFolderImages(folder);

      // Convert to File objects for the addImages function
      const filePromises = folderImages.map(async (img) => {
        const response = await fetch(img.url);
        const blob = await response.blob();
        return new File([blob], img.name, { type: img.type });
      });

      const files = await Promise.all(filePromises);
      addImages(files);

      toast({
        title: "Folder Loaded",
        description: `Loaded ${folderImages.length} images from "${folder.name}"`,
      });
    } catch (error) {
      console.error("Failed to read folder:", error);
      toast({
        title: "Error",
        description:
          "Failed to access folder. The folder may have been moved or permission denied.",
        variant: "destructive",
      });

      // Mark folder as invalid
      setFolderStatus((prev) => ({ ...prev, [folder.id]: "invalid" }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingFolder) return;

    if (folderAction === "replace") {
      clearImages();
    }

    await loadFolderImages(pendingFolder);
    setShowActionDialog(false);
    setPendingFolder(null);
  };

  const handlePasswordSubmit = () => {
    if (password === "1590") {
      setIsLocked(false);
      setShowPasswordDialog(false);
      setPassword("");
      setPasswordError("");
      toast({
        title: "Unlocked",
        description: "Linked folders access granted",
      });
    } else {
      setPasswordError("Incorrect password");
      setPassword("");
    }
  };

  const handleLockToggle = () => {
    if (isLocked) {
      setShowPasswordDialog(true);
    } else {
      setIsLocked(true);
      toast({
        title: "Locked",
        description: "Linked folders access restricted",
      });
    }
  };

  const checkLockAccess = (action: () => void) => {
    if (isLocked) {
      setShowPasswordDialog(true);
    } else {
      action();
    }
  };

  const handleDeletePrivateFolder = (folder: LinkedFolder) => {
    // Allow deletion of private folders without lock check
    setDeletingFolder(folder);
    setShowDeleteDialog(true);
  };

  const handleTogglePrivacy = async (folder: LinkedFolder) => {
    try {
      const updatedFolders = linkedFolders.map(f =>
        f.id === folder.id ? { ...f, isPrivate: !f.isPrivate } : f
      );
      setLinkedFolders(updatedFolders);

      toast({
        title: folder.isPrivate ? "Folder Made Public" : "Folder Made Private",
        description: `"${folder.name}" is now ${folder.isPrivate ? "public" : "private"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change folder privacy",
        variant: "destructive",
      });
    }
  };

  const handleRenameFolder = async () => {
    if (!editingFolder || !newFolderName.trim()) return;

    try {
      await updateFolderName(editingFolder.id, newFolderName.trim());
      setLinkedFolders((prev) =>
        prev.map((folder) =>
          folder.id === editingFolder.id
            ? { ...folder, name: newFolderName.trim() }
            : folder,
        ),
      );
      setEditingFolder(null);
      setNewFolderName("");
      toast({
        title: "Folder Renamed",
        description: `Folder renamed to "${newFolderName.trim()}"`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename folder",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;

    try {
      await removeLinkedFolder(deletingFolder.id);
      setLinkedFolders((prev) =>
        prev.filter((f) => f.id !== deletingFolder.id),
      );
      setFolderStatus((prev) => {
        const newStatus = { ...prev };
        delete newStatus[deletingFolder.id];
        return newStatus;
      });
      toast({
        title: "Folder Unlinked",
        description: `"${deletingFolder.name}" has been removed from linked folders`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove folder",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setDeletingFolder(null);
    }
  };

  const getStatusIcon = (folderId: string) => {
    const status = folderStatus[folderId];
    switch (status) {
      case "valid":
        return <Check className="h-4 w-4 text-green-500" />;
      case "invalid":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "checking":
        return <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Linked Folders</h3>
          {isLocked && (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLockToggle}
                  className={`h-8 w-8 p-0 ${
                    isLocked
                      ? "text-red-500 hover:text-red-600"
                      : "text-green-500 hover:text-green-600"
                  }`}
                >
                  {isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isLocked ? "Unlock folder access" : "Lock folder access"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLinkFolder}
                  disabled={isLoading || isLocked}
                  className={`${
                    theme === "neon" ? "hover:shadow-glow-neon" : ""
                  } ${
                    theme === "cyberpunk"
                      ? "border-cyberpunk-blue/50 hover:border-cyberpunk-pink"
                      : ""
                  } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Link Folder
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isLocked ? "Unlock to link folders" : "Link a local folder to access its images"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Folder List */}
      <ScrollArea className="max-h-80 relative">
        {isLocked && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center">
              <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Folder access is locked
              </p>
              <p className="text-xs text-muted-foreground">
                Click the lock icon to unlock
              </p>
            </div>
          </div>
        )}
        {linkedFolders.length === 0 ? (
          <div className="text-center py-8">
            <HardDrive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              No linked folders
            </p>
            <p className="text-xs text-muted-foreground">
              Link a local folder to access its images directly
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedFolders.map((folder) => (
              <Card
                key={folder.id}
                className={`transition-all duration-200 hover:shadow-md ${
                  theme === "neon"
                    ? "hover:shadow-glow-neon border-neon-primary/20"
                    : ""
                } ${
                  theme === "cyberpunk"
                    ? "border-cyberpunk-pink/20 hover:border-cyberpunk-blue/50"
                    : ""
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {folder.name}
                        </span>
                        {/* Privacy indicator for private folders */}
                        {folder.isPrivate && (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </Badge>
                        )}
                        {getStatusIcon(folder.id)}
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs h-5">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          {folder.imageCount} images
                        </Badge>

                        <Badge variant="secondary" className="text-xs h-5">
                          {folder.dateLinked.toLocaleDateString()}
                        </Badge>
                      </div>

                      {/* Cover Images Preview */}
                      {folder.coverImages.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {folder.coverImages
                            .slice(0, 3)
                            .map((imageName, index) => (
                              <div
                                key={index}
                                className="w-8 h-8 bg-muted rounded flex items-center justify-center"
                              >
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            ))}
                          {folder.coverImages.length > 3 && (
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">
                                +{folder.coverImages.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      {/* Special controls for private folders */}
                      {folder.isPrivate && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleViewFolder(folder)}
                              disabled={isLoading || folderStatus[folder.id] === "invalid"}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Images
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingFolder(folder);
                                setNewFolderName(folder.name);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Rename Folder
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeletePrivateFolder(folder)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Private Folder
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeletePrivateFolder(folder)}
                              className="text-red-700 focus:text-red-700 focus:bg-red-100"
                            >
                              <AlertOctagon className="h-4 w-4 mr-2" />
                              Permanently Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Regular folder controls */}
                      {!folder.isPrivate && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => checkLockAccess(() => handleViewFolder(folder))}
                                disabled={
                                  isLoading ||
                                  folderStatus[folder.id] === "invalid" ||
                                  isLocked
                                }
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Load folder images</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Regular folder controls (only for non-private folders) */}
                      {!folder.isPrivate && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => checkLockAccess(() => checkFolderAccess(folder))}
                                  disabled={folderStatus[folder.id] === "checking" || isLocked}
                                  className="h-8 w-8 p-0"
                                >
                                  <RefreshCw
                                    className={`h-4 w-4 ${
                                      folderStatus[folder.id] === "checking"
                                        ? "animate-spin"
                                        : ""
                                    }`}
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Check folder access</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => checkLockAccess(() => {
                                    setEditingFolder(folder);
                                    setNewFolderName(folder.name);
                                  })}
                                  disabled={isLocked}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Rename folder</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTogglePrivacy(folder)}
                                  disabled={isLocked}
                                  className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                >
                                  <Shield className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Make private</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => checkLockAccess(() => {
                                    setDeletingFolder(folder);
                                    setShowDeleteDialog(true);
                                  })}
                                  disabled={isLocked}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Unlink folder</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Rename Dialog */}
      <Dialog
        open={!!editingFolder}
        onOpenChange={() => setEditingFolder(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingFolder(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleRenameFolder}
                disabled={!newFolderName.trim()}
              >
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              {deletingFolder?.isPrivate ? (
                <AlertOctagon className="h-5 w-5 text-red-600" />
              ) : (
                <Trash2 className="h-5 w-5 text-destructive" />
              )}
              <AlertDialogTitle>
                {deletingFolder?.isPrivate ? "Delete Private Folder" : "Unlink Folder"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              {deletingFolder?.isPrivate ? (
                <>
                  Are you sure you want to permanently delete the private folder "{deletingFolder?.name}"?
                  <br />
                  <br />
                  <span className="text-red-600 font-medium">
                    ⚠️ This action cannot be undone. The folder and all its private content will be removed from the system.
                  </span>
                  <br />
                  <br />
                  Files on your computer will remain safe, but the folder's privacy settings and associations will be lost.
                </>
              ) : (
                <>
                  Are you sure you want to unlink "{deletingFolder?.name}"? This
                  will remove the folder from your linked folders list, but won't
                  delete any files from your computer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className={`${
                deletingFolder?.isPrivate
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }`}
            >
              {deletingFolder?.isPrivate ? "Delete Forever" : "Unlink"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Folder Action Dialog */}
      <AlertDialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load Folder Images</AlertDialogTitle>
            <AlertDialogDescription>
              You currently have {currentImages.length} images loaded. What
              would you like to do with the images from "{pendingFolder?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select
              value={folderAction}
              onValueChange={(value: "replace" | "combine") =>
                setFolderAction(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="combine">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Combine</span>
                    <span className="text-xs text-muted-foreground">
                      Add new images to existing ones
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="replace">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Replace</span>
                    <span className="text-xs text-muted-foreground">
                      Remove current images and add new ones
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFolder(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {folderAction === "replace" ? "Replace Images" : "Add Images"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Iframe Warning Modal */}
      <AlertDialog open={showIframeWarning} onOpenChange={setShowIframeWarning}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <AlertDialogTitle>File Access Restricted</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left">
              Browser security prevents direct folder access in embedded environments.
              <br /><br />
              <strong>Alternative options:</strong>
              <br />• Use drag-and-drop to add images directly
              <br />• Click "Add Images" to upload individual files
              <br />• Open this app in a new tab for full folder access
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Stay Here</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(window.location.href, '_blank');
                setShowIframeWarning(false);
              }}
              className="bg-primary hover:bg-primary/90"
            >
              Open in New Tab
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <DialogTitle>Enter Password</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Enter the password to access linked folders functionality.
              </p>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handlePasswordSubmit();
                  }
                }}
                className={passwordError ? "border-destructive" : ""}
              />
              {passwordError && (
                <p className="text-sm text-destructive mt-1">{passwordError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPassword("");
                  setPasswordError("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handlePasswordSubmit}>
                Unlock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
