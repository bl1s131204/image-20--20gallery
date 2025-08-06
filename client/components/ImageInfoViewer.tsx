import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  Tag,
} from "lucide-react";
import { ImageData } from "@/lib/tagEngine";
import { useTheme } from "./ThemeProvider";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";

interface ImageInfoViewerProps {
  image: ImageData;
  images: ImageData[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImageInfoViewer({
  image,
  images,
  currentIndex,
  onClose,
  onNavigate,
}: ImageInfoViewerProps) {
  const { theme } = useTheme();
  const [showControls, setShowControls] = useState(true);
  const [hideControlsTimeout, setHideControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(false);

  // Prevent body scroll when viewer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          navigatePrevious();
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          navigateNext();
          break;
        case "i":
        case "I":
          e.preventDefault();
          setShowInfo(prev => !prev);
          break;
        case "+":
        case "=":
          e.preventDefault();
          handleZoomIn();
          break;
        case "-":
          e.preventDefault();
          handleZoomOut();
          break;
        case "0":
          e.preventDefault();
          setZoom(1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  // Auto-hide controls
  useEffect(() => {
    const resetHideTimer = () => {
      if (hideControlsTimeout) {
        clearTimeout(hideControlsTimeout);
      }
      setShowControls(true);
      const timeout = setTimeout(() => setShowControls(false), 4000);
      setHideControlsTimeout(timeout);
    };

    resetHideTimer();
    return () => {
      if (hideControlsTimeout) {
        clearTimeout(hideControlsTimeout);
      }
    };
  }, [currentIndex]);

  const navigatePrevious = () => {
    const nextIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    onNavigate(nextIndex);
    setZoom(1); // Reset zoom when navigating
  };

  const navigateNext = () => {
    const nextIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    onNavigate(nextIndex);
    setZoom(1); // Reset zoom when navigating
  };

  const handleMouseMove = () => {
    if (hideControlsTimeout) {
      clearTimeout(hideControlsTimeout);
    }
    setShowControls(true);
    const timeout = setTimeout(() => setShowControls(false), 4000);
    setHideControlsTimeout(timeout);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    link.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center ${
        theme === "cyberpunk" ? "bg-cyberpunk-dark" : ""
      }`}
      onMouseMove={handleMouseMove}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Main Image Container */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <img
          src={image.url}
          alt={image.title || image.name}
          className="transition-transform duration-300 ease-in-out cursor-grab active:cursor-grabbing"
          style={{ 
            maxWidth: "100vw", 
            maxHeight: "100vh",
            objectFit: "contain",
            transform: `scale(${zoom})`,
            userSelect: "none"
          }}
          onClick={(e) => {
            e.preventDefault();
            if (e.button === 0) { // Left click
              navigateNext();
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            navigatePrevious();
          }}
        />
      </div>

      {/* Top Controls Bar */}
      <div
        className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-4 pointer-events-auto transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-medium truncate max-w-md text-lg">
              {image.title || image.name}
            </h2>
            <div className="text-white/70 text-sm bg-black/40 px-2 py-1 rounded">
              {currentIndex + 1} of {images.length}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              title="Zoom out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-white text-sm min-w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              title="Zoom in (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(1)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              title="Reset zoom (0)"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            {/* Info Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfo(prev => !prev)}
              className={`text-white hover:bg-white/20 h-8 w-8 p-0 ${showInfo ? 'bg-white/20' : ''}`}
              title="Toggle info (I)"
            >
              <Info className="h-4 w-4" />
            </Button>

            {/* Download */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              title="Download image"
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* Close */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          {/* Previous Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={navigatePrevious}
            className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto
              text-white hover:bg-white/20 h-16 w-16 p-0 transition-opacity duration-300 ${
                showControls ? "opacity-100" : "opacity-0"
              } ${theme === "neon" ? "hover:shadow-glow" : ""}`}
            title="Previous image (←) - loops to last"
          >
            <ChevronLeft className="h-10 w-10" />
          </Button>

          {/* Next Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={navigateNext}
            className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto
              text-white hover:bg-white/20 h-16 w-16 p-0 transition-opacity duration-300 ${
                showControls ? "opacity-100" : "opacity-0"
              } ${theme === "neon" ? "hover:shadow-glow" : ""}`}
            title="Next image (→) - loops to first"
          >
            <ChevronRight className="h-10 w-10" />
          </Button>
        </>
      )}

      {/* Info Sidebar */}
      {showInfo && (
        <div className="absolute top-0 right-0 w-80 h-full bg-black/90 backdrop-blur-sm border-l border-white/20 overflow-y-auto pointer-events-auto">
          <div className="p-6 space-y-6">
            {/* Image Details */}
            <div>
              <h3 className="text-white font-semibold text-lg mb-3 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Image Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="text-white/70">
                  <span className="text-white">Name:</span> {image.name}
                </div>
                {image.title && image.title !== image.name && (
                  <div className="text-white/70">
                    <span className="text-white">Title:</span> {image.title}
                  </div>
                )}
                <div className="text-white/70">
                  <span className="text-white">Type:</span> {image.type}
                </div>
                {image.size && (
                  <div className="text-white/70">
                    <span className="text-white">Size:</span> {formatFileSize(image.size)}
                  </div>
                )}
                <div className="text-white/70">
                  <span className="text-white">Added:</span> {image.dateAdded.toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-white font-semibold text-lg mb-3 flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags ({image.tags.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {image.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30 cursor-pointer"
                  >
                    {tag}
                  </Badge>
                ))}
                {image.tags.length === 0 && (
                  <span className="text-white/50 text-sm italic">No tags</span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-white font-semibold text-lg mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Image
                </Button>
              </div>
            </div>

            {/* Navigation Info */}
            {images.length > 1 && (
              <div>
                <h3 className="text-white font-semibold text-lg mb-3">Navigation</h3>
                <div className="text-sm text-white/70 space-y-1">
                  <div>• Use ← → arrow keys to navigate</div>
                  <div>• Left-click image: next image</div>
                  <div>• Right-click image: previous image</div>
                  <div>• Press I to toggle this info panel</div>
                  <div>• Press + / - to zoom in/out</div>
                  <div>• Press 0 to reset zoom</div>
                  <div>• Press Esc to close</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
