import React, { useState } from "react";
import { ImageEditor } from "./ImageEditor";
import { ImageData } from "@/lib/tagEngine";
import { Button } from "./ui/button";

// Demo component to test the ImageEditor
export function ImageEditorDemo() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  // Mock image data for testing
  const mockImage: ImageData = {
    id: "demo-image",
    name: "demo-image.jpg",
    title: "Demo Image",
    url: "https://picsum.photos/800/600",
    size: 150000,
    type: "image/jpeg",
    dateAdded: new Date(),
    tags: ["demo", "test"],
    rawTags: ["demo", "test"],
  };

  return (
    <div className="p-4">
      <Button onClick={() => setIsEditorOpen(true)}>
        Open Image Editor Demo
      </Button>
      
      <ImageEditor
        image={isEditorOpen ? mockImage : null}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
      />
    </div>
  );
}
