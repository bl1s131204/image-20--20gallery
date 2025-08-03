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
import { initializeMockData } from "./lib/store";
import { useEffect } from "react";
import Index from "./pages/Index";
import FolderSelection from "./pages/FolderSelection";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  useEffect(() => {
    initializeMockData();
  }, []);

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
