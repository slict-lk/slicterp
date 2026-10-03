"use client";

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, UserCircle, RefreshCw, Mail, Phone } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: string;
  company?: string;
  jobTitle?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

const typeColors = {
  CUSTOMER: 'bg-blue-100 text-blue-800',
  VENDOR: 'bg-green-100 text-green-800',
  PARTNER: 'bg-purple-100 text-purple-800',
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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const data = await response.json();
      setContacts(data.contacts || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const ContactCard = ({ contact }: { contact: Contact }) => (
    <Card key={contact.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{contact.name}</CardTitle>
            {contact.jobTitle && <CardDescription>{contact.jobTitle}</CardDescription>}
          </div>
          <Badge className={typeColors[contact.type as keyof typeof typeColors]}>
            {contact.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {contact.company && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{contact.company}</span>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{contact.phone}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Manage your business contacts</p>
        </div>
        <Button onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Customers" value={stats.CUSTOMER || 0} icon={Users} />
        <StatCard title="Vendors" value={stats.VENDOR || 0} icon={Building2} />
        <StatCard title="Partners" value={stats.PARTNER || 0} icon={UserCircle} />
        <StatCard title="Total Contacts" value={contacts.length} icon={Users} />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Contacts</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {contacts.map(contact => <ContactCard key={contact.id} contact={contact} />)}
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          {contacts.filter(c => c.type === 'CUSTOMER').map(contact => <ContactCard key={contact.id} contact={contact} />)}
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          {contacts.filter(c => c.type === 'VENDOR').map(contact => <ContactCard key={contact.id} contact={contact} />)}
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          {contacts.filter(c => c.type === 'PARTNER').map(contact => <ContactCard key={contact.id} contact={contact} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
