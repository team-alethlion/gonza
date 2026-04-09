"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, LogOut, ShieldCheck, Mail } from "lucide-react";
import { signOut } from "next-auth/react";
import Logo from "@/components/header/Logo";

export default function ReauthenticateNotice() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar / Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <Button
            onClick={() => signOut({ callbackUrl: "/public/login" })}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center bg-[#fafafa]">
        <div className="max-w-3xl w-full px-6 py-12 md:py-24 text-center">
          {/* Success Icon Section */}
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-green-100 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-green-50 rounded-3xl flex items-center justify-center mx-auto border border-green-100 shadow-inner">
              <ShieldCheck className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-4">
            Subscription Updated
          </h1>
          
          <p className="text-xl text-gray-500 max-w-xl mx-auto mb-12 leading-relaxed">
            Your account status has been successfully synchronized. To access your new features and dashboard, a secure session refresh is required.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-16">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-left hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <RefreshCcw className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Sync Credentials</h3>
              <p className="text-sm text-gray-500 mb-6">
                Updating your session will generate fresh security tokens and unlock your dashboard access.
              </p>
              <Button 
                onClick={() => signOut({ callbackUrl: "/public/login" })}
                className="w-full rounded-xl bg-primary hover:bg-primary/90"
              >
                Sign In to Sync
              </Button>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-left hover:shadow-md transition-shadow opacity-60">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Need help?</h3>
              <p className="text-sm text-gray-500 mb-6">
                If you encounter any issues during this refresh, our technical support team is standing by to assist.
              </p>
              <Button variant="outline" className="w-full rounded-xl border-gray-200" asChild>
                <a href="mailto:support@gonzasystems.com">Email Support</a>
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Credential Exchange Required</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t bg-white">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
            <span>Security Protocols</span>
            <span>Privacy Guard</span>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Gonza Systems. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
