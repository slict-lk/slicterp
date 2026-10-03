'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntegrationList } from '@/components/integrations/IntegrationList';
import { IntegrationForm } from '@/components/integrations/IntegrationForm';
import {
  Facebook,
  MessageCircle,
  ShoppingBag,
  Truck,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Plus,
  Settings,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface Integration {
  id: string;
  platform: string;
  accountName: string;
  isActive: boolean;
  lastSyncAt?: string;
  expiresAt?: string;
  _count: {
    shipments: number;
    messages: number;
    logs: number;
  };
}

interface IntegrationFormData {
  platform: string;
  accountName: string;
  accountId?: string;
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  settings?: Record<string, any>;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (viewMode === 'list') {
      fetchIntegrations();
    }
  }, [viewMode]);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations');
      const result = await response.json();

      if (result.success) {
        setIntegrations(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedIntegration(null);
    setViewMode('create');
  };

  const handleEdit = (integration: Integration) => {
    setSelectedIntegration(integration);
    setViewMode('edit');
  };

  const handleDelete = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchIntegrations();
      }
    } catch (error) {
      console.error('Failed to delete integration:', error);
    }
  };

  const handleSync = async (integrationId: string, platform: string) => {
    setSyncing(prev => ({ ...prev, [integrationId]: true }));

    try {
      let endpoint: string;

      switch (platform) {
        case 'FACEBOOK_MARKETPLACE':
          endpoint = `/api/integrations/facebook`;
          break;
        case 'WHATSAPP_BUSINESS':
          endpoint = `/api/integrations/whatsapp`;
          break;
        case 'ARAMEX':
        case 'DHL':
        case 'DOMEX':
          endpoint = `/api/integrations/shipments/track`;
          break;
        default:
          endpoint = `/api/integrations/${platform.toLowerCase()}`;
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchIntegrations(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to sync integration:', error);
    } finally {
      setSyncing(prev => ({ ...prev, [integrationId]: false }));
    }
  };

  const handleFormSubmit = async (data: IntegrationFormData) => {
    setIsSubmitting(true);

    try {
      const method = selectedIntegration ? 'PUT' : 'POST';
      const url = selectedIntegration
        ? `/api/integrations/${selectedIntegration.id}`
        : '/api/integrations';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setViewMode('list');
        await fetchIntegrations();
      }
    } catch (error) {
      console.error('Failed to save integration:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedIntegration(null);
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setViewMode('list')}
              className="mb-4"
            >
              ← Back to Integrations
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              {viewMode === 'create' ? 'Add New Integration' : 'Edit Integration'}
            </h1>
          </div>

          <IntegrationForm
            initialData={selectedIntegration ? {
              platform: selectedIntegration.platform as any,
              accountName: selectedIntegration.accountName,
            } : undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <IntegrationList
        integrations={integrations}
        onCreateNew={handleCreateNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSync={handleSync}
        isLoading={loading}
      />

      {/* Integration Tabs - Keeping original detailed view */}
      <Tabs defaultValue="marketplaces" className="space-y-4">
        <TabsList>
          <TabsTrigger value="marketplaces">Marketplaces</TabsTrigger>
          <TabsTrigger value="couriers">Couriers</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
        </TabsList>

        {/* Marketplaces Tab */}
        <TabsContent value="marketplaces" className="space-y-4">
          {integrations.filter(i => ['FACEBOOK_MARKETPLACE', 'WHATSAPP_BUSINESS', 'IKMAN_LK'].includes(i.platform)).length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No marketplace integrations</h3>
                  <p className="text-gray-600 mb-4">Connect to marketplaces to sync products and receive messages</p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Marketplace
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations
                .filter(i => ['FACEBOOK_MARKETPLACE', 'WHATSAPP_BUSINESS', 'IKMAN_LK'].includes(i.platform))
                .map((integration) => (
                  <Card key={integration.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            integration.platform === 'FACEBOOK_MARKETPLACE' ? 'bg-blue-100 text-blue-800' :
                            integration.platform === 'WHATSAPP_BUSINESS' ? 'bg-green-100 text-green-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {integration.platform === 'FACEBOOK_MARKETPLACE' ? <Facebook className="h-5 w-5" /> :
                             integration.platform === 'WHATSAPP_BUSINESS' ? <MessageCircle className="h-5 w-5" /> :
                             <ShoppingBag className="h-5 w-5" />}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{integration.accountName}</CardTitle>
                            <p className="text-sm text-gray-500">{integration.platform.replace('_', ' ')}</p>
                          </div>
                        </div>
                        {integration.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>
                        ) : (
                          <Badge variant="secondary">Disconnected</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Last sync:</span>
                        <span>{integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleDateString() : 'Never'}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Messages:</span>
                        <span>{integration._count.messages}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleSync(integration.id, integration.platform)}
                          disabled={syncing[integration.id]}
                        >
                          <RefreshCw className={`h-3 w-3 mr-2 ${syncing[integration.id] ? 'animate-spin' : ''}`} />
                          Sync
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-3 w-3" />
                        </Button>
                        {integration.platform === 'WHATSAPP_BUSINESS' && (
                          <Link href="/integrations/messages">
                            <Button size="sm" variant="outline">
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Messages
                            </Button>
                          </Link>
                        )}
                        {(integration.platform === 'ARAMEX' || integration.platform === 'DHL' || integration.platform === 'DOMEX') && (
                          <Link href="/integrations/tracking">
                            <Button size="sm" variant="outline">
                              <Truck className="h-3 w-3 mr-1" />
                              Track
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Couriers Tab */}
        <TabsContent value="couriers" className="space-y-4">
          {integrations.filter(i => ['ARAMEX', 'DHL', 'DOMEX'].includes(i.platform)).length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No courier integrations</h3>
                  <p className="text-gray-600 mb-4">Connect to courier services to track shipments</p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Courier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations
                .filter(i => ['ARAMEX', 'DHL', 'DOMEX'].includes(i.platform))
                .map((integration) => (
                  <Card key={integration.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-purple-100 text-purple-800`}>
                            <Truck className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{integration.accountName}</CardTitle>
                            <p className="text-sm text-gray-500">{integration.platform}</p>
                          </div>
                        </div>
                        {integration.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>
                        ) : (
                          <Badge variant="secondary">Disconnected</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Shipments:</span>
                        <span>{integration._count.shipments}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleSync(integration.id, integration.platform)}
                          disabled={syncing[integration.id]}
                        >
                          <RefreshCw className={`h-3 w-3 mr-2 ${syncing[integration.id] ? 'animate-spin' : ''}`} />
                          Sync
                        </Button>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Sync Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div key={integration.id} className="border-b pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{integration.accountName}</span>
                        <span className="text-sm text-gray-500">({integration.platform})</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {integration._count.logs} logs
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Last sync: {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                ))}

                {integrations.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No integration logs yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
