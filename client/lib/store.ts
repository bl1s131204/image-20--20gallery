import { create } from 'zustand';
import { ImageData, FolderData, TagVariant, SortField, SortDirection, processImageTags, normalizeAndGroupTags, sortImages } from './tagEngine';

interface AppState {
  // Images and folders
  images: ImageData[];
  folders: FolderData[];
  tagVariants: TagVariant[];
  
  // UI state
  searchQuery: string;
  selectedTags: string[];
  selectedFolder: string | null;
  sortField: SortField;
  sortDirection: SortDirection;
  showFilters: boolean;
  
  // Actions
  addImages: (files: File[]) => void;
  removeImage: (id: string) => void;
  updateImage: (id: string, updates: Partial<ImageData>) => void;
  
  createFolder: (name: string) => void;
  deleteFolder: (id: string) => void;
  renameFolder: (id: string, name: string) => void;
  addImageToFolder: (imageId: string, folderId: string) => void;
  removeImageFromFolder: (imageId: string, folderId: string) => void;
  
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: string) => void;
  setSelectedFolder: (folderId: string | null) => void;
  setSorting: (field: SortField, direction: SortDirection) => void;
  toggleFilters: () => void;
  
  // Computed
  getFilteredImages: () => ImageData[];
  refreshTagVariants: () => void;
}

// Mock image data for demonstration
const createMockImages = (): ImageData[] => [
  {
    id: '1',
    name: 'Mountain landscape ,, nature photography ,, scenic view.jpg',
    title: 'Mountain landscape',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    folder: 'nature',
    size: 1200000,
    type: 'image/jpeg',
    dateAdded: new Date('2024-01-15'),
    tags: [],
    rawTags: []
  },
  {
    id: '2',
    name: 'City architecture ,, modern buildings ,, urban design.png',
    title: 'City architecture',
    url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop',
    folder: 'architecture',
    size: 890000,
    type: 'image/png',
    dateAdded: new Date('2024-01-16'),
    tags: [],
    rawTags: []
  },
  {
    id: '3',
    name: 'Abstract art ,, colorful painting ,, creative expression.jpg',
    title: 'Abstract art',
    url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop',
    folder: 'art',
    size: 1500000,
    type: 'image/jpeg',
    dateAdded: new Date('2024-01-17'),
    tags: [],
    rawTags: []
  },
  {
    id: '4',
    name: 'Ocean waves ,, beach photography ,, coastal beauty.webp',
    title: 'Ocean waves',
    url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&h=300&fit=crop',
    folder: 'nature',
    size: 750000,
    type: 'image/webp',
    dateAdded: new Date('2024-01-18'),
    tags: [],
    rawTags: []
  },
  {
    id: '5',
    name: 'Food photography ,, culinary art ,, gourmet presentation.jpg',
    title: 'Food photography',
    url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
    folder: 'food',
    size: 980000,
    type: 'image/jpeg',
    dateAdded: new Date('2024-01-19'),
    tags: [],
    rawTags: []
  },
  {
    id: '6',
    name: 'Technology concept ,, digital innovation ,, modern workspace.png',
    title: 'Technology concept',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
    folder: 'technology',
    size: 1100000,
    type: 'image/png',
    dateAdded: new Date('2024-01-20'),
    tags: [],
    rawTags: []
  }
];

const createMockFolders = (): FolderData[] => [
  { id: 'nature', name: 'Nature & Landscape', images: ['1', '4'] },
  { id: 'architecture', name: 'Architecture', images: ['2'] },
  { id: 'art', name: 'Art & Creative', images: ['3'] },
  { id: 'food', name: 'Food & Culinary', images: ['5'] },
  { id: 'technology', name: 'Technology', images: ['6'] }
];

export const useAppStore = create<AppState>()((set, get) => ({
      // Initial state
      images: [],
      folders: [],
      tagVariants: [],
      searchQuery: '',
      selectedTags: [],
      selectedFolder: null,
      sortField: 'relevance',
      sortDirection: 'desc',
      showFilters: false,

      // Actions
      addImages: (files: File[]) => {
        const newImages: ImageData[] = files.map((file, index) => {
          const imageId = Date.now().toString() + index;
          const { title, rawTags, processedTags } = processImageTags(
            file.name,
            undefined,
            undefined,
            undefined,
            imageId
          );

          return {
            id: imageId,
            name: file.name,
            title,
            url: URL.createObjectURL(file),
            size: file.size,
            type: file.type,
            dateAdded: new Date(),
            tags: processedTags,
            rawTags
          };
        });

        set(state => ({
          images: [...state.images, ...newImages]
        }));
        
        get().refreshTagVariants();
      },

      removeImage: (id: string) => {
        set(state => ({
          images: state.images.filter(img => img.id !== id),
          folders: state.folders.map(folder => ({
            ...folder,
            images: folder.images.filter(imgId => imgId !== id)
          }))
        }));
        get().refreshTagVariants();
      },

      updateImage: (id: string, updates: Partial<ImageData>) => {
        set(state => ({
          images: state.images.map(img => 
            img.id === id ? { ...img, ...updates } : img
          )
        }));
      },

      createFolder: (name: string) => {
        const newFolder: FolderData = {
          id: Date.now().toString(),
          name,
          images: [],
          userDefined: true
        };
        
        set(state => ({
          folders: [...state.folders, newFolder]
        }));
      },

      deleteFolder: (id: string) => {
        set(state => ({
          folders: state.folders.filter(folder => folder.id !== id),
          selectedFolder: state.selectedFolder === id ? null : state.selectedFolder
        }));
      },

      renameFolder: (id: string, name: string) => {
        set(state => ({
          folders: state.folders.map(folder =>
            folder.id === id ? { ...folder, name } : folder
          )
        }));
      },

      addImageToFolder: (imageId: string, folderId: string) => {
        set(state => ({
          folders: state.folders.map(folder =>
            folder.id === folderId 
              ? { ...folder, images: [...folder.images, imageId] }
              : folder
          ),
          images: state.images.map(img =>
            img.id === imageId ? { ...img, folder: folderId } : img
          )
        }));
      },

      removeImageFromFolder: (imageId: string, folderId: string) => {
        set(state => ({
          folders: state.folders.map(folder =>
            folder.id === folderId
              ? { ...folder, images: folder.images.filter(id => id !== imageId) }
              : folder
          ),
          images: state.images.map(img =>
            img.id === imageId ? { ...img, folder: undefined } : img
          )
        }));
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      toggleTag: (tag: string) => {
        set(state => ({
          selectedTags: state.selectedTags.includes(tag)
            ? state.selectedTags.filter(t => t !== tag)
            : [...state.selectedTags, tag]
        }));
      },

      setSelectedFolder: (folderId: string | null) => {
        set({ selectedFolder: folderId });
      },

      setSorting: (field: SortField, direction: SortDirection) => {
        set({ sortField: field, sortDirection: direction });
      },

      toggleFilters: () => {
        set(state => ({ showFilters: !state.showFilters }));
      },

      // Computed
      getFilteredImages: () => {
        const state = get();
        let filtered = state.images;

        // Filter by search query
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter(img =>
            img.name.toLowerCase().includes(query) ||
            img.title.toLowerCase().includes(query) ||
            img.tags.some(tag => tag.toLowerCase().includes(query)) ||
            img.rawTags.some(tag => tag.toLowerCase().includes(query)) ||
            (img.folder && state.folders.find(f => f.id === img.folder)?.name.toLowerCase().includes(query))
          );
        }

        // Filter by selected tags
        if (state.selectedTags.length > 0) {
          filtered = filtered.filter(img =>
            state.selectedTags.every(selectedTag =>
              img.tags.some(tag => tag.includes(selectedTag))
            )
          );
        }

        // Filter by selected folder
        if (state.selectedFolder) {
          filtered = filtered.filter(img => img.folder === state.selectedFolder);
        }

        // Apply sorting
        return sortImages(filtered, state.sortField, state.sortDirection, state.searchQuery);
      },

      refreshTagVariants: () => {
        const state = get();
        const allRawTagSources = state.images.flatMap(img => img.rawTags);
        const tagVariants = normalizeAndGroupTags(allRawTagSources);

        set({ tagVariants });

        // Update processed tags on images
        set(state => ({
          images: state.images.map(img => {
            const rawTagValues = img.rawTags.map(source => source.value);
            const processedTags = tagVariants
              .filter(variant =>
                variant.aliases.some(alias => rawTagValues.includes(alias)) ||
                rawTagValues.includes(variant.canonical)
              )
              .map(variant => variant.canonical);

            return { ...img, tags: processedTags };
          })
        }));
      }
    }));

// Initialize with mock data if empty
export function initializeMockData() {
  const store = useAppStore.getState();
  if (store.images.length === 0) {
    const mockImages = createMockImages();
    const mockFolders = createMockFolders();
    
    // Process tags for mock images
    const processedImages = mockImages.map(img => {
      const folderName = mockFolders.find(f => f.id === img.folder)?.name;
      const { title, rawTags, processedTags } = processImageTags(
        img.name,
        folderName,
        undefined,
        undefined,
        img.id
      );
      return { ...img, title, rawTags, tags: processedTags };
    });
    
    useAppStore.setState({
      images: processedImages,
      folders: mockFolders
    });
    
    store.refreshTagVariants();
  }
}
