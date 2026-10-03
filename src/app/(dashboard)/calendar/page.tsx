"use client";

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, RefreshCw, MapPin } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  allDay: boolean;
  organizer: { name: string; email: string };
  customer?: { name: string };
  project?: { name: string };
  _count: { attendees: number };
}

function StatCard({ title, value, icon: Icon, description }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <Calendar className="h-12 w-12 mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      // Fetch events for the next 30 days
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.startTime);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });

  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.startTime);
    const today = new Date();
    return eventDate > today;
  });

  const totalEvents = events.length;
  const totalAttendees = events.reduce((sum, e) => sum + e._count.attendees, 0);

  const EventCard = ({ event }: { event: CalendarEvent }) => {
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);
    const isToday = startDate.toDateString() === new Date().toDateString();

    return (
      <Card key={event.id} className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base">{event.title}</CardTitle>
              {event.description && (
                <CardDescription className="line-clamp-2 mt-1">{event.description}</CardDescription>
              )}
            </div>
            {isToday && <Badge className="bg-blue-100 text-blue-800">Today</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {event.allDay
                ? 'All Day'
                : `${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{event._count.attendees} attendees</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Organizer: {event.organizer.name}</span>
          </div>
          {event.project && (
            <Badge variant="outline" className="mt-2">
              Project: {event.project.name}
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) return <LoadingState />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage your events and meetings</p>
        </div>
        <Button onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Today's Events" value={todayEvents.length} icon={Calendar} />
        <StatCard title="Upcoming Events" value={upcomingEvents.length} icon={Clock} />
        <StatCard title="Total Events" value={totalEvents} icon={Calendar} />
        <StatCard title="Total Attendees" value={totalAttendees} icon={Users} />
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Today's Events</h2>
          {todayEvents.length === 0 ? (
            <EmptyState message="No events scheduled for today" />
          ) : (
            <div className="space-y-4">
              {todayEvents.map(event => <EventCard key={event.id} event={event} />)}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
          {upcomingEvents.length === 0 ? (
            <EmptyState message="No upcoming events" />
          ) : (
            <div className="space-y-4">
              {upcomingEvents.slice(0, 10).map(event => <EventCard key={event.id} event={event} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
