'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Construction className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle>Module Under Development</CardTitle>
          <CardDescription>This module is planned but not yet implemented.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            This feature is on the roadmap. Check back soon for updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
