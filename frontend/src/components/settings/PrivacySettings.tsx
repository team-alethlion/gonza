"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

interface PrivacySettingsProps {
  onRequestDataDeletion: () => void;
}

const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  onRequestDataDeletion,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <CardTitle>Privacy & Data</CardTitle>
        </div>
        <CardDescription>Manage your privacy settings and data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Privacy Policy</h3>
            <p className="text-sm text-gray-500">Review our privacy policy</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/public/privacy-policy">View Policy</Link>
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Delete My Data</h3>
            <p className="text-sm text-gray-500">
              Request deletion of your personal information
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Request Deletion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Data Deletion</DialogTitle>
                <DialogDescription>
                  This will open your email client to send a request for data
                  deletion. Our team will process your request and contact you
                  for verification.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-2 mt-4">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={onRequestDataDeletion}>Proceed</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-xs text-muted-foreground">
          You can request deletion of your account and associated data at any
          time.
        </p>
      </CardContent>
    </Card>
  );
};

export default PrivacySettings;
