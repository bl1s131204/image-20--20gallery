import React, { useState } from "react";
import { LogIn, Shield, Lock } from "lucide-react";
import { AuthModal } from "./AuthModal";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function LoginGate() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* App Logo */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-lg bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">TG</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">TagEngine</h1>
          <p className="text-muted-foreground">
            Intelligent Image Gallery & Tag Management
          </p>
        </div>

        {/* Access Required Card */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-3">
              <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Access to TagEngine requires authentication. Please sign in to continue.
            </p>
            
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>🔐 Secure access to your personal gallery</p>
                <p>📁 Private folder management</p>
                <p>🏷️ Personalized tag system</p>
                <p>💾 Data persistence across sessions</p>
              </div>
            </div>

            <Button 
              onClick={() => setShowAuthModal(true)}
              className="w-full"
              size="lg"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In to Continue
            </Button>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
              <p className="font-medium mb-1">Access Instructions:</p>
              <p>Use User ID: <span className="font-mono font-bold">1312yoga</span></p>
              <p>No password required</p>
            </div>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What's Inside</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <p className="font-medium">🖼️ Image Management</p>
                <p className="font-medium">🏷️ Smart Tagging</p>
                <p className="font-medium">📁 Folder Organization</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium">🔒 Privacy Controls</p>
                <p className="font-medium">☁️ Cloud Integration</p>
                <p className="font-medium">🎨 Theme Customization</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Authentication Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onOpenChange={setShowAuthModal}
        defaultMode="login"
      />
    </div>
  );
}
