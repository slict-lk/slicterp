'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SMSCampaignFormProps {
  campaign?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
}

export function SMSCampaignForm({ campaign, onSubmit, onCancel }: SMSCampaignFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    message: campaign?.message || '',
    scheduledAt: campaign?.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) : '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  const charCount = formData.message.length;
  const isOverLimit = charCount > 160;

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{campaign ? 'Edit SMS Campaign' : 'Create SMS Campaign'}</CardTitle>
          <CardDescription>
            {campaign ? 'Update campaign details' : 'Send SMS messages to your customers'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Summer Sale 2025"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="message">Message *</Label>
              <Badge variant={isOverLimit ? 'destructive' : 'secondary'}>
                {charCount}/160 characters
              </Badge>
            </div>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              placeholder="Get 20% off all items! Use code SUMMER20. Shop now: https://example.com"
              rows={4}
              required
              className={isOverLimit ? 'border-red-500' : ''}
            />
            {isOverLimit && (
              <p className="text-sm text-red-500">
                Message exceeds 160 characters. Long messages will be split into multiple SMS.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Schedule Send Time (optional)</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => handleChange('scheduledAt', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Leave empty to send immediately
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium">SMS Best Practices</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Keep messages under 160 characters</li>
              <li>• Include a clear call-to-action</li>
              <li>• Add opt-out instructions for marketing messages</li>
              <li>• Personalize when possible</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}
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
