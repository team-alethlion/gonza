"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="bg-primary/10 p-6 rounded-full">
            <FileQuestion className="w-16 h-16 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">404</h1>
          <h2 className="text-2xl font-bold text-gray-700">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you are looking for doesn&apos;t exist or has been restricted due to account status.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button asChild variant="outline" className="gap-2">
            <Link href="javascript:history.back()">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
