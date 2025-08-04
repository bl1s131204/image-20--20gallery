import React from "react";
import { Lock, Unlock, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import { useAppStore } from "@/lib/store";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { toast } from "./ui/use-toast";

interface PrivacyToggleProps {
  type: 'image' | 'folder';
  id: string;
  isPrivate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'badge' | 'icon';
  showLabel?: boolean;
}

export function PrivacyToggle({ 
  type, 
  id, 
  isPrivate = false, 
  size = 'sm',
  variant = 'icon',
  showLabel = false 
}: PrivacyToggleProps) {
  const { user, isAuthenticated } = useAuthStore();
  const { toggleImagePrivacy, toggleFolderPrivacy } = useAppStore();

  if (!isAuthenticated || !user) {
    return null; // Don't show privacy controls for unauthenticated users
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newPrivacy = !isPrivate;
    
    if (type === 'image') {
      toggleImagePrivacy(id, newPrivacy);
    } else {
      toggleFolderPrivacy(id, newPrivacy);
    }
    
    toast({
      title: `${type === 'image' ? 'Image' : 'Folder'} ${newPrivacy ? 'Private' : 'Public'}`,
      description: `${type === 'image' ? 'Image' : 'Folder'} is now ${newPrivacy ? 'private' : 'public'}`,
    });
  };

  const getIcon = () => {
    if (isPrivate) {
      return <Lock className={`h-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'} w-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'}`} />;
    } else {
      return <Unlock className={`h-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'} w-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'}`} />;
    }
  };

  const getLabel = () => {
    return isPrivate ? 'Private' : 'Public';
  };

  const getTooltipText = () => {
    return isPrivate 
      ? `This ${type} is private and only visible to you. Click to make public.`
      : `This ${type} is public. Click to make private.`;
  };

  if (variant === 'badge') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={isPrivate ? "default" : "secondary"}
              className={`cursor-pointer text-xs ${
                isPrivate 
                  ? "bg-orange-500 hover:bg-orange-600 text-white" 
                  : "hover:bg-gray-300"
              }`}
              onClick={handleToggle}
            >
              {getIcon()}
              {showLabel && <span className="ml-1">{getLabel()}</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'button') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isPrivate ? "default" : "outline"}
              size={size}
              onClick={handleToggle}
              className={`${
                isPrivate 
                  ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" 
                  : "hover:bg-gray-100"
              }`}
            >
              {getIcon()}
              {showLabel && <span className="ml-2">{getLabel()}</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default icon variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleToggle}
            className={`p-1 rounded transition-colors ${
              isPrivate 
                ? "text-orange-500 hover:text-orange-600 hover:bg-orange-50" 
                : "text-gray-500 hover:text-gray-600 hover:bg-gray-50"
            }`}
          >
            {getIcon()}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Convenience components for specific use cases
export function ImagePrivacyToggle({ imageId, isPrivate, ...props }: { imageId: string; isPrivate?: boolean } & Omit<PrivacyToggleProps, 'type' | 'id'>) {
  return <PrivacyToggle type="image" id={imageId} isPrivate={isPrivate} {...props} />;
}

export function FolderPrivacyToggle({ folderId, isPrivate, ...props }: { folderId: string; isPrivate?: boolean } & Omit<PrivacyToggleProps, 'type' | 'id'>) {
  return <PrivacyToggle type="folder" id={folderId} isPrivate={isPrivate} {...props} />;
}
