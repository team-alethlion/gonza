"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FileQuestion, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function AccessDenied404() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="bg-primary/10 p-6 rounded-full">
            <FileQuestion className="w-16 h-16 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">404</h1>
          <h2 className="text-2xl font-bold text-gray-700">Access Restricted</h2>
          <p className="text-muted-foreground">
            We encountered issues verifying your account profile details. 
            Please sign out and sign in again, or contact support if the issue persists.
          </p>
        </div>

        <div className="pt-4">
          <Button 
            onClick={() => signOut({ callbackUrl: '/public/login' })}
            variant="destructive" 
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout of System
          </Button>
        </div>
      </div>
    </div>
  );
}
