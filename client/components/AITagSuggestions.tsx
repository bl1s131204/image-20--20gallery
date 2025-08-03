import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, X, Brain, Lightbulb } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { AITagging } from '@/lib/tagEngine';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface AITagSuggestionsProps {
  imageId: string;
  filename: string;
  currentTags: string[];
  onAddTag: (tag: string) => void;
}

export function AITagSuggestions({ 
  imageId, 
  filename, 
  currentTags, 
  onAddTag 
}: AITagSuggestionsProps) {
  const { tagVariants } = useAppStore();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [semanticTags, setSemanticTags] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    generateSuggestions();
  }, [filename, tagVariants]);

  const generateSuggestions = async () => {
    setIsGenerating(true);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      // Generate contextual suggestions
      const contextualSuggestions = AITagging.suggestTags(filename, tagVariants);
      
      // Generate semantic enhancements
      const enhanced = AITagging.enhanceWithSemantics(currentTags);
      const newSemanticTags = enhanced.filter(tag => !currentTags.includes(tag));
      
      setSuggestions(contextualSuggestions.filter(tag => !currentTags.includes(tag)));
      setSemanticTags(newSemanticTags);
    } catch (error) {
      console.warn('Failed to generate AI suggestions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddSuggestion = (tag: string) => {
    onAddTag(tag);
    setSuggestions(prev => prev.filter(t => t !== tag));
    setSemanticTags(prev => prev.filter(t => t !== tag));
  };

  const handleDismissSuggestion = (tag: string) => {
    setSuggestions(prev => prev.filter(t => t !== tag));
    setSemanticTags(prev => prev.filter(t => t !== tag));
  };

  if (suggestions.length === 0 && semanticTags.length === 0 && !isGenerating) {
    return null;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-500" />
          AI Suggestions
          {isGenerating && (
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse delay-75" />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse delay-150" />
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contextual Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3 w-3 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">
                Based on Similar Images
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map(tag => (
                <div key={tag} className="flex items-center gap-1">
                  <Badge 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-accent transition-colors pr-1"
                  >
                    {tag}
                    <div className="flex ml-1 gap-0.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddSuggestion(tag)}
                              className="h-4 w-4 p-0 hover:bg-green-500/20"
                            >
                              <Plus className="h-2 w-2" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Add tag</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDismissSuggestion(tag)}
                              className="h-4 w-4 p-0 hover:bg-red-500/20"
                            >
                              <X className="h-2 w-2" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Dismiss</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Semantic Enhancements */}
        {semanticTags.length > 0 && (
          <>
            {suggestions.length > 0 && <Separator />}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-3 w-3 text-yellow-500" />
                <span className="text-xs font-medium text-muted-foreground">
                  Semantic Categories
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {semanticTags.map(tag => (
                  <div key={tag} className="flex items-center gap-1">
                    <Badge 
                      variant="outline" 
                      className="text-xs cursor-pointer hover:bg-accent transition-colors pr-1 border-yellow-200"
                    >
                      {tag}
                      <div className="flex ml-1 gap-0.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAddSuggestion(tag)}
                                className="h-4 w-4 p-0 hover:bg-green-500/20"
                              >
                                <Plus className="h-2 w-2" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add category tag</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDismissSuggestion(tag)}
                                className="h-4 w-4 p-0 hover:bg-red-500/20"
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Dismiss</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Regenerate button */}
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSuggestions}
            disabled={isGenerating}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {isGenerating ? 'Thinking...' : 'Regenerate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Add the AI suggestions to the image modal
export function AITagSuggestionsWrapper({ imageId }: { imageId: string }) {
  const { images } = useAppStore();
  const image = images.find(img => img.id === imageId);

  if (!image) return null;

  const handleAddTag = (tag: string) => {
    // This would typically update the image tags
    console.log(`Adding tag "${tag}" to image ${imageId}`);
  };

  return (
    <AITagSuggestions
      imageId={imageId}
      filename={image.name}
      currentTags={image.tags}
      onAddTag={handleAddTag}
    />
  );
}
