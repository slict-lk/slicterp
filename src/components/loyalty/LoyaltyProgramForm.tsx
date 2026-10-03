'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';

interface LoyaltyProgramFormProps {
  program?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
}

interface LoyaltyTier {
  name: string;
  minPoints: number;
  benefits: string;
}

interface LoyaltyProgramFormState {
  name: string;
  description: string;
  pointsPerDollar: number;
  redeemRate: number;
}

export function LoyaltyProgramForm({ program, onSubmit, onCancel }: LoyaltyProgramFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LoyaltyProgramFormState>({
    name: program?.name || '',
    description: program?.description || '',
    pointsPerDollar: program?.pointsPerDollar || 1,
    redeemRate: program?.redeemRate || 0.01,
  });
  const [tiers, setTiers] = useState<LoyaltyTier[]>(
    (program?.tiers as LoyaltyTier[] | undefined)?.map((tier) => ({
      name: tier.name,
      minPoints: tier.minPoints,
      benefits: tier.benefits,
    })) ?? [{ name: 'Bronze', minPoints: 0, benefits: 'Basic rewards' }]
  );

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTierChange = <Key extends keyof LoyaltyTier>(
    index: number,
    field: Key,
    value: LoyaltyTier[Key]
  ) => {
    setTiers((prev) =>
      prev.map((tier, currentIndex) =>
        currentIndex === index ? { ...tier, [field]: value } : tier
      )
    );
  };

  const addTier = () => {
    setTiers((prev) => [...prev, { name: '', minPoints: 0, benefits: '' }]);
  };

  const removeTier = (index: number) => {
    setTiers((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ ...formData, tiers });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{program ? 'Edit Loyalty Program' : 'Create Loyalty Program'}</CardTitle>
          <CardDescription>
            {program ? 'Update program settings' : 'Reward customers for their loyalty'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Program Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="VIP Rewards Program"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Earn points with every purchase..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pointsPerDollar">Points per Dollar *</Label>
              <Input
                id="pointsPerDollar"
                type="number"
                step="0.1"
                min="0"
                value={formData.pointsPerDollar}
                onChange={(e) => handleChange('pointsPerDollar', parseFloat(e.target.value))}
                required
              />
              <p className="text-sm text-muted-foreground">e.g., 1 = 1 point per $1 spent</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="redeemRate">Redemption Rate *</Label>
              <Input
                id="redeemRate"
                type="number"
                step="0.001"
                min="0"
                value={formData.redeemRate}
                onChange={(e) => handleChange('redeemRate', parseFloat(e.target.value))}
                required
              />
              <p className="text-sm text-muted-foreground">e.g., 0.01 = 100 points = $1</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Membership Tiers</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTier}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tier
              </Button>
            </div>

            {tiers.map((tier, index) => (
              <Card key={index}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label>Tier Name *</Label>
                        <Input
                          value={tier.name}
                          onChange={(e) => handleTierChange(index, 'name', e.target.value)}
                          placeholder="Gold, Platinum, etc."
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Minimum Points *</Label>
                        <Input
                          type="number"
                          min="0"
                          value={tier.minPoints}
                          onChange={(e) => handleTierChange(index, 'minPoints', parseInt(e.target.value))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Benefits</Label>
                        <Textarea
                          value={tier.benefits}
                          onChange={(e) => handleTierChange(index, 'benefits', e.target.value)}
                          placeholder="Free shipping, exclusive deals, etc."
                          rows={2}
                        />
                      </div>
                    </div>

                    {tiers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTier(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : program ? 'Update Program' : 'Create Program'}
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
