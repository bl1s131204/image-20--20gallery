import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  RotateCcw,
  Save,
  Copy,
  Crop,
  Sliders,
  Square,
  Maximize,
  Smartphone,
  Monitor,
  Image as ImageIcon,
  Check,
  SkipBack,
} from "lucide-react";
import { ImageData } from "@/lib/tagEngine";
import { useAppStore } from "@/lib/store";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "./ui/use-toast";

interface ImageEditorProps {
  image: ImageData | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  blur: number;
  hueRotation: number;
  grayscale: number;
  invert: boolean;
}

const ASPECT_RATIOS = {
  freeform: { label: "Freeform", ratio: null },
  "1:1": { label: "Square (1:1)", ratio: 1 },
  "4:3": { label: "Standard (4:3)", ratio: 4/3 },
  "3:2": { label: "DSLR (3:2)", ratio: 3/2 },
  "16:9": { label: "Widescreen (16:9)", ratio: 16/9 },
  "9:16": { label: "Portrait (9:16)", ratio: 9/16 },
  "2:3": { label: "Vertical (2:3)", ratio: 2/3 },
};

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sharpness: 100,
  blur: 0,
  hueRotation: 0,
  grayscale: 0,
  invert: false,
};

export function ImageEditor({ image, isOpen, onClose }: ImageEditorProps) {
  const { addImages, updateImage } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTool, setCurrentTool] = useState<"crop" | "adjust">("crop");
  
  // Crop state
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [aspectRatio, setAspectRatio] = useState<string>("freeform");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Adjustments state
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);

  // Initialize when image changes
  useEffect(() => {
    if (image && isOpen) {
      setOriginalImageData(image);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setCropArea({ x: 10, y: 10, width: 80, height: 80 });
      setCurrentTool("crop");
      loadImageToCanvas();
    }
  }, [image, isOpen]);

  const loadImageToCanvas = useCallback(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Set canvas size to image size
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Clear and draw original image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Update preview
      updatePreview();
    };
    img.src = image.url;
  }, [image]);

  const applyFilters = (ctx: CanvasRenderingContext2D) => {
    const filters = [];
    
    if (adjustments.brightness !== 100) {
      filters.push(`brightness(${adjustments.brightness}%)`);
    }
    if (adjustments.contrast !== 100) {
      filters.push(`contrast(${adjustments.contrast}%)`);
    }
    if (adjustments.saturation !== 100) {
      filters.push(`saturate(${adjustments.saturation}%)`);
    }
    if (adjustments.blur > 0) {
      filters.push(`blur(${adjustments.blur}px)`);
    }
    if (adjustments.hueRotation !== 0) {
      filters.push(`hue-rotate(${adjustments.hueRotation}deg)`);
    }
    if (adjustments.grayscale > 0) {
      filters.push(`grayscale(${adjustments.grayscale}%)`);
    }
    if (adjustments.invert) {
      filters.push("invert(100%)");
    }
    
    ctx.filter = filters.length > 0 ? filters.join(" ") : "none";
  };

  const updatePreview = useCallback(() => {
    if (!canvasRef.current || !previewCanvasRef.current || !image) return;

    const sourceCanvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const ctx = previewCanvas.getContext("2d");
    if (!ctx) return;

    // Set preview canvas size
    const maxSize = 400;
    const scale = Math.min(maxSize / sourceCanvas.width, maxSize / sourceCanvas.height);
    previewCanvas.width = sourceCanvas.width * scale;
    previewCanvas.height = sourceCanvas.height * scale;

    // Clear preview
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Apply filters
    applyFilters(ctx);
    
    // Draw scaled image
    ctx.drawImage(sourceCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
    
    // Draw crop overlay if in crop mode
    if (currentTool === "crop") {
      drawCropOverlay(ctx, scale);
    }
  }, [currentTool, cropArea, adjustments]);

  const drawCropOverlay = (ctx: CanvasRenderingContext2D, scale: number) => {
    const canvas = ctx.canvas;
    const cropX = (cropArea.x / 100) * canvas.width;
    const cropY = (cropArea.y / 100) * canvas.height;
    const cropWidth = (cropArea.width / 100) * canvas.width;
    const cropHeight = (cropArea.height / 100) * canvas.height;

    // Semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear crop area
    ctx.clearRect(cropX, cropY, cropWidth, cropHeight);
    
    // Crop border
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);
    
    // Corner handles
    const handleSize = 8;
    ctx.fillStyle = "#3b82f6";
    
    // Top-left
    ctx.fillRect(cropX - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
    // Top-right
    ctx.fillRect(cropX + cropWidth - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
    // Bottom-left
    ctx.fillRect(cropX - handleSize/2, cropY + cropHeight - handleSize/2, handleSize, handleSize);
    // Bottom-right
    ctx.fillRect(cropX + cropWidth - handleSize/2, cropY + cropHeight - handleSize/2, handleSize, handleSize);
  };

  // Update preview when adjustments change
  useEffect(() => {
    updatePreview();
  }, [updatePreview, adjustments]);

  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool !== "crop") return;
    
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || currentTool !== "crop") return;
    
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const width = Math.abs(x - dragStart.x);
    const height = Math.abs(y - dragStart.y);
    
    let newCrop = {
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      width,
      height,
    };
    
    // Apply aspect ratio constraint
    const selectedRatio = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS];
    if (selectedRatio.ratio) {
      const targetRatio = selectedRatio.ratio;
      if (width / height > targetRatio) {
        newCrop.width = height * targetRatio;
      } else {
        newCrop.height = width / targetRatio;
      }
    }
    
    setCropArea(newCrop);
  };

  const handleCropMouseUp = () => {
    setIsDragging(false);
  };

  const applyCrop = async () => {
    if (!canvasRef.current || !originalImageData) return;

    const sourceCanvas = canvasRef.current;
    const cropX = (cropArea.x / 100) * sourceCanvas.width;
    const cropY = (cropArea.y / 100) * sourceCanvas.height;
    const cropWidth = (cropArea.width / 100) * sourceCanvas.width;
    const cropHeight = (cropArea.height / 100) * sourceCanvas.height;

    // Create new canvas for cropped image
    const croppedCanvas = document.createElement("canvas");
    const ctx = croppedCanvas.getContext("2d");
    if (!ctx) return;

    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;

    // Apply filters and draw cropped portion
    applyFilters(ctx);
    ctx.drawImage(
      sourceCanvas,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );

    // Update main canvas
    sourceCanvas.width = cropWidth;
    sourceCanvas.height = cropHeight;
    const mainCtx = sourceCanvas.getContext("2d");
    if (mainCtx) {
      mainCtx.clearRect(0, 0, cropWidth, cropHeight);
      mainCtx.drawImage(croppedCanvas, 0, 0);
    }

    // Reset crop area
    setCropArea({ x: 0, y: 0, width: 100, height: 100 });
    updatePreview();

    toast({
      title: "Crop Applied",
      description: "Image has been cropped successfully",
    });
  };

  const resetAdjustments = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
  };

  const resetSingleAdjustment = (key: keyof ImageAdjustments) => {
    setAdjustments(prev => ({
      ...prev,
      [key]: DEFAULT_ADJUSTMENTS[key],
    }));
  };

  const saveAsNew = async () => {
    if (!canvasRef.current || !originalImageData) return;

    setIsLoading(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Apply final filters
      applyFilters(ctx);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `edited_${originalImageData.name}`;
          const file = new File([blob], fileName, { type: "image/png" });
          addImages([file]);
          
          toast({
            title: "Image Saved",
            description: "Edited image has been saved as a new image",
          });
          onClose();
        }
      }, "image/png", 0.95);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save image",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const replaceOriginal = async () => {
    if (!canvasRef.current || !originalImageData) return;

    setIsLoading(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Apply final filters
      applyFilters(ctx);

      // Convert to blob and create new URL
      canvas.toBlob((blob) => {
        if (blob) {
          const newUrl = URL.createObjectURL(blob);
          const updatedImage: ImageData = {
            ...originalImageData,
            url: newUrl,
            tags: [...originalImageData.tags, "edited"],
          };
          
          updateImage(originalImageData.id, updatedImage);
          
          toast({
            title: "Image Updated",
            description: "Original image has been replaced with edited version",
          });
          onClose();
        }
      }, "image/png", 0.95);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update image",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!image) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Edit Image: {image.title || image.name}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Tools Panel */}
            <div className="w-80 border-r bg-muted/20 flex flex-col">
              {/* Tool Selector */}
              <div className="p-4 border-b">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={currentTool === "crop" ? "default" : "outline"}
                    onClick={() => setCurrentTool("crop")}
                    className="flex items-center gap-2"
                  >
                    <Crop className="h-4 w-4" />
                    Crop
                  </Button>
                  <Button
                    variant={currentTool === "adjust" ? "default" : "outline"}
                    onClick={() => setCurrentTool("adjust")}
                    className="flex items-center gap-2"
                  >
                    <Sliders className="h-4 w-4" />
                    Adjust
                  </Button>
                </div>
              </div>

              {/* Tool Options */}
              <div className="flex-1 overflow-y-auto p-4">
                {currentTool === "crop" && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Aspect Ratio</Label>
                      <Select value={aspectRatio} onValueChange={setAspectRatio}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ASPECT_RATIOS).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Button
                        onClick={applyCrop}
                        className="w-full"
                        disabled={cropArea.width === 0 || cropArea.height === 0}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Apply Crop
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCropArea({ x: 10, y: 10, width: 80, height: 80 })}
                        className="w-full"
                      >
                        <SkipBack className="h-4 w-4 mr-2" />
                        Reset Crop
                      </Button>
                    </div>
                  </div>
                )}

                {currentTool === "adjust" && (
                  <div className="space-y-6">
                    {/* Brightness */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Brightness</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{adjustments.brightness}%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetSingleAdjustment("brightness")}
                            className="h-6 w-6 p-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Slider
                        value={[adjustments.brightness]}
                        onValueChange={([value]) => setAdjustments(prev => ({ ...prev, brightness: value }))}
                        min={0}
                        max={200}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Contrast</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{adjustments.contrast}%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetSingleAdjustment("contrast")}
                            className="h-6 w-6 p-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Slider
                        value={[adjustments.contrast]}
                        onValueChange={([value]) => setAdjustments(prev => ({ ...prev, contrast: value }))}
                        min={0}
                        max={200}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Saturation</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{adjustments.saturation}%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetSingleAdjustment("saturation")}
                            className="h-6 w-6 p-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Slider
                        value={[adjustments.saturation]}
                        onValueChange={([value]) => setAdjustments(prev => ({ ...prev, saturation: value }))}
                        min={0}
                        max={200}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Blur */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Blur</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{adjustments.blur}px</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetSingleAdjustment("blur")}
                            className="h-6 w-6 p-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Slider
                        value={[adjustments.blur]}
                        onValueChange={([value]) => setAdjustments(prev => ({ ...prev, blur: value }))}
                        min={0}
                        max={20}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {/* Hue Rotation */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Hue Rotation</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{adjustments.hueRotation}°</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetSingleAdjustment("hueRotation")}
                            className="h-6 w-6 p-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Slider
                        value={[adjustments.hueRotation]}
                        onValueChange={([value]) => setAdjustments(prev => ({ ...prev, hueRotation: value }))}
                        min={0}
                        max={360}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Grayscale */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Grayscale</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{adjustments.grayscale}%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetSingleAdjustment("grayscale")}
                            className="h-6 w-6 p-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Slider
                        value={[adjustments.grayscale]}
                        onValueChange={([value]) => setAdjustments(prev => ({ ...prev, grayscale: value }))}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Invert */}
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Invert Colors</Label>
                      <Button
                        variant={adjustments.invert ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAdjustments(prev => ({ ...prev, invert: !prev.invert }))}
                      >
                        {adjustments.invert ? "On" : "Off"}
                      </Button>
                    </div>

                    <Separator />

                    {/* Reset All */}
                    <Button
                      variant="outline"
                      onClick={resetAdjustments}
                      className="w-full"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset All
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 flex flex-col">
              {/* Canvas Container */}
              <div className="flex-1 flex items-center justify-center p-6 bg-checkered">
                <canvas
                  ref={previewCanvasRef}
                  className="max-w-full max-h-full border border-border shadow-lg bg-white cursor-crosshair"
                  onMouseDown={handleCropMouseDown}
                  onMouseMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  style={{ imageRendering: "pixelated" }}
                />
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {image.type?.split("/")[1]?.toUpperCase()}
                    </Badge>
                    {image.tags.includes("edited") && (
                      <Badge variant="outline" className="text-xs">
                        Edited
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={saveAsNew}
                      disabled={isLoading}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Save as New
                    </Button>
                    <Button
                      onClick={replaceOriginal}
                      disabled={isLoading}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Replace Original
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden canvases */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </DialogContent>
    </Dialog>
  );
}
