import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Download, Trash2, FolderPlus, Eye, Heart, Brain, X, Maximize, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useTheme } from './ThemeProvider';
import { ImageData } from '@/lib/tagEngine';
import { AITagSuggestions } from './AITagSuggestions';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface ImageCardProps {
  image: ImageData;
  onView: (image: ImageData) => void;
  onFullscreen: (image: ImageData) => void;
}

function ImageCard({ image, onView, onFullscreen }: ImageCardProps) {
  const { theme } = useTheme();
  const { removeImage, folders, addImageToFolder } = useAppStore();
  const [isHovered, setIsHovered] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-300 cursor-pointer ${
        isHovered ? 'animate-bounce-soft' : ''
      } ${
        theme === 'neon' ? 'hover:shadow-glow' : 'hover:shadow-lg'
      } ${
        theme === 'cyberpunk' ? 'border-cyberpunk-pink/30 hover:border-cyberpunk-blue' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          onFullscreen(image);
        } else {
          onView(image);
        }
      }}
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        <img
          src={image.url}
          alt={image.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Overlay */}
        <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 ${
          theme === 'neon' ? 'group-hover:bg-neon/10' : ''
        }`} />
        
        {/* Actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onView(image)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFullscreen(image)}>
                <Maximize className="h-4 w-4 mr-2" />
                Full Screen
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {folders.map(folder => (
                <DropdownMenuItem 
                  key={folder.id}
                  onClick={() => addImageToFolder(image.id, folder.id)}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add to {folder.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => removeImage(image.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 left-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement favorite functionality
          }}
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>
      
      <CardContent className="p-3">
        {/* Image Title */}
        <h3 className="font-medium text-sm truncate mb-2 group-hover:text-primary transition-colors">
          {image.title || image.name}
        </h3>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {image.tags.slice(0, 3).map(tag => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className={`text-xs ${
                theme === 'neon' ? 'border-neon/30 text-neon' : ''
              } ${
                theme === 'cyberpunk' ? 'border-cyberpunk-pink/30 text-cyberpunk-pink' : ''
              }`}
            >
              {tag}
            </Badge>
          ))}
          {image.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{image.tags.length - 3}
            </Badge>
          )}
        </div>
        
        {/* File Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{image.type?.split('/')[1]?.toUpperCase()}</span>
          {image.size && (
            <span>{formatFileSize(image.size)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ImageGrid() {
  const { theme } = useTheme();
  const { getFilteredImages, addImages } = useAppStore();
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<ImageData | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const images = getFilteredImages();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      addImages(files);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      addImages(files);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  if (images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div 
          className={`text-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 hover:border-primary ${
            theme === 'neon' ? 'border-neon/30 hover:border-neon' : ''
          } ${
            theme === 'cyberpunk' ? 'border-cyberpunk-pink/30 hover:border-cyberpunk-pink' : ''
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <FolderPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">No images here yet</h3>
              <p className="text-muted-foreground text-sm">
                Drag and drop images here, or click to browse
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Supports JPG, PNG, WebP, and GIF
              </p>
            </div>
          </div>
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
    );
  }

  return (
    <>
      <div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {images.map((image, index) => (
          <ImageCard
            key={image.id}
            image={image}
            onView={setSelectedImage}
            onFullscreen={(img) => {
              setFullscreenImage(img);
              setCurrentImageIndex(index);
            }}
          />
        ))}
      </div>

      {/* Hidden file input for additional uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Full Screen Image Viewer */}
      {fullscreenImage && (
        <FullScreenImageViewer
          image={fullscreenImage}
          images={images}
          currentIndex={currentImageIndex}
          onClose={() => setFullscreenImage(null)}
          onNavigate={(index) => {
            setCurrentImageIndex(index);
            setFullscreenImage(images[index]);
          }}
        />
      )}

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedImage.name}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.name}
                    className="w-full h-auto max-h-96 object-contain rounded-lg"
                  />
                </div>
                <div className="lg:w-80 space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Title</h4>
                    <p className="text-sm mb-4">{selectedImage.title || selectedImage.name}</p>

                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedImage.tags.map(tag => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                      {selectedImage.tags.length === 0 && (
                        <span className="text-sm text-muted-foreground">No tags yet</span>
                      )}
                    </div>
                  </div>

                  {/* AI Tag Suggestions */}
                  <AITagSuggestions
                    imageId={selectedImage.id}
                    filename={selectedImage.name}
                    currentTags={selectedImage.tags}
                    onAddTag={(tag) => {
                      console.log(`Adding tag "${tag}" to image ${selectedImage.id}`);
                      // TODO: Implement tag addition to store
                    }}
                  />

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Details</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>Type: {selectedImage.type}</div>
                      {selectedImage.size && (
                        <div>Size: {(selectedImage.size / 1024 / 1024).toFixed(2)} MB</div>
                      )}
                      {selectedImage.dateAdded && (
                        <div>Added: {selectedImage.dateAdded.toLocaleDateString()}</div>
                      )}
                      <div>Raw Sources: {selectedImage.rawTags.length} tag sources</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
