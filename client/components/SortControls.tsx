import React from "react";
import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SortField, SortDirection } from "@/lib/tagEngine";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function SortControls() {
  const { sortField, sortDirection, setSorting } = useAppStore();

  const { searchQuery } = useAppStore();

  const sortOptions: { field: SortField; label: string }[] = [
    { field: "relevance", label: "Relevance" },
    { field: "title", label: "Title" },
    { field: "name", label: "Name" },
    { field: "tags", label: "Tag Count" },
    { field: "date", label: "Date Added" },
    { field: "size", label: "File Size" },
    { field: "type", label: "File Type" },
  ];

  const toggleDirection = () => {
    setSorting(sortField, sortDirection === "asc" ? "desc" : "asc");
  };

  const changeSortField = (field: SortField) => {
    setSorting(field, sortDirection);
  };

  const getCurrentLabel = () => {
    const option = sortOptions.find((opt) => opt.field === sortField);
    const directionIcon = sortDirection === "asc" ? "▲" : "▼";
    return option ? `Sort By: ${option.label} ${directionIcon}` : "Sort By";
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-fit">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <span className="transition-all duration-200">{getCurrentLabel()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {sortOptions.map((option) => {
            // Hide relevance option if no search query
            if (option.field === "relevance" && !searchQuery) {
              return null;
            }

            return (
              <DropdownMenuItem
                key={option.field}
                onClick={() => changeSortField(option.field)}
                className={`transition-colors duration-200 ${sortField === option.field ? "bg-accent" : ""}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{option.label}</span>
                  <div className="flex items-center gap-2">
                    {option.field === "relevance" && searchQuery && (
                      <span className="text-xs text-muted-foreground">
                        for "{searchQuery}"
                      </span>
                    )}
                    {sortField === option.field && (
                      <span className="text-xs">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        onClick={toggleDirection}
        className="transition-all duration-200 hover:scale-105 hover:bg-accent"
        title={`Sort ${sortDirection === "asc" ? "Descending" : "Ascending"}`}
      >
        {sortDirection === "asc" ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
