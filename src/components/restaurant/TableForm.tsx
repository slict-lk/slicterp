'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TableFormProps {
  table?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
}

export function TableForm({ table, onSubmit, onCancel }: TableFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tableNumber: table?.tableNumber || '',
    capacity: table?.capacity || 2,
    location: table?.location || '',
    status: table?.status || 'AVAILABLE',
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
          <CardTitle>{table ? 'Edit Table' : 'Add New Table'}</CardTitle>
          <CardDescription>
            {table ? 'Update table information' : 'Add a new table to your restaurant'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tableNumber">Table Number *</Label>
            <Input
              id="tableNumber"
              value={formData.tableNumber}
              onChange={(e) => handleChange('tableNumber', e.target.value)}
              placeholder="1, A1, Patio-5, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (number of seats) *</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              max="20"
              value={formData.capacity}
              onChange={(e) => handleChange('capacity', parseInt(e.target.value))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="Main Dining, Patio, Bar Area, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="OCCUPIED">Occupied</SelectItem>
                <SelectItem value="RESERVED">Reserved</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : table ? 'Update Table' : 'Add Table'}
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
