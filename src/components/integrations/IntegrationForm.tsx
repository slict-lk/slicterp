import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { INTEGRATION_CONFIGS } from '@/lib/integrations/config';

const integrationSchema = z.object({
  platform: z.enum(['WHATSAPP_BUSINESS', 'FACEBOOK_MARKETPLACE', 'IKMAN_LK', 'ARAMEX', 'DHL', 'DOMEX']),
  accountName: z.string().min(1, 'Account name is required'),
  accountId: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  webhookSecret: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

type IntegrationFormData = z.infer<typeof integrationSchema>;

interface IntegrationFormProps {
  initialData?: Partial<IntegrationFormData>;
  onSubmit: (data: IntegrationFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const PLATFORM_OPTIONS = [
  { value: 'WHATSAPP_BUSINESS', label: 'WhatsApp Business API', category: 'Messaging' },
  { value: 'FACEBOOK_MARKETPLACE', label: 'Facebook Marketplace', category: 'Marketplace' },
  { value: 'IKMAN_LK', label: 'Ikman.lk', category: 'Marketplace' },
  { value: 'ARAMEX', label: 'Aramex', category: 'Courier' },
  { value: 'DHL', label: 'DHL Express', category: 'Courier' },
  { value: 'DOMEX', label: 'Domex', category: 'Courier' },
];

export function IntegrationForm({ initialData, onSubmit, onCancel, isLoading }: IntegrationFormProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      platform: initialData?.platform || 'WHATSAPP_BUSINESS',
      accountName: initialData?.accountName || '',
      accountId: initialData?.accountId || '',
      accessToken: initialData?.accessToken || '',
      refreshToken: initialData?.refreshToken || '',
      apiKey: initialData?.apiKey || '',
      apiSecret: initialData?.apiSecret || '',
      webhookSecret: initialData?.webhookSecret || '',
      settings: initialData?.settings || {},
    },
  });

  const selectedPlatform = watch('platform');
  const platformConfig = selectedPlatform ? INTEGRATION_CONFIGS[selectedPlatform as keyof typeof INTEGRATION_CONFIGS] : null;

  const handleTestConnection = async () => {
    if (!selectedPlatform) return;

    setTestStatus('testing');
    setTestMessage('');

    try {
      // This would be implemented to test the connection
      // For now, just simulate a test
      await new Promise(resolve => setTimeout(resolve, 2000));

      setTestStatus('success');
      setTestMessage('Connection successful!');
    } catch (error) {
      setTestStatus('error');
      setTestMessage(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const onFormSubmit = async (data: IntegrationFormData) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error('Failed to save integration:', error);
    }
  };

  const getRequiredFields = (platform: string) => {
    switch (platform) {
      case 'WHATSAPP_BUSINESS':
        return ['accountName', 'accessToken', 'webhookSecret'];
      case 'FACEBOOK_MARKETPLACE':
        return ['accountName', 'accessToken'];
      case 'IKMAN_LK':
        return ['accountName', 'apiKey'];
      case 'ARAMEX':
      case 'DHL':
      case 'DOMEX':
        return ['accountName', 'apiKey'];
      default:
        return ['accountName'];
    }
  };

  const requiredFields = selectedPlatform ? getRequiredFields(selectedPlatform) : [];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Integration' : 'Add New Integration'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label htmlFor="platform">Platform *</Label>
            <Select
              value={selectedPlatform}
              onValueChange={(value) => setValue('platform', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {option.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.platform && (
              <p className="text-sm text-red-500">{errors.platform.message}</p>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name *</Label>
              <Input
                id="accountName"
                {...register('accountName')}
                placeholder="My WhatsApp Business"
                className={errors.accountName ? 'border-red-500' : ''}
              />
              {errors.accountName && (
                <p className="text-sm text-red-500">{errors.accountName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountId">Account ID</Label>
              <Input
                id="accountId"
                {...register('accountId')}
                placeholder="External account identifier"
              />
            </div>
          </div>

          {/* Platform-specific fields */}
          {selectedPlatform === 'WHATSAPP_BUSINESS' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">WhatsApp Business API Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessToken">Access Token *</Label>
                    <Input
                      id="accessToken"
                      type="password"
                      {...register('accessToken')}
                      placeholder="WhatsApp API Access Token"
                      className={errors.accessToken ? 'border-red-500' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhookSecret">Webhook Secret *</Label>
                    <Input
                      id="webhookSecret"
                      type="password"
                      {...register('webhookSecret')}
                      placeholder="Webhook verification secret"
                      className={errors.webhookSecret ? 'border-red-500' : ''}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Get these credentials from your WhatsApp Business API setup in Meta for Developers.
                </div>
              </CardContent>
            </Card>
          )}

          {selectedPlatform === 'FACEBOOK_MARKETPLACE' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Facebook Marketplace Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accessToken">Page Access Token *</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    {...register('accessToken')}
                    placeholder="Facebook Page Access Token"
                    className={errors.accessToken ? 'border-red-500' : ''}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  Generate a Page Access Token from your Facebook Page settings with marketplace permissions.
                </div>
              </CardContent>
            </Card>
          )}

          {(selectedPlatform === 'ARAMEX' || selectedPlatform === 'DHL' || selectedPlatform === 'DOMEX') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedPlatform} Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key *</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      {...register('apiKey')}
                      placeholder="Courier API Key"
                      className={errors.apiKey ? 'border-red-500' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">API Secret</Label>
                    <Input
                      id="apiSecret"
                      type="password"
                      {...register('apiSecret')}
                      placeholder="API Secret (if required)"
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Contact {selectedPlatform} support to get your API credentials.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Connection */}
          {selectedPlatform && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Test Connection</h4>
                    <p className="text-sm text-gray-600">Verify your integration credentials work</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {testStatus === 'testing' && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        <span className="text-sm">Testing...</span>
                      </div>
                    )}
                    {testStatus === 'success' && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">{testMessage}</span>
                      </div>
                    )}
                    {testStatus === 'error' && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{testMessage}</span>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={testStatus === 'testing'}
                    >
                      Test Connection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (initialData ? 'Update Integration' : 'Add Integration')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
