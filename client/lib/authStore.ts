import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  lastLogin: Date;
  preferences: {
    theme: string;
    defaultView: string;
    autoSave: boolean;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: { userId: string }) => Promise<boolean>;
  register: (userData: { username: string; email: string; password: string; displayName: string }) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  
  // Session management
  checkSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// Mock user database (in real app, this would be a backend API)
const USERS_DB_KEY = "tagengine_users";
const SESSIONS_DB_KEY = "tagengine_sessions";

interface StoredUser extends Omit<User, 'createdAt' | 'lastLogin'> {
  password: string; // Hashed in real implementation
  createdAt: string;
  lastLogin: string;
}

interface UserSession {
  userId: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
}

// Helper functions for user management
const hashPassword = (password: string): string => {
  // Simple hash for demo - use proper hashing in production (bcrypt, scrypt, etc.)
  return btoa(password + "salt_string");
};

const generateToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const getStoredUsers = (): StoredUser[] => {
  try {
    const users = localStorage.getItem(USERS_DB_KEY);
    return users ? JSON.parse(users) : [];
  } catch {
    return [];
  }
};

const saveStoredUsers = (users: StoredUser[]): void => {
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
};

const getStoredSessions = (): UserSession[] => {
  try {
    const sessions = localStorage.getItem(SESSIONS_DB_KEY);
    return sessions ? JSON.parse(sessions) : [];
  } catch {
    return [];
  }
};

const saveStoredSessions = (sessions: UserSession[]): void => {
  localStorage.setItem(SESSIONS_DB_KEY, JSON.stringify(sessions));
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username: string): boolean => {
  return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });

        try {
          // Special case: direct login with user ID "1312yoga"
          if (credentials.userId === "1312yoga") {
            const users = getStoredUsers();
            let user = users.find(u => u.username === "1312yoga");

            // Create the user if it doesn't exist
            if (!user) {
              const newUser: StoredUser = {
                id: "user_1312yoga",
                username: "1312yoga",
                email: "1312yoga@tagengine.demo",
                displayName: "Yoga Master",
                password: "", // No password needed
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                preferences: {
                  theme: "light",
                  defaultView: "grid",
                  autoSave: true,
                },
              };
              users.push(newUser);
              saveStoredUsers(users);
              user = newUser;
            }

            // Update last login
            const updatedUsers = users.map(u =>
              u.id === user!.id
                ? { ...u, lastLogin: new Date().toISOString() }
                : u
            );
            saveStoredUsers(updatedUsers);

            // Create session
            const token = generateToken();
            const sessions = getStoredSessions();
            const newSession: UserSession = {
              userId: user.id,
              token,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
              isActive: true,
            };
            sessions.push(newSession);
            saveStoredSessions(sessions);

            // Convert to User format
            const authenticatedUser: User = {
              id: user.id,
              username: user.username,
              email: user.email,
              displayName: user.displayName,
              avatar: user.avatar,
              createdAt: new Date(user.createdAt),
              lastLogin: new Date(user.lastLogin),
              preferences: user.preferences,
            };

            set({
              user: authenticatedUser,
              isAuthenticated: true,
              isLoading: false,
            });

            // Store session token
            localStorage.setItem('auth_token', token);

            return true;
          }

          // For any other user ID, return false
          set({ isLoading: false });
          return false;

        } catch (error) {
          console.error('Login error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      register: async (userData) => {
        set({ isLoading: true });

        try {
          // Validate input
          if (!validateUsername(userData.username)) {
            throw new Error("Username must be at least 3 characters and contain only letters, numbers, and underscores");
          }
          
          if (!validateEmail(userData.email)) {
            throw new Error("Invalid email format");
          }
          
          if (!validatePassword(userData.password)) {
            throw new Error("Password must be at least 6 characters");
          }

          const users = getStoredUsers();
          
          // Check if user exists
          const existingUser = users.find(
            u => u.username === userData.username || u.email === userData.email
          );
          
          if (existingUser) {
            set({ isLoading: false });
            return false;
          }

          // Create new user
          const newUser: StoredUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            username: userData.username,
            email: userData.email,
            displayName: userData.displayName,
            password: hashPassword(userData.password),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            preferences: {
              theme: "light",
              defaultView: "grid",
              autoSave: true,
            },
          };

          users.push(newUser);
          saveStoredUsers(users);

          // Auto-login after registration
          const loginSuccess = await get().login({
            username: userData.username,
            password: userData.password,
          });

          set({ isLoading: false });
          return loginSuccess;
        } catch (error) {
          console.error('Registration error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          // Invalidate session
          const sessions = getStoredSessions();
          const updatedSessions = sessions.map(s => 
            s.token === token ? { ...s, isActive: false } : s
          );
          saveStoredSessions(updatedSessions);
          localStorage.removeItem('auth_token');
        }

        set({
          user: null,
          isAuthenticated: false,
        });
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const updatedUser = { ...currentUser, ...updates };
        
        // Update in storage
        const users = getStoredUsers();
        const updatedUsers = users.map(u => 
          u.id === currentUser.id 
            ? { 
                ...u, 
                ...updates,
                createdAt: u.createdAt, // Keep original dates as strings
                lastLogin: u.lastLogin 
              }
            : u
        );
        saveStoredUsers(updatedUsers);

        set({ user: updatedUser });
      },

      checkSession: async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        const sessions = getStoredSessions();
        const session = sessions.find(s => s.token === token && s.isActive);
        
        if (!session || new Date(session.expiresAt) < new Date()) {
          // Session expired or invalid
          localStorage.removeItem('auth_token');
          set({ isAuthenticated: false, user: null });
          return;
        }

        // Get user data
        const users = getStoredUsers();
        const userData = users.find(u => u.id === session.userId);
        
        if (!userData) {
          localStorage.removeItem('auth_token');
          set({ isAuthenticated: false, user: null });
          return;
        }

        // Convert to User format
        const user: User = {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          displayName: userData.displayName,
          avatar: userData.avatar,
          createdAt: new Date(userData.createdAt),
          lastLogin: new Date(userData.lastLogin),
          preferences: userData.preferences,
        };

        set({
          user,
          isAuthenticated: true,
        });
      },

      refreshSession: async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const sessions = getStoredSessions();
        const updatedSessions = sessions.map(s => 
          s.token === token 
            ? { ...s, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
            : s
        );
        saveStoredSessions(updatedSessions);
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Initialize session check on store creation
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkSession();
}
