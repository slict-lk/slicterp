'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Hotel as HotelIcon, Users, Bed, Check, Settings, Loader2, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

// Types
interface Room {
  id: string;
  roomNumber: string;
  roomType: string;
  floor?: number;
  status: string;
  basePrice: number;
  maxOccupancy: number;
  bedType?: string;
  type?: {
    name: string;
    basePrice: number;
    maxOccupancy: number;
    bedType?: string;
  };
}

interface Booking {
  id: string;
  bookingNumber: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  room: Room;
}

export default function HotelPage() {
  const t = useTranslations('hotel');
  const tc = useTranslations('common');
  const { data: session, status: sessionStatus } = useSession();
  const tenantId = (session?.user as unknown as { tenantId?: string })?.tenantId;

  const { settings } = useSettings();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [tenantSubdomain, setTenantSubdomain] = useState<string | null>(null);

  // Fetch tenant subdomain
  useEffect(() => {
    if (tenantId) {
      fetchTenantSubdomain();
    }
  }, [tenantId]);

  const fetchTenantSubdomain = async () => {
    try {
      const res = await fetch(`/api/tenant?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setTenantSubdomain(data.subdomain);
      }
    } catch (error) {
      console.error('Failed to fetch tenant subdomain:', error);
    }
  };

  // Generate frontend URL based on environment
  const getFrontendUrl = () => {
    if (!tenantSubdomain) return null;

    const isLocal = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocal) {
      return `http://127.0.0.1:5500/hotel/index.html?subdomain=${tenantSubdomain}`;
    } else {
      return `https://${tenantSubdomain}.hotels.slict.lk/`;
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  const fetchData = async () => {
    if (!tenantId) return;

    try {
      const [roomsRes, bookingsRes] = await Promise.all([
        fetch(`/api/hotel/rooms?tenantId=${tenantId}`),
        fetch(`/api/hotel/bookings?tenantId=${tenantId}`)
      ]);

      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (bookingsRes.ok) setBookings(await bookingsRes.json());

    } catch (error) {
      console.error('Failed to fetch hotel data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while session is loading
  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No tenant found. Please contact your administrator.
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'OCCUPIED': return 'bg-red-100 text-red-800';
      case 'RESERVED': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'CHECKED_IN': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    totalRooms: rooms.length,
    occupied: rooms.filter(r => r.status === 'OCCUPIED' || r.status === 'RESERVED').length,
    available: rooms.filter(r => r.status === 'AVAILABLE').length,
    revenue: bookings.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0),
    adr: 0,
    revPar: 0,
  };

  if (stats.occupied > 0) {
    stats.adr = stats.revenue / stats.occupied;
  }
  if (stats.totalRooms > 0) {
    stats.revPar = stats.revenue / stats.totalRooms;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {tenantSubdomain && (
            <Button
              variant="outline"
              onClick={() => window.open(getFrontendUrl() || '', '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" /> View Website
            </Button>
          )}
          <Button variant="outline" onClick={fetchData}>{tc('refresh')}</Button>
          <Button variant="outline" asChild>
            <a href="/hotel/branches">
              <HotelIcon className="mr-2 h-4 w-4" /> Branches
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/hotel/settings">
              <Settings className="mr-2 h-4 w-4" /> {t('settings')}
            </a>
          </Button>
          <Button asChild>
            <Link href="/hotel/rooms">
              <Bed className="mr-2 h-4 w-4" /> Manage Rooms
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="bookings">{t('bookings')}</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <div className="h-4 w-4 text-muted-foreground font-mono">$</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.revenue)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  RevPAR: {formatCurrency(stats.revPar)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ADR</CardTitle>
                <div className="h-4 w-4 text-muted-foreground font-mono">AVG</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.adr)}</div>
                <p className="text-xs text-muted-foreground mt-1">Average Daily Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalRooms > 0 ? Math.round((stats.occupied / stats.totalRooms) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.occupied} / {stats.totalRooms} rooms
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.available}</div>
                <p className="text-xs text-muted-foreground mt-1">Ready for check-in</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Room Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Room Inventory</CardTitle>
                  <CardDescription>Quick view of all rooms across categories</CardDescription>
                </div>
                <Button asChild>
                  <Link href="/hotel/rooms">
                    <Bed className="mr-2 h-4 w-4" /> Manage Rooms
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : rooms.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {rooms.slice(0, 12).map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-semibold">Room {room.roomNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {room.type?.name || room.roomType || "Unassigned"}
                        </p>
                      </div>
                      <Badge className={getStatusColor(room.status)}>
                        {room.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No rooms found.</p>
                  <Button asChild className="mt-3" variant="outline">
                    <Link href="/hotel/rooms">Set up rooms →</Link>
                  </Button>
                </div>
              )}
              {rooms.length > 12 && (
                <div className="mt-4 text-center">
                  <Button asChild variant="link">
                    <Link href="/hotel/rooms">View all {rooms.length} rooms →</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOOKINGS TAB */}
        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Managed reservations from all sources.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-sm">{booking.bookingNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{booking.guestName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {booking.room ? `Room ${booking.room.roomNumber}` : 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline" className={getStatusColor(booking.status)}>{booking.status}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {formatCurrency(booking.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bookings.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">No bookings found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
