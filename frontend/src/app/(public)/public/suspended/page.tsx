import React from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Mail, LogOut, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/header/Logo";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar / Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <Button asChild variant="ghost" size="sm">
            <Link href="/public/login" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center bg-[#fafafa]">
        <div className="max-w-3xl w-full px-6 py-12 md:py-24 text-center">
          {/* Animated Icon Section */}
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-red-100 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-red-50 rounded-3xl flex items-center justify-center mx-auto border border-red-100 shadow-inner">
              <ShieldAlert className="w-12 h-12 text-red-600" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-4">
            Access Restricted
          </h1>
          
          <p className="text-xl text-gray-500 max-w-xl mx-auto mb-12 leading-relaxed">
            Your access to Gonza Systems is currently restricted. This can occur for several reasons, including security protocols, account status changes, or policy updates.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-16">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-left hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Need more info?</h3>
              <p className="text-sm text-gray-500 mb-6">
                If you believe this is a mistake or need clarification on your account status, please reach out to our support team.
              </p>
              <Button asChild className="w-full rounded-xl">
                <Link href="mailto:support@gonzasystems.com">
                  Contact Support
                </Link>
              </Button>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-left hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <LogOut className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Try another account</h3>
              <p className="text-sm text-gray-500 mb-6">
                Need to access a different organization? Sign out and log in with another set of credentials.
              </p>
              <Button asChild variant="outline" className="w-full rounded-xl border-gray-200">
                <Link href="/public/login">
                  Back to Login
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-400">
            <ShieldAlert className="w-4 h-4" />
            <span>Strict Security Protocol Active</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t bg-white">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
            <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Gonza Systems. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
