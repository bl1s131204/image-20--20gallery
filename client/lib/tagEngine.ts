import { z } from "zod";

// Enhanced tag structure with comprehensive metadata
export interface TagVariant {
  canonical: string;
  aliases: string[];
  count: number;
  sources: TagSource[];
  confidence: number;
  lastUpdated: Date;
  userOverride?: boolean;
}

export interface TagSource {
  type: "filename" | "folder" | "user_folder" | "metadata" | "manual";
  value: string;
  imageId?: string;
  extractedAt: Date;
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
  rawTags: TagSource[];
  metadata?: {
    exif?: Record<string, any>;
    iptc?: Record<string, any>;
    xmp?: Record<string, any>;
  };
}

export interface FolderData {
  id: string;
  name: string;
  images: string[];
  userDefined?: boolean;
  userTags?: string[];
}

// Stopwords to filter out during tokenization
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "this",
  "that",
  "these",
  "those",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "can",
  "get",
  "got",
  "go",
  "went",
  "come",
  "came",
]);

// Enhanced common tag patterns for better canonicalization
const COMMON_TAG_PATTERNS = {
  "forced feminization": [
    "forced femanizartion",
    "forced femanization",
    "forced feminzation",
    "femanizartion",
    "feminzation",
  ],
  crossdressing: [
    "cross dressing",
    "cross-dressing",
    "cross_dress",
    "crossdresser",
    "crossdress",
  ],
  latex: ["latx", "latix", "latex_wear"],
  sissy: ["sissie", "sisie", "sissyy"],
  transformation: ["transform", "transf", "transformtion"],
  makeup: ["make up", "make-up", "makup"],
  training: ["trainig", "traning", "train"],
  dress: ["dresses", "dressed", "dressing"],
  outfit: ["outfits", "out fit"],
  tutorial: ["tut", "tutorail", "guide"],
  feminine: ["fem", "feminin", "feminne"],
  dominant: ["dom", "dominate", "dominat"],
  submissive: ["sub", "submisive", "submit"],
  roleplay: ["role play", "role-play", "rp"],
  hypno: ["hypnosis", "hipno", "hyp"],
  petplay: ["pet play", "pet-play", "puppy play"],
  bdsm: ["bd sm", "b.d.s.m"],
  humiliation: ["humiliate", "humiliation"],
  bondage: ["bound", "tied", "rope"],
};

// Get all common canonical tags
const COMMON_TAGS = Object.keys(COMMON_TAG_PATTERNS);

// Configuration for fuzzy matching
const FUZZY_CONFIG = {
  maxDistance: 3,
  minSimilarity: 0.7,
  enableSubsetMatching: true,
  enableRearrangement: true,
  minTokenLength: 2,
};

// Enhanced Levenshtein distance with optimizations
function levenshteinDistance(str1: string, str2: string): number {
  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  // Optimize for large strings
  if (Math.abs(str1.length - str2.length) > FUZZY_CONFIG.maxDistance) {
    return FUZZY_CONFIG.maxDistance + 1;
  }

  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

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
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

// Calculate similarity ratio
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

// Check if one tag is a subset of another
function isSubset(tag1: string, tag2: string): boolean {
  const tokens1 = tag1.split(/\s+/);
  const tokens2 = tag2.split(/\s+/);

  if (tokens1.length >= tokens2.length) return false;

  return tokens1.every((token) =>
    tokens2.some(
      (token2) =>
        calculateSimilarity(token, token2) >= FUZZY_CONFIG.minSimilarity,
    ),
  );
}

// Check if tags are rearrangements of each other
function areRearrangements(tag1: string, tag2: string): boolean {
  const tokens1 = tag1.split(/\s+/).sort();
  const tokens2 = tag2.split(/\s+/).sort();

  if (tokens1.length !== tokens2.length) return false;

  return tokens1.every(
    (token, index) =>
      calculateSimilarity(token, tokens2[index]) >= FUZZY_CONFIG.minSimilarity,
  );
}

// Normalize singular/plural forms
function normalizePlural(word: string): string {
  const pluralRules = [
    { suffix: "ies", replacement: "y" }, // babies -> baby
    { suffix: "ves", replacement: "f" }, // wolves -> wolf
    { suffix: "ses", replacement: "s" }, // dresses -> dress
    { suffix: "es", replacement: "" }, // boxes -> box
    { suffix: "s", replacement: "" }, // cats -> cat
  ];

  for (const rule of pluralRules) {
    if (word.endsWith(rule.suffix) && word.length > rule.suffix.length + 1) {
      return word.slice(0, -rule.suffix.length) + rule.replacement;
    }
  }

  return word;
}

// Advanced tokenization with multi-delimiter support
function tokenizeText(text: string): string[] {
  if (!text) return [];

  // First pass: split by various delimiters
  const delimiters = /[_\-\s,.()[\]{}|;:!?"'`~@#$%^&*+=<>\/\\]+/;
  let tokens = text.split(delimiters);

  // Second pass: handle camelCase and PascalCase
  const expandedTokens: string[] = [];
  tokens.forEach((token) => {
    if (token.length > 1) {
      // Split camelCase: forcedFeminization -> forced Feminization
      const camelSplit = token.replace(/([a-z])([A-Z])/g, "$1 $2");
      expandedTokens.push(...camelSplit.split(/\s+/));
    }
  });

  // Third pass: normalize and clean
  const cleanedTokens = expandedTokens
    .map((token) => {
      // Convert to lowercase
      let cleaned = token.toLowerCase().trim();

      // Remove trailing numbers (example_001 -> example)
      cleaned = cleaned.replace(/\d+$/, "");

      // Remove punctuation
      cleaned = cleaned.replace(/[^a-zA-Z0-9\s]/g, "");

      // Normalize plural forms
      cleaned = normalizePlural(cleaned);

      return cleaned;
    })
    .filter((token) => {
      // Filter criteria
      return (
        token.length >= FUZZY_CONFIG.minTokenLength && // Min length
        !STOPWORDS.has(token) && // Not a stopword
        !token.match(/^\d+$/) && // Not just numbers
        !["jpg", "png", "jpeg", "webp", "gif", "bmp", "tiff", "svg"].includes(
          token,
        )
      ); // Not file extensions
    });

  return [...new Set(cleanedTokens)]; // Remove duplicates
}

// Extract from brackets and parentheses
function extractBracketContent(text: string): string[] {
  const patterns = [
    /\(([^)]+)\)/g, // (content)
    /\[([^\]]+)\]/g, // [content]
    /\{([^}]+)\}/g, // {content}
  ];

  const extracted: string[] = [];
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      extracted.push(...tokenizeText(match[1]));
    }
  });

  return extracted;
}

// Extract title and tags from filename using enhanced parsing
export function extractTitleAndTags(filename: string): {
  title: string;
  tags: TagSource[];
} {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  const extractedAt = new Date();

  // Handle comma-separated format (title ,, tag1 ,, tag2)
  if (nameWithoutExt.includes(",,")) {
    const parts = nameWithoutExt.split(",,").map((part) => part.trim());
    const title = parts[0] || nameWithoutExt;
    const tagSources: TagSource[] = [];

    parts.slice(1).forEach((tagText) => {
      if (tagText.length > 0) {
        tagSources.push({
          type: "filename",
          value: tagText.trim(),
          extractedAt,
        });
      }
    });

    return { title, tags: tagSources };
  }

  // Enhanced tokenization for non-comma format
  const tokens = tokenizeText(nameWithoutExt);
  const bracketContent = extractBracketContent(nameWithoutExt);

  // Combine tokens with bracket content
  const allTokens = [...tokens, ...bracketContent];

  if (allTokens.length === 0) {
    return {
      title: nameWithoutExt,
      tags: [],
    };
  }

  // Smart title extraction (first 1-3 meaningful words)
  const titleWords = allTokens.slice(
    0,
    Math.min(3, Math.ceil(allTokens.length / 3)),
  );
  const remainingTokens = allTokens.slice(titleWords.length);

  const tagSources: TagSource[] = remainingTokens.map((token) => ({
    type: "filename" as const,
    value: token,
    extractedAt,
  }));

  return {
    title: titleWords.join(" "),
    tags: tagSources,
  };
}

// Extract tags from folder paths and names
export function extractFolderTags(
  folderPath: string,
  userDefinedName?: string,
): TagSource[] {
  const extractedAt = new Date();
  const tagSources: TagSource[] = [];

  // Extract from folder path
  if (folderPath) {
    const pathParts = folderPath.split("/").filter((part) => part.length > 0);
    pathParts.forEach((part) => {
      const tokens = tokenizeText(part);
      tokens.forEach((token) => {
        tagSources.push({
          type: "folder",
          value: token,
          extractedAt,
        });
      });
    });
  }

  // Extract from user-defined folder name
  if (userDefinedName) {
    const tokens = tokenizeText(userDefinedName);
    tokens.forEach((token) => {
      tagSources.push({
        type: "user_folder",
        value: token,
        extractedAt,
      });
    });
  }

  return tagSources;
}

// Extract tags from metadata (EXIF, IPTC, XMP)
export function extractMetadataTags(metadata?: {
  exif?: any;
  iptc?: any;
  xmp?: any;
}): TagSource[] {
  const extractedAt = new Date();
  const tagSources: TagSource[] = [];

  if (!metadata) return tagSources;

  // Extract from EXIF
  if (metadata.exif) {
    const exifFields = [
      "ImageDescription",
      "UserComment",
      "Artist",
      "Copyright",
    ];
    exifFields.forEach((field) => {
      if (metadata.exif[field]) {
        const tokens = tokenizeText(metadata.exif[field]);
        tokens.forEach((token) => {
          tagSources.push({
            type: "metadata",
            value: token,
            extractedAt,
          });
        });
      }
    });
  }

  // Extract from IPTC
  if (metadata.iptc) {
    const iptcFields = ["keywords", "caption", "title", "category"];
    iptcFields.forEach((field) => {
      if (metadata.iptc[field]) {
        const value = Array.isArray(metadata.iptc[field])
          ? metadata.iptc[field].join(" ")
          : metadata.iptc[field];
        const tokens = tokenizeText(value);
        tokens.forEach((token) => {
          tagSources.push({
            type: "metadata",
            value: token,
            extractedAt,
          });
        });
      }
    });
  }

  // Extract from XMP
  if (metadata.xmp) {
    const xmpFields = ["dc:subject", "dc:title", "dc:description"];
    xmpFields.forEach((field) => {
      if (metadata.xmp[field]) {
        const tokens = tokenizeText(metadata.xmp[field]);
        tokens.forEach((token) => {
          tagSources.push({
            type: "metadata",
            value: token,
            extractedAt,
          });
        });
      }
    });
  }

  return tagSources;
}

// Select the best canonical tag from a group
function selectCanonicalTag(
  members: string[],
  tagCounts: Map<string, { count: number; sources: TagSource[] }>,
): string {
  // Prioritization rules:
  // 1. Common patterns (highest priority)
  // 2. Most frequent
  // 3. Least typos (highest similarity to common patterns)
  // 4. Most complete structure
  // 5. User overrides (if any)

  // Check for common patterns first
  for (const [canonical, patterns] of Object.entries(COMMON_TAG_PATTERNS)) {
    if (members.includes(canonical)) return canonical;

    for (const pattern of patterns) {
      if (members.includes(pattern)) return canonical;
    }
  }

  // Find most frequent
  let bestCandidate = members[0];
  let maxCount = tagCounts.get(bestCandidate)?.count || 0;
  let maxCompleteness = bestCandidate.split(" ").length;

  members.forEach((member) => {
    const count = tagCounts.get(member)?.count || 0;
    const completeness = member.split(" ").length;
    const hasUserSource = tagCounts
      .get(member)
      ?.sources.some((s) => s.type === "user_folder" || s.type === "manual");

    // Prefer user-defined tags
    if (
      hasUserSource &&
      !tagCounts
        .get(bestCandidate)
        ?.sources.some((s) => s.type === "user_folder" || s.type === "manual")
    ) {
      bestCandidate = member;
      maxCount = count;
      maxCompleteness = completeness;
      return;
    }

    // Prefer higher frequency
    if (count > maxCount) {
      bestCandidate = member;
      maxCount = count;
      maxCompleteness = completeness;
    }

    // Prefer more complete tags (same frequency)
    if (count === maxCount && completeness > maxCompleteness) {
      bestCandidate = member;
      maxCompleteness = completeness;
    }
  });

  return bestCandidate;
}

// Calculate group coherence (average similarity within group)
function calculateGroupCoherence(members: string[]): number {
  if (members.length <= 1) return 1.0;

  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      totalSimilarity += calculateSimilarity(members[i], members[j]);
      comparisons++;
    }
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 1.0;
}

// Advanced fuzzy grouping with comprehensive matching
export function normalizeAndGroupTags(
  allTagSources: TagSource[],
): TagVariant[] {
  // Count tag sources and build frequency map
  const tagCounts = new Map<string, { count: number; sources: TagSource[] }>();

  allTagSources.forEach((source) => {
    const existing = tagCounts.get(source.value) || { count: 0, sources: [] };
    existing.count++;
    existing.sources.push(source);
    tagCounts.set(source.value, existing);
  });

  const uniqueTags = Array.from(tagCounts.keys());
  const tagGroups = new Map<
    string,
    {
      members: Set<string>;
      sources: TagSource[];
      confidence: number;
    }
  >();
  const processed = new Set<string>();

  // Group similar tags using multiple strategies
  uniqueTags.forEach((tag) => {
    if (processed.has(tag)) return;

    const group = {
      members: new Set<string>([tag]),
      sources: [...tagCounts.get(tag)!.sources],
      confidence: 1.0,
    };
    processed.add(tag);

    // Strategy 1: Direct fuzzy matching
    uniqueTags.forEach((otherTag) => {
      if (processed.has(otherTag) || tag === otherTag) return;

      const similarity = calculateSimilarity(tag, otherTag);
      const distance = levenshteinDistance(tag, otherTag);

      if (
        similarity >= FUZZY_CONFIG.minSimilarity &&
        distance <= FUZZY_CONFIG.maxDistance
      ) {
        group.members.add(otherTag);
        group.sources.push(...tagCounts.get(otherTag)!.sources);
        processed.add(otherTag);
      }
    });

    // Strategy 2: Subset matching (if enabled)
    if (FUZZY_CONFIG.enableSubsetMatching) {
      uniqueTags.forEach((otherTag) => {
        if (processed.has(otherTag) || tag === otherTag) return;

        if (isSubset(tag, otherTag) || isSubset(otherTag, tag)) {
          group.members.add(otherTag);
          group.sources.push(...tagCounts.get(otherTag)!.sources);
          processed.add(otherTag);
        }
      });
    }

    // Strategy 3: Token rearrangement (if enabled)
    if (FUZZY_CONFIG.enableRearrangement) {
      uniqueTags.forEach((otherTag) => {
        if (processed.has(otherTag) || tag === otherTag) return;

        if (areRearrangements(tag, otherTag)) {
          group.members.add(otherTag);
          group.sources.push(...tagCounts.get(otherTag)!.sources);
          processed.add(otherTag);
        }
      });
    }

    // Strategy 4: Common pattern matching
    Object.entries(COMMON_TAG_PATTERNS).forEach(([canonical, patterns]) => {
      patterns.forEach((pattern) => {
        if (
          Array.from(group.members).some(
            (member) =>
              calculateSimilarity(member, pattern) >=
              FUZZY_CONFIG.minSimilarity,
          )
        ) {
          // Update group to use canonical tag
          const newGroup = {
            members: new Set([canonical, ...Array.from(group.members)]),
            sources: group.sources,
            confidence: Math.min(group.confidence + 0.2, 1.0),
          };
          tagGroups.set(canonical, newGroup);
          return;
        }
      });
    });

    // Canonicalization: Select the best representative
    const canonical = selectCanonicalTag(Array.from(group.members), tagCounts);

    // Calculate confidence based on group coherence
    const avgSimilarity = calculateGroupCoherence(Array.from(group.members));
    group.confidence = Math.max(0.1, avgSimilarity);

    tagGroups.set(canonical, group);
  });

  // Convert to TagVariant format
  const tagVariants: TagVariant[] = [];

  tagGroups.forEach((group, canonical) => {
    const aliases = Array.from(group.members).filter(
      (tag) => tag !== canonical,
    );
    const totalCount = Array.from(group.members).reduce(
      (sum, tag) => sum + (tagCounts.get(tag)?.count || 0),
      0,
    );

    tagVariants.push({
      canonical,
      aliases,
      count: totalCount,
      sources: group.sources,
      confidence: group.confidence,
      lastUpdated: new Date(),
    });
  });

  // Sort by confidence and count
  return tagVariants.sort((a, b) => {
    if (Math.abs(a.confidence - b.confidence) > 0.1) {
      return b.confidence - a.confidence;
    }
    return b.count - a.count;
  });
}

// Comprehensive tag processing with all sources
export function processImageTags(
  filename: string,
  folderName?: string,
  userFolderName?: string,
  metadata?: { exif?: any; iptc?: any; xmp?: any },
  imageId?: string,
): {
  title: string;
  rawTags: TagSource[];
  processedTags: string[];
  tagVariants: TagVariant[];
} {
  const { title, tags: filenameTags } = extractTitleAndTags(filename);

  // Collect all tag sources
  const allTagSources: TagSource[] = [
    ...filenameTags.map((source) => ({ ...source, imageId })),
    ...extractFolderTags(folderName || "", userFolderName).map((source) => ({
      ...source,
      imageId,
    })),
    ...extractMetadataTags(metadata).map((source) => ({ ...source, imageId })),
  ];

  // Process and group tags
  const tagVariants = normalizeAndGroupTags(allTagSources);
  const processedTags = tagVariants.map((variant) => variant.canonical);

  return {
    title,
    rawTags: allTagSources,
    processedTags,
    tagVariants,
  };
}

// Create fuzzy search index for fast tag lookup
export class TagSearchIndex {
  private canonicalIndex = new Map<string, TagVariant>();
  private aliasIndex = new Map<string, TagVariant>();
  private fuzzyIndex = new Map<string, TagVariant[]>();

  constructor(tagVariants: TagVariant[]) {
    this.buildIndex(tagVariants);
  }

  private buildIndex(tagVariants: TagVariant[]) {
    tagVariants.forEach((variant) => {
      // Index canonical tag
      this.canonicalIndex.set(variant.canonical, variant);

      // Index aliases
      variant.aliases.forEach((alias) => {
        this.aliasIndex.set(alias, variant);
      });

      // Build fuzzy index (for performance)
      const allTags = [variant.canonical, ...variant.aliases];
      allTags.forEach((tag) => {
        const tokens = tokenizeText(tag);
        tokens.forEach((token) => {
          if (!this.fuzzyIndex.has(token)) {
            this.fuzzyIndex.set(token, []);
          }
          this.fuzzyIndex.get(token)!.push(variant);
        });
      });
    });
  }

  // Search for tags matching query (supports fuzzy matching)
  search(query: string): TagVariant[] {
    const results = new Set<TagVariant>();
    const normalizedQuery = query.toLowerCase().trim();

    // Exact canonical match
    const canonicalMatch = this.canonicalIndex.get(normalizedQuery);
    if (canonicalMatch) results.add(canonicalMatch);

    // Exact alias match
    const aliasMatch = this.aliasIndex.get(normalizedQuery);
    if (aliasMatch) results.add(aliasMatch);

    // Fuzzy token matching
    const queryTokens = tokenizeText(normalizedQuery);
    queryTokens.forEach((token) => {
      // Direct token match
      const tokenMatches = this.fuzzyIndex.get(token);
      if (tokenMatches) {
        tokenMatches.forEach((match) => results.add(match));
      }

      // Fuzzy token matching
      for (const [indexToken, variants] of this.fuzzyIndex.entries()) {
        if (
          calculateSimilarity(token, indexToken) >= FUZZY_CONFIG.minSimilarity
        ) {
          variants.forEach((variant) => results.add(variant));
        }
      }
    });

    // Convert to array and sort by relevance
    return Array.from(results).sort((a, b) => {
      // Prefer exact matches
      const aExact =
        a.canonical === normalizedQuery || a.aliases.includes(normalizedQuery);
      const bExact =
        b.canonical === normalizedQuery || b.aliases.includes(normalizedQuery);
      if (aExact !== bExact) return aExact ? -1 : 1;

      // Then by confidence and count
      if (Math.abs(a.confidence - b.confidence) > 0.1) {
        return b.confidence - a.confidence;
      }
      return b.count - a.count;
    });
  }

  // Get all canonical tags sorted by frequency
  getAllCanonical(): string[] {
    return Array.from(this.canonicalIndex.values())
      .sort((a, b) => b.count - a.count)
      .map((variant) => variant.canonical);
  }

  // Update index with new tag variants
  update(tagVariants: TagVariant[]) {
    this.canonicalIndex.clear();
    this.aliasIndex.clear();
    this.fuzzyIndex.clear();
    this.buildIndex(tagVariants);
  }
}

// Legacy function for backward compatibility
export function extractRawTags(
  filename: string,
  folderName?: string,
): string[] {
  const { tags } = extractTitleAndTags(filename);
  const folderTags = extractFolderTags(folderName || "");

  const allTags = [...tags, ...folderTags].map((source) => source.value);
  return [...new Set(allTags)];
}

// Enhanced sorting with tag-based sorting
export type SortField =
  | "name"
  | "title"
  | "size"
  | "date"
  | "type"
  | "tags"
  | "relevance";
export type SortDirection = "asc" | "desc";

// Calculate search relevance score
function calculateSearchRelevance(image: ImageData, query: string): number {
  const normalizedQuery = query.toLowerCase();
  let score = 0;

  // Title match (highest weight)
  if (image.title.toLowerCase().includes(normalizedQuery)) {
    score += 100;
  }

  // Exact tag match (high weight)
  const exactTagMatch = image.tags.some(
    (tag) => tag.toLowerCase() === normalizedQuery,
  );
  if (exactTagMatch) score += 80;

  // Partial tag match (medium weight)
  const partialTagMatch = image.tags.some((tag) =>
    tag.toLowerCase().includes(normalizedQuery),
  );
  if (partialTagMatch) score += 50;

  // Filename match (lower weight)
  if (image.name.toLowerCase().includes(normalizedQuery)) {
    score += 30;
  }

  // Fuzzy tag match (lowest weight)
  const fuzzyTagMatch = image.tags.some(
    (tag) => calculateSimilarity(tag.toLowerCase(), normalizedQuery) >= 0.7,
  );
  if (fuzzyTagMatch) score += 20;

  return score;
}

export function sortImages(
  images: ImageData[],
  field: SortField,
  direction: SortDirection,
  searchQuery?: string,
): ImageData[] {
  return [...images].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "size":
        comparison = (a.size || 0) - (b.size || 0);
        break;
      case "date":
        comparison =
          (a.dateAdded?.getTime() || 0) - (b.dateAdded?.getTime() || 0);
        break;
      case "type":
        comparison = (a.type || "").localeCompare(b.type || "");
        break;
      case "tags":
        comparison = a.tags.length - b.tags.length;
        break;
      case "relevance":
        if (searchQuery) {
          const relevanceA = calculateSearchRelevance(a, searchQuery);
          const relevanceB = calculateSearchRelevance(b, searchQuery);
          comparison = relevanceA - relevanceB;
        } else {
          comparison = b.tags.length - a.tags.length; // Fallback to tag count
        }
        break;
    }

    return direction === "desc" ? -comparison : comparison;
  });
}

// Performance optimization: debounced tag processing
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Storage utilities for tag persistence
export const TagStorage = {
  // Save tag variants to localStorage
  save(tagVariants: TagVariant[], key = "tagEngine_variants") {
    try {
      localStorage.setItem(key, JSON.stringify(tagVariants));
    } catch (error) {
      console.warn("Failed to save tag variants to localStorage:", error);
    }
  },

  // Load tag variants from localStorage
  load(key = "tagEngine_variants"): TagVariant[] {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored).map((variant: any) => ({
          ...variant,
          lastUpdated: new Date(variant.lastUpdated),
          sources: variant.sources.map((source: any) => ({
            ...source,
            extractedAt: new Date(source.extractedAt),
          })),
        }));
      }
    } catch (error) {
      console.warn("Failed to load tag variants from localStorage:", error);
    }
    return [];
  },

  // Clear stored tag variants
  clear(key = "tagEngine_variants") {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Failed to clear tag variants from localStorage:", error);
    }
  },
};

// AI-assisted tagging utilities (optional enhancement)
export const AITagging = {
  // Suggest tags based on existing patterns
  suggestTags(filename: string, existingTags: TagVariant[]): string[] {
    const suggestions: string[] = [];
    const { title } = extractTitleAndTags(filename);
    const titleTokens = tokenizeText(title);

    // Find related tags based on co-occurrence patterns
    const relatedTags = new Map<string, number>();

    existingTags.forEach((variant) => {
      variant.sources.forEach((source) => {
        if (source.type === "filename") {
          const sourceTokens = tokenizeText(source.value);
          const hasCommonToken = titleTokens.some((token) =>
            sourceTokens.some(
              (sourceToken) => calculateSimilarity(token, sourceToken) >= 0.8,
            ),
          );

          if (hasCommonToken) {
            const currentCount = relatedTags.get(variant.canonical) || 0;
            relatedTags.set(variant.canonical, currentCount + 1);
          }
        }
      });
    });

    // Return top suggestions
    const sortedSuggestions = Array.from(relatedTags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    return sortedSuggestions;
  },

  // Enhance tags with semantic understanding
  enhanceWithSemantics(tags: string[]): string[] {
    const enhanced = [...tags];

    // Add semantic relationships
    tags.forEach((tag) => {
      if (tag.includes("dress") && !enhanced.includes("clothing")) {
        enhanced.push("clothing");
      }
      if (tag.includes("makeup") && !enhanced.includes("beauty")) {
        enhanced.push("beauty");
      }
      if (tag.includes("tutorial") && !enhanced.includes("educational")) {
        enhanced.push("educational");
      }
    });

    return [...new Set(enhanced)];
  },
};

// Theme utilities (keeping existing functionality)
export type Theme = "light" | "dark" | "gold" | "neon" | "cyberpunk";

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  // Remove all theme classes
  root.classList.remove("dark", "theme-gold", "theme-neon", "theme-cyberpunk");

  // Apply selected theme
  switch (theme) {
    case "dark":
      root.classList.add("dark");
      break;
    case "gold":
      root.classList.add("theme-gold");
      break;
    case "neon":
      root.classList.add("theme-neon");
      break;
    case "cyberpunk":
      root.classList.add("theme-cyberpunk");
      break;
    case "light":
    default:
      // Light theme is default, no class needed
      break;
  }
}

// Drive file interface and utilities (keeping existing)
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  thumbnailLink?: string;
  webContentLink?: string;
}

export function parseGoogleDriveLink(url: string): string | null {
  const patterns = [
    /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9-_]+)/,
    /drive\.google\.com\/drive\/u\/\d+\/folders\/([a-zA-Z0-9-_]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9-_]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Export the enhanced tag engine as default
export default {
  TokenizeText: tokenizeText,
  ExtractTitleAndTags: extractTitleAndTags,
  ExtractFolderTags: extractFolderTags,
  ExtractMetadataTags: extractMetadataTags,
  ProcessImageTags: processImageTags,
  NormalizeAndGroupTags: normalizeAndGroupTags,
  TagSearchIndex,
  TagStorage,
  AITagging,
  FUZZY_CONFIG,
  COMMON_TAG_PATTERNS,
};
