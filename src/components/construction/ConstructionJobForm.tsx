'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ConstructionJobFormProps {
  job?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
}

export function ConstructionJobForm({ job, onSubmit, onCancel }: ConstructionJobFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    jobNumber: job?.jobNumber || '',
    projectName: job?.projectName || '',
    description: job?.description || '',
    siteAddress: job?.siteAddress || '',
    city: job?.city || '',
    state: job?.state || '',
    clientName: job?.clientName || '',
    clientEmail: job?.clientEmail || '',
    clientPhone: job?.clientPhone || '',
    startDate: job?.startDate ? new Date(job.startDate).toISOString().slice(0, 10) : '',
    estimatedCost: job?.estimatedCost || 0,
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

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{job ? 'Edit Construction Job' : 'Create New Job'}</CardTitle>
          <CardDescription>
            {job ? 'Update job information' : 'Add a new construction project'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobNumber">Job Number *</Label>
              <Input
                id="jobNumber"
                value={formData.jobNumber}
                onChange={(e) => handleChange('jobNumber', e.target.value)}
                placeholder="JOB-2025-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                value={formData.projectName}
                onChange={(e) => handleChange('projectName', e.target.value)}
                placeholder="Office Building Renovation"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Project scope and details..."
              rows={4}
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Site Location</h3>
            <div className="space-y-2">
              <Label htmlFor="siteAddress">Address</Label>
              <Input
                id="siteAddress"
                value={formData.siteAddress}
                onChange={(e) => handleChange('siteAddress', e.target.value)}
                placeholder="123 Construction Ave"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="New York"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="NY"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Client Information</h3>
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => handleChange('clientName', e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => handleChange('clientEmail', e.target.value)}
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone">Phone</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => handleChange('clientPhone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Estimated Cost (USD) *</Label>
              <Input
                id="estimatedCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.estimatedCost}
                onChange={(e) => handleChange('estimatedCost', parseFloat(e.target.value))}
                placeholder="50000"
                required
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : job ? 'Update Job' : 'Create Job'}
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
