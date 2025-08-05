import { ImageData, processImageTags } from "./tagEngine";

export interface LinkedFolder {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  coverImages: string[];
  imageCount: number;
  dateLinked: Date;
  lastAccessed: Date;
  isPrivate?: boolean;
}

export interface StoredLinkedFolder {
  id: string;
  name: string;
  coverImages: string[];
  imageCount: number;
  dateLinked: string;
  lastAccessed: string;
  isPrivate?: boolean;
}

// Check if we're in an iframe
function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // If we can't access window.top, we're likely in an iframe
  }
}

// Check if File System Access API is supported and usable
export function isFileSystemAccessSupported(): boolean {
  // Must have the API
  if (!("showDirectoryPicker" in window)) {
    return false;
  }

  // Check secure context but be more permissive
  if (!window.isSecureContext && location.protocol !== 'http:') {
    return false;
  }

  return true;
}

// Check if we're likely in an iframe (for warning purposes only)
export function isLikelyInIframe(): boolean {
  return isInIframe();
}

// Get specific reason why File System Access is not supported
export function getFileSystemAccessError(): string {
  if (!("showDirectoryPicker" in window)) {
    return "File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.";
  }

  if (!window.isSecureContext && location.protocol !== 'http:') {
    return "File System Access API requires a secure context (HTTPS). Please access this app over HTTPS.";
  }

  return "File System Access API is not available.";
}

// IndexedDB setup
const DB_NAME = "TagEngineLocalFolders";
const DB_VERSION = 1;
const STORE_NAME = "linkedFolders";
const HANDLES_STORE = "folderHandles";

let db: IDBDatabase | null = null;

export async function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Store for folder metadata
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }

      // Store for folder handles
      if (!database.objectStoreNames.contains(HANDLES_STORE)) {
        database.createObjectStore(HANDLES_STORE, { keyPath: "id" });
      }
    };
  });
}

// Save folder metadata and handle to IndexedDB
export async function saveLinkedFolder(folder: LinkedFolder): Promise<void> {
  if (!db) await initializeDatabase();

  const transaction = db!.transaction([STORE_NAME, HANDLES_STORE], "readwrite");

  // Save metadata
  const metadataStore = transaction.objectStore(STORE_NAME);
  const storedFolder: StoredLinkedFolder = {
    id: folder.id,
    name: folder.name,
    coverImages: folder.coverImages,
    imageCount: folder.imageCount,
    dateLinked: folder.dateLinked.toISOString(),
    lastAccessed: folder.lastAccessed.toISOString(),
  };
  metadataStore.put(storedFolder);

  // Save handle
  const handlesStore = transaction.objectStore(HANDLES_STORE);
  handlesStore.put({ id: folder.id, handle: folder.handle });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Load all linked folders from IndexedDB
export async function loadLinkedFolders(): Promise<LinkedFolder[]> {
  if (!db) await initializeDatabase();

  const transaction = db!.transaction([STORE_NAME, HANDLES_STORE], "readonly");
  const metadataStore = transaction.objectStore(STORE_NAME);
  const handlesStore = transaction.objectStore(HANDLES_STORE);

  const folders: LinkedFolder[] = [];

  return new Promise((resolve, reject) => {
    const request = metadataStore.getAll();
    request.onsuccess = async () => {
      const storedFolders: StoredLinkedFolder[] = request.result;

      for (const storedFolder of storedFolders) {
        try {
          const handleRequest = handlesStore.get(storedFolder.id);
          handleRequest.onsuccess = () => {
            if (handleRequest.result) {
              const folder: LinkedFolder = {
                id: storedFolder.id,
                name: storedFolder.name,
                handle: handleRequest.result.handle,
                coverImages: storedFolder.coverImages,
                imageCount: storedFolder.imageCount,
                dateLinked: new Date(storedFolder.dateLinked),
                lastAccessed: new Date(storedFolder.lastAccessed),
              };
              folders.push(folder);
            }
          };
        } catch (error) {
          console.warn(`Failed to load folder ${storedFolder.name}:`, error);
        }
      }

      // Wait a bit for all handle requests to complete
      setTimeout(() => resolve(folders), 100);
    };
    request.onerror = () => reject(request.error);
  });
}

// Remove a linked folder from storage
export async function removeLinkedFolder(folderId: string): Promise<void> {
  if (!db) await initializeDatabase();

  const transaction = db!.transaction([STORE_NAME, HANDLES_STORE], "readwrite");
  transaction.objectStore(STORE_NAME).delete(folderId);
  transaction.objectStore(HANDLES_STORE).delete(folderId);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Check and request permissions for a folder handle
export async function checkFolderPermissions(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const permission = await handle.queryPermission({ mode: "read" });

    if (permission === "granted") {
      return true;
    }

    if (permission === "prompt") {
      const requestedPermission = await handle.requestPermission({
        mode: "read",
      });
      return requestedPermission === "granted";
    }

    return false;
  } catch (error) {
    console.warn("Permission check failed:", error);
    return false;
  }
}

// Link a new local folder
export async function linkLocalFolder(): Promise<LinkedFolder | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error(getFileSystemAccessError());
  }

  try {
    const handle = await window.showDirectoryPicker({
      mode: "read",
      startIn: "pictures",
    });

    // Check permissions
    const hasPermission = await checkFolderPermissions(handle);
    if (!hasPermission) {
      throw new Error("Permission denied to access the folder");
    }

    // Read folder contents to get image files and count
    const imageFiles: string[] = [];
    const supportedTypes = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".tiff", ".tif", ".svg"];

    for await (const [name, fileHandle] of handle.entries()) {
      if (fileHandle.kind === "file") {
        const extension = name.toLowerCase().substring(name.lastIndexOf("."));
        if (supportedTypes.includes(extension)) {
          imageFiles.push(name);
        }
      }
    }

    // Create folder object
    const folderId = `linked_${Date.now()}`;
    const linkedFolder: LinkedFolder = {
      id: folderId,
      name: handle.name,
      handle,
      coverImages: imageFiles.slice(0, 4), // First 4 images as covers
      imageCount: imageFiles.length,
      dateLinked: new Date(),
      lastAccessed: new Date(),
    };

    // Save to IndexedDB
    await saveLinkedFolder(linkedFolder);

    return linkedFolder;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // User cancelled the picker
      return null;
    }
    throw error;
  }
}

// Read images from a linked folder
export async function readFolderImages(
  folder: LinkedFolder,
): Promise<ImageData[]> {
  try {
    // Check permissions first
    const hasPermission = await checkFolderPermissions(folder.handle);
    if (!hasPermission) {
      throw new Error("Permission denied to access the folder");
    }

    const images: ImageData[] = [];
    const supportedTypes = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".tiff", ".tif", ".svg"];

    for await (const [name, fileHandle] of folder.handle.entries()) {
      if (fileHandle.kind === "file") {
        const extension = name.toLowerCase().substring(name.lastIndexOf("."));
        if (supportedTypes.includes(extension)) {
          try {
            const file = await fileHandle.getFile();
            const url = URL.createObjectURL(file);

            // Process tags from filename
            const { title, rawTags, processedTags } = processImageTags(
              name,
              folder.name,
              undefined,
              undefined,
              `${folder.id}_${name}`,
            );

            const imageData: ImageData = {
              id: `${folder.id}_${name}`,
              name,
              title,
              url,
              folder: folder.id,
              size: file.size,
              type: file.type,
              dateAdded: new Date(file.lastModified),
              tags: processedTags,
              rawTags,
            };

            images.push(imageData);
          } catch (error) {
            console.warn(`Failed to read file ${name}:`, error);
          }
        }
      }
    }

    // Update last accessed time
    folder.lastAccessed = new Date();
    await saveLinkedFolder(folder);

    return images;
  } catch (error) {
    console.error("Failed to read folder images:", error);
    throw error;
  }
}

// Update folder name (UI only)
export async function updateFolderName(
  folderId: string,
  newName: string,
): Promise<void> {
  if (!db) await initializeDatabase();

  const transaction = db!.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(folderId);
    getRequest.onsuccess = () => {
      const folder = getRequest.result;
      if (folder) {
        folder.name = newName;
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

// Validate folder access (for reconnection)
export async function validateFolderAccess(
  folder: LinkedFolder,
): Promise<boolean> {
  try {
    return await checkFolderPermissions(folder.handle);
  } catch (error) {
    return false;
  }
}

// Get folder statistics
export async function getFolderStats(
  folder: LinkedFolder,
): Promise<{ imageCount: number; lastModified: Date }> {
  try {
    const hasPermission = await checkFolderPermissions(folder.handle);
    if (!hasPermission) {
      return {
        imageCount: folder.imageCount,
        lastModified: folder.lastAccessed,
      };
    }

    let imageCount = 0;
    let lastModified = new Date(0);
    const supportedTypes = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".tiff", ".tif", ".svg"];

    for await (const [name, fileHandle] of folder.handle.entries()) {
      if (fileHandle.kind === "file") {
        const extension = name.toLowerCase().substring(name.lastIndexOf("."));
        if (supportedTypes.includes(extension)) {
          imageCount++;
          try {
            const file = await fileHandle.getFile();
            const modified = new Date(file.lastModified);
            if (modified > lastModified) {
              lastModified = modified;
            }
          } catch (error) {
            // Skip files we can't access
          }
        }
      }
    }

    return { imageCount, lastModified };
  } catch (error) {
    return { imageCount: folder.imageCount, lastModified: folder.lastAccessed };
  }
}
