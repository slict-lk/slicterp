import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, User, Bell, Shield, Palette, Database, Building, CreditCard } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure your system preferences and account settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SettingCard
          title="Company Profile"
          description="Manage company information and branding"
          icon={User}
          href="/settings/company"
        />
        <SettingCard
          title="User Management"
          description="Add and manage team members"
          icon={Shield}
          href="/settings/users"
        />
        <SettingCard
          title="Notifications"
          description="Configure email and push notifications"
          icon={Bell}
          href="/settings/notifications"
        />
        <SettingCard
          title="Appearance"
          description="Customize theme and display settings"
          icon={Palette}
          href="/settings/appearance"
        />
        <SettingCard
          title="Integrations"
          description="Connect third-party services"
          icon={Database}
          href="/settings/integrations"
        />
        <SettingCard
          title="Billing & Subscription"
          description="Manage your plan, usage, and payments"
          icon={CreditCard}
          href="/settings/billing"
        />
        <SettingCard
          title="System Settings"
          description="Advanced configuration options"
          icon={Settings}
          href="/settings/system"
        />

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingCard({
  title,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  description: string;
  icon: any;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Icon className="h-6 w-6 text-gray-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
