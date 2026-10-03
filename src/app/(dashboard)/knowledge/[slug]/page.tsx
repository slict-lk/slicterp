'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookText, Eye, ThumbsUp, Share2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function KnowledgeArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
  }, [params.slug]);

  const fetchArticle = async () => {
    try {
      const tenantId = 'tenant-1';
      const response = await fetch(`/api/knowledge?tenantId=${tenantId}`);
      const articles = await response.json();
      const found = articles.find((a: any) => a.slug === params.slug);
      
      if (found) {
        const detailResponse = await fetch(`/api/knowledge/${found.id}`);
        const detail = await detailResponse.json();
        setArticle(detail);
      }
    } catch (error) {
      console.error('Failed to fetch article:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-8">
        <Card className="p-12 text-center">
          <BookText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Article not found</h3>
          <Button asChild className="mt-4">
            <Link href="/knowledge">Back to Knowledge Base</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/knowledge">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Articles
          </Link>
        </Button>

        <Card>
          <CardContent className="pt-8">
            {/* Header */}
            <div className="mb-8">
              {article.category && (
                <Badge variant="outline" className="mb-4">{article.category}</Badge>
              )}
              <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
              
              {article.excerpt && (
                <p className="text-xl text-muted-foreground">{article.excerpt}</p>
              )}

              <div className="flex items-center gap-6 mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {article.viewCount} views
                </div>
                {article.publishedAt && (
                  <div>
                    Published {new Date(article.publishedAt).toLocaleDateString()}
                  </div>
                )}
                {article.updatedAt && (
                  <div>
                    Updated {new Date(article.updatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {article.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="prose max-w-none">
              <div
                className="leading-relaxed"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-12 pt-8 border-t">
              <Button variant="outline">
                <ThumbsUp className="mr-2 h-4 w-4" />
                Helpful
              </Button>
              <Button variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>

            {/* Related Articles */}
            <div className="mt-12 pt-8 border-t">
              <h3 className="text-lg font-semibold mb-4">Related Articles</h3>
              <p className="text-muted-foreground">
                No related articles available
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
