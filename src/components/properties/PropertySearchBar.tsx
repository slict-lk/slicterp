'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MapPin } from 'lucide-react';

interface PropertySearchBarProps {
  onSearch: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  keyword?: string;
  transactionType?: string;
  propertyType?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  bathrooms?: string;
}

export function PropertySearchBar({ onSearch }: PropertySearchBarProps) {
  const [filters, setFilters] = useState<SearchFilters>({});

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSearch(filters);
  };

  return (
    <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by keyword..."
            className="pl-10"
            value={filters.keyword || ''}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <Select
          value={filters.transactionType}
          onValueChange={(value) => setFilters({ ...filters, transactionType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Transaction Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SALE">For Sale</SelectItem>
            <SelectItem value="RENT">For Rent</SelectItem>
            <SelectItem value="LEASE">For Lease</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.propertyType}
          onValueChange={(value) => setFilters({ ...filters, propertyType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HOUSE">House</SelectItem>
            <SelectItem value="APARTMENT">Apartment</SelectItem>
            <SelectItem value="CONDO">Condo</SelectItem>
            <SelectItem value="TOWNHOUSE">Townhouse</SelectItem>
            <SelectItem value="COMMERCIAL">Commercial</SelectItem>
            <SelectItem value="LAND">Land</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="City / District"
            className="pl-10"
            value={filters.city || ''}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          type="number"
          placeholder="Min Price"
          value={filters.minPrice || ''}
          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
        />

        <Input
          type="number"
          placeholder="Max Price"
          value={filters.maxPrice || ''}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
        />

        <Select
          value={filters.bedrooms}
          onValueChange={(value) => setFilters({ ...filters, bedrooms: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Bedrooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1+ Bed</SelectItem>
            <SelectItem value="2">2+ Beds</SelectItem>
            <SelectItem value="3">3+ Beds</SelectItem>
            <SelectItem value="4">4+ Beds</SelectItem>
            <SelectItem value="5">5+ Beds</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.bathrooms}
          onValueChange={(value) => setFilters({ ...filters, bathrooms: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Bathrooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1+ Bath</SelectItem>
            <SelectItem value="2">2+ Baths</SelectItem>
            <SelectItem value="3">3+ Baths</SelectItem>
            <SelectItem value="4">4+ Baths</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" className="w-full md:w-auto">
          <Search className="mr-2 h-4 w-4" />
          Search Properties
        </Button>
      </div>
    </form>
  );
}

