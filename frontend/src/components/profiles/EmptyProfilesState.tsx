import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

export const EmptyProfilesState: React.FC = () => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Profiles Yet</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Create profiles for individuals using your business account. Each profile can track their activities separately.
        </p>
      </CardContent>
    </Card>
  );
};