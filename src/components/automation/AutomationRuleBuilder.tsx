'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, X } from 'lucide-react';

interface AutomationRuleBuilderProps {
  rule?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
}

type AutomationActionType =
  | 'send_email'
  | 'send_sms'
  | 'create_task'
  | 'update_field'
  | 'webhook'
  | 'notification';

interface AutomationAction {
  type: AutomationActionType;
  config: Record<string, unknown>;
}

export function AutomationRuleBuilder({ rule, onSubmit, onCancel }: AutomationRuleBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    triggerType: rule?.triggerType || 'record_created',
    isActive: rule?.isActive ?? true,
  });
  const [actions, setActions] = useState<AutomationAction[]>(
    (rule?.actions as AutomationAction[] | undefined)?.map((action) => ({
      type: action.type,
      config: action.config ?? {},
    })) ?? [{ type: 'send_email', config: {} }]
  );

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleActionTypeChange = (index: number, type: AutomationActionType) => {
    setActions((prev) =>
      prev.map((action, currentIndex) =>
        currentIndex === index ? { ...action, type } : action
      )
    );
  };

  const addAction = () => {
    setActions((prev) => [...prev, { type: 'send_email', config: {} }]);
  };

  const removeAction = (index: number) => {
    setActions((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        actions,
        triggerConfig: {},
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{rule ? 'Edit Automation Rule' : 'Create Automation Rule'}</CardTitle>
          <CardDescription>
            {rule ? 'Update automation workflow' : 'Automate repetitive tasks with custom rules'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Send welcome email to new customers"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe what this automation does..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="triggerType">Trigger Event *</Label>
            <Select value={formData.triggerType} onValueChange={(value) => handleChange('triggerType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="record_created">Record Created</SelectItem>
                <SelectItem value="record_updated">Record Updated</SelectItem>
                <SelectItem value="record_deleted">Record Deleted</SelectItem>
                <SelectItem value="field_changed">Field Value Changed</SelectItem>
                <SelectItem value="scheduled">Scheduled (Time-based)</SelectItem>
                <SelectItem value="webhook">Webhook Received</SelectItem>
                <SelectItem value="email_received">Email Received</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose when this automation should run
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Actions to Perform</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAction}>
                <Plus className="mr-2 h-4 w-4" />
                Add Action
              </Button>
            </div>

            {actions.map((action, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label>Action Type *</Label>
                        <Select
                          value={action.type}
                          onValueChange={(value: AutomationActionType) =>
                            handleActionTypeChange(index, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="send_email">Send Email</SelectItem>
                            <SelectItem value="send_sms">Send SMS</SelectItem>
                            <SelectItem value="create_task">Create Task</SelectItem>
                            <SelectItem value="update_field">Update Field</SelectItem>
                            <SelectItem value="webhook">Call Webhook</SelectItem>
                            <SelectItem value="notification">Send Notification</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                        <p>
                          <strong>{action.type.replace('_', ' ').toUpperCase()}</strong>
                          {action.type === 'send_email' && ' - Sends an email to specified recipients'}
                          {action.type === 'send_sms' && ' - Sends an SMS message'}
                          {action.type === 'create_task' && ' - Creates a new task'}
                          {action.type === 'update_field' && ' - Updates a field value'}
                          {action.type === 'webhook' && ' - Calls an external webhook URL'}
                          {action.type === 'notification' && ' - Sends an in-app notification'}
                        </p>
                      </div>
                    </div>

                    {actions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAction(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleChange('isActive', checked)}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active (rule will run automatically)
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Inactive rules won't execute but can be enabled later
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
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
