import { useAuthStore } from "./authStore";

export interface DemoUser {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export const demoUsers: DemoUser[] = [
  {
    username: "admin",
    email: "admin@tagengine.demo",
    password: "admin123",
    displayName: "Admin User",
  },
  {
    username: "demo",
    email: "demo@tagengine.demo", 
    password: "demo123",
    displayName: "Demo User",
  },
  {
    username: "photographer",
    email: "photographer@tagengine.demo",
    password: "photo123",
    displayName: "Pro Photographer",
  },
];

// Initialize demo users if they don't exist
export async function initializeDemoUsers() {
  const USERS_DB_KEY = "tagengine_users";
  
  try {
    const existingUsers = localStorage.getItem(USERS_DB_KEY);
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    
    // Check if demo users already exist
    const hasAdmin = users.some((u: any) => u.username === "admin");
    const hasDemo = users.some((u: any) => u.username === "demo");
    
    if (!hasAdmin || !hasDemo) {
      console.log("Creating demo users...");
      
      // Register each demo user
      for (const demoUser of demoUsers) {
        const userExists = users.some((u: any) => 
          u.username === demoUser.username || u.email === demoUser.email
        );
        
        if (!userExists) {
          // Create user manually in storage
          const hashedPassword = btoa(demoUser.password + "salt_string");
          const newUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            username: demoUser.username,
            email: demoUser.email,
            displayName: demoUser.displayName,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            preferences: {
              theme: "light",
              defaultView: "grid",
              autoSave: true,
            },
          };
          
          users.push(newUser);
        }
      }
      
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
      console.log("Demo users created successfully");
    }
  } catch (error) {
    console.error("Failed to initialize demo users:", error);
  }
}

// Quick login function for development
export function quickLogin(username: string) {
  const demoUser = demoUsers.find(u => u.username === username);
  if (demoUser) {
    const authStore = useAuthStore.getState();
    return authStore.login({
      username: demoUser.username,
      password: demoUser.password,
    });
  }
  return Promise.resolve(false);
}
