'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';

const opportunitySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  customerId: z.string().min(1, 'Customer is required'),
  leadId: z.string().optional(),
  stage: z.enum(['QUALIFICATION', 'NEEDS_ANALYSIS', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']),
  probability: z.number().min(0).max(100),
  expectedRevenue: z.number().min(0),
  expectedCloseDate: z.string(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type OpportunityFormData = z.infer<typeof opportunitySchema>;

interface Customer {
  id: string;
  name: string;
}

interface Lead {
  id: string;
  title?: string;
  name?: string;
}

interface OpportunityFormProps {
  initialData?: Partial<OpportunityFormData> & { id?: string };
  customers: Customer[];
  leads: Lead[];
  onSubmit: (data: OpportunityFormData) => Promise<void>;
  onCancel: () => void;
}

const STAGES = [
  { value: 'QUALIFICATION', label: 'Qualification', probability: 10 },
  { value: 'NEEDS_ANALYSIS', label: 'Needs Analysis', probability: 25 },
  { value: 'PROPOSAL', label: 'Proposal', probability: 50 },
  { value: 'NEGOTIATION', label: 'Negotiation', probability: 75 },
  { value: 'CLOSED_WON', label: 'Closed Won', probability: 100 },
  { value: 'CLOSED_LOST', label: 'Closed Lost', probability: 0 },
];

const NONE_LEAD_VALUE = '__NONE_LEAD__';

export function OpportunityForm({
  initialData,
  customers,
  leads,
  onSubmit,
  onCancel,
}: OpportunityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      name: initialData?.name || '',
      customerId: initialData?.customerId || '',
      leadId: initialData?.leadId || '',
      stage: initialData?.stage || 'QUALIFICATION',
      probability: initialData?.probability || 10,
      expectedRevenue: initialData?.expectedRevenue || 0,
      expectedCloseDate:
        initialData?.expectedCloseDate ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: initialData?.description || '',
      notes: initialData?.notes || '',
    },
  });

  const stage = watch('stage');
  const expectedRevenue = watch('expectedRevenue');
  const probability = watch('probability');

  const onFormSubmit = async (data: OpportunityFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStageChange = (value: string) => {
    setValue('stage', value as any);
    const stageInfo = STAGES.find((s) => s.value === value);
    if (stageInfo) {
      setValue('probability', stageInfo.probability);
    }
  };

  const weightedRevenue = (expectedRevenue * probability) / 100;

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Opportunity Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Opportunity Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Q4 Enterprise Deal"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="customerId">Customer *</Label>
              <Select
                value={watch('customerId')}
                onValueChange={(value) => setValue('customerId', value)}
              >
                <SelectTrigger className={errors.customerId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && (
                <p className="text-sm text-red-500 mt-1">{errors.customerId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="leadId">Related Lead</Label>
              <Select
                value={watch('leadId') || NONE_LEAD_VALUE}
                onValueChange={(value) => setValue('leadId', value === NONE_LEAD_VALUE ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lead (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_LEAD_VALUE}>None</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.title || lead.name || lead.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of the opportunity"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Information */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stage">Stage *</Label>
              <Select value={stage} onValueChange={handleStageChange}>
                <SelectTrigger className={errors.stage ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.stage && (
                <p className="text-sm text-red-500 mt-1">{errors.stage.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="probability">Probability (%) *</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                {...register('probability', { valueAsNumber: true })}
                placeholder="0-100"
                className={errors.probability ? 'border-red-500' : ''}
              />
              {errors.probability && (
                <p className="text-sm text-red-500 mt-1">{errors.probability.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="expectedRevenue">Expected Revenue *</Label>
              <Input
                id="expectedRevenue"
                type="number"
                step="0.01"
                min="0"
                {...register('expectedRevenue', { valueAsNumber: true })}
                placeholder="0.00"
                className={errors.expectedRevenue ? 'border-red-500' : ''}
              />
              {errors.expectedRevenue && (
                <p className="text-sm text-red-500 mt-1">{errors.expectedRevenue.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="expectedCloseDate">Expected Close Date *</Label>
              <Input
                id="expectedCloseDate"
                type="date"
                {...register('expectedCloseDate')}
                className={errors.expectedCloseDate ? 'border-red-500' : ''}
              />
              {errors.expectedCloseDate && (
                <p className="text-sm text-red-500 mt-1">{errors.expectedCloseDate.message}</p>
              )}
            </div>
          </div>

          {/* Weighted Revenue */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Weighted Revenue</p>
                <p className="text-xs text-gray-500">Expected Revenue × Probability</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">${weightedRevenue.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register('notes')}
            placeholder="Additional notes about this opportunity..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Opportunity' : 'Create Opportunity'}
        </Button>
      </div>
    </form>
  );
}
