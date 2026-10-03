import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Edit,
  Trash2,
} from 'lucide-react';
import { INTEGRATION_CONFIGS } from '@/lib/integrations/config';

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

interface IntegrationListProps {
  integrations: Integration[];
  onCreateNew: () => void;
  onEdit: (integration: Integration) => void;
  onDelete: (integrationId: string) => void;
  onSync: (integrationId: string, platform: string) => void;
  isLoading?: boolean;
}

const PLATFORM_CONFIG = {
  FACEBOOK_MARKETPLACE: {
    name: 'Facebook Marketplace',
    icon: Facebook,
    color: 'bg-blue-100 text-blue-800',
    description: 'Sync products and manage listings',
  },
  WHATSAPP_BUSINESS: {
    name: 'WhatsApp Business',
    icon: MessageCircle,
    color: 'bg-green-100 text-green-800',
    description: 'Customer messaging and notifications',
  },
  IKMAN_LK: {
    name: 'Ikman.lk',
    icon: ShoppingBag,
    color: 'bg-orange-100 text-orange-800',
    description: 'Sri Lankan marketplace integration',
  },
  ARAMEX: {
    name: 'Aramex',
    icon: Truck,
    color: 'bg-purple-100 text-purple-800',
    description: 'International shipping and logistics',
  },
  DHL: {
    name: 'DHL',
    icon: Truck,
    color: 'bg-red-100 text-red-800',
    description: 'Global express delivery',
  },
  DOMEX: {
    name: 'Domex',
    icon: Truck,
    color: 'bg-indigo-100 text-indigo-800',
    description: 'Sri Lankan domestic delivery',
  },
};

export function IntegrationList({
  integrations,
  onCreateNew,
  onEdit,
  onDelete,
  onSync,
  isLoading,
}: IntegrationListProps) {
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  const handleSync = async (integrationId: string, platform: string) => {
    setSyncingIds(prev => new Set(prev).add(integrationId));

    try {
      await onSync(integrationId, platform);
    } finally {
      setSyncingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(integrationId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (integration: Integration) => {
    if (!integration.isActive) {
      return <Badge variant="secondary">Disconnected</Badge>;
    }

    if (integration.expiresAt && new Date(integration.expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>;
  };

  const getLastSyncDisplay = (date?: string) => {
    if (!date) return 'Never';

    const lastSync = new Date(date);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const marketPlaceIntegrations = integrations.filter(i =>
    ['FACEBOOK_MARKETPLACE', 'WHATSAPP_BUSINESS', 'IKMAN_LK'].includes(i.platform)
  );

  const courierIntegrations = integrations.filter(i =>
    ['ARAMEX', 'DHL', 'DOMEX'].includes(i.platform)
  );

  const IntegrationCard = ({ integration }: { integration: Integration }) => {
    const config = PLATFORM_CONFIG[integration.platform as keyof typeof PLATFORM_CONFIG];
    const IconComponent = config.icon;
    const isSyncing = syncingIds.has(integration.id);

    return (
      <Card key={integration.id} className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{integration.accountName}</CardTitle>
                <p className="text-sm text-gray-500">{config.name}</p>
              </div>
            </div>
            {getStatusBadge(integration)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">{config.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Last sync:</span>
              <div className="font-medium">{getLastSyncDisplay(integration.lastSyncAt)}</div>
            </div>

            {integration.platform === 'WHATSAPP_BUSINESS' && (
              <div>
                <span className="text-gray-500">Messages:</span>
                <div className="font-medium">{integration._count.messages}</div>
              </div>
            )}

            {(integration.platform === 'ARAMEX' || integration.platform === 'DHL' || integration.platform === 'DOMEX') && (
              <div>
                <span className="text-gray-500">Shipments:</span>
                <div className="font-medium">{integration._count.shipments}</div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => handleSync(integration.id, integration.platform)}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-3 w-3 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(integration)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm('Are you sure you want to delete this integration?')) {
                  onDelete(integration.id);
                }
              }}
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Integration Accounts</h2>
          <p className="text-gray-600">Manage your external service connections</p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {marketPlaceIntegrations.length}
              </p>
              <p className="text-sm text-gray-600">Marketplaces</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Truck className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {courierIntegrations.length}
              </p>
              <p className="text-sm text-gray-600">Couriers</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {integrations.filter(i => i.isActive).length}
              </p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {integrations.filter(i => i._count.messages > 0 || i._count.shipments > 0).length}
              </p>
              <p className="text-sm text-gray-600">In Use</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Marketplace Integrations */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Marketplace Integrations</h3>
        {marketPlaceIntegrations.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No marketplace integrations</h3>
                <p className="text-gray-600 mb-4">Connect to marketplaces to sync products and receive messages</p>
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Marketplace
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketPlaceIntegrations.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        )}
      </div>

      {/* Courier Integrations */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Courier Integrations</h3>
        {courierIntegrations.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No courier integrations</h3>
                <p className="text-gray-600 mb-4">Connect to courier services to track shipments automatically</p>
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Courier
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courierIntegrations.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
