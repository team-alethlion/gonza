"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FileQuestion, LogOut, Home } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function AgencyNotFound() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-6 max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-center">
          <div className="bg-primary/10 p-6 rounded-full">
            <FileQuestion className="w-16 h-16 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">404</h1>
          <h2 className="text-2xl font-bold text-gray-700">Access Restricted</h2>
          <p className="text-muted-foreground">
            We encountered issues verifying your account profile details or the page does not exist.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          {session ? (
            <Button 
              onClick={() => signOut({ callbackUrl: '/public/login' })}
              variant="destructive" 
              className="w-full gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout of System
            </Button>
          ) : (
            <Button asChild className="w-full gap-2">
              <Link href="/public/login">
                <LogOut className="w-4 h-4" />
                Return to Login
              </Link>
            </Button>
          )}
          
          <Button asChild variant="outline" className="w-full gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              Back to Website
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
