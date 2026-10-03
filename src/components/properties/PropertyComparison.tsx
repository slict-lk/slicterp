'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ArrowLeftRight, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Property {
  id: string;
  title: string;
  price: number;
  currency: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  propertyType: string;
  images: string[];
  city: string;
  state: string;
  amenities?: Array<{ name: string }>;
  viewCount?: number;
  _count?: {
    favorites: number;
  };
  neighborhood?: {
    walkScore?: number;
  } | null;
}

interface PropertyComparisonProps {
  properties: Property[];
  userId?: string;
}

export function PropertyComparison({ properties, userId }: PropertyComparisonProps) {
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);

  const toggleProperty = (propertyId: string) => {
    setSelectedProperties((prev) => {
      if (prev.includes(propertyId)) {
        return prev.filter((id) => id !== propertyId);
      } else {
        if (prev.length >= 5) {
          toast.error('You can compare up to 5 properties at once');
          return prev;
        }
        return [...prev, propertyId];
      }
    });
  };

  const loadComparison = async () => {
    if (selectedProperties.length < 2) {
      toast.error('Select at least 2 properties to compare');
      return;
    }

    try {
      const response = await fetch(
        `/api/properties/compare?propertyIds=${selectedProperties.join(',')}`
      );
      const data = await response.json();

      if (data.success) {
        setComparisonData(data.data);
        setIsComparing(true);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load comparison');
    }
  };

  const saveComparison = async () => {
    if (!userId) {
      toast.error('Please log in to save comparisons');
      return;
    }

    try {
      const response = await fetch('/api/properties/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          propertyIds: selectedProperties,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Comparison saved successfully');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save comparison');
    }
  };

  const getComparisonValue = (category: string, propertyId: string) => {
    if (!comparisonData?.comparison) return null;
    const item = comparisonData.comparison[category]?.find(
      (i: any) => i.id === propertyId
    );
    return item?.value;
  };

  const getBestValue = (category: string, higher = true) => {
    if (!comparisonData?.comparison || !comparisonData.comparison[category]) return null;
    const values = comparisonData.comparison[category]
      .map((i: any) => ({ id: i.id, value: i.value }))
      .filter((i: any) => i.value !== null && i.value !== undefined);

    if (values.length === 0) return null;

    return higher
      ? values.reduce((max: any, curr: any) => (curr.value > max.value ? curr : max))
      : values.reduce((min: any, curr: any) => (curr.value < min.value ? curr : min));
  };

  const isBestValue = (category: string, propertyId: string, higher = true) => {
    const best = getBestValue(category, higher);
    return best?.id === propertyId;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Compare Properties
              {selectedProperties.length > 0 && (
                <Badge variant="secondary">{selectedProperties.length} selected</Badge>
              )}
            </div>
            {selectedProperties.length >= 2 && (
              <Button onClick={loadComparison}>Compare</Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => (
              <div
                key={property.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedProperties.includes(property.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleProperty(property.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedProperties.includes(property.id)}
                    onCheckedChange={() => toggleProperty(property.id)}
                  />
                  <div className="flex-1">
                    {property.images?.[0] && (
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    <h4 className="font-semibold text-sm">{property.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {property.city}, {property.state}
                    </p>
                    <p className="font-bold mt-1">
                      {property.currency} {property.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Dialog */}
      <Dialog open={isComparing} onOpenChange={setIsComparing}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Property Comparison</DialogTitle>
            <DialogDescription>
              Compare selected properties side by side
            </DialogDescription>
          </DialogHeader>

          {comparisonData && (
            <div className="space-y-6">
              {/* Images Row */}
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedProperties.length}, 1fr)` }}>
                {comparisonData.properties.map((property: Property) => (
                  <div key={property.id}>
                    <img
                      src={property.images[0] || '/placeholder-property.jpg'}
                      alt={property.title}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <h3 className="font-semibold mt-2">{property.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {property.city}, {property.state}
                    </p>
                  </div>
                ))}
              </div>

              {/* Comparison Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {/* Price */}
                    <tr className="border-b bg-muted/50">
                      <td className="p-3 font-medium">Price</td>
                      {comparisonData.properties.map((property: Property) => (
                        <td key={property.id} className="p-3 text-center">
                          <span className={isBestValue('price', property.id, false) ? 'font-bold text-green-600' : ''}>
                            {property.currency} {property.price.toLocaleString()}
                            {isBestValue('price', property.id, false) && (
                              <Check className="inline h-4 w-4 ml-1" />
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Bedrooms */}
                    <tr className="border-b">
                      <td className="p-3 font-medium">Bedrooms</td>
                      {comparisonData.properties.map((property: Property) => (
                        <td key={property.id} className="p-3 text-center">
                          <span className={isBestValue('bedrooms', property.id) ? 'font-bold text-green-600' : ''}>
                            {property.bedrooms || 'N/A'}
                            {isBestValue('bedrooms', property.id) && property.bedrooms && (
                              <Check className="inline h-4 w-4 ml-1" />
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Bathrooms */}
                    <tr className="border-b bg-muted/50">
                      <td className="p-3 font-medium">Bathrooms</td>
                      {comparisonData.properties.map((property: Property) => (
                        <td key={property.id} className="p-3 text-center">
                          <span className={isBestValue('bathrooms', property.id) ? 'font-bold text-green-600' : ''}>
                            {property.bathrooms || 'N/A'}
                            {isBestValue('bathrooms', property.id) && property.bathrooms && (
                              <Check className="inline h-4 w-4 ml-1" />
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Area */}
                    <tr className="border-b">
                      <td className="p-3 font-medium">Area (sq ft)</td>
                      {comparisonData.properties.map((property: Property) => (
                        <td key={property.id} className="p-3 text-center">
                          <span className={isBestValue('area', property.id) ? 'font-bold text-green-600' : ''}>
                            {property.area?.toLocaleString() || 'N/A'}
                            {isBestValue('area', property.id) && property.area && (
                              <Check className="inline h-4 w-4 ml-1" />
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Property Type */}
                    <tr className="border-b bg-muted/50">
                      <td className="p-3 font-medium">Type</td>
                      {comparisonData.properties.map((property: Property) => (
                        <td key={property.id} className="p-3 text-center">
                          <Badge variant="outline">{property.propertyType}</Badge>
                        </td>
                      ))}
                    </tr>

                    {/* Amenities Count */}
                    <tr className="border-b">
                      <td className="p-3 font-medium">Amenities</td>
                      {comparisonData.properties.map((property: Property) => (
                        <td key={property.id} className="p-3 text-center">
                          <span className={isBestValue('amenitiesCount', property.id) ? 'font-bold text-green-600' : ''}>
                            {property.amenities?.length || 0}
                            {isBestValue('amenitiesCount', property.id) && (
                              <Check className="inline h-4 w-4 ml-1" />
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Walk Score */}
                    <tr className="border-b bg-muted/50">
                      <td className="p-3 font-medium">Walk Score</td>
                      {comparisonData.properties.map((property: Property) => (
                        <td key={property.id} className="p-3 text-center">
                          <span className={isBestValue('walkScore', property.id) ? 'font-bold text-green-600' : ''}>
                            {property.neighborhood?.walkScore || 'N/A'}
                            {isBestValue('walkScore', property.id) && property.neighborhood?.walkScore && (
                              <Check className="inline h-4 w-4 ml-1" />
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Views */}
                    <tr className="border-b">
                      <td className="p-3 font-medium">Total Views</td>
                      {comparisonData.properties.map((property: Property) => (
                        <td key={property.id} className="p-3 text-center">
                          {property.viewCount || 0}
                        </td>
                      ))}
                    </tr>

                    {/* Favorites */}
                    <tr className="border-b bg-muted/50">
                      <td className="p-3 font-medium">Favorites</td>
                      {comparisonData.properties.map((property: Property) => (
                        <td key={property.id} className="p-3 text-center">
                          {property._count?.favorites || 0}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                {userId && (
                  <Button variant="outline" onClick={saveComparison}>
                    Save Comparison
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsComparing(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

