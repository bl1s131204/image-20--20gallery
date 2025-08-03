// File System Access API type definitions
// These types may not be available in all TypeScript environments

interface FileSystemDirectoryHandle {
  readonly kind: 'directory';
  readonly name: string;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface FileSystemFileHandle {
  readonly kind: 'file';
  readonly name: string;
  getFile(): Promise<File>;
  queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

type FileSystemHandle = FileSystemDirectoryHandle | FileSystemFileHandle;

interface Window {
  showDirectoryPicker(options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }): Promise<FileSystemDirectoryHandle>;
  
  showOpenFilePicker(options?: {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }): Promise<FileSystemFileHandle[]>;
}
