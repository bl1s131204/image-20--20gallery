import React, { useState } from "react";
import { Cloud, Link, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { parseGoogleDriveLink, processImageTags } from "@/lib/tagEngine";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

// Mock Google Drive API response for demonstration
const mockGoogleDriveFiles = [
  {
    id: "1",
    name: "Nature documentary ,, wildlife photography ,, outdoor expedition.jpg",
    mimeType: "image/jpeg",
    size: "1200000",
    thumbnailLink:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=150&h=150&fit=crop",
    webContentLink:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
  },
  {
    id: "2",
    name: "Travel photography ,, cultural exploration ,, world heritage.png",
    mimeType: "image/png",
    size: "890000",
    thumbnailLink:
      "https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?w=150&h=150&fit=crop",
    webContentLink:
      "https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?w=400&h=300&fit=crop",
  },
  {
    id: "3",
    name: "Street photography ,, urban life ,, city moments.jpg",
    mimeType: "image/jpeg",
    size: "1500000",
    thumbnailLink:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=150&h=150&fit=crop",
    webContentLink:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop",
  },
];

export function GoogleDriveImport() {
  const { addImages } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewFiles, setPreviewFiles] = useState<any[]>([]);

  const handleImport = async () => {
    if (!driveUrl.trim()) {
      setError("Please enter a Google Drive folder URL");
      return;
    }

    const folderId = parseGoogleDriveLink(driveUrl);
    if (!folderId) {
      setError(
        "Invalid Google Drive URL. Please make sure the folder is public and the URL is correct.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock: Check if folder is accessible and get files
      const files = mockGoogleDriveFiles;

      if (files.length === 0) {
        setError("No images found in the folder or folder is private");
        setIsLoading(false);
        return;
      }

      // Filter for image files only
      const imageFiles = files.filter(
        (file) =>
          file.mimeType.startsWith("image/") &&
          ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
            file.mimeType,
          ),
      );

      if (imageFiles.length === 0) {
        setError("No supported image files found (JPG, PNG, WebP, GIF)");
        setIsLoading(false);
        return;
      }

      setPreviewFiles(imageFiles);
      setIsLoading(false);
    } catch (err) {
      setError(
        "Failed to access Google Drive folder. Please check the URL and try again.",
      );
      setIsLoading(false);
    }
  };

  const confirmImport = () => {
    // Convert Google Drive files to ImageData format
    const imageFiles = previewFiles.map((file, index) => {
      const imageId = Date.now().toString() + index;
      const { title, rawTags, processedTags } = processImageTags(
        file.name,
        undefined,
        undefined,
        undefined,
        imageId,
      );

      return {
        id: imageId,
        name: file.name,
        title,
        url: file.webContentLink || file.thumbnailLink,
        size: parseInt(file.size),
        type: file.mimeType,
        dateAdded: new Date(),
        tags: processedTags,
        rawTags,
      };
    });

    // Add to store (this would normally use the actual File objects)
    // For demo purposes, we're using the mock data
    addImages(imageFiles as any);

    setSuccess(
      `Successfully imported ${imageFiles.length} images from Google Drive!`,
    );
    setPreviewFiles([]);
    setDriveUrl("");

    // Close dialog after a delay
    setTimeout(() => {
      setIsOpen(false);
      setSuccess(null);
    }, 2000);
  };

  const resetState = () => {
    setDriveUrl("");
    setError(null);
    setSuccess(null);
    setPreviewFiles([]);
    setIsLoading(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Cloud className="h-4 w-4 mr-2" />
          Import from Drive
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Import from Google Drive
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">How to import</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                1. Make sure your Google Drive folder is public (Anyone with the
                link can view)
              </p>
              <p>2. Copy the folder URL from your browser</p>
              <p>3. Paste it below and click Import</p>
            </CardContent>
          </Card>

          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Google Drive Folder URL
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="https://drive.google.com/drive/folders/..."
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                disabled={isLoading}
              />
              <Button
                onClick={handleImport}
                disabled={isLoading || !driveUrl.trim()}
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Preview Files */}
          {previewFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  Found {previewFiles.length} images
                  <Button onClick={confirmImport} size="sm">
                    Import All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                  {previewFiles.map((file) => (
                    <div key={file.id} className="space-y-2">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                          src={file.thumbnailLink}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {file.mimeType.split("/")[1].toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {(parseInt(file.size) / 1024 / 1024).toFixed(1)}MB
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">
                  Accessing Google Drive folder...
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
