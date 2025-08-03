import React, { useState } from 'react';
import { Hash, TrendingUp, Star, Clock, Search, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useTheme } from './ThemeProvider';
import { LinkedFolders } from './LinkedFolders';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

export function TagsSidebar() {
  const { theme } = useTheme();
  const { tagVariants, selectedTags, toggleTag, images } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'name' | 'confidence'>('count');
  const [showDetails, setShowDetails] = useState(false);

  // Filter and sort tags
  const filteredTags = tagVariants
    .filter(tag => 
      !searchQuery || 
      tag.canonical.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.aliases.some(alias => alias.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'count':
          return b.count - a.count;
        case 'name':
          return a.canonical.localeCompare(b.canonical);
        case 'confidence':
          return b.confidence - a.confidence;
        default:
          return 0;
      }
    });

  const totalTags = tagVariants.length;
  const totalTagInstances = tagVariants.reduce((sum, tag) => sum + tag.count, 0);
  const averageConfidence = tagVariants.length > 0 
    ? (tagVariants.reduce((sum, tag) => sum + tag.confidence, 0) / tagVariants.length * 100).toFixed(1)
    : 0;

  return (
    <div className={`w-80 border-l bg-background/95 backdrop-blur-sm flex flex-col h-[calc(100vh-4rem)] ${
      theme === 'neon' ? 'border-neon-primary/30' : ''
    } ${
      theme === 'cyberpunk' ? 'border-cyberpunk-pink/30' : ''
    }`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Generated Tags</h2>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-8 w-8 p-0"
                >
                  {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showDetails ? 'Hide' : 'Show'} tag details</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>

        {/* Sort Options */}
        <div className="flex gap-1">
          <Button
            variant={sortBy === 'count' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('count')}
            className={`h-7 px-2 text-xs ${
              theme === 'neon' && sortBy === 'count' ? 'shadow-glow-neon' : ''
            }`}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Count
          </Button>
          <Button
            variant={sortBy === 'confidence' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('confidence')}
            className="h-7 px-2 text-xs"
          >
            <Star className="h-3 w-3 mr-1" />
            Quality
          </Button>
          <Button
            variant={sortBy === 'name' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('name')}
            className="h-7 px-2 text-xs"
          >
            A-Z
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b bg-muted/30">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-primary">{totalTags}</div>
            <div className="text-xs text-muted-foreground">Unique Tags</div>
          </div>
          <div>
            <div className="text-lg font-bold text-primary">{totalTagInstances}</div>
            <div className="text-xs text-muted-foreground">Total Uses</div>
          </div>
          <div>
            <div className="text-lg font-bold text-primary">{averageConfidence}%</div>
            <div className="text-xs text-muted-foreground">Avg Quality</div>
          </div>
        </div>
      </div>

      {/* Linked Folders */}
      <div className="p-4 border-b">
        <LinkedFolders />
      </div>

      {/* Tags List */}
      <ScrollArea className="flex-1 p-4">
        {filteredTags.length === 0 ? (
          <div className="text-center py-8">
            <Hash className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No tags found matching your search' : 'No tags generated yet'}
            </p>
            {!searchQuery && (
              <p className="text-xs text-muted-foreground mt-1">
                Add images to start generating tags
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTags.map((tagVariant, index) => {
              const isSelected = selectedTags.includes(tagVariant.canonical);
              
              return (
                <Card
                  key={tagVariant.canonical}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary bg-accent/50' : ''
                  } ${
                    theme === 'neon' && isSelected ? 'shadow-glow-neon' : ''
                  } ${
                    theme === 'cyberpunk' && isSelected ? 'border-cyberpunk-pink/50' : ''
                  }`}
                  onClick={() => toggleTag(tagVariant.canonical)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium text-sm truncate ${
                            theme === 'cyberpunk' && isSelected ? 'text-cyberpunk-pink' : ''
                          } ${
                            theme === 'neon' && isSelected ? 'text-neon-primary' : ''
                          }`}>
                            {tagVariant.canonical}
                          </span>
                          
                          {/* Confidence indicator */}
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            tagVariant.confidence >= 0.9 ? 'bg-green-500' :
                            tagVariant.confidence >= 0.7 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs h-5 ${
                              theme === 'neon' ? 'border-neon-primary/30' : ''
                            } ${
                              theme === 'cyberpunk' ? 'border-cyberpunk-blue/30' : ''
                            }`}
                          >
                            {tagVariant.count} uses
                          </Badge>
                          
                          {tagVariant.aliases.length > 0 && (
                            <Badge variant="secondary" className="text-xs h-5">
                              +{tagVariant.aliases.length} variants
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Show details if enabled */}
                    {showDetails && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Quality: {(tagVariant.confidence * 100).toFixed(0)}%</div>
                          <div>Sources: {[...new Set(tagVariant.sources.map(s => s.type))].join(', ')}</div>
                          {tagVariant.aliases.length > 0 && (
                            <div>
                              <div className="font-medium mb-1">Variants:</div>
                              <div className="flex flex-wrap gap-1">
                                {tagVariant.aliases.slice(0, 3).map(alias => (
                                  <span key={alias} className="bg-muted px-1 rounded text-xs">
                                    {alias}
                                  </span>
                                ))}
                                {tagVariant.aliases.length > 3 && (
                                  <span className="text-xs">+{tagVariant.aliases.length - 3} more</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer with action buttons */}
      {selectedTags.length > 0 && (
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectedTags.forEach(tag => toggleTag(tag))}
              className="h-7 px-2 text-xs"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
