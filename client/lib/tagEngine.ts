import { z } from 'zod';

export interface TagVariant {
  canonical: string;
  aliases: string[];
  count: number;
}

export interface ImageData {
  id: string;
  name: string;
  url: string;
  folder?: string;
  size?: number;
  type?: string;
  dateAdded?: Date;
  tags: string[];
  rawTags: string[];
}

export interface FolderData {
  id: string;
  name: string;
  images: string[];
  userDefined?: boolean;
}

// Common tag patterns for normalization
const COMMON_TAGS = [
  'forced feminization',
  'crossdressing',
  'latex',
  'dominant',
  'petplay',
  'sissy',
  'transformation',
  'hypno',
  'bdsm',
  'submission',
  'makeup',
  'heels',
  'dress',
  'lingerie',
  'training',
  'humiliation',
  'bondage',
  'roleplay'
];

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Extract tags from filename and folder
export function extractRawTags(filename: string, folderName?: string): string[] {
  const tags: string[] = [];
  
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Split by various delimiters
  const delimiters = /[_\-\s,.()[\]{}]+/;
  const filenameParts = nameWithoutExt.split(delimiters);
  
  // Add folder name parts if available
  if (folderName) {
    const folderParts = folderName.split(delimiters);
    tags.push(...folderParts);
  }
  
  // Add filename parts
  tags.push(...filenameParts);
  
  // Split camelCase and PascalCase
  const camelCaseRegex = /([a-z])([A-Z])/g;
  const expandedTags: string[] = [];
  
  tags.forEach(tag => {
    if (tag.length > 1) {
      const expanded = tag.replace(camelCaseRegex, '$1 $2').toLowerCase();
      expandedTags.push(...expanded.split(' '));
    }
  });
  
  // Combine and clean
  const allTags = [...tags, ...expandedTags]
    .map(tag => tag.toLowerCase().trim())
    .filter(tag => tag.length > 1 && !tag.match(/^\d+$/)) // Remove numbers and single chars
    .filter(tag => !['jpg', 'png', 'jpeg', 'webp', 'gif'].includes(tag)); // Remove file extensions
  
  return [...new Set(allTags)]; // Remove duplicates
}

// Normalize and group similar tags
export function normalizeAndGroupTags(allRawTags: string[]): TagVariant[] {
  const tagCounts = new Map<string, number>();
  
  // Count all raw tags
  allRawTags.forEach(tag => {
    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  });
  
  const tagGroups = new Map<string, Set<string>>();
  const processed = new Set<string>();
  
  // Group similar tags
  Array.from(tagCounts.keys()).forEach(tag => {
    if (processed.has(tag)) return;
    
    const group = new Set<string>([tag]);
    processed.add(tag);
    
    // Find similar tags using Levenshtein distance
    Array.from(tagCounts.keys()).forEach(otherTag => {
      if (processed.has(otherTag) || tag === otherTag) return;
      
      const distance = levenshteinDistance(tag, otherTag);
      const maxLength = Math.max(tag.length, otherTag.length);
      const similarity = 1 - distance / maxLength;
      
      // Group if similarity is high enough (adjust threshold as needed)
      if (similarity >= 0.7 || distance <= 2) {
        group.add(otherTag);
        processed.add(otherTag);
      }
    });
    
    // Check against common tags for better canonicalization
    let canonical = tag;
    let maxCount = tagCounts.get(tag) || 0;
    
    group.forEach(groupTag => {
      const count = tagCounts.get(groupTag) || 0;
      if (count > maxCount) {
        canonical = groupTag;
        maxCount = count;
      }
      
      // Prefer common tags as canonical
      COMMON_TAGS.forEach(commonTag => {
        if (groupTag.includes(commonTag) || commonTag.includes(groupTag)) {
          if (levenshteinDistance(groupTag, commonTag) <= 2) {
            canonical = commonTag;
          }
        }
      });
    });
    
    tagGroups.set(canonical, group);
  });
  
  // Convert to TagVariant format
  const tagVariants: TagVariant[] = [];
  
  tagGroups.forEach((group, canonical) => {
    const aliases = Array.from(group).filter(tag => tag !== canonical);
    const totalCount = Array.from(group).reduce((sum, tag) => sum + (tagCounts.get(tag) || 0), 0);
    
    tagVariants.push({
      canonical,
      aliases,
      count: totalCount
    });
  });
  
  // Sort by count (most frequent first)
  return tagVariants.sort((a, b) => b.count - a.count);
}

// Extract and normalize tags from an image
export function processImageTags(filename: string, folderName?: string): {
  rawTags: string[];
  processedTags: string[];
} {
  const rawTags = extractRawTags(filename, folderName);
  const tagVariants = normalizeAndGroupTags(rawTags);
  const processedTags = tagVariants.map(variant => variant.canonical);
  
  return {
    rawTags,
    processedTags
  };
}

// Mock Google Drive API response
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  thumbnailLink?: string;
  webContentLink?: string;
}

// Parse Google Drive share link
export function parseGoogleDriveLink(url: string): string | null {
  const patterns = [
    /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9-_]+)/,
    /drive\.google\.com\/drive\/u\/\d+\/folders\/([a-zA-Z0-9-_]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9-_]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Theme utilities
export type Theme = 'light' | 'dark' | 'gold' | 'neon' | 'cyberpunk';

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  // Remove all theme classes
  root.classList.remove('dark', 'theme-gold', 'theme-neon', 'theme-cyberpunk');
  
  // Apply selected theme
  switch (theme) {
    case 'dark':
      root.classList.add('dark');
      break;
    case 'gold':
      root.classList.add('theme-gold');
      break;
    case 'neon':
      root.classList.add('theme-neon');
      break;
    case 'cyberpunk':
      root.classList.add('theme-cyberpunk');
      break;
    case 'light':
    default:
      // Light theme is default, no class needed
      break;
  }
}

// Sort utilities
export type SortField = 'name' | 'size' | 'date' | 'type';
export type SortDirection = 'asc' | 'desc';

export function sortImages(
  images: ImageData[],
  field: SortField,
  direction: SortDirection
): ImageData[] {
  return [...images].sort((a, b) => {
    let comparison = 0;
    
    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = (a.size || 0) - (b.size || 0);
        break;
      case 'date':
        comparison = (a.dateAdded?.getTime() || 0) - (b.dateAdded?.getTime() || 0);
        break;
      case 'type':
        comparison = (a.type || '').localeCompare(b.type || '');
        break;
    }
    
    return direction === 'desc' ? -comparison : comparison;
  });
}
