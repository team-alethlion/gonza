"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Save } from "lucide-react";

interface CustomerNotesProps {
  notes: string;
  onSave: (notes: string) => Promise<boolean>;
}

const CustomerNotes: React.FC<CustomerNotesProps> = ({ notes, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [notesContent, setNotesContent] = useState(notes);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await onSave(notesContent);
      if (success) {
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              rows={8}
              placeholder="Enter notes about this customer..."
              className="w-full"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setNotesContent(notes);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Notes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {notes ? (
              <div className="whitespace-pre-wrap">{notes}</div>
            ) : (
              <div className="text-muted-foreground italic">
                No notes for this customer yet.
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Save className="h-4 w-4 mr-1" />
                Edit Notes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerNotes;
