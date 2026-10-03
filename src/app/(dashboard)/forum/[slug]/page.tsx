'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Eye, ThumbsUp, Reply, ArrowLeft, Pin, Lock } from 'lucide-react';
import Link from 'next/link';

export default function ForumTopicPage() {
  const params = useParams();
  const [topic, setTopic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    fetchTopic();
  }, [params.slug]);

  const fetchTopic = async () => {
    try {
      const tenantId = 'tenant-1';
      const response = await fetch(`/api/forum?tenantId=${tenantId}`);
      const topics = await response.json();
      const found = topics.find((t: any) => t.slug === params.slug);
      
      if (found) {
        const detailResponse = await fetch(`/api/forum/${found.id}`);
        const detail = await detailResponse.json();
        setTopic(detail);
      }
    } catch (error) {
      console.error('Failed to fetch topic:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    // Post reply logic here
    console.log('Reply:', replyContent);
    setReplyContent('');
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

  if (!topic) {
    return (
      <div className="p-8">
        <Card className="p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Topic not found</h3>
          <Button asChild className="mt-4">
            <Link href="/forum">Back to Forum</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/forum">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forum
          </Link>
        </Button>

        {/* Topic Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  {topic.isPinned && (
                    <Badge variant="secondary">
                      <Pin className="mr-1 h-3 w-3" />
                      Pinned
                    </Badge>
                  )}
                  {topic.isLocked && (
                    <Badge variant="secondary">
                      <Lock className="mr-1 h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                  {topic.category && (
                    <Badge variant="outline">{topic.category}</Badge>
                  )}
                  <Badge className={
                    topic.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                    topic.status === 'ANSWERED' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {topic.status}
                  </Badge>
                </div>
                <CardTitle className="text-2xl mb-3">{topic.title}</CardTitle>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {topic.viewCount} views
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {topic._count?.posts || 0} replies
                  </div>
                  <div>
                    Created {new Date(topic.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="leading-relaxed whitespace-pre-wrap">{topic.description}</p>
            </div>
            {topic.tags && topic.tags.length > 0 && (
              <div className="flex gap-2 mt-6">
                {topic.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          {topic.posts && topic.posts.length > 0 ? (
            topic.posts.map((post: any, index: number) => (
              <Card key={post.id}>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">U</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">User</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                        {post.isAcceptedAnswer && (
                          <Badge variant="default" className="bg-green-500">
                            ✓ Accepted Answer
                          </Badge>
                        )}
                      </div>
                      <div className="prose max-w-none">
                        <p className="whitespace-pre-wrap">{post.content}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <Button variant="ghost" size="sm">
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          Helpful
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Reply className="mr-2 h-4 w-4" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No replies yet</h3>
              <p className="text-muted-foreground">Be the first to reply to this topic</p>
            </Card>
          )}
        </div>

        {/* Reply Form */}
        {!topic.isLocked && (
          <Card>
            <CardHeader>
              <CardTitle>Post a Reply</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReply} className="space-y-4">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply..."
                  rows={6}
                  required
                />
                <Button type="submit">
                  <Reply className="mr-2 h-4 w-4" />
                  Post Reply
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
