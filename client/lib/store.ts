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
    name: 'Birth of a son ,, dressed as a girl ,, being pretty ,, gang of girls.jpg',
    title: 'Birth of a son',
    url: 'https://images.unsplash.com/photo-1494790108755-2616c5e2e3f8?w=400&h=300&fit=crop',
    folder: 'training',
    size: 1200000,
    type: 'image/jpeg',
    dateAdded: new Date('2024-01-15'),
    tags: [],
    rawTags: []
  },
  {
    id: '2',
    name: 'Makeup transformation ,, crossdressing tutorial ,, feminine look.png',
    title: 'Makeup transformation',
    url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=300&fit=crop',
    folder: 'tutorials',
    size: 890000,
    type: 'image/png',
    dateAdded: new Date('2024-01-16'),
    tags: [],
    rawTags: []
  },
  {
    id: '3',
    name: 'Fashion collection ,, latex dress ,, elegant outfit ,, party wear.jpg',
    title: 'Fashion collection',
    url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=300&fit=crop',
    folder: 'outfits',
    size: 1500000,
    type: 'image/jpeg',
    dateAdded: new Date('2024-01-17'),
    tags: [],
    rawTags: []
  },
  {
    id: '4',
    name: 'Training session ,, sissy hypno ,, mind control.webp',
    title: 'Training session',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop',
    folder: 'training',
    size: 750000,
    type: 'image/webp',
    dateAdded: new Date('2024-01-18'),
    tags: [],
    rawTags: []
  },
  {
    id: '5',
    name: 'Complete guide ,, feminization steps ,, transformation journey.jpg',
    title: 'Complete guide',
    url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=300&fit=crop',
    folder: 'guides',
    size: 980000,
    type: 'image/jpeg',
    dateAdded: new Date('2024-01-19'),
    tags: [],
    rawTags: []
  },
  {
    id: '6',
    name: 'Roleplay scenario ,, dominant mistress ,, submissive training.png',
    title: 'Roleplay scenario',
    url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=300&fit=crop',
    folder: 'roleplay',
    size: 1100000,
    type: 'image/png',
    dateAdded: new Date('2024-01-20'),
    tags: [],
    rawTags: []
  }
];

const createMockFolders = (): FolderData[] => [
  { id: 'training', name: 'Training Set', images: ['1', '4'] },
  { id: 'tutorials', name: 'Tutorials', images: ['2'] },
  { id: 'outfits', name: 'Outfits', images: ['3'] },
  { id: 'guides', name: 'Guides', images: ['5'] },
  { id: 'roleplay', name: 'Roleplay', images: ['6'] }
];

export const useAppStore = create<AppState>()((set, get) => ({
      // Initial state
      images: [],
      folders: [],
      tagVariants: [],
      searchQuery: '',
      selectedTags: [],
      selectedFolder: null,
      sortField: 'date',
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
        return sortImages(filtered, state.sortField, state.sortDirection);
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
