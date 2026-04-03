"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";
import Image from "next/image";

interface ImageViewerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  imageAlt?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  isOpen,
  onOpenChange,
  imageUrl,
  imageAlt = "Receipt image",
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <div className="relative p-4">
            <DrawerClose className="absolute right-4 top-4 z-10 rounded-sm opacity-70 hover:opacity-100 bg-black/50 text-white p-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DrawerClose>
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="relative w-full h-[80vh]">
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  fill
                  sizes="(max-width: 768px) 100vw, 80vw"
                  className="object-contain rounded-lg"
                  priority={true} // Add this if the image is the main focus of a modal/page
                />
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-4">
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="relative w-full max-h-[80vh] aspect-video">
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-contain rounded-lg"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
