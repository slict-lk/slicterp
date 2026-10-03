'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, User, Clock } from 'lucide-react';
import Link from 'next/link';

export default function LiveChatPage() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ACTIVE');

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [filter]);

  const fetchChats = async () => {
    try {
      const tenantId = 'tenant-1';
      const statusFilter = filter !== 'ALL' ? `&status=${filter}` : '';
      const response = await fetch(`/api/livechat?tenantId=${tenantId}${statusFilter}`);
      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'WAITING': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-blue-100 text-blue-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Live Chat Support</h1>
          <p className="text-muted-foreground mt-2">Monitor and respond to customer conversations</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['ALL', 'ACTIVE', 'WAITING', 'RESOLVED', 'CLOSED'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              </CardHeader>
            </Card>
          ))
        ) : (
          chats.map((chat: any) => (
            <Card key={chat.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {chat.visitorName || 'Anonymous Visitor'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {chat.visitorEmail || 'No email provided'}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(chat.status)}>
                    {chat.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Started {new Date(chat.startedAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    {chat.messages?.length || 0} messages
                  </div>
                </div>
                {chat.assignedTo && (
                  <p className="text-sm mb-3">
                    <span className="font-medium">Assigned to:</span> {chat.assignedTo.name}
                  </p>
                )}
                {chat.messages?.[0] && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">{chat.messages[0].content}</p>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button asChild size="sm">
                    <Link href={`/livechat/${chat.id}`}>View Chat</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {!loading && chats.length === 0 && (
        <Card className="p-12 text-center">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No active chats</h3>
          <p className="text-muted-foreground">Waiting for visitors to start a conversation</p>
        </Card>
      )}
    </div>
  );
}
