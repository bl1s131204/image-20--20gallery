import React from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { SortField, SortDirection } from '@/lib/tagEngine';
import { Button } from './ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';

export function SortControls() {
  const { sortField, sortDirection, setSorting } = useAppStore();

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'name', label: 'Name' },
    { field: 'date', label: 'Date Added' },
    { field: 'size', label: 'File Size' },
    { field: 'type', label: 'File Type' },
  ];

  const toggleDirection = () => {
    setSorting(sortField, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const changeSortField = (field: SortField) => {
    setSorting(field, sortDirection);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort by {sortOptions.find(opt => opt.field === sortField)?.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option.field}
              onClick={() => changeSortField(option.field)}
              className={sortField === option.field ? 'bg-accent' : ''}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Button
        variant="outline"
        size="sm"
        onClick={toggleDirection}
        className="transition-transform duration-200 hover:scale-105"
      >
        {sortDirection === 'asc' ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
