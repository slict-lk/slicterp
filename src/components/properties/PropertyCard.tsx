'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Home, MapPin, Bed, Bath, Maximize, Heart } from 'lucide-react';

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    description: string | null;
    propertyType: string;
    listingType: string;
    address: string;
    city: string;
    state: string;
    bedrooms: number | null;
    bathrooms: number | null;
    area: number | null;
    price: number;
    currency: string;
    status: string;
    images: string[];
  };
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

export function PropertyCard({ property, onFavorite, isFavorite }: PropertyCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-500 text-white';
      case 'PENDING': return 'bg-yellow-500 text-white';
      case 'SOLD': return 'bg-red-500 text-white';
      case 'RENTED': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getListingTypeBadge = (type: string) => {
    return type === 'SALE' ? 'For Sale' : type === 'RENT' ? 'For Rent' : 'For Lease';
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="relative h-64 overflow-hidden">
        {property.images.length > 0 ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Home className="h-16 w-16 text-muted-foreground" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className={getStatusColor(property.status)}>
            {property.status}
          </Badge>
          <Badge variant="secondary">{getListingTypeBadge(property.listingType)}</Badge>
        </div>

        {/* Favorite Button */}
        {onFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite(property.id);
            }}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white p-2 rounded-full transition-colors shadow-md hover:shadow-lg z-10"
            aria-label="Add to favorites"
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>
        )}

        {/* Property Type Badge */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="outline" className="bg-white/90">
            {property.propertyType}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="space-y-2">
          <Link href={`/real-estate/properties/${property.id}`}>
            <h3 className="text-xl font-bold hover:text-primary transition-colors line-clamp-1">
              {property.title}
            </h3>
          </Link>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-1" />
            {property.address}, {property.city}, {property.state}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-3">
          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">
              ${property.price.toLocaleString()}
            </span>
            {property.listingType === 'RENT' && (
              <span className="text-sm text-muted-foreground">/month</span>
            )}
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {property.bedrooms !== null && (
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                <span>{property.bedrooms} Beds</span>
              </div>
            )}
            {property.bathrooms !== null && (
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                <span>{property.bathrooms} Baths</span>
              </div>
            )}
            {property.area !== null && (
              <div className="flex items-center gap-1">
                <Maximize className="h-4 w-4" />
                <span>{property.area.toLocaleString()} sq ft</span>
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {property.description}
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <Link href={`/real-estate/properties/${property.id}`} className="w-full">
          <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

