'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant } from '@/hooks/useTenant';
import { useSession } from 'next-auth/react';
import {
  AdvancedSearchFilters,
  PropertyMapView,
  PropertyCard,
  PropertyComparison,
  FavoritesManager,
  SavedSearches,
  type SearchFilters,
} from '@/components/properties';
import { ModuleCopilotPanel } from '@/components/ai/module-copilot-panel';
import {
  Home,
  TrendingUp,
  Users,
  Building2,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Heart,
  Search,
  Eye,
  Grid,
  Plus,
  List,
  Star,
} from 'lucide-react';

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

export default function RealEstateHomePage() {
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [newListings, setNewListings] = useState<Property[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [activeView, setActiveView] = useState<'hero' | 'search'>('hero');
  const { tenantId } = useTenant();
  const { data: session } = useSession();
  const userId = session?.user?.id || 'demo-user';

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
      if (response.ok) {
        const result = await response.json();
        // API returns { success: true, data: [...], pagination: {...} }
        const properties = result.data || result;
        const propertiesArray = Array.isArray(properties) ? properties : [];

        setAllProperties(propertiesArray);
        setFeaturedProperties(propertiesArray.filter((p: Property) => p.featured).slice(0, 6));
        setNewListings(propertiesArray.slice(0, 8));
        setCurrentFilters(filters);

        // Calculate stats
        setStats({
          total: propertiesArray.length,
          available: propertiesArray.filter((p: Property) => p.status === 'AVAILABLE').length,
          featured: propertiesArray.filter((p: Property) => p.featured).length,
          totalViews: propertiesArray.reduce((sum: number, p: Property) => sum + (p.viewCount || 0), 0),
        });
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (filters: SearchFilters) => {
    fetchProperties(filters);
    setActiveView('search');
  };

  const handleReset = () => {
    fetchProperties({});
    setActiveView('hero');
  };

  // Listen for saved search application
  useEffect(() => {
    const handleApplySavedSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      fetchProperties(customEvent.detail);
      setActiveView('search');
    };

    window.addEventListener('applySavedSearch', handleApplySavedSearch);
    return () => {
      window.removeEventListener('applySavedSearch', handleApplySavedSearch);
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section with Advanced Search */}
      <section className="relative bg-gradient-to-r from-primary/90 to-primary text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Your Dream Property
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-6">
              Discover the perfect home with advanced search, interactive maps, and smart features
            </p>
          </div>

          {/* Advanced Search Filters - Centered */}
          <div className="max-w-4xl mx-auto mb-8">
            <Card className="bg-white/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Search className="h-5 w-5" />
                  Advanced Property Search
                </CardTitle>
                <CardDescription>
                  Use 15+ filters including price, location, amenities, and more
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdvancedSearchFilters
                  onSearch={handleSearch}
                  onReset={handleReset}
                />
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold mb-1">{stats.total}</div>
              <div className="text-sm text-white/80">Total Properties</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold mb-1">{stats.available}</div>
              <div className="text-sm text-white/80">Available Now</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold mb-1">{stats.featured}</div>
              <div className="text-sm text-white/80">Featured</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold mb-1">{stats.totalViews}</div>
              <div className="text-sm text-white/80">Total Views</div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Tabs */}
      <section className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <ModuleCopilotPanel
              module="real-estate"
              title="Real Estate Copilot"
              description="Review demand signals, listing health, and follow-up priorities from current search context."
              context={{
                totalProperties: stats.total,
                availableProperties: stats.available,
                featuredProperties: stats.featured,
                totalViews: stats.totalViews,
                activeFilters: Object.keys(currentFilters).length,
              }}
              suggestions={[
                'Summarize market demand from the current listings.',
                'Which properties or inquiries need attention first?',
              ]}
            />
          </div>
          <Tabs defaultValue="grid" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid w-full max-w-2xl grid-cols-5">
                <TabsTrigger value="grid">
                  <Grid className="h-4 w-4 mr-2" />
                  Properties
                </TabsTrigger>
                <TabsTrigger value="map">
                  <MapPin className="h-4 w-4 mr-2" />
                  Map
                </TabsTrigger>
                <TabsTrigger value="compare">
                  <List className="h-4 w-4 mr-2" />
                  Compare
                </TabsTrigger>
                <TabsTrigger value="favorites">
                  <Heart className="h-4 w-4 mr-2" />
                  Favorites
                </TabsTrigger>
                <TabsTrigger value="searches">
                  <Search className="h-4 w-4 mr-2" />
                  Saved
                </TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                {Object.keys(currentFilters).length > 0 && (
                  <Badge variant="secondary">
                    {Object.keys(currentFilters).length} filter(s) applied
                  </Badge>
                )}
                <Link href="/real-estate/dashboard/properties/new">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Property
                  </Button>
                </Link>
              </div>
            </div>

            {/* Grid View - Featured & New Listings */}
            <TabsContent value="grid" className="space-y-8">
              {/* Featured Properties */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Star className="h-6 w-6 text-yellow-500" />
                      Featured Properties
                    </h2>
                    <p className="text-muted-foreground">Hand-picked premium listings</p>
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white rounded-lg h-96 animate-pulse" />
                    ))}
                  </div>
                ) : featuredProperties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredProperties.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No featured properties yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* New Listings */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <TrendingUp className="h-6 w-6 text-green-500" />
                      New Listings
                    </h2>
                    <p className="text-muted-foreground">Recently added properties</p>
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-white rounded-lg h-80 animate-pulse" />
                    ))}
                  </div>
                ) : newListings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {newListings.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No properties found. Try adjusting your filters or add new properties.</p>
                      <Link href="/real-estate/dashboard/properties/new">
                        <Button className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Your First Property
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Map View */}
            <TabsContent value="map">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Interactive Property Map
                  </CardTitle>
                  <CardDescription>
                    Click on markers to view property details. Zoom and pan to explore areas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PropertyMapView
                    properties={allProperties}
                    onPropertyClick={(id) => {
                      window.location.href = `/real-estate/properties/${id}`;
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compare View */}
            <TabsContent value="compare">
              <PropertyComparison properties={allProperties} userId={userId} />
            </TabsContent>

            {/* Favorites View */}
            <TabsContent value="favorites">
              <FavoritesManager userId={userId} showList={true} />
            </TabsContent>

            {/* Saved Searches View */}
            <TabsContent value="searches">
              <SavedSearches userId={userId} currentFilters={currentFilters} />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Popular Areas */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Popular Areas</h2>
            <p className="text-muted-foreground">Explore properties in trending locations</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {['San Francisco', 'Los Angeles', 'New York', 'Chicago', 'Miami', 'Seattle'].map((city) => (
              <button
                key={city}
                onClick={() => handleSearch({ city })}
                className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-lg transition-shadow hover:bg-gray-100"
              >
                <MapPin className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold">{city}</h3>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">🎉 Enhanced Features</h2>
            <p className="text-muted-foreground">Discover our powerful property search tools</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Search className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>Advanced Search</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Filter by price range, bedrooms, bathrooms, amenities, and 15+ other options
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MapPin className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>Interactive Maps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Explore properties on Leaflet-powered maps with clickable markers and popups
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Heart className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>Favorites</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Save properties to favorites for quick access and comparison later
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Search className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>Saved Searches</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Save your search criteria and get email notifications for new matching properties
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <List className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>Property Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Compare up to 5 properties side-by-side with best value highlights
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Eye className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>View Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track property views, popularity, and engagement metrics
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl mb-8 text-white/90">
              Whether you&apos;re buying, selling, or renting, we&apos;re here to help
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/real-estate/dashboard/properties/new">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Building2 className="mr-2 h-5 w-5" />
                  List Your Property
                </Button>
              </Link>
              <Link href="/real-estate/dashboard">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white text-primary hover:bg-white/90">
                  <Users className="mr-2 h-5 w-5" />
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">About Us</h3>
              <p className="text-gray-400">
                Leading real estate platform with advanced search and smart features.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link href="/real-estate" className="text-gray-400 hover:text-white">Browse Properties</Link></li>
                <li><Link href="/real-estate/dashboard" className="text-gray-400 hover:text-white">Dashboard</Link></li>
                <li><Link href="/real-estate/search" className="text-gray-400 hover:text-white">Advanced Search</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-gray-400 hover:text-white">Terms of Service</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  +1 (555) 123-4567
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  info@realestate.com
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Real Estate Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

