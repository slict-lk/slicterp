'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Bell, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import type { SearchFilters } from './AdvancedSearchFilters';

interface SavedSearchesProps {
  userId: string;
  currentFilters?: SearchFilters;
}

export function SavedSearches({ userId, currentFilters }: SavedSearchesProps) {
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    emailNotifications: true,
    frequency: 'DAILY',
  });

  useEffect(() => {
    loadSavedSearches();
  }, [userId]);

  const loadSavedSearches = async () => {
    try {
      const response = await fetch(`/api/properties/saved-searches?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setSavedSearches(data.data);
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  const saveSearch = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name for this search');
      return;
    }

    if (!currentFilters) {
      toast.error('No search criteria to save');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/properties/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: formData.name,
          criteria: currentFilters,
          emailNotifications: formData.emailNotifications,
          frequency: formData.frequency,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Search saved successfully');
        setIsOpen(false);
        setFormData({ name: '', emailNotifications: true, frequency: 'DAILY' });
        loadSavedSearches();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save search');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSearch = async (searchId: string) => {
    try {
      const response = await fetch(
        `/api/properties/saved-searches?id=${searchId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Search deleted successfully');
        setSavedSearches(savedSearches.filter(s => s.id !== searchId));
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete search');
    }
  };

  const applySearch = (criteria: any) => {
    // Emit custom event to apply the search
    window.dispatchEvent(new CustomEvent('applySavedSearch', { detail: criteria }));
    toast.success('Search applied');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Saved Searches</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!currentFilters}>
              <Save className="mr-2 h-4 w-4" />
              Save Current Search
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Search</DialogTitle>
              <DialogDescription>
                Save this search to get notified when new matching properties are listed
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="searchName">Search Name</Label>
                <Input
                  id="searchName"
                  placeholder="e.g., Downtown Apartments"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications">Email Notifications</Label>
                  <Switch
                    id="notifications"
                    checked={formData.emailNotifications}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, emailNotifications: checked })
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Get notified when new properties match your criteria
                </p>
              </div>

              {formData.emailNotifications && (
                <div className="space-y-2">
                  <Label htmlFor="frequency">Notification Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSTANT">Instant (as they're listed)</SelectItem>
                      <SelectItem value="DAILY">Daily Summary</SelectItem>
                      <SelectItem value="WEEKLY">Weekly Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button onClick={saveSearch} disabled={isLoading} className="w-full">
                {isLoading ? 'Saving...' : 'Save Search'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {savedSearches.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Save className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No saved searches yet</p>
              <p className="text-sm mt-2">
                Save your search criteria to quickly find properties later
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {savedSearches.map((search) => (
            <Card key={search.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{search.name}</h4>
                      {search.emailNotifications && (
                        <Badge variant="secondary" className="text-xs">
                          <Bell className="h-3 w-3 mr-1" />
                          {search.frequency}
                        </Badge>
                      )}
                      {search.isActive ? (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {search.criteria.propertyType && (
                        <p>Type: {search.criteria.propertyType}</p>
                      )}
                      {(search.criteria.minPrice || search.criteria.maxPrice) && (
                        <p>
                          Price: {search.criteria.minPrice?.toLocaleString() || '0'} -{' '}
                          {search.criteria.maxPrice?.toLocaleString() || '∞'}
                        </p>
                      )}
                      {search.criteria.city && <p>Location: {search.criteria.city}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applySearch(search.criteria)}
                    >
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSearch(search.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

