'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  MapPin, Bed, Bath, Maximize, Calendar,
  Heart, Share2, Phone, Mail, User, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface Property {
  id: string;
  title: string;
  description: string | null;
  propertyType: string;
  listingType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  price: number;
  currency: string;
  status: string;
  images: string[];
  amenities?: Array<{ id: string; name: string; description: string | null }>;
  agents?: Array<{
    id: string;
    agent: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  }>;
  createdAt: string;
}

export default function PropertyDetailsPage() {
  const params = useParams();
    const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  useEffect(() => {
    if (params?.id) {
      fetchProperty();
    }
  }, [params?.id]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/properties/${params?.id}`);
      if (response.ok) {
        const data = await response.json();
        setProperty(data);
      }
    } catch (error) {
      console.error('Failed to fetch property:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/properties/${params?.id}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inquiryForm),
      });

      if (response.ok) {
        toast.success('Success', { description: 'Your inquiry has been sent successfully!' });
        setInquiryForm({ name: '', email: '', phone: '', message: '' });
      } else {
        throw new Error('Failed to send inquiry');
      }
    } catch (error) {
      toast.error('Error', { description: 'Failed to send inquiry. Please try again.' });
    }
  };

  const handleScheduleViewing = () => {
    // Navigate to viewing scheduler
    window.location.href = `/real-estate/properties/${params?.id}/schedule-viewing`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Property not found</h2>
          <Link href="/real-estate/search">
            <Button>Back to Search</Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = property.images.length > 0 ? property.images : ['/placeholder-property.jpg'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Image Gallery */}
      <section className="bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="relative">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <img
                src={images[currentImageIndex]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>

            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
              {currentImageIndex + 1} / {images.length}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 ${
                    idx === currentImageIndex ? 'border-white' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Badge className="bg-green-500">{property.status}</Badge>
                      <Badge variant="secondary">{property.listingType === 'SALE' ? 'For Sale' : 'For Rent'}</Badge>
                      <Badge variant="outline">{property.propertyType}</Badge>
                    </div>
                    <h1 className="text-3xl font-bold">{property.title}</h1>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.address}, {property.city}, {property.state} {property.zipCode}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        toast.success('Added to favorites', { description: 'Property saved to your favorites list' });
                      }}
                      aria-label="Add to favorites"
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('Link copied', { description: 'Property link copied to clipboard' });
                      }}
                      aria-label="Share property"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-bold text-primary">
                    ${property.price.toLocaleString()}
                  </span>
                  {property.listingType === 'RENT' && (
                    <span className="text-lg text-muted-foreground">/month</span>
                  )}
                </div>

                {/* Key Features */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  {property.bedrooms && (
                    <div className="text-center">
                      <Bed className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="font-semibold">{property.bedrooms}</div>
                      <div className="text-sm text-muted-foreground">Bedrooms</div>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="text-center">
                      <Bath className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="font-semibold">{property.bathrooms}</div>
                      <div className="text-sm text-muted-foreground">Bathrooms</div>
                    </div>
                  )}
                  {property.area && (
                    <div className="text-center">
                      <Maximize className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="font-semibold">{property.area.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">sq ft</div>
                    </div>
                  )}
                  <div className="text-center">
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-semibold">
                      {new Date(property.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-sm text-muted-foreground">Listed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-muted-foreground ${!showFullDescription && 'line-clamp-4'}`}>
                  {property.description || 'No description available.'}
                </div>
                {property.description && property.description.length > 200 && (
                  <Button
                    variant="link"
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="mt-2 p-0"
                  >
                    {showFullDescription ? 'Read Less' : 'Read More'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.amenities.map((amenity) => (
                      <div key={amenity.id} className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full" />
                        <span>{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {property.address}, {property.city}, {property.state}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Map integration coming soon
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Agent Card */}
            {property.agents && property.agents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact Agent</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {property.agents.map((agentAssignment) => (
                    <div key={agentAssignment.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">{agentAssignment.agent.name}</div>
                          <div className="text-sm text-muted-foreground">Real Estate Agent</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <a href={`tel:${agentAssignment.agent.phone}`} className="flex items-center gap-2 text-sm hover:text-primary">
                          <Phone className="h-4 w-4" />
                          {agentAssignment.agent.phone}
                        </a>
                        <a href={`mailto:${agentAssignment.agent.email}`} className="flex items-center gap-2 text-sm hover:text-primary">
                          <Mail className="h-4 w-4" />
                          {agentAssignment.agent.email}
                        </a>
                      </div>
                    </div>
                  ))}
                  <Button className="w-full" onClick={handleScheduleViewing}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Viewing
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Inquiry Form */}
            <Card>
              <CardHeader>
                <CardTitle>Send Inquiry</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inquiryForm.email}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={inquiryForm.phone}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={4}
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Send Inquiry</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

