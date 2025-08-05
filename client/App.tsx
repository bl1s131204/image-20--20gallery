import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { Header } from "./components/Header";
import { FilterSidebar } from "./components/FilterSidebar";
import { TagsSidebar } from "./components/TagsSidebar";
import { ImageGrid } from "./components/ImageGrid";
import { initializeAppData, useAppStore } from "./lib/store";
import { useUserStore } from "./lib/userStore\";userStore\";e\";rStore";
import { autoRepairDatabase } from "./lib/databaseRepair";

import { useEffect } from "react";
import Index from "./pages/Index";
import FolderSelection from "./pages/FolderSelection";
import NotFound from "./pages/NotFound";
import { LoginGate } from "./components/LoginGate";

const queryClient = new QueryClient();

function AppContent() {
  const { isLoaded } = useAppStore();
  const { checkSession, isAuthenticated } = useUserStore();

  useEffect(() => {
    const initApp = async () => {
      try {
        // Check and repair database if needed
        const dbHealthy = await autoRepairDatabase();
        if (!dbHealthy) {
          console.warn("Database repair failed, some features may not work correctly");
        }

        // Check authentication session first
        checkSession();

        // Initialize app data (will load user-specific data if authenticated)
        await initializeAppData();
        console.log("App initialized successfully");
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    };

    initApp();
  }, []);

  // Show loading screen while initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-r-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading your gallery...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginGate />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="relative flex">
        <TagsSidebar />
        <div className="flex-1 min-h-[calc(100vh-4rem)]">
          <ImageGrid />
        </div>
        <FilterSidebar />
      </main>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="/folders" element={<FolderSelection />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
