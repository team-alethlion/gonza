"use client";
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface BusinessPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  onPasswordVerified: () => void;
  onVerifyPassword: (password: string) => Promise<boolean>;
}

export const BusinessPasswordDialog: React.FC<BusinessPasswordDialogProps> = ({
  open,
  onOpenChange,
  businessName,
  onPasswordVerified,
  onVerifyPassword,
}) => {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberForSession, setRememberForSession] = useState(true);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter the business password.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      const isValid = await onVerifyPassword(password);
      
      if (isValid) {
        onPasswordVerified();
        setPassword('');
        onOpenChange(false);
        
        toast({
          title: "Access Granted",
          description: `Successfully switched to ${businessName}`,
        });
      } else {
        toast({
          title: "Invalid Password",
          description: "The password you entered is incorrect.",
          variant: "destructive",
        });
        setPassword('');
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      toast({
        title: "Verification Failed",
        description: "Failed to verify password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setShowPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="sm:max-w-md mx-4 max-w-[95vw] max-h-[90vh] overflow-y-auto z-[100]">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Business Access Required</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Enter the password to switch to <span className="font-semibold">{businessName}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-password">Password</Label>
            <div className="relative">
              <Input
                id="business-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter business password"
                disabled={isVerifying}
                className="pr-10"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isVerifying}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="remember-session"
              checked={rememberForSession}
              onChange={(e) => setRememberForSession(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="remember-session" className="text-sm">
              Remember for this session
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isVerifying}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isVerifying || !password.trim()}
              className="flex-1"
            >
              {isVerifying ? "Verifying..." : "Access Business"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};