import { z } from 'zod';

export interface TagVariant {
  canonical: string;
  aliases: string[];
  count: number;
}

export interface ImageData {
  id: string;
  name: string;
  title: string;
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

// Extract title and tags from filename using comma-separated format
export function extractTitleAndTags(filename: string): { title: string; tags: string[] } {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Check if filename contains double commas (our special format)
  if (nameWithoutExt.includes(',,')) {
    const parts = nameWithoutExt.split(',,').map(part => part.trim());
    const title = parts[0] || nameWithoutExt;
    const tags = parts.slice(1).filter(tag => tag.length > 0);

    return {
      title,
      tags
    };
  }

  // Fallback to old behavior for files without double commas
  // Use the first part as title, rest as tags
  const delimiters = /[_\-\s,()\[\]{}]+/;
  const parts = nameWithoutExt.split(delimiters).filter(part => part.length > 1);

  if (parts.length === 0) {
    return {
      title: nameWithoutExt,
      tags: []
    };
  }

  // First 1-3 words become title, rest become tags
  const titleWords = parts.slice(0, Math.min(3, Math.ceil(parts.length / 2)));
  const tagWords = parts.slice(titleWords.length);

  return {
    title: titleWords.join(' '),
    tags: tagWords.filter(tag =>
      !tag.match(/^\d+$/) && // Remove numbers
      !['jpg', 'png', 'jpeg', 'webp', 'gif'].includes(tag.toLowerCase()) // Remove file extensions
    )
  };
}

// Legacy function for backward compatibility
export function extractRawTags(filename: string, folderName?: string): string[] {
  const { tags } = extractTitleAndTags(filename);

  // Add folder name parts if available
  if (folderName) {
    const delimiters = /[_\-\s,.()[\]{}]+/;
    const folderParts = folderName.split(delimiters)
      .map(part => part.toLowerCase().trim())
      .filter(part => part.length > 1);
    tags.push(...folderParts);
  }

  return [...new Set(tags)]; // Remove duplicates
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
  title: string;
  rawTags: string[];
  processedTags: string[];
} {
  const { title, tags } = extractTitleAndTags(filename);

  // Add folder tags if available
  const allRawTags = [...tags];
  if (folderName) {
    const delimiters = /[_\-\s,.()[\]{}]+/;
    const folderParts = folderName.split(delimiters)
      .map(part => part.toLowerCase().trim())
      .filter(part => part.length > 1);
    allRawTags.push(...folderParts);
  }

  const tagVariants = normalizeAndGroupTags(allRawTags);
  const processedTags = tagVariants.map(variant => variant.canonical);

  return {
    title,
    rawTags: allRawTags,
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
