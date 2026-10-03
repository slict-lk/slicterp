"use client";

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, RefreshCw } from 'lucide-react';

interface MarketingEvent {
  id: string;
  name: string;
  description?: string;
  eventType: string;
  location?: string;
  startDate: string;
  endDate: string;
  maxAttendees?: number;
  _count: { registrations: number };
}

const eventTypeColors: Record<string, string> = {
  WEBINAR: 'bg-blue-100 text-blue-800',
  CONFERENCE: 'bg-purple-100 text-purple-800',
  WORKSHOP: 'bg-green-100 text-green-800',
  TRADE_SHOW: 'bg-orange-100 text-orange-800',
  NETWORKING: 'bg-pink-100 text-pink-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

function StatCard({ title, value, icon: Icon }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalRegistrations = events.reduce((sum, e) => sum + e._count.registrations, 0);
  const upcomingEvents = events.filter(e => new Date(e.startDate) > new Date()).length;

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">Manage marketing events and registrations</p>
        </div>
        <Button onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Events" value={events.length} icon={Calendar} />
        <StatCard title="Upcoming" value={upcomingEvents} icon={Calendar} />
        <StatCard title="Registrations" value={totalRegistrations} icon={Users} />
        <StatCard title="Locations" value={new Set(events.map(e => e.location).filter(Boolean)).size} icon={MapPin} />
      </div>

      <div className="space-y-4">
        {events.map(event => (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{event.name}</CardTitle>
                    <Badge className={eventTypeColors[event.eventType] || eventTypeColors.OTHER}>
                      {event.eventType.replace('_', ' ')}
                    </Badge>
                  </div>
                  {event.description && <CardDescription className="mt-1">{event.description}</CardDescription>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(event.startDate).toLocaleDateString()}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{event._count.registrations} registered</span>
                  {event.maxAttendees && <span>/ {event.maxAttendees} max</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
