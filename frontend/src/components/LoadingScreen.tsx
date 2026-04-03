"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * A centralized loading component used by loading.tsx across the app.
 * Change this file to update the loading animation everywhere.
 */
export default function LoadingScreen({ 
  message = "Loading...", 
  fullScreen = true 
}: LoadingScreenProps) {
  return (
    <div className={`flex flex-col items-center justify-center bg-background ${fullScreen ? 'min-h-screen w-full' : 'h-full w-full p-8'}`}>
      <div className="relative flex items-center justify-center">
        {/* Outer Ring */}
        <div className="absolute h-16 w-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
        
        {/* Inner Icon */}
        <div className="bg-primary/5 p-4 rounded-full">
          <Loader2 className="h-8 w-8 text-primary animate-pulse" />
        </div>
      </div>
      
      {message && (
        <p className="mt-6 text-sm font-medium text-muted-foreground animate-pulse tracking-wide uppercase">
          {message}
        </p>
      )}
    </div>
  );
}
