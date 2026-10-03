'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface ForumTopicFormProps {
  topic?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
}

interface ForumTopicFormState {
  title: string;
  slug: string;
  description: string;
  category: string;
  tags: string;
  isPinned: boolean;
  isLocked: boolean;
}

export function ForumTopicForm({ topic, onSubmit, onCancel }: ForumTopicFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ForumTopicFormState>({
    title: topic?.title || '',
    slug: topic?.slug || '',
    description: topic?.description || '',
    category: topic?.category || '',
    tags: topic?.tags?.join(', ') || '',
    isPinned: topic?.isPinned || false,
    isLocked: topic?.isLocked || false,
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'title' && !topic) {
      setFormData(prev => ({
        ...prev,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        tags: formData.tags
          .split(',')
          .map((tag: string) => tag.trim())
          .filter((tag: string) => Boolean(tag)),
      };
      await onSubmit(submitData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{topic ? 'Edit Topic' : 'Create New Topic'}</CardTitle>
          <CardDescription>
            {topic ? 'Update forum topic' : 'Start a new discussion in the community'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Topic Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="What's your question or discussion topic?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              placeholder="your-question-here"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Provide details about your topic..."
              rows={8}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                placeholder="General Discussion"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                placeholder="help, feature-request"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="isPinned"
                checked={formData.isPinned}
                onCheckedChange={(checked) => handleChange('isPinned', checked)}
              />
              <Label htmlFor="isPinned">Pin to Top</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isLocked"
                checked={formData.isLocked}
                onCheckedChange={(checked) => handleChange('isLocked', checked)}
              />
              <Label htmlFor="isLocked">Lock Topic (prevent replies)</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : topic ? 'Update Topic' : 'Create Topic'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
