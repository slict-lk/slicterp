"use client";

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, FileText, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface WebPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaDescription?: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

function StatCard({ title, value, icon: Icon }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function WebsitePage() {
  const [pages, setPages] = useState<WebPage[]>([]);
  const [publishedCount, setPublishedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/website/pages');
      if (!response.ok) throw new Error('Failed to fetch pages');
      const data = await response.json();
      setPages(data.pages || []);
      setPublishedCount(data.publishedCount || 0);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Website</h1>
          <p className="text-muted-foreground">Manage your website pages</p>
        </div>
        <Button onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Pages" value={pages.length} icon={FileText} />
        <StatCard title="Published Pages" value={publishedCount} icon={Eye} />
        <StatCard title="Draft Pages" value={pages.length - publishedCount} icon={EyeOff} />
      </div>

      <div className="space-y-4">
        {pages.map(page => (
          <Card key={page.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{page.title}</CardTitle>
                    {page.isPublished ? (
                      <Badge className="bg-green-100 text-green-800">Published</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">Draft</Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Globe className="h-3 w-3" />
                    <span>/{page.slug}</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {page.metaDescription && (
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{page.metaDescription}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
