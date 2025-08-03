import React, { useState } from "react";
import { ArrowLeft, Plus, Edit, Trash2, Heart, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function FolderSelection() {
  const { theme } = useTheme();
  const { folders, images, createFolder, deleteFolder, renameFolder } =
    useAppStore();
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<string | null>(null);

  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolders((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId],
    );
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName("");
      setShowCreateDialog(false);
    }
  };

  const handleRenameFolder = () => {
    if (newFolderName.trim() && renamingFolder) {
      renameFolder(renamingFolder, newFolderName.trim());
      setNewFolderName("");
      setRenamingFolder(null);
      setShowRenameDialog(false);
    }
  };

  const handleDeleteFolder = () => {
    if (deletingFolder) {
      deleteFolder(deletingFolder);
      setSelectedFolders((prev) => prev.filter((id) => id !== deletingFolder));
      setDeletingFolder(null);
      setShowDeleteDialog(false);
    }
  };

  const getFolderPreviewImages = (folderId: string) => {
    const folderImages = images.filter((img) => img.folder === folderId);
    return folderImages.slice(0, 4);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Gallery
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Select Folders</h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Folder
              </Button>

              {selectedFolders.length > 0 && (
                <Button size="sm">
                  <Check className="h-4 w-4 mr-2" />
                  Select {selectedFolders.length} Folder
                  {selectedFolders.length > 1 ? "s" : ""}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Folder Grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {folders.map((folder) => {
            const previewImages = getFolderPreviewImages(folder.id);
            const isSelected = selectedFolders.includes(folder.id);

            return (
              <Card
                key={folder.id}
                className={`group relative cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  isSelected ? "ring-2 ring-primary" : ""
                } ${theme === "neon" && isSelected ? "shadow-glow" : ""} ${
                  theme === "cyberpunk"
                    ? "border-cyberpunk-pink/30 hover:border-cyberpunk-blue"
                    : ""
                }`}
                onClick={() => toggleFolderSelection(folder.id)}
              >
                <CardContent className="p-4">
                  {/* Preview Images */}
                  <div className="aspect-square mb-4 relative overflow-hidden rounded-lg bg-muted">
                    {previewImages.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1 h-full">
                        {previewImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative overflow-hidden rounded"
                          >
                            <img
                              src={img.url}
                              alt={img.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {/* Fill empty slots */}
                        {Array.from({ length: 4 - previewImages.length }).map(
                          (_, index) => (
                            <div
                              key={`empty-${index}`}
                              className="bg-muted/50 rounded"
                            />
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-6xl opacity-50">📁</div>
                      </div>
                    )}

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-2">
                          <Check className="h-6 w-6" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Folder Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {folder.name}
                      </h3>
                      <Badge variant="secondary">{folder.images.length}</Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingFolder(folder.id);
                            setNewFolderName(folder.name);
                            setShowRenameDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingFolder(folder.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement favorite functionality
                        }}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {folders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 opacity-50">📁</div>
            <h3 className="text-lg font-semibold mb-2">No folders yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first folder to organize your images
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Folder
            </Button>
          </div>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="New folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRenameDialog(false)}
              >
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

      {/* Delete Folder Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this folder? This action cannot be
              undone. Images in this folder will not be deleted, but they will
              be moved to "Uncategorized".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
