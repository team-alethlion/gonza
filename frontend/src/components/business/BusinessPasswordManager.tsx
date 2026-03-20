"use client";
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Lock, Eye, EyeOff, Shield, ShieldOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface BusinessPasswordManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
  hasPassword: boolean;
  onPasswordSet: (businessId: string, hasPassword: boolean) => void;
  onSetPassword: (businessId: string, password: string) => Promise<boolean>;
  onRemovePassword: (businessId: string, currentPassword: string) => Promise<boolean>;
}

export const BusinessPasswordManager: React.FC<BusinessPasswordManagerProps> = ({
  open,
  onOpenChange,
  businessId,
  businessName,
  hasPassword,
  onPasswordSet,
  onSetPassword,
  onRemovePassword,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [confirmationPassword, setConfirmationPassword] = useState('');
  const [showConfirmationPassword, setShowConfirmationPassword] = useState(false);
  const { toast } = useToast();

  const validatePassword = () => {
    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) return;

    setIsProcessing(true);
    
    try {
      const success = await onSetPassword(businessId, password);
      
      if (success) {
        onPasswordSet(businessId, true);
        setPassword('');
        setConfirmPassword('');
        onOpenChange(false);
        
        toast({
          title: "Password Set Successfully",
          description: `Business "${businessName}" is now password protected.`,
        });
        
        // Refresh the app to reflect password protection instantly
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error setting password:', error);
      toast({
        title: "Failed to Set Password",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPasswordRemoval = async () => {
    if (!confirmationPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter the current password to remove protection.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const success = await onRemovePassword(businessId, confirmationPassword);
      
      if (success) {
        onPasswordSet(businessId, false);
        setShowRemoveDialog(false);
        setShowPasswordConfirmation(false);
        setConfirmationPassword('');
        onOpenChange(false);
        
        toast({
          title: "Password Removed",
          description: `Business "${businessName}" is no longer password protected.`,
        });
        
        // Refresh the app to reflect password removal instantly
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error removing password:', error);
      toast({
        title: "Failed to Remove Password",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePassword = () => {
    setShowPasswordConfirmation(true);
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowPasswordConfirmation(false);
    setConfirmationPassword('');
    setShowConfirmationPassword(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {hasPassword ? (
                <Shield className="h-6 w-6 text-primary" />
              ) : (
                <ShieldOff className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <DialogTitle className="text-xl">
              {hasPassword ? 'Change Business Password' : 'Set Business Password'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {hasPassword 
                ? `Update the password for "${businessName}"`
                : `Set a password to protect access to "${businessName}"`
              }
            </p>
          </DialogHeader>

          {hasPassword ? (
            <div className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Lock className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">
                  This business is currently password protected
                </p>
              </div>
              
              {showPasswordConfirmation ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-sm text-amber-800 font-medium mb-2">
                      Enter current password to remove protection
                    </p>
                    <div className="relative">
                      <Input
                        type={showConfirmationPassword ? "text" : "password"}
                        value={confirmationPassword}
                        onChange={(e) => setConfirmationPassword(e.target.value)}
                        placeholder="Enter current password"
                        disabled={isProcessing}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmationPassword(!showConfirmationPassword)}
                        disabled={isProcessing}
                      >
                        {showConfirmationPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPasswordConfirmation(false);
                        setConfirmationPassword('');
                      }}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleConfirmPasswordRemoval}
                      disabled={isProcessing || !confirmationPassword.trim()}
                      className="flex-1"
                    >
                      {isProcessing ? "Removing..." : "Remove Password"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <Button
                    variant="destructive"
                    onClick={handleRemovePassword}
                    disabled={isProcessing}
                    className="w-full max-w-xs"
                  >
                    Remove Password
                  </Button>
                </div>
              )}
            </div>
          ) : null}

          {(!hasPassword || password || confirmPassword) && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    disabled={isProcessing}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isProcessing}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={isProcessing}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isProcessing}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing || !password.trim() || !confirmPassword.trim()}
                  className="flex-1"
                >
                  {isProcessing ? "Setting..." : hasPassword ? "Update Password" : "Set Password"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Password Protection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove password protection from "{businessName}". Anyone with access to your account will be able to switch to this business without entering a password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemovePassword}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Removing..." : "Remove Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};