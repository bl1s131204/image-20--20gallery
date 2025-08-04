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
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to link folder",
        variant: "destructive",
      });
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
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLinkFolder}
                disabled={isLoading}
                className={`${
                  theme === "neon" ? "hover:shadow-glow-neon" : ""
                } ${
                  theme === "cyberpunk"
                    ? "border-cyberpunk-blue/50 hover:border-cyberpunk-pink"
                    : ""
                }`}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Link Folder
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Link a local folder to access its images</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Folder List */}
      <ScrollArea className="max-h-80">
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewFolder(folder)}
                              disabled={
                                isLoading ||
                                folderStatus[folder.id] === "invalid"
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

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => checkFolderAccess(folder)}
                              disabled={folderStatus[folder.id] === "checking"}
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
                              onClick={() => {
                                setEditingFolder(folder);
                                setNewFolderName(folder.name);
                              }}
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
                              onClick={() => {
                                setDeletingFolder(folder);
                                setShowDeleteDialog(true);
                              }}
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
            <AlertDialogTitle>Unlink Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink "{deletingFolder?.name}"? This
              will remove the folder from your linked folders list, but won't
              delete any files from your computer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unlink
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


    </div>
  );
}
