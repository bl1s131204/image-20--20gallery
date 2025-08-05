import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  lastLogin: Date;
  isGuest: boolean;
  preferences: {
    theme: string;
    defaultView: string;
    autoSave: boolean;
  };
}

export interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (username: string) => Promise<boolean>;
  register: (username: string, displayName?: string) => Promise<boolean>;
  guestLogin: () => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  
  // User management
  getAllUsers: () => User[];
  deleteUser: (userId: string) => boolean;
  getUserByUsername: (username: string) => User | null;
  
  // Session management
  checkSession: () => void;
}

// Storage keys
const USERS_DB_KEY = "tagengine_all_users";
const CURRENT_SESSION_KEY = "tagengine_current_session";

interface StoredUser extends Omit<User, 'createdAt' | 'lastLogin'> {
  createdAt: string;
  lastLogin: string;
}

interface UserSession {
  userId: string;
  username: string;
  loginTime: string;
  isActive: boolean;
}

// Helper functions
const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

const generateGuestId = (): string => {
  const random = Math.floor(Math.random() * 9999) + 1;
  return `guest_user_${random}`;
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

const getCurrentSession = (): UserSession | null => {
  try {
    const session = localStorage.getItem(CURRENT_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
};

const saveCurrentSession = (session: UserSession | null): void => {
  if (session) {
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(CURRENT_SESSION_KEY);
  }
};

const validateUsername = (username: string): boolean => {
  return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
};

const convertStoredToUser = (stored: StoredUser): User => ({
  id: stored.id,
  username: stored.username,
  displayName: stored.displayName,
  avatar: stored.avatar,
  createdAt: new Date(stored.createdAt),
  lastLogin: new Date(stored.lastLogin),
  isGuest: stored.isGuest,
  preferences: stored.preferences,
});

const convertUserToStored = (user: User): StoredUser => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  avatar: user.avatar,
  createdAt: user.createdAt.toISOString(),
  lastLogin: user.lastLogin.toISOString(),
  isGuest: user.isGuest,
  preferences: user.preferences,
});

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string) => {
        if (!validateUsername(username)) {
          return false;
        }

        set({ isLoading: true });

        try {
          const users = getStoredUsers();
          const userData = users.find(u => u.username === username);

          if (!userData) {
            set({ isLoading: false });
            return false;
          }

          // Update last login
          const updatedUsers = users.map(u =>
            u.id === userData.id
              ? { ...u, lastLogin: new Date().toISOString() }
              : u
          );
          saveStoredUsers(updatedUsers);

          // Create session
          const session: UserSession = {
            userId: userData.id,
            username: userData.username,
            loginTime: new Date().toISOString(),
            isActive: true,
          };
          saveCurrentSession(session);

          // Convert to User format
          const user = convertStoredToUser({ ...userData, lastLogin: new Date().toISOString() });

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });

          return true;
        } catch (error) {
          console.error('Login error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      register: async (username: string, displayName?: string) => {
        if (!validateUsername(username)) {
          return false;
        }

        set({ isLoading: true });

        try {
          const users = getStoredUsers();
          
          // Check if username already exists
          const existingUser = users.find(u => u.username === username);
          if (existingUser) {
            set({ isLoading: false });
            return false;
          }

          // Create new user
          const newUser: User = {
            id: generateUserId(),
            username,
            displayName: displayName || username,
            createdAt: new Date(),
            lastLogin: new Date(),
            isGuest: false,
            preferences: {
              theme: "light",
              defaultView: "grid",
              autoSave: true,
            },
          };

          // Save to storage
          const storedUser = convertUserToStored(newUser);
          users.push(storedUser);
          saveStoredUsers(users);

          // Auto-login after registration
          const loginSuccess = await get().login(username);
          
          set({ isLoading: false });
          return loginSuccess;
        } catch (error) {
          console.error('Registration error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      guestLogin: async () => {
        set({ isLoading: true });

        try {
          // Create temporary guest user
          const guestUser: User = {
            id: generateGuestId(),
            username: generateGuestId(),
            displayName: "Guest User",
            createdAt: new Date(),
            lastLogin: new Date(),
            isGuest: true,
            preferences: {
              theme: "light",
              defaultView: "grid",
              autoSave: false, // Don't auto-save guest data
            },
          };

          // Don't store guest users permanently
          // Create temporary session
          const session: UserSession = {
            userId: guestUser.id,
            username: guestUser.username,
            loginTime: new Date().toISOString(),
            isActive: true,
          };
          
          // Store session temporarily (will be cleared on logout)
          sessionStorage.setItem('guest_session', JSON.stringify(session));

          set({
            user: guestUser,
            isAuthenticated: true,
            isLoading: false,
          });

          return true;
        } catch (error) {
          console.error('Guest login error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        const currentUser = get().user;
        
        // Clear sessions
        saveCurrentSession(null);
        sessionStorage.removeItem('guest_session');
        
        // For guest users, don't save any data
        if (currentUser?.isGuest) {
          // Clear any guest data from memory
          // This ensures guest data is not persistent
        }

        set({
          user: null,
          isAuthenticated: false,
        });
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const updatedUser = { ...currentUser, ...updates };
        
        // Don't update storage for guest users
        if (!currentUser.isGuest) {
          const users = getStoredUsers();
          const updatedUsers = users.map(u => 
            u.id === currentUser.id 
              ? convertUserToStored(updatedUser)
              : u
          );
          saveStoredUsers(updatedUsers);
        }

        set({ user: updatedUser });
      },

      getAllUsers: () => {
        const users = getStoredUsers();
        return users
          .filter(u => !u.isGuest) // Don't include guest users
          .map(convertStoredToUser)
          .sort((a, b) => b.lastLogin.getTime() - a.lastLogin.getTime());
      },

      deleteUser: (userId: string) => {
        try {
          const users = getStoredUsers();
          const filteredUsers = users.filter(u => u.id !== userId);
          saveStoredUsers(filteredUsers);
          
          // If deleting current user, logout
          const currentUser = get().user;
          if (currentUser && currentUser.id === userId) {
            get().logout();
          }
          
          return true;
        } catch {
          return false;
        }
      },

      getUserByUsername: (username: string) => {
        const users = getStoredUsers();
        const userData = users.find(u => u.username === username);
        return userData ? convertStoredToUser(userData) : null;
      },

      checkSession: () => {
        // Check for regular session
        const session = getCurrentSession();
        if (session && session.isActive) {
          const users = getStoredUsers();
          const userData = users.find(u => u.id === session.userId);
          
          if (userData) {
            const user = convertStoredToUser(userData);
            set({
              user,
              isAuthenticated: true,
            });
            return;
          }
        }

        // Check for guest session
        try {
          const guestSession = sessionStorage.getItem('guest_session');
          if (guestSession) {
            const session: UserSession = JSON.parse(guestSession);
            // Recreate guest user from session
            const guestUser: User = {
              id: session.userId,
              username: session.username,
              displayName: "Guest User",
              createdAt: new Date(session.loginTime),
              lastLogin: new Date(session.loginTime),
              isGuest: true,
              preferences: {
                theme: "light",
                defaultView: "grid",
                autoSave: false,
              },
            };
            
            set({
              user: guestUser,
              isAuthenticated: true,
            });
            return;
          }
        } catch (error) {
          console.warn('Error checking guest session:', error);
        }

        // No valid session found
        set({ isAuthenticated: false, user: null });
      },
    }),
    {
      name: 'user-store',
      partialize: (state) => ({ 
        // Don't persist guest users
        user: state.user?.isGuest ? null : state.user,
        isAuthenticated: state.user?.isGuest ? false : state.isAuthenticated 
      }),
    }
  )
);

// Initialize session check on store creation
if (typeof window !== 'undefined') {
  useUserStore.getState().checkSession();
}
