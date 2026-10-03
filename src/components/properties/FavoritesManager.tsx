'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface FavoritesManagerProps {
  userId: string;
  propertyId?: string;
  isFavorited?: boolean;
  showList?: boolean;
  onToggle?: (isFavorited: boolean) => void;
}

export function FavoritesManager({
  userId,
  propertyId,
  isFavorited: initialIsFavorited = false,
  showList = false,
  onToggle,
}: FavoritesManagerProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    if (showList) {
      loadFavorites();
    }
  }, [showList, userId]);

  const loadFavorites = async () => {
    try {
      const response = await fetch(`/api/properties/favorites?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setFavorites(data.data);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!propertyId) return;

    setIsLoading(true);
    try {
      if (isFavorited) {
        // Remove from favorites
        const response = await fetch(
          `/api/properties/favorites?userId=${userId}&propertyId=${propertyId}`,
          { method: 'DELETE' }
        );
        const data = await response.json();

        if (data.success) {
          setIsFavorited(false);
          toast.success('Removed from favorites');
          if (onToggle) onToggle(false);
        } else {
          throw new Error(data.error);
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/properties/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, propertyId }),
        });
        const data = await response.json();

        if (data.success) {
          setIsFavorited(true);
          toast.success('Added to favorites');
          if (onToggle) onToggle(true);
        } else {
          throw new Error(data.error);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update favorites');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFavorite = async (favoritePropertyId: string) => {
    try {
      const response = await fetch(
        `/api/properties/favorites?userId=${userId}&propertyId=${favoritePropertyId}`,
        { method: 'DELETE' }
      );
      const data = await response.json();

      if (data.success) {
        setFavorites(favorites.filter(f => f.propertyId !== favoritePropertyId));
        toast.success('Removed from favorites');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove favorite');
    }
  };

  if (showList) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            My Favorites
            <Badge variant="secondary">{favorites.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {favorites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No favorite properties yet</p>
              <p className="text-sm mt-2">
                Start adding properties to your favorites
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  {favorite.property.images?.[0] && (
                    <img
                      src={favorite.property.images[0]}
                      alt={favorite.property.title}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold">{favorite.property.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {favorite.property.city}, {favorite.property.state}
                    </p>
                    <p className="font-bold mt-1">
                      {favorite.property.currency} {favorite.property.price.toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFavorite(favorite.propertyId)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Button
      variant={isFavorited ? 'default' : 'outline'}
      size="sm"
      onClick={toggleFavorite}
      disabled={isLoading}
      className="gap-2"
    >
      <Heart
        className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`}
      />
      {isFavorited ? 'Favorited' : 'Add to Favorites'}
    </Button>
  );
}

