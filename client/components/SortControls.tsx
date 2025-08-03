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

export function SortControls() {\n  const { sortField, sortDirection, setSorting } = useAppStore();\n\n  const sortOptions: { field: SortField; label: string }[] = [\n    { field: 'name', label: 'Name' },\n    { field: 'date', label: 'Date Added' },\n    { field: 'size', label: 'File Size' },\n    { field: 'type', label: 'File Type' },\n  ];\n\n  const toggleDirection = () => {\n    setSorting(sortField, sortDirection === 'asc' ? 'desc' : 'asc');\n  };\n\n  const changeSortField = (field: SortField) => {\n    setSorting(field, sortDirection);\n  };\n\n  return (\n    <div className=\"flex items-center gap-2\">\n      <DropdownMenu>\n        <DropdownMenuTrigger asChild>\n          <Button variant=\"outline\" size=\"sm\">\n            <ArrowUpDown className=\"h-4 w-4 mr-2\" />\n            Sort by {sortOptions.find(opt => opt.field === sortField)?.label}\n          </Button>\n        </DropdownMenuTrigger>\n        <DropdownMenuContent align=\"end\">\n          {sortOptions.map((option) => (\n            <DropdownMenuItem\n              key={option.field}\n              onClick={() => changeSortField(option.field)}\n              className={sortField === option.field ? 'bg-accent' : ''}\n            >\n              {option.label}\n            </DropdownMenuItem>\n          ))}\n        </DropdownMenuContent>\n      </DropdownMenu>\n      \n      <Button\n        variant=\"outline\"\n        size=\"sm\"\n        onClick={toggleDirection}\n        className=\"transition-transform duration-200 hover:scale-105\"\n      >\n        {sortDirection === 'asc' ? (\n          <ChevronUp className=\"h-4 w-4\" />\n        ) : (\n          <ChevronDown className=\"h-4 w-4\" />\n        )}\n      </Button>\n    </div>\n  );\n}","old_str":""}]