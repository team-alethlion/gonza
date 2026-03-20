"use client";

import React, { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Save, Edit } from 'lucide-react';

interface SignaturePadComponentProps {
  onSave: (signatureDataUrl: string) => void;
  existingSignature?: string;
  className?: string;
}

const SignaturePadComponent: React.FC<SignaturePadComponentProps> = ({
  onSave,
  existingSignature,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showPad, setShowPad] = useState(!existingSignature);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (canvasRef.current && showPad) {
      // Initialize signature pad
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        minWidth: 2,
        maxWidth: 4,
        throttle: 16,
        minDistance: 5,
      });

      const signaturePad = signaturePadRef.current;

      // Set up event listeners
      const handleBeginStroke = () => {
        setIsDrawing(true);
        setIsEmpty(false);
      };
      const handleEndStroke = () => {
        setIsDrawing(false);
        setIsEmpty(signaturePad.isEmpty());
      };

      signaturePad.addEventListener('beginStroke', handleBeginStroke);
      signaturePad.addEventListener('endStroke', handleEndStroke);

      // Resize canvas to match container
      const resizeCanvas = () => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const container = canvas.parentElement;
          if (container) {
            const rect = container.getBoundingClientRect();
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            
            canvas.width = rect.width * ratio;
            canvas.height = 200 * ratio;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = '200px';
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.scale(ratio, ratio);
            }
            
            signaturePad.clear();
            setIsEmpty(true);
          }
        }
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      return () => {
        signaturePad.removeEventListener('beginStroke', handleBeginStroke);
        signaturePad.removeEventListener('endStroke', handleEndStroke);
        window.removeEventListener('resize', resizeCanvas);
        signaturePad.off();
      };
    }
  }, [showPad]);

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setIsDrawing(false);
      setIsEmpty(true);
    }
  };

  const saveSignature = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const dataUrl = signaturePadRef.current.toDataURL('image/png', 0.8);
      onSave(dataUrl);
      setShowPad(false);
    }
  };

  const hasSignature = !isEmpty;

  if (!showPad && existingSignature) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card className="p-4">
          <CardContent className="p-0">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Current Signature:</p>
              <div className="border rounded-lg p-4 bg-white">
                <img
                  src={existingSignature}
                  alt="Current Signature"
                  className="max-h-24 mx-auto object-contain"
                />
              </div>
              <Button
                onClick={() => setShowPad(true)}
                variant="outline"
                className="w-full"
              >
                <Edit className="mr-2 h-4 w-4" />
                Replace Signature
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="p-4">
        <CardContent className="p-0">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Draw your signature using your finger or stylus
              </p>
            </div>
            
            {/* Signature Canvas */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white relative overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-[200px] touch-none"
                style={{ touchAction: 'none' }}
              />
              {!hasSignature && !isDrawing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-gray-400 text-sm">Sign here</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={clearSignature}
                variant="outline"
                className="flex-1"
                disabled={!hasSignature}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <Button
                onClick={saveSignature}
                className="flex-1"
                disabled={!hasSignature}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Signature
              </Button>
            </div>

            {existingSignature && (
              <Button
                onClick={() => setShowPad(false)}
                variant="ghost"
                className="w-full"
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignaturePadComponent;
