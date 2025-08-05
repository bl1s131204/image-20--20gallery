import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ImageData,
  FolderData,
  TagVariant,
  SortField,
  SortDirection,
  processImageTags,
  normalizeAndGroupTags,
  sortImages,
} from "./tagEngine";
import {
  initializeAppDatabase,
  saveAppData,
  loadAppData,
  saveSessionData,
  scheduleAutoSave,
  loadUserAppData,
  saveUserImage,
  saveUserFolder,
} from "./storageManager";
import { useUserStore } from "./userStore\";rStore\";ore\";tore";

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
  clearImages: () => void;

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

  // Persistence
  saveToStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  loadUserData: (userId: string) => Promise<void>;
  isLoaded: boolean;
  setLoaded: (loaded: boolean) => void;

  // Privacy management
  toggleImagePrivacy: (imageId: string, isPrivate: boolean) => void;
  toggleFolderPrivacy: (folderId: string, isPrivate: boolean) => void;
}

// Mock image data for demonstration - empty by default
const createMockImages = (): ImageData[] => [];

const createMockFolders = (): FolderData[] => [];

export const useAppStore = create<AppState>()((set, get) => ({
  // Initial state
  images: [],
  folders: [],
  tagVariants: [],
  searchQuery: "",
  selectedTags: [],
  selectedFolder: null,
  sortField: "relevance",
  sortDirection: "desc",
  showFilters: false,
  isLoaded: false,

  // Actions
  addImages: (files: File[]) => {
    const currentUser = useUserStore.getState().user;
    const newImages: ImageData[] = files.map((file, index) => {
      const imageId = Date.now().toString() + index;
      const { title, rawTags, processedTags } = processImageTags(
        file.name,
        undefined,
        undefined,
        undefined,
        imageId,
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
        rawTags,
      };
    });

    set((state) => ({
      images: [...state.images, ...newImages],
    }));

    get().refreshTagVariants();

    // Save images with user ownership if authenticated
    if (currentUser && !currentUser.isGuest) {
      newImages.forEach(image => {
        saveUserImage(image, currentUser.id, false); // Default to public
      });
    }

    // Auto-save after adding images
    scheduleAutoSave(() => get().saveToStorage());
  },

  removeImage: (id: string) => {
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
      folders: state.folders.map((folder) => ({
        ...folder,
        images: folder.images.filter((imgId) => imgId !== id),
      })),
    }));
    get().refreshTagVariants();

    // Auto-save after removing image
    scheduleAutoSave(() => get().saveToStorage());
  },

  updateImage: (id: string, updates: Partial<ImageData>) => {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, ...updates } : img,
      ),
    }));
  },

  clearImages: () => {
    set(() => ({
      images: [],
      tagVariants: [],
    }));

    // Auto-save after clearing images
    scheduleAutoSave(() => get().saveToStorage());
  },

  createFolder: (name: string) => {
    const currentUser = useUserStore.getState().user;
    const newFolder: FolderData = {
      id: Date.now().toString(),
      name,
      images: [],
      userDefined: true,
    };

    set((state) => ({
      folders: [...state.folders, newFolder],
    }));

    // Save folder with user ownership if authenticated
    if (currentUser && !currentUser.isGuest) {
      saveUserFolder(newFolder, currentUser.id, false, 'custom');
    }

    // Auto-save after creating folder
    scheduleAutoSave(() => get().saveToStorage());
  },

  deleteFolder: (id: string) => {
    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== id),
      selectedFolder: state.selectedFolder === id ? null : state.selectedFolder,
    }));

    // Auto-save after deleting folder
    scheduleAutoSave(() => get().saveToStorage());
  },

  renameFolder: (id: string, name: string) => {
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === id ? { ...folder, name } : folder,
      ),
    }));

    // Auto-save after renaming folder
    scheduleAutoSave(() => get().saveToStorage());
  },

  addImageToFolder: (imageId: string, folderId: string) => {
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === folderId
          ? { ...folder, images: [...folder.images, imageId] }
          : folder,
      ),
      images: state.images.map((img) =>
        img.id === imageId ? { ...img, folder: folderId } : img,
      ),
    }));
  },

  removeImageFromFolder: (imageId: string, folderId: string) => {
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === folderId
          ? { ...folder, images: folder.images.filter((id) => id !== imageId) }
          : folder,
      ),
      images: state.images.map((img) =>
        img.id === imageId ? { ...img, folder: undefined } : img,
      ),
    }));
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  toggleTag: (tag: string) => {
    set((state) => ({
      selectedTags: state.selectedTags.includes(tag)
        ? state.selectedTags.filter((t) => t !== tag)
        : [...state.selectedTags, tag],
    }));
  },

  setSelectedFolder: (folderId: string | null) => {
    set({ selectedFolder: folderId });
  },

  setSorting: (field: SortField, direction: SortDirection) => {
    set({ sortField: field, sortDirection: direction });
  },

  toggleFilters: () => {
    set((state) => ({ showFilters: !state.showFilters }));
  },

  // Computed
  getFilteredImages: () => {
    const state = get();
    let filtered = state.images;

    // Filter by search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          img.name.toLowerCase().includes(query) ||
          img.title.toLowerCase().includes(query) ||
          img.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          img.rawTags.some((tag) => tag.toLowerCase().includes(query)) ||
          (img.folder &&
            state.folders
              .find((f) => f.id === img.folder)
              ?.name.toLowerCase()
              .includes(query)),
      );
    }

    // Filter by selected tags
    if (state.selectedTags.length > 0) {
      filtered = filtered.filter((img) =>
        state.selectedTags.every((selectedTag) =>
          img.tags.some((tag) => tag.includes(selectedTag)),
        ),
      );
    }

    // Filter by selected folder
    if (state.selectedFolder) {
      filtered = filtered.filter((img) => img.folder === state.selectedFolder);
    }

    // Apply sorting
    return sortImages(
      filtered,
      state.sortField,
      state.sortDirection,
      state.searchQuery,
    );
  },

  refreshTagVariants: () => {
    const state = get();
    const allRawTagSources = state.images.flatMap((img) => img.rawTags);
    const tagVariants = normalizeAndGroupTags(allRawTagSources);

    set({ tagVariants });

    // Update processed tags on images
    set((state) => ({
      images: state.images.map((img) => {
        const rawTagValues = img.rawTags.map((source) => source.value);
        const processedTags = tagVariants
          .filter(
            (variant) =>
              variant.aliases.some((alias) => rawTagValues.includes(alias)) ||
              rawTagValues.includes(variant.canonical),
          )
          .map((variant) => variant.canonical);

        return { ...img, tags: processedTags };
      }),
    }));
  },

  // Persistence functions
  saveToStorage: async () => {
    const state = get();
    try {
      await saveAppData({
        images: state.images,
        folders: state.folders,
        tagVariants: state.tagVariants,
        sessionData: {
          selectedFolder: state.selectedFolder,
          searchQuery: state.searchQuery,
          selectedTags: state.selectedTags,
          sortField: state.sortField,
          sortDirection: state.sortDirection,
        },
      });
    } catch (error) {
      console.error("Failed to save app data:", error);
    }
  },

  loadFromStorage: async () => {
    try {
      await initializeAppDatabase();
      const data = await loadAppData();

      set({
        images: data.images,
        folders: data.folders,
        tagVariants: data.tagVariants,
        selectedFolder: data.sessionData?.selectedFolder || null,
        searchQuery: data.sessionData?.searchQuery || "",
        selectedTags: data.sessionData?.selectedTags || [],
        sortField: (data.sessionData?.sortField as SortField) || "relevance",
        sortDirection: (data.sessionData?.sortDirection as SortDirection) || "desc",
        isLoaded: true,
      });

      console.log("App data loaded from storage:", {
        images: data.images.length,
        folders: data.folders.length,
        tagVariants: data.tagVariants.length,
      });
    } catch (error) {
      console.error("Failed to load app data:", error);
      set({ isLoaded: true }); // Set loaded even if failed to prevent blocking UI
    }
  },

  setLoaded: (loaded: boolean) => {
    set({ isLoaded: loaded });
  },

  loadUserData: async (userId: string) => {
    try {
      await initializeAppDatabase();
      const data = await loadUserAppData(userId);

      set({
        images: data.images || [],
        folders: data.folders || [],
        tagVariants: data.tagVariants || [],
        selectedFolder: data.sessionData?.selectedFolder || null,
        searchQuery: data.sessionData?.searchQuery || "",
        selectedTags: data.sessionData?.selectedTags || [],
        sortField: (data.sessionData?.sortField as SortField) || "relevance",
        sortDirection: (data.sessionData?.sortDirection as SortDirection) || "desc",
        isLoaded: true,
      });

      console.log("User data loaded successfully:", {
        images: data.images?.length || 0,
        folders: data.folders?.length || 0,
        tagVariants: data.tagVariants?.length || 0,
      });
    } catch (error) {
      console.error("Failed to load user data:", error);

      // Initialize with empty data but set as loaded to prevent blocking
      set({
        images: [],
        folders: [],
        tagVariants: [],
        selectedFolder: null,
        searchQuery: "",
        selectedTags: [],
        sortField: "relevance",
        sortDirection: "desc",
        isLoaded: true,
      });

      // Try to initialize with fallback data
      try {
        await initializeAppData();
      } catch (fallbackError) {
        console.error("Fallback initialization also failed:", fallbackError);
      }
    }
  },

  toggleImagePrivacy: (imageId: string, isPrivate: boolean) => {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === imageId ? { ...img, isPrivate } : img
      ),
    }));

    // Update in storage
    import("./storageManager").then(({ toggleImagePrivacy }) => {
      toggleImagePrivacy(imageId, isPrivate);
    });

    scheduleAutoSave(() => get().saveToStorage());
  },

  toggleFolderPrivacy: (folderId: string, isPrivate: boolean) => {
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === folderId ? { ...folder, isPrivate } : folder
      ),
    }));

    // Update in storage
    import("./storageManager").then(({ toggleFolderPrivacy }) => {
      toggleFolderPrivacy(folderId, isPrivate);
    });

    scheduleAutoSave(() => get().saveToStorage());
  },
}));

// Initialize app data from storage
export async function initializeAppData() {
  const store = useAppStore.getState();
  const userStore = useUserStore.getState();

  if (!store.isLoaded) {
    // If user is authenticated, load their specific data
    if (userStore.isAuthenticated && userStore.user) {
      await store.loadUserData(userStore.user.id);
    } else {
      // Load general data for unauthenticated state
      await store.loadFromStorage();
    }
  }

  // For guest users, don't create persistent mock data
  // For regular users, if no data exists, initialize with empty data
  if (store.images.length === 0 && store.folders.length === 0) {
    if (userStore.user?.isGuest) {
      // For guests, create temporary mock data in memory only
      const mockImages = createMockImages();
      const mockFolders = createMockFolders();

      // Process tags for mock images
      const processedImages = mockImages.map((img) => {
        const folderName = mockFolders.find((f) => f.id === img.folder)?.name;
        const { title, rawTags, processedTags } = processImageTags(
          img.name,
          folderName,
          undefined,
          undefined,
          img.id,
        );
        return { ...img, title, rawTags, tags: processedTags };
      });

      useAppStore.setState({
        images: processedImages,
        folders: mockFolders,
      });

      store.refreshTagVariants();
      // Don't save mock data for guests
    } else {
      // For regular users, just set empty state
      useAppStore.setState({
        images: [],
        folders: [],
      });
      store.refreshTagVariants();
    }
  }
}

// Legacy function for backward compatibility
export function initializeMockData() {
  initializeAppData();
}
