import React, { useState, useEffect } from "react";
import {
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  HardDrive,
  Cloud,
  Folder,
  Image as ImageIcon,
  Tags,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTheme } from "./ThemeProvider";
import {
  loadAppData,
  clearAllAppData,
  saveAppData,
} from "@/lib/storageManager";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { toast } from "./ui/use-toast";

interface StorageStats {
  images: number;
  folders: number;
  tagVariants: number;
  totalSize: string;
  lastSaved: string;
}

export function DataManager() {
  const { theme } = useTheme();
  const {
    images,
    folders,
    tagVariants,
    saveToStorage,
    loadFromStorage,
  } = useAppStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  useEffect(() => {
    if (isOpen) {
      updateStats();
    }
  }, [isOpen, images, folders, tagVariants]);

  const updateStats = async () => {
    try {
      const data = await loadAppData();
      
      // Calculate approximate storage size
      const imageSize = data.images.reduce((acc, img) => acc + (img.size || 0), 0);
      const totalSizeStr = formatBytes(imageSize);
      
      setStorageStats({
        images: data.images.length,
        folders: data.folders.length,
        tagVariants: data.tagVariants.length,
        totalSize: totalSizeStr,
        lastSaved: new Date().toLocaleString(),
      });
    } catch (error) {
      console.error("Failed to load storage stats:", error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      const data = await loadAppData();
      
      // Create export object
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        data: {
          images: data.images,
          folders: data.folders,
          tagVariants: data.tagVariants,
          sessionData: data.sessionData,
        },
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tag-engine-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your gallery data has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);
        
        // Validate import data structure
        if (!importData.data || !importData.data.images || !importData.data.folders) {
          throw new Error("Invalid data format");
        }

        // Import data
        await saveAppData({
          images: importData.data.images,
          folders: importData.data.folders,
          tagVariants: importData.data.tagVariants || [],
          sessionData: importData.data.sessionData,
        });

        // Reload from storage
        await loadFromStorage();
        
        toast({
          title: "Data Imported",
          description: `Successfully imported ${importData.data.images.length} images and ${importData.data.folders.length} folders.`,
        });
        
        updateStats();
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid file format or corrupted data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.readAsText(file);
    event.target.value = ""; // Reset input
  };

  const handleClearAllData = async () => {
    setIsLoading(true);
    try {
      await clearAllAppData();
      await loadFromStorage();
      
      toast({
        title: "Data Cleared",
        description: "All gallery data has been removed.",
      });
      
      setStorageStats(null);
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Clear Failed",
        description: "Failed to clear data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      await saveToStorage();
      await loadFromStorage();
      updateStats();
      
      toast({
        title: "Data Refreshed",
        description: "Gallery data has been reloaded from storage.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFolderTypeIcon = (type: string) => {
    switch (type) {
      case 'local':
        return <HardDrive className="h-4 w-4" />;
      case 'google_drive':
        return <Cloud className="h-4 w-4" />;
      default:
        return <Folder className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Database className="h-4 w-4 mr-2" />
          Data Manager
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Storage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Storage Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {storageStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{storageStats.images}</div>
                    <div className="text-xs text-muted-foreground">Images</div>
                  </div>
                  <div className="text-center">
                    <Folder className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{storageStats.folders}</div>
                    <div className="text-xs text-muted-foreground">Folders</div>
                  </div>
                  <div className="text-center">
                    <Tags className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{storageStats.tagVariants}</div>
                    <div className="text-xs text-muted-foreground">Tag Variants</div>
                  </div>
                  <div className="text-center">
                    <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{storageStats.totalSize}</div>
                    <div className="text-xs text-muted-foreground">Total Size</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-r-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading stats...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Data Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-sm">Images Loaded</span>
                </div>
                <Badge variant="secondary">{images.length}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  <span className="text-sm">Folders Created</span>
                </div>
                <Badge variant="secondary">{folders.length}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  <span className="text-sm">Tag Variants</span>
                </div>
                <Badge variant="secondary">{tagVariants.length}</Badge>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Data Management Actions */}
          <div className="space-y-4">
            <h3 className="font-medium">Data Operations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Export Data */}
              <Button
                onClick={handleExportData}
                disabled={isLoading}
                variant="outline"
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>

              {/* Import Data */}
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                  id="import-data"
                />
                <Button
                  onClick={() => document.getElementById('import-data')?.click()}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </Button>
              </div>

              {/* Refresh Data */}
              <Button
                onClick={handleRefreshData}
                disabled={isLoading}
                variant="outline"
                className="w-full justify-start"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>

              {/* Clear All Data */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <AlertDialogTitle>Clear All Data</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription>
                      This will permanently delete all your images, folders, tags, and settings.
                      This action cannot be undone. Are you sure you want to continue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAllData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear All Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Data Persistence Info */}
          <Card className="border-muted">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">🔄 Auto-Save Enabled</p>
                <p>• All changes are automatically saved to your browser's local storage</p>
                <p>• Data persists across browser sessions and page reloads</p>
                <p>• Export your data regularly as a backup</p>
                <p>• Clearing browser data will remove all stored information</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
