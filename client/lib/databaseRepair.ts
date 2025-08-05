import { initializeAppDatabase } from "./storageManager";

// Database repair utilities
export async function repairDatabase(): Promise<boolean> {
  try {
    console.log("Starting database repair...");
    
    // Delete the existing database
    await deleteDatabase();
    
    // Reinitialize with correct schema
    await initializeAppDatabase();
    
    console.log("Database repair completed successfully");
    return true;
  } catch (error) {
    console.error("Database repair failed:", error);
    return false;
  }
}

export async function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase("TagEngineAppData");
    
    deleteRequest.onsuccess = () => {
      console.log("Database deleted successfully");
      resolve();
    };
    
    deleteRequest.onerror = () => {
      console.error("Failed to delete database:", deleteRequest.error);
      reject(deleteRequest.error);
    };
    
    deleteRequest.onblocked = () => {
      console.warn("Database deletion blocked - close all tabs and try again");
      // Try to resolve anyway after a delay
      setTimeout(() => resolve(), 2000);
    };
  });
}

export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean;
  missingIndices: string[];
  errors: string[];
}> {
  const result = {
    isHealthy: true,
    missingIndices: [] as string[],
    errors: [] as string[],
  };

  try {
    await initializeAppDatabase();
    
    // Check if we can access the database
    const dbOpenRequest = indexedDB.open("TagEngineAppData");
    
    return new Promise((resolve) => {
      dbOpenRequest.onsuccess = () => {
        const db = dbOpenRequest.result;
        
        try {
          // Check Images store indices
          if (db.objectStoreNames.contains("images")) {
            const transaction = db.transaction(["images"], "readonly");
            const store = transaction.objectStore("images");
            
            const requiredIndices = ["userId", "folderId", "dateAdded", "isPrivate"];
            for (const indexName of requiredIndices) {
              if (!store.indexNames.contains(indexName)) {
                result.missingIndices.push(`images.${indexName}`);
                result.isHealthy = false;
              }
            }
          }
          
          // Check Folders store indices
          if (db.objectStoreNames.contains("folders")) {
            const transaction = db.transaction(["folders"], "readonly");
            const store = transaction.objectStore("folders");
            
            const requiredIndices = ["userId", "folderType", "dateCreated", "isPrivate"];
            for (const indexName of requiredIndices) {
              if (!store.indexNames.contains(indexName)) {
                result.missingIndices.push(`folders.${indexName}`);
                result.isHealthy = false;
              }
            }
          }
          
          db.close();
          resolve(result);
        } catch (error) {
          result.errors.push(`Database access error: ${error}`);
          result.isHealthy = false;
          db.close();
          resolve(result);
        }
      };
      
      dbOpenRequest.onerror = () => {
        result.errors.push(`Failed to open database: ${dbOpenRequest.error}`);
        result.isHealthy = false;
        resolve(result);
      };
    });
  } catch (error) {
    result.errors.push(`Database check failed: ${error}`);
    result.isHealthy = false;
    return result;
  }
}

// Auto-repair function that tries to fix common issues
export async function autoRepairDatabase(): Promise<boolean> {
  try {
    const health = await checkDatabaseHealth();
    
    if (!health.isHealthy) {
      console.log("Database issues detected:", health);
      console.log("Attempting automatic repair...");
      
      return await repairDatabase();
    }
    
    console.log("Database is healthy, no repair needed");
    return true;
  } catch (error) {
    console.error("Auto-repair failed:", error);
    return false;
  }
}
