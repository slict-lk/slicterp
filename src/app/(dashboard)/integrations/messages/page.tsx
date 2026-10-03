'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, Phone, Mail, RefreshCw, Eye, Reply } from 'lucide-react';

interface Message {
  id: string;
  platform: string;
  direction: string;
  senderId: string;
  senderName?: string;
  recipientId: string;
  recipientName?: string;
  messageType: string;
  content: string;
  status: string;
  readAt?: string;
  customer?: {
    id: string;
    name: string;
  };
  salesOrder?: {
    id: string;
    number: string;
  };
  createdAt: string;
}

const PLATFORM_ICONS = {
  WHATSAPP: '💬',
  FACEBOOK_MESSENGER: '📘',
  INSTAGRAM: '📷',
};

const STATUS_COLORS = {
  SENT: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-green-100 text-green-800',
  READ: 'bg-purple-100 text-purple-800',
  FAILED: 'bg-red-100 text-red-800',
};

export default function MarketplaceMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations/messages');
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        console.error('Failed to fetch messages');
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(message =>
    message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.senderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.DELIVERED}>
        {status}
      </Badge>
    );
  };

  const getDirectionBadge = (direction: string) => {
    return (
      <Badge variant={direction === 'INBOUND' ? 'default' : 'secondary'}>
        {direction === 'INBOUND' ? 'Incoming' : 'Outgoing'}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketplace Messages</h1>
          <p className="text-gray-600">View and manage customer messages from WhatsApp and Facebook</p>
        </div>
        <Button onClick={fetchMessages} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search messages, customers, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="py-6">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? 'Try adjusting your search' : 'No messages received yet'}
                  </p>
                  {!searchTerm && (
                    <p className="text-sm text-gray-500">
                      Messages will appear here when customers contact you through connected platforms
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => (
                <Card
                  key={message.id}
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${selectedMessage?.id === message.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  onClick={() => setSelectedMessage(message)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {PLATFORM_ICONS[message.platform as keyof typeof PLATFORM_ICONS] || '💬'}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {message.senderName || message.senderId}
                          </div>
                          <div className="text-sm text-gray-500">
                            {message.customer?.name && `Customer: ${message.customer.name}`}
                            {message.salesOrder && ` • Order: ${message.salesOrder.number}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getDirectionBadge(message.direction)}
                        {getStatusBadge(message.status)}
                      </div>
                    </div>

                    <div className="text-sm text-gray-700 mb-3">
                      {message.content}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        {message.readAt && (
                          <span>Read: {new Date(message.readAt).toLocaleString()}</span>
                        )}
                        <Button size="sm" variant="ghost">
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Message Details */}
        <div className="lg:col-span-1">
          {selectedMessage ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Message Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {PLATFORM_ICONS[selectedMessage.platform as keyof typeof PLATFORM_ICONS] || '💬'}
                    </span>
                    <span className="font-medium">{selectedMessage.platform}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">From:</span>
                      <div className="font-medium">
                        {selectedMessage.senderName || selectedMessage.senderId}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">To:</span>
                      <div className="font-medium">
                        {selectedMessage.recipientName || selectedMessage.recipientId}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <div className="font-medium">{selectedMessage.messageType}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Direction:</span>
                      <div className="font-medium">
                        {selectedMessage.direction === 'INBOUND' ? 'Incoming' : 'Outgoing'}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm">
                    <span className="text-gray-500">Status:</span>
                    <div>{getStatusBadge(selectedMessage.status)}</div>
                  </div>

                  {selectedMessage.customer && (
                    <div className="text-sm">
                      <span className="text-gray-500">Customer:</span>
                      <div className="font-medium">{selectedMessage.customer.name}</div>
                    </div>
                  )}

                  {selectedMessage.salesOrder && (
                    <div className="text-sm">
                      <span className="text-gray-500">Order:</span>
                      <div className="font-medium">{selectedMessage.salesOrder.number}</div>
                    </div>
                  )}

                  <div className="text-sm">
                    <span className="text-gray-500">Received:</span>
                    <div className="font-medium">
                      {new Date(selectedMessage.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    <Reply className="h-3 w-3 mr-2" />
                    Reply
                  </Button>
                  <Button size="sm" variant="outline">
                    <Eye className="h-3 w-3 mr-2" />
                    View Thread
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <MessageCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Select a message to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Message Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {messages.length}
              </p>
              <p className="text-sm text-gray-600">Total Messages</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600">💬</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {messages.filter(m => m.platform === 'WHATSAPP').length}
              </p>
              <p className="text-sm text-gray-600">WhatsApp</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600">📘</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {messages.filter(m => m.platform === 'FACEBOOK_MESSENGER').length}
              </p>
              <p className="text-sm text-gray-600">Facebook</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-purple-600">📖</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {messages.filter(m => m.status === 'READ').length}
              </p>
              <p className="text-sm text-gray-600">Read</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
