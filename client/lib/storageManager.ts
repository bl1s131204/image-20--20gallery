import { ImageData, FolderData, TagVariant } from "./tagEngine";

// Enhanced interfaces for persistence
export interface StoredImageData extends Omit<ImageData, 'dateAdded'> {
  dateAdded: string; // ISO string for serialization
  isFavorite?: boolean;
  userNotes?: string;
  lastViewed?: string;
  userId?: string; // Owner of the image
  isPrivate?: boolean; // Privacy setting
}

export interface StoredFolderData extends Omit<FolderData, 'dateCreated' | 'lastViewed'> {
  dateCreated: string;
  lastViewed?: string;
  folderType: 'local' | 'google_drive' | 'custom';
  isPrivate?: boolean;
  userId?: string; // Owner of the folder
  sharedWith?: string[]; // User IDs with access
  metadata?: {
    originalPath?: string;
    driveUrl?: string;
    description?: string;
  };
}

export interface StoredAppData {
  images: StoredImageData[];
  folders: StoredFolderData[];
  tagVariants: TagVariant[];
  lastSession: {
    selectedFolder: string | null;
    searchQuery: string;
    selectedTags: string[];
    sortField: string;
    sortDirection: string;
  };
  userPreferences: {
    theme: string;
    defaultView: string;
    autoSave: boolean;
  };
}

// Database configuration
const DB_NAME = "TagEngineAppData";
const DB_VERSION = 4;
const IMAGES_STORE = "images";
const FOLDERS_STORE = "folders";
const TAG_VARIANTS_STORE = "tagVariants";
const SESSION_STORE = "sessionData";
const PREFERENCES_STORE = "userPreferences";
const LINKED_FOLDERS_STORE = "linkedFolders";
const FOLDER_HANDLES_STORE = "folderHandles";
const USER_DATA_STORE = "userData";

let db: IDBDatabase | null = null;

// Initialize the enhanced database
export async function initializeAppDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction!;

      // Helper function to safely create index
      const createIndexSafely = (store: IDBObjectStore, indexName: string, keyPath: string, options?: IDBIndexParameters) => {
        if (!store.indexNames.contains(indexName)) {
          try {
            store.createIndex(indexName, keyPath, options);
          } catch (error) {
            console.warn(`Failed to create index ${indexName}:`, error);
          }
        }
      };

      // Images store
      let imageStore: IDBObjectStore;
      if (!database.objectStoreNames.contains(IMAGES_STORE)) {
        imageStore = database.createObjectStore(IMAGES_STORE, { keyPath: "id" });
      } else {
        imageStore = transaction.objectStore(IMAGES_STORE);
      }

      // Ensure all indices exist
      createIndexSafely(imageStore, "folderId", "folder", { unique: false });
      createIndexSafely(imageStore, "dateAdded", "dateAdded", { unique: false });
      createIndexSafely(imageStore, "userId", "userId", { unique: false });
      createIndexSafely(imageStore, "isPrivate", "isPrivate", { unique: false });

      // Folders store
      let folderStore: IDBObjectStore;
      if (!database.objectStoreNames.contains(FOLDERS_STORE)) {
        folderStore = database.createObjectStore(FOLDERS_STORE, { keyPath: "id" });
      } else {
        folderStore = transaction.objectStore(FOLDERS_STORE);
      }

      // Ensure all indices exist
      createIndexSafely(folderStore, "folderType", "folderType", { unique: false });
      createIndexSafely(folderStore, "dateCreated", "dateCreated", { unique: false });
      createIndexSafely(folderStore, "userId", "userId", { unique: false });
      createIndexSafely(folderStore, "isPrivate", "isPrivate", { unique: false });

      // Tag variants store
      if (!database.objectStoreNames.contains(TAG_VARIANTS_STORE)) {
        database.createObjectStore(TAG_VARIANTS_STORE, { keyPath: "canonical" });
      }

      // Session data store
      if (!database.objectStoreNames.contains(SESSION_STORE)) {
        database.createObjectStore(SESSION_STORE, { keyPath: "key" });
      }

      // User preferences store
      if (!database.objectStoreNames.contains(PREFERENCES_STORE)) {
        database.createObjectStore(PREFERENCES_STORE, { keyPath: "key" });
      }

      // Linked folders store (for backward compatibility)
      if (!database.objectStoreNames.contains(LINKED_FOLDERS_STORE)) {
        database.createObjectStore(LINKED_FOLDERS_STORE, { keyPath: "id" });
      }

      // Folder handles store (for local folder handles)
      if (!database.objectStoreNames.contains(FOLDER_HANDLES_STORE)) {
        database.createObjectStore(FOLDER_HANDLES_STORE, { keyPath: "id" });
      }

      // User data store (for user-specific storage)
      if (!database.objectStoreNames.contains(USER_DATA_STORE)) {
        const userStore = database.createObjectStore(USER_DATA_STORE, { keyPath: "userId" });
        userStore.createIndex("lastAccessed", "lastAccessed", { unique: false });
      }
    };
  });
}

// Generic storage operations
async function storeData<T>(storeName: string, data: T): Promise<void> {
  if (!db) await initializeAppDatabase();
  
  const transaction = db!.transaction([storeName], "readwrite");
  const store = transaction.objectStore(storeName);
  store.put(data);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getData<T>(storeName: string, key: string): Promise<T | null> {
  if (!db) await initializeAppDatabase();
  
  const transaction = db!.transaction([storeName], "readonly");
  const store = transaction.objectStore(storeName);
  const request = store.get(key);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function getAllData<T>(storeName: string): Promise<T[]> {
  if (!db) await initializeAppDatabase();
  
  const transaction = db!.transaction([storeName], "readonly");
  const store = transaction.objectStore(storeName);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function deleteData(storeName: string, key: string): Promise<void> {
  if (!db) await initializeAppDatabase();
  
  const transaction = db!.transaction([storeName], "readwrite");
  const store = transaction.objectStore(storeName);
  store.delete(key);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Image storage operations
export async function saveImage(image: ImageData): Promise<void> {
  const storedImage: StoredImageData = {
    ...image,
    dateAdded: image.dateAdded.toISOString(),
    lastViewed: new Date().toISOString(),
  };
  return storeData(IMAGES_STORE, storedImage);
}

export async function saveImages(images: ImageData[]): Promise<void> {
  if (!db) await initializeAppDatabase();
  
  const transaction = db!.transaction([IMAGES_STORE], "readwrite");
  const store = transaction.objectStore(IMAGES_STORE);
  
  images.forEach(image => {
    const storedImage: StoredImageData = {
      ...image,
      dateAdded: image.dateAdded.toISOString(),
      lastViewed: new Date().toISOString(),
    };
    store.put(storedImage);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadImages(): Promise<ImageData[]> {
  const storedImages = await getAllData<StoredImageData>(IMAGES_STORE);
  return storedImages.map(stored => ({
    ...stored,
    dateAdded: new Date(stored.dateAdded),
  }));
}

export async function deleteImage(imageId: string): Promise<void> {
  return deleteData(IMAGES_STORE, imageId);
}

// Folder storage operations
export async function saveFolder(folder: FolderData, folderType: 'local' | 'google_drive' | 'custom' = 'custom', metadata?: any): Promise<void> {
  const storedFolder: StoredFolderData = {
    ...folder,
    dateCreated: new Date().toISOString(),
    lastViewed: new Date().toISOString(),
    folderType,
    metadata,
  };
  return storeData(FOLDERS_STORE, storedFolder);
}

export async function loadFolders(): Promise<FolderData[]> {
  const storedFolders = await getAllData<StoredFolderData>(FOLDERS_STORE);
  return storedFolders.map(stored => ({
    id: stored.id,
    name: stored.name,
    images: stored.images,
    userDefined: stored.userDefined,
  }));
}

export async function deleteFolder(folderId: string): Promise<void> {
  return deleteData(FOLDERS_STORE, folderId);
}

// Tag variants storage
export async function saveTagVariants(tagVariants: TagVariant[]): Promise<void> {
  if (!db) await initializeAppDatabase();
  
  const transaction = db!.transaction([TAG_VARIANTS_STORE], "readwrite");
  const store = transaction.objectStore(TAG_VARIANTS_STORE);
  
  // Clear existing tag variants
  store.clear();
  
  // Add new ones
  tagVariants.forEach(variant => {
    store.put(variant);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadTagVariants(): Promise<TagVariant[]> {
  return getAllData<TagVariant>(TAG_VARIANTS_STORE);
}

// Session data storage
export async function saveSessionData(sessionData: {
  selectedFolder: string | null;
  searchQuery: string;
  selectedTags: string[];
  sortField: string;
  sortDirection: string;
}): Promise<void> {
  return storeData(SESSION_STORE, { key: "lastSession", ...sessionData });
}

export async function loadSessionData(): Promise<any> {
  return getData(SESSION_STORE, "lastSession");
}

// User preferences storage
export async function saveUserPreferences(preferences: {
  theme?: string;
  defaultView?: string;
  autoSave?: boolean;
}): Promise<void> {
  const existing = await loadUserPreferences();
  const updated = { ...existing, ...preferences };
  return storeData(PREFERENCES_STORE, { key: "userPreferences", ...updated });
}

export async function loadUserPreferences(): Promise<any> {
  const data = await getData(PREFERENCES_STORE, "userPreferences");
  return data || {
    theme: "light",
    defaultView: "grid",
    autoSave: true,
  };
}

// Full app data operations
export async function saveAppData(appData: {
  images: ImageData[];
  folders: FolderData[];
  tagVariants: TagVariant[];
  sessionData?: any;
}): Promise<void> {
  await Promise.all([
    saveImages(appData.images),
    Promise.all(appData.folders.map(folder => saveFolder(folder))),
    saveTagVariants(appData.tagVariants),
    appData.sessionData ? saveSessionData(appData.sessionData) : Promise.resolve(),
  ]);
}

export async function loadAppData(): Promise<{
  images: ImageData[];
  folders: FolderData[];
  tagVariants: TagVariant[];
  sessionData: any;
  userPreferences: any;
}> {
  const [images, folders, tagVariants, sessionData, userPreferences] = await Promise.all([
    loadImages(),
    loadFolders(),
    loadTagVariants(),
    loadSessionData(),
    loadUserPreferences(),
  ]);

  return {
    images,
    folders,
    tagVariants,
    sessionData,
    userPreferences,
  };
}

// Clear all app data (for reset functionality)
export async function clearAllAppData(): Promise<void> {
  if (!db) await initializeAppDatabase();
  
  const storeNames = [IMAGES_STORE, FOLDERS_STORE, TAG_VARIANTS_STORE, SESSION_STORE, PREFERENCES_STORE];
  const transaction = db!.transaction(storeNames, "readwrite");
  
  storeNames.forEach(storeName => {
    transaction.objectStore(storeName).clear();
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Auto-save functionality
let autoSaveTimeout: NodeJS.Timeout | null = null;

export function scheduleAutoSave(saveFunction: () => void, delay: number = 2000): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  
  autoSaveTimeout = setTimeout(() => {
    saveFunction();
    autoSaveTimeout = null;
  }, delay);
}

// User-specific data access functions
export async function getUserImages(userId: string, includePrivate: boolean = true): Promise<ImageData[]> {
  if (!db) await initializeAppDatabase();

  try {
    const transaction = db!.transaction([IMAGES_STORE], "readonly");
    const store = transaction.objectStore(IMAGES_STORE);

    // Try to use the userId index, fall back to scanning all records if index doesn't exist
    let request: IDBRequest;
    try {
      const index = store.index("userId");
      request = index.getAll(userId);
    } catch (indexError) {
      console.warn("userId index not found, scanning all records");
      request = store.getAll();
    }

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        let storedImages: StoredImageData[] = request.result || [];

        // If we had to scan all records, filter by userId
        if (!store.indexNames.contains("userId")) {
          storedImages = storedImages.filter(img => img.userId === userId);
        }

        const filteredImages = includePrivate
          ? storedImages
          : storedImages.filter(img => !img.isPrivate);

        const images = filteredImages.map(stored => ({
          ...stored,
          dateAdded: new Date(stored.dateAdded),
        }));

        resolve(images);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error in getUserImages:", error);
    return []; // Return empty array on error
  }
}

export async function getUserFolders(userId: string, includePrivate: boolean = true): Promise<FolderData[]> {
  if (!db) await initializeAppDatabase();

  try {
    const transaction = db!.transaction([FOLDERS_STORE], "readonly");
    const store = transaction.objectStore(FOLDERS_STORE);

    // Try to use the userId index, fall back to scanning all records if index doesn't exist
    let request: IDBRequest;
    try {
      const index = store.index("userId");
      request = index.getAll(userId);
    } catch (indexError) {
      console.warn("userId index not found in folders, scanning all records");
      request = store.getAll();
    }

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        let storedFolders: StoredFolderData[] = request.result || [];

        // If we had to scan all records, filter by userId
        if (!store.indexNames.contains("userId")) {
          storedFolders = storedFolders.filter(folder => folder.userId === userId);
        }

        const filteredFolders = includePrivate
          ? storedFolders
          : storedFolders.filter(folder => !folder.isPrivate);

        const folders = filteredFolders.map(stored => ({
          id: stored.id,
          name: stored.name,
          images: stored.images,
          userDefined: stored.userDefined,
        }));

        resolve(folders);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error in getUserFolders:", error);
    return []; // Return empty array on error
  }
}

export async function saveUserFolder(folder: FolderData, userId: string, isPrivate: boolean = false, folderType: 'local' | 'google_drive' | 'custom' = 'custom', metadata?: any): Promise<void> {
  const storedFolder: StoredFolderData = {
    ...folder,
    dateCreated: new Date().toISOString(),
    lastViewed: new Date().toISOString(),
    folderType,
    isPrivate,
    userId,
    metadata,
  };
  return storeData(FOLDERS_STORE, storedFolder);
}

export async function saveUserImage(image: ImageData, userId: string, isPrivate: boolean = false): Promise<void> {
  const storedImage: StoredImageData = {
    ...image,
    dateAdded: image.dateAdded.toISOString(),
    lastViewed: new Date().toISOString(),
    userId,
    isPrivate,
  };
  return storeData(IMAGES_STORE, storedImage);
}

export async function toggleImagePrivacy(imageId: string, isPrivate: boolean): Promise<void> {
  if (!db) await initializeAppDatabase();

  const transaction = db!.transaction([IMAGES_STORE], "readwrite");
  const store = transaction.objectStore(IMAGES_STORE);
  const getRequest = store.get(imageId);

  return new Promise((resolve, reject) => {
    getRequest.onsuccess = () => {
      const image = getRequest.result;
      if (image) {
        image.isPrivate = isPrivate;
        const putRequest = store.put(image);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error("Image not found"));
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function toggleFolderPrivacy(folderId: string, isPrivate: boolean): Promise<void> {
  if (!db) await initializeAppDatabase();

  const transaction = db!.transaction([FOLDERS_STORE], "readwrite");
  const store = transaction.objectStore(FOLDERS_STORE);
  const getRequest = store.get(folderId);

  return new Promise((resolve, reject) => {
    getRequest.onsuccess = () => {
      const folder = getRequest.result;
      if (folder) {
        folder.isPrivate = isPrivate;
        const putRequest = store.put(folder);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error("Folder not found"));
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function loadUserAppData(userId: string): Promise<{
  images: ImageData[];
  folders: FolderData[];
  tagVariants: TagVariant[];
  sessionData: any;
  userPreferences: any;
}> {
  const [images, folders, tagVariants, sessionData, userPreferences] = await Promise.all([
    getUserImages(userId),
    getUserFolders(userId),
    loadTagVariants(),
    loadSessionData(),
    loadUserPreferences(),
  ]);

  return {
    images,
    folders,
    tagVariants,
    sessionData,
    userPreferences,
  };
}

// Export database instance for backward compatibility
export { db, initializeAppDatabase as initializeDatabase };
