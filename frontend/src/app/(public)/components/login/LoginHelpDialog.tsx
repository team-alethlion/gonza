"use client";

import React from "react";
import { HelpCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function LoginHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="link"
          className="text-sm text-primary p-0 h-auto">
          <HelpCircle className="w-4 h-4 mr-1" />
          Need Help?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Need Help?</DialogTitle>
          <DialogDescription>
            If you need assistance with logging in or have any other questions,
            please contact our support team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p>Common issues:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Forgot your password? Use the &quot;Forgot password?&quot; link.
            </li>
            <li>New user? Click on &quot;Create Account&quot; to sign up.</li>
            <li>
              Having trouble with Google Sign-in? Make sure you have a valid
              Google account.
            </li>
          </ul>
          <div className="p-4 border rounded-md mt-4">
            <h3 className="font-medium mb-2">Contact Support</h3>
            <p className="text-sm mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a
                href="mailto:gonzabrands@gmail.com"
                className="text-primary hover:underline">
                gonzabrands@gmail.com
              </a>
            </p>
            <p className="text-sm flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <a
                href="tel:+256758519696"
                className="text-primary hover:underline">
                +256 758519696
              </a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
