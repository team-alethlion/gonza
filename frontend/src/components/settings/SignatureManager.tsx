"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Signature, Smartphone, X, PenTool } from "lucide-react";
import SignaturePadComponent from "@/components/signature/SignaturePad";
import { useIsMobile } from "@/hooks/use-mobile";
import Image from "next/image";

interface SignatureManagerProps {
  signature: string | undefined | null;
  onSignatureChange: (signature: string) => void;
  onSignaturePadSave: (signatureDataUrl: string) => Promise<void>;
  onRemoveSignature: () => Promise<void>;
}

const SignatureUploader = ({
  signature,
  onChange,
  onRemove,
}: {
  signature: string | undefined | null;
  onChange: (signature: string) => void;
  onRemove: () => void;
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="signature">Upload Signature Image</Label>
      <div className="flex items-center space-x-4">
        {signature && (
          <div className="relative border rounded bg-white p-2">
            <Image
              height={64}
              width={128}
              src={signature}
              alt="Business Signature"
              className="w-32 h-16 object-contain"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={onRemove}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex-1">
          <Input
            id="signature"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  onChange(reader.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById("signature")?.click()}
            className="w-full">
            <Signature className="mr-2 h-4 w-4" />
            {signature ? "Change Signature" : "Upload Signature"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Upload an image of your signature to display on receipts and invoices,
        or remove it if you don&apos;t want to include it
      </p>
    </div>
  );
};

const SignatureManager: React.FC<SignatureManagerProps> = ({
  signature,
  onSignatureChange,
  onSignaturePadSave,
  onRemoveSignature,
}) => {
  const isMobile = useIsMobile();

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PenTool className="h-5 w-5 text-blue-600" />
          <CardTitle>Business Signature</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mobile Signature Pad */}
        {isMobile && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <Label className="text-sm font-medium text-blue-600">
                Draw Your Signature
              </Label>
            </div>
            <SignaturePadComponent
              onSave={onSignaturePadSave}
              existingSignature={signature || undefined}
            />
          </div>
        )}

        {/* File Upload Option */}
        <div className="space-y-2">
          <SignatureUploader
            signature={signature}
            onChange={onSignatureChange}
            onRemove={onRemoveSignature}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SignatureManager;
