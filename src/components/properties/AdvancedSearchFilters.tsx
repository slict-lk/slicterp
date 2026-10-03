'use client';

import React, { useState } from 'react';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { SlidersHorizontal, X } from 'lucide-react';

interface AdvancedSearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  onReset: () => void;
}

export interface SearchFilters {
  keyword?: string;
  propertyType?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  amenities?: string[];
  city?: string;
  state?: string;
  featured?: boolean;
  verified?: boolean;
}

const propertyTypes = [
  'APARTMENT',
  'HOUSE',
  'CONDO',
  'TOWNHOUSE',
  'COMMERCIAL',
  'LAND',
  'VILLA',
  'STUDIO',
  'PENTHOUSE',
  'DUPLEX',
];

const commonAmenities = [
  'Pool',
  'Gym',
  'Parking',
  'Garden',
  'Balcony',
  'Air Conditioning',
  'Heating',
  'Security System',
  'Elevator',
  'Pet Friendly',
  'Furnished',
  'Laundry',
];

export function AdvancedSearchFilters({ onSearch, onReset }: AdvancedSearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    onSearch(filters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setFilters({});
    onReset();
    setIsOpen(false);
  };

  const activeFiltersCount = Object.keys(filters).filter(
    key => filters[key as keyof SearchFilters] !== undefined &&
           filters[key as keyof SearchFilters] !== '' &&
           (Array.isArray(filters[key as keyof SearchFilters]) ?
             (filters[key as keyof SearchFilters] as any[]).length > 0 : true)
  ).length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Advanced Filters
          {activeFiltersCount > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Advanced Search Filters</SheetTitle>
          <SheetDescription>
            Refine your property search with detailed filters
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-6">
          {/* Keyword Search */}
          <div className="space-y-2">
            <Label htmlFor="keyword">Keyword Search</Label>
            <Input
              id="keyword"
              placeholder="Search by title, description, location..."
              value={filters.keyword || ''}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
            />
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <Label htmlFor="propertyType">Property Type</Label>
            <Select
              value={filters.propertyType || ''}
              onValueChange={(value) => handleFilterChange('propertyType', value)}
            >
              <SelectTrigger id="propertyType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Listing Type */}
          <div className="space-y-2">
            <Label htmlFor="listingType">Listing Type</Label>
            <Select
              value={filters.listingType || ''}
              onValueChange={(value) => handleFilterChange('listingType', value)}
            >
              <SelectTrigger id="listingType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALE">For Sale</SelectItem>
                <SelectItem value="RENT">For Rent</SelectItem>
                <SelectItem value="LEASE">For Lease</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <Label>Price Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="number"
                  placeholder="Min Price"
                  value={filters.minPrice || ''}
                  onChange={(e) => handleFilterChange('minPrice', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Max Price"
                  value={filters.maxPrice || ''}
                  onChange={(e) => handleFilterChange('maxPrice', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Bedrooms */}
          <div className="space-y-2">
            <Label>Bedrooms</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="number"
                  placeholder="Min"
                  min={0}
                  value={filters.minBedrooms || ''}
                  onChange={(e) => handleFilterChange('minBedrooms', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Max"
                  min={0}
                  value={filters.maxBedrooms || ''}
                  onChange={(e) => handleFilterChange('maxBedrooms', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Bathrooms */}
          <div className="space-y-2">
            <Label>Bathrooms</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="number"
                  placeholder="Min"
                  min={0}
                  step={0.5}
                  value={filters.minBathrooms || ''}
                  onChange={(e) => handleFilterChange('minBathrooms', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Max"
                  min={0}
                  step={0.5}
                  value={filters.maxBathrooms || ''}
                  onChange={(e) => handleFilterChange('maxBathrooms', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Area Range */}
          <div className="space-y-2">
            <Label>Area (sq ft)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="number"
                  placeholder="Min Area"
                  value={filters.minArea || ''}
                  onChange={(e) => handleFilterChange('minArea', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Max Area"
                  value={filters.maxArea || ''}
                  onChange={(e) => handleFilterChange('maxArea', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  placeholder="City"
                  value={filters.city || ''}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                />
              </div>
              <div>
                <Input
                  placeholder="State"
                  value={filters.state || ''}
                  onChange={(e) => handleFilterChange('state', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="grid grid-cols-2 gap-3">
              {commonAmenities.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={amenity}
                    checked={filters.amenities?.includes(amenity) || false}
                    onCheckedChange={(checked) => {
                      const current = filters.amenities || [];
                      if (checked) {
                        handleFilterChange('amenities', [...current, amenity]);
                      } else {
                        handleFilterChange('amenities', current.filter(a => a !== amenity));
                      }
                    }}
                  />
                  <label
                    htmlFor={amenity}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {amenity}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Special Flags */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={filters.featured || false}
                onCheckedChange={(checked) => handleFilterChange('featured', checked)}
              />
              <label htmlFor="featured" className="text-sm font-medium">
                Featured Properties Only
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={filters.verified || false}
                onCheckedChange={(checked) => handleFilterChange('verified', checked)}
              />
              <label htmlFor="verified" className="text-sm font-medium">
                Verified Properties Only
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSearch} className="flex-1">
              Apply Filters
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1">
              <X className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

