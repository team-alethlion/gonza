"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProfiles } from "@/contexts/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export const PinEntryOverlay: React.FC = () => {
  const {
    currentProfile,
    isProfileVerified,
    verifyPin,
    setCurrentProfile,
    logoutProfile,
  } = useProfiles();
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPin("");
    setError(false);
  }, [currentProfile?.id]);

  // Auto-focus the input when overlay appears
  useEffect(() => {
    if (currentProfile && !isProfileVerified && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentProfile, isProfileVerified]);

  if (!currentProfile || isProfileVerified) {
    return null;
  }

  const handleVerify = async (pinToVerify?: string) => {
    const pinValue = pinToVerify || pin;
    if (pinValue.length !== 4) return;

    setIsVerifying(true);
    setError(false);
    try {
      const success = await verifyPin(pinValue);
      if (!success) {
        setPin("");
        setError(true);
        setTimeout(() => {
          setError(false);
          inputRef.current?.focus();
        }, 500);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(value);

    // Auto-submit when 4 digits are entered
    if (value.length === 4) {
      handleVerify(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && pin.length === 4) {
      handleVerify();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={cn(
          "w-full max-w-sm flex flex-col items-center justify-center space-y-6 text-center",
          error ? "animate-shake" : "",
        )}>
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/icon.png"
            alt="Gonza Logo"
            // Using 48x48 because h-12 in Tailwind is 48px (12 * 4px)
            width={48}
            height={48}
            className="h-12 w-auto animate-in fade-in slide-in-from-bottom-4 duration-700 object-contain"
            priority
          />
        </div>

        {/* Header */}
        <div className="space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Enter PIN</h2>
          <p className="text-sm text-muted-foreground">
            {currentProfile.profile_name}
          </p>
        </div>

        {/* PIN Input */}
        <div className="w-full space-y-4">
          <Input
            ref={inputRef}
            id="security-pin-code"
            name="security-pin-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={handlePinChange}
            onKeyDown={handleKeyDown}
            disabled={isVerifying}
            placeholder="Enter 4-digit PIN"
            autoComplete="one-time-code"
            style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
            className={cn(
              "text-center text-2xl font-bold tracking-widest h-14",
              error && "border-destructive",
            )}
          />

          {error && (
            <p className="text-sm text-destructive animate-in fade-in">
              Incorrect PIN. Please try again.
            </p>
          )}

          <Button
            variant="outline"
            size="lg"
            onClick={() => setCurrentProfile(null)}
            disabled={isVerifying}
            className="w-full">
            Switch Profile
          </Button>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-2 w-full">
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="link"
              size="sm"
              onClick={() => setCurrentProfile(null)}
              disabled={isVerifying}
              className="h-auto p-0 text-sm">
              Back to Profiles
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-destructive h-auto p-0 text-xs font-normal hover:no-underline"
              onClick={logoutProfile}
              disabled={isVerifying}>
              Logout of System
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            First time? Default PIN is{" "}
            <span className="font-mono font-semibold">0000</span>
          </p>
        </div>
      </div>
    </div>
  );
};
