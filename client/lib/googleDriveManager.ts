import { ImageData, processImageTags } from "./tagEngine";
import { saveFolder } from "./storageManager";

export interface GoogleDriveFolder {
  id: string;
  name: string;
  url: string;
  imageCount: number;
  dateLinked: Date;
  lastAccessed: Date;
  isPublic: boolean;
}

export interface DriveImageData extends ImageData {
  driveUrl: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
}

// Extract folder ID from Google Drive URL
export function extractDriveFolderId(url: string): string | null {
  const patterns = [
    /\/folders\/([a-zA-Z0-9-_]+)/,
    /\/drive\/folders\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Validate if Google Drive URL is accessible
export async function validateDriveUrl(url: string): Promise<boolean> {
  try {
    const folderId = extractDriveFolderId(url);
    if (!folderId) {
      return false;
    }

    // Try to access the folder via Google Drive API (requires public access)
    const apiUrl = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType&key=YOUR_API_KEY`;
    
    // For now, we'll just check if the URL format is valid
    // In a real implementation, you'd need a Google Drive API key
    return true;
  } catch (error) {
    return false;
  }
}

// Link a Google Drive folder
export async function linkGoogleDriveFolder(url: string): Promise<GoogleDriveFolder | null> {
  try {
    const folderId = extractDriveFolderId(url);
    if (!folderId) {
      throw new Error("Invalid Google Drive folder URL");
    }

    const isValid = await validateDriveUrl(url);
    if (!isValid) {
      throw new Error("Cannot access Google Drive folder. Make sure it's publicly accessible.");
    }

    // Create folder object
    const driveFolder: GoogleDriveFolder = {
      id: `drive_${folderId}`,
      name: `Drive Folder ${folderId.substring(0, 8)}...`,
      url,
      imageCount: 0, // Would be populated by API call
      dateLinked: new Date(),
      lastAccessed: new Date(),
      isPublic: true,
    };

    // Save to storage as a Google Drive folder
    await saveFolder(
      {
        id: driveFolder.id,
        name: driveFolder.name,
        images: [],
        userDefined: false,
      },
      'google_drive',
      {
        driveUrl: url,
        folderId,
        isPublic: true,
      }
    );

    return driveFolder;
  } catch (error) {
    console.error("Failed to link Google Drive folder:", error);
    throw error;
  }
}

// Read images from Google Drive folder (mock implementation)
export async function readGoogleDriveImages(folder: GoogleDriveFolder): Promise<DriveImageData[]> {
  try {
    // In a real implementation, you would:
    // 1. Use Google Drive API to list files in the folder
    // 2. Filter for image files
    // 3. Get download/thumbnail URLs
    // 4. Process each image for tags

    // Mock implementation for demo
    const mockImages: DriveImageData[] = [];
    
    // For demonstration, create some mock drive images
    const sampleImages = [
      { name: "vacation-beach-sunset.jpg", size: 2048000 },
      { name: "family-reunion-2024.png", size: 1536000 },
      { name: "mountain-hiking-adventure.webp", size: 1024000 },
    ];

    sampleImages.forEach((sample, index) => {
      const imageId = `${folder.id}_${index}`;
      const { title, rawTags, processedTags } = processImageTags(
        sample.name,
        folder.name,
        undefined,
        undefined,
        imageId,
      );

      const mockImage: DriveImageData = {
        id: imageId,
        name: sample.name,
        title,
        url: `https://drive.google.com/uc?id=mock_${imageId}`, // Mock URL
        driveUrl: folder.url,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=mock_${imageId}`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=mock_${imageId}`,
        folder: folder.id,
        size: sample.size,
        type: `image/${sample.name.split('.').pop()}`,
        dateAdded: new Date(),
        tags: processedTags,
        rawTags,
      };

      mockImages.push(mockImage);
    });

    // Update last accessed time
    folder.lastAccessed = new Date();

    return mockImages;
  } catch (error) {
    console.error("Failed to read Google Drive images:", error);
    throw error;
  }
}

// Get Google Drive folder info
export async function getDriveFolderInfo(url: string): Promise<{
  name: string;
  imageCount: number;
  isAccessible: boolean;
}> {
  try {
    const folderId = extractDriveFolderId(url);
    if (!folderId) {
      throw new Error("Invalid Google Drive URL");
    }

    // Mock implementation - in real app, use Google Drive API
    return {
      name: `Drive Folder ${folderId.substring(0, 8)}...`,
      imageCount: 3, // Mock count
      isAccessible: true,
    };
  } catch (error) {
    return {
      name: "Unknown Folder",
      imageCount: 0,
      isAccessible: false,
    };
  }
}

// Refresh Google Drive folder access
export async function refreshDriveFolderAccess(folder: GoogleDriveFolder): Promise<boolean> {
  try {
    return await validateDriveUrl(folder.url);
  } catch (error) {
    return false;
  }
}
