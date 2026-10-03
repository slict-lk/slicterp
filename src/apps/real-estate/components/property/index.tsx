'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Property } from '../../../../types/property';

export interface PropertyCardProps {
  property: Property;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function PropertyCard({ property, onView, onEdit, onDelete }: PropertyCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{property.title}</CardTitle>
          <Badge variant="outline" className="capitalize">
            {property.status.toLowerCase()}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {property.propertyType} • {property.listingType}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="mb-4">
          <div className="text-2xl font-bold">${property.price.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">
            {property.city}, {property.state}
          </div>
        </div>
        <div className="mt-auto flex gap-2">
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(property.id)}>
              View
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(property.id)}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" size="sm" onClick={() => onDelete(property.id)}>
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
