"use client";

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, MessageSquare, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  customer: { name: string; email: string };
  assignee?: { name: string; email: string };
  _count: { comments: number; attachments: number };
  createdAt: string;
  updatedAt: string;
}

interface TicketStats {
  OPEN?: number;
  IN_PROGRESS?: number;
  WAITING?: number;
  RESOLVED?: number;
  CLOSED?: number;
}

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

const statusColors = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  WAITING: 'bg-purple-100 text-purple-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

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
      <Ticket className="h-12 w-12 mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );
}

export default function HelpdeskPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [stats, setStats] = useState<TicketStats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/helpdesk/tickets');
      if (!response.ok) throw new Error('Failed to fetch tickets');
      const data = await response.json();
      setTickets(data.tickets || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error fetching helpdesk data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openTickets = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const totalTickets = tickets.length;
  const avgResponseTime = '2.5 hours'; // Placeholder

  const TicketCard = ({ ticket }: { ticket: TicketItem }) => (
    <Card key={ticket.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-muted-foreground">{ticket.ticketNumber}</span>
              <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                {ticket.priority}
              </Badge>
            </div>
            <CardTitle className="text-base">{ticket.subject}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">{ticket.description}</CardDescription>
          </div>
          <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
            {ticket.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Customer: {ticket.customer.name}</span>
            {ticket.assignee && <span>Assigned: {ticket.assignee.name}</span>}
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>{ticket._count.comments}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) return <LoadingState />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Helpdesk</h1>
          <p className="text-muted-foreground">Manage customer support tickets</p>
        </div>
        <Button onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Open Tickets" value={openTickets} icon={AlertCircle} />
        <StatCard title="In Progress" value={inProgressTickets} icon={Clock} />
        <StatCard title="Total Tickets" value={totalTickets} icon={Ticket} />
        <StatCard title="Avg Response" value={avgResponseTime} icon={CheckCircle} />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Tickets</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {tickets.length === 0 ? (
            <EmptyState message="No tickets found" />
          ) : (
            tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
          )}
        </TabsContent>

        <TabsContent value="open" className="space-y-4">
          {tickets.filter(t => t.status === 'OPEN').length === 0 ? (
            <EmptyState message="No open tickets" />
          ) : (
            tickets.filter(t => t.status === 'OPEN').map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
          )}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          {tickets.filter(t => t.status === 'IN_PROGRESS').length === 0 ? (
            <EmptyState message="No tickets in progress" />
          ) : (
            tickets.filter(t => t.status === 'IN_PROGRESS').map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          {tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length === 0 ? (
            <EmptyState message="No resolved tickets" />
          ) : (
            tickets
              .filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED')
              .map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
