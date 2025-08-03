import React from 'react';
import { X, Hash, Folder, Calendar, FileType, HardDrive } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useTheme } from './ThemeProvider';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function FilterSidebar() {
  const { theme } = useTheme();
  const {
    showFilters,
    toggleFilters,
    tagVariants,
    selectedTags,
    toggleTag,
    folders,
    selectedFolder,
    setSelectedFolder,
    images
  } = useAppStore();

  if (!showFilters) return null;

  const fileTypes = [...new Set(images.map(img => img.type).filter(Boolean))];
  const totalImages = images.length;

  return (
    <div className={`fixed inset-y-0 right-0 z-40 w-80 bg-background border-l transform transition-transform duration-300 ease-in-out ${
      showFilters ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Filters
          </h2>
          <Button variant="ghost" size="sm" onClick={toggleFilters}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className={theme === 'neon' ? 'border-neon/30' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Images</span>
                  <Badge variant="secondary">{totalImages}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unique Tags</span>
                  <Badge variant="secondary">{tagVariants.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Folders</span>
                  <Badge variant="secondary">{folders.length}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Folders Filter */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Folders
              </h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <Checkbox
                    checked={selectedFolder === null}
                    onCheckedChange={() => setSelectedFolder(null)}
                  />
                  <span className="text-sm group-hover:text-primary transition-colors">
                    All Folders
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    {totalImages}
                  </Badge>
                </label>
                {folders.map(folder => (
                  <label key={folder.id} className="flex items-center space-x-2 cursor-pointer group">
                    <Checkbox
                      checked={selectedFolder === folder.id}
                      onCheckedChange={() => 
                        setSelectedFolder(selectedFolder === folder.id ? null : folder.id)
                      }
                    />
                    <span className="text-sm group-hover:text-primary transition-colors truncate">
                      {folder.name}
                    </span>
                    <Badge variant="outline" className="ml-auto">
                      {folder.images.length}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Tags Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Tags
                </h3>
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectedTags.forEach(tag => toggleTag(tag))}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tagVariants.slice(0, 50).map(tagVariant => (
                  <label 
                    key={tagVariant.canonical} 
                    className="flex items-center space-x-2 cursor-pointer group"
                  >
                    <Checkbox
                      checked={selectedTags.includes(tagVariant.canonical)}
                      onCheckedChange={() => toggleTag(tagVariant.canonical)}
                    />
                    <span className={`text-sm group-hover:text-primary transition-colors truncate ${
                      theme === 'cyberpunk' && selectedTags.includes(tagVariant.canonical) 
                        ? 'text-cyberpunk-pink' 
                        : ''
                    }`}>
                      {tagVariant.canonical}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`ml-auto ${
                        theme === 'neon' && selectedTags.includes(tagVariant.canonical)
                          ? 'border-neon text-neon'
                          : ''
                      }`}
                    >
                      {tagVariant.count}
                    </Badge>
                  </label>
                ))}
                {tagVariants.length > 50 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    ... and {tagVariants.length - 50} more tags
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* File Types */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <FileType className="h-4 w-4" />
                File Types
              </h3>
              <div className="space-y-2">
                {fileTypes.map(type => {
                  const count = images.filter(img => img.type === type).length;
                  return (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {type?.split('/')[1]?.toUpperCase() || 'Unknown'}
                      </span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
