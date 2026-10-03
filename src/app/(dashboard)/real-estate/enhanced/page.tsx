'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AdvancedSearchFilters,
  PropertyMapView,
  PropertyCard,
  PropertyComparison,
  FavoritesManager,
  SavedSearches,
  type SearchFilters,
} from '@/components/properties';
import {
  Home,
  MapPin,
  Heart,
  Search,
  TrendingUp,
  Eye,
  MessageSquare,
  Grid,
  List,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

interface Property {
  id: string;
  title: string;
  description: string | null;
  propertyType: string;
  listingType: string;
  address: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  price: number;
  currency: string;
  status: string;
  images: string[];
  featured?: boolean;
  verified?: boolean;
  viewCount?: number;
  _count?: {
    favorites: number;
    views: number;
    inquiries: number;
  };
}

export default function RealEstateEnhancedPage() {
  const { tenantId } = useTenant();
  const { data: session } = useSession();
  const userId = session?.user?.id || 'demo-user';

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    featured: 0,
    totalViews: 0,
  });

  useEffect(() => {
    if (tenantId) {
      fetchProperties({});
    }
  }, [tenantId]);

  const fetchProperties = async (filters: SearchFilters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        tenantId: tenantId || '',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
        ),
      });

      const response = await fetch(`/api/properties?${params}`);
      const result = await response.json();

      if (result.success) {
        const data = result.data || [];
        setProperties(data);
        setCurrentFilters(filters);

        // Calculate stats
        setStats({
          total: data.length,
          available: data.filter((p: Property) => p.status === 'AVAILABLE').length,
          featured: data.filter((p: Property) => p.featured).length,
          totalViews: data.reduce((sum: number, p: Property) => sum + (p.viewCount || 0), 0),
        });
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Listen for saved search application
  useEffect(() => {
    const handleApplySavedSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      fetchProperties(customEvent.detail);
    };

    window.addEventListener('applySavedSearch', handleApplySavedSearch);
    return () => {
      window.removeEventListener('applySavedSearch', handleApplySavedSearch);
    };
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real Estate - Enhanced Features</h1>
          <p className="text-muted-foreground">
            Explore advanced search, maps, favorites, comparisons, and more
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/real-estate/dashboard/properties/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Across all types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Now</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.available}</div>
            <p className="text-xs text-muted-foreground">Ready to view</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.featured}</div>
            <p className="text-xs text-muted-foreground">Premium listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search & Filters
          </CardTitle>
          <CardDescription>
            Use 15+ filter options including price range, bedrooms, amenities, and more
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdvancedSearchFilters
            onSearch={fetchProperties}
            onReset={() => fetchProperties({})}
          />
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="grid" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="grid" onClick={() => setViewMode('grid')}>
              <Grid className="h-4 w-4 mr-2" />
              Grid View
            </TabsTrigger>
            <TabsTrigger value="map" onClick={() => setViewMode('map')}>
              <MapPin className="h-4 w-4 mr-2" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="compare">
              <List className="h-4 w-4 mr-2" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Heart className="h-4 w-4 mr-2" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="saved-searches">
              <Search className="h-4 w-4 mr-2" />
              Saved Searches
            </TabsTrigger>
          </TabsList>
          {currentFilters && Object.keys(currentFilters).length > 0 && (
            <Badge variant="secondary">
              {Object.keys(currentFilters).length} filter(s) applied
            </Badge>
          )}
        </div>

        {/* Grid View */}
        <TabsContent value="grid" className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-muted rounded-lg h-96 animate-pulse" />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No properties found</p>
                  <p className="text-sm mt-2">Try adjusting your filters or add new properties</p>
                  <Link href="/real-estate/dashboard/properties/new">
                    <Button className="mt-4">Add Property</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Map View */}
        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Property Map</CardTitle>
              <CardDescription>
                Click on markers to view property details. Zoom and pan to explore different areas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyMapView
                properties={properties}
                onPropertyClick={(id) => {
                  window.location.href = `/real-estate/properties/${id}`;
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compare View */}
        <TabsContent value="compare">
          <PropertyComparison properties={properties} userId={userId} />
        </TabsContent>

        {/* Favorites */}
        <TabsContent value="favorites">
          <FavoritesManager userId={userId} showList={true} />
        </TabsContent>

        {/* Saved Searches */}
        <TabsContent value="saved-searches">
          <SavedSearches userId={userId} currentFilters={currentFilters} />
        </TabsContent>
      </Tabs>

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>🎉 New Features Available</CardTitle>
          <CardDescription>Check out all the enhanced real estate capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <Search className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Advanced Search</h3>
              <p className="text-sm text-muted-foreground">
                15+ filter options including price range, amenities, and location
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <MapPin className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Interactive Maps</h3>
              <p className="text-sm text-muted-foreground">
                Leaflet-powered maps with property markers and popups
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Heart className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Favorites</h3>
              <p className="text-sm text-muted-foreground">
                Save properties to favorites for quick access later
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Search className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Saved Searches</h3>
              <p className="text-sm text-muted-foreground">
                Save your search criteria with email notifications
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Eye className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Virtual Tours</h3>
              <p className="text-sm text-muted-foreground">
                360° images, videos, and Matterport integration
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <MessageSquare className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Neighborhood Insights</h3>
              <p className="text-sm text-muted-foreground">
                Walk scores, demographics, schools, and amenities
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

