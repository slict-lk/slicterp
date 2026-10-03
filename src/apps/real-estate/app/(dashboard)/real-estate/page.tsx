'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PropertySearchBar, SearchFilters } from '@/components/properties/PropertySearchBar';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { useTenant } from '@/hooks/useTenant';
import {
  Home,
  TrendingUp,
  Users,
  Building2,
  MapPin,
  Phone,
  Mail,
  ArrowRight
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
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  price: number;
  currency: string;
  status: string;
  images: string[];
}

export default function RealEstateHomePage() {
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [newListings, setNewListings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantId } = useTenant();

  useEffect(() => {
    if (tenantId) {
      fetchProperties();
    }
  }, [tenantId]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/properties?tenantId=${tenantId}&status=AVAILABLE`);
      if (response.ok) {
        const data = await response.json();
        setFeaturedProperties(data.slice(0, 6));
        setNewListings(data.slice(0, 8));
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (filters: SearchFilters) => {
    // Navigate to search page with filters
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    window.location.href = `/real-estate/search?${params.toString()}`;
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary/90 to-primary text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Find Your Dream Property
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Discover the perfect home, apartment, or commercial space with our comprehensive listings
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-6xl mx-auto">
            <PropertySearchBar onSearch={handleSearch} />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-12">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">1,234</div>
              <div className="text-white/80">Properties Listed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">856</div>
              <div className="text-white/80">Properties Sold</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">342</div>
              <div className="text-white/80">Active Agents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">98%</div>
              <div className="text-white/80">Customer Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Properties</h2>
              <p className="text-muted-foreground">Hand-picked properties for you</p>
            </div>
            <Link href="/real-estate/search">
              <Button variant="outline">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg h-96 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New Listings */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">New Listings</h2>
              <p className="text-muted-foreground">Recently added properties</p>
            </div>
            <Link href="/real-estate/search?sort=newest">
              <Button variant="outline">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {newListings.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      </section>

      {/* Popular Areas */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Popular Areas</h2>
            <p className="text-muted-foreground">Explore properties in trending locations</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {['San Francisco', 'Los Angeles', 'New York', 'Chicago', 'Miami', 'Seattle'].map((city) => (
              <Link
                key={city}
                href={`/real-estate/search?city=${city}`}
                className="bg-white rounded-lg p-6 text-center hover:shadow-lg transition-shadow"
              >
                <MapPin className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold">{city}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl mb-8 text-white/90">
              Whether you're buying, selling, or renting, we're here to help
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/real-estate/dashboard/properties/new">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Building2 className="mr-2 h-5 w-5" />
                  List Your Property
                </Button>
              </Link>
              <Link href="/real-estate/agents">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white text-primary hover:bg-white/90">
                  <Users className="mr-2 h-5 w-5" />
                  Contact an Agent
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
                Leading real estate platform connecting buyers, sellers, and renters.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link href="/real-estate/search" className="text-gray-400 hover:text-white">Browse Properties</Link></li>
                <li><Link href="/real-estate/agents" className="text-gray-400 hover:text-white">Find Agents</Link></li>
                <li><Link href="/real-estate/dashboard" className="text-gray-400 hover:text-white">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-gray-400 hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white">Contact Us</Link></li>
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

