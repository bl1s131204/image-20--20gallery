import React, { useState } from "react";
import {
  X,
  Hash,
  Folder,
  Calendar,
  FileType,
  HardDrive,
  Info,
  Eye,
  Search,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTheme } from "./ThemeProvider";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

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
    images,
  } = useAppStore();

  const [showDebugView, setShowDebugView] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  if (!showFilters) return null;

  const fileTypes = [...new Set(images.map((img) => img.type).filter(Boolean))];
  const totalImages = images.length;

  return (
    <div
      className={`fixed inset-y-0 right-0 z-40 w-80 bg-background border-l transform transition-transform duration-300 ease-in-out ${
        showFilters ? "translate-x-0" : "translate-x-full"
      }`}
    >
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
            <Card className={theme === "neon" ? "border-neon/30" : ""}>
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
                {folders.map((folder) => (
                  <label
                    key={folder.id}
                    className="flex items-center space-x-2 cursor-pointer group"
                  >
                    <Checkbox
                      checked={selectedFolder === folder.id}
                      onCheckedChange={() =>
                        setSelectedFolder(
                          selectedFolder === folder.id ? null : folder.id,
                        )
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
                  Smart Tags
                </h3>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDebugView(!showDebugView)}
                          className="h-6 w-6 p-0"
                        >
                          <Info className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Show tag details and aliases</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        selectedTags.forEach((tag) => toggleTag(tag))
                      }
                      className="h-6 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Tag Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tags..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {tagVariants
                  .filter(
                    (tagVariant) =>
                      !tagSearchQuery ||
                      tagVariant.canonical
                        .toLowerCase()
                        .includes(tagSearchQuery.toLowerCase()) ||
                      tagVariant.aliases.some((alias) =>
                        alias
                          .toLowerCase()
                          .includes(tagSearchQuery.toLowerCase()),
                      ),
                  )
                  .slice(0, 50)
                  .map((tagVariant) => {
                    const isExpanded = expandedTags.has(tagVariant.canonical);
                    const hasAliases = tagVariant.aliases.length > 0;

                    return (
                      <div key={tagVariant.canonical} className="space-y-1">
                        <div className="flex items-center space-x-2 cursor-pointer group">
                          <Checkbox
                            checked={selectedTags.includes(
                              tagVariant.canonical,
                            )}
                            onCheckedChange={() =>
                              toggleTag(tagVariant.canonical)
                            }
                          />
                          <span
                            className={`text-sm group-hover:text-primary transition-colors truncate flex-1 ${
                              theme === "cyberpunk" &&
                              selectedTags.includes(tagVariant.canonical)
                                ? "text-cyberpunk-pink"
                                : ""
                            }`}
                          >
                            {tagVariant.canonical}
                          </span>

                          <div className="flex items-center gap-1">
                            {/* Confidence indicator */}
                            <div
                              className={`w-2 h-2 rounded-full ${
                                tagVariant.confidence >= 0.9
                                  ? "bg-green-500"
                                  : tagVariant.confidence >= 0.7
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              title={`Confidence: ${(tagVariant.confidence * 100).toFixed(0)}%`}
                            />

                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                theme === "neon" &&
                                selectedTags.includes(tagVariant.canonical)
                                  ? "border-neon text-neon"
                                  : ""
                              }`}
                            >
                              {tagVariant.count}
                            </Badge>

                            {hasAliases && showDebugView && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newExpanded = new Set(expandedTags);
                                  if (isExpanded) {
                                    newExpanded.delete(tagVariant.canonical);
                                  } else {
                                    newExpanded.add(tagVariant.canonical);
                                  }
                                  setExpandedTags(newExpanded);
                                }}
                                className="h-4 w-4 p-0"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Show aliases in debug mode */}
                        {hasAliases && showDebugView && isExpanded && (
                          <div className="ml-6 space-y-1">
                            <div className="text-xs text-muted-foreground font-medium">
                              Aliases:
                            </div>
                            {tagVariant.aliases.map((alias) => (
                              <div
                                key={alias}
                                className="text-xs text-muted-foreground ml-2"
                              >
                                • {alias}
                              </div>
                            ))}
                            <div className="text-xs text-muted-foreground">
                              Sources:{" "}
                              {tagVariant.sources.map((s) => s.type).join(", ")}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {tagVariants.length > 50 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    ... and {tagVariants.length - 50} more tags
                  </div>
                )}

                {tagSearchQuery &&
                  tagVariants.filter(
                    (tagVariant) =>
                      tagVariant.canonical
                        .toLowerCase()
                        .includes(tagSearchQuery.toLowerCase()) ||
                      tagVariant.aliases.some((alias) =>
                        alias
                          .toLowerCase()
                          .includes(tagSearchQuery.toLowerCase()),
                      ),
                  ).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No tags found matching "{tagSearchQuery}"
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
                {fileTypes.map((type) => {
                  const count = images.filter(
                    (img) => img.type === type,
                  ).length;
                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {type?.split("/")[1]?.toUpperCase() || "Unknown"}
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
