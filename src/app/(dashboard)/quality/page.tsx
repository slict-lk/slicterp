"use client";

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

interface QualityCheck {
  id: string;
  checkNumber: string;
  type: string;
  status: string;
  result?: string;
  defectsFound: number;
  notes?: string;
  product: { name: string; sku: string };
  inspector: { name: string };
  inspectionDate: string;
  createdAt: string;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

const typeColors = {
  INCOMING: 'bg-purple-100 text-purple-800',
  IN_PROCESS: 'bg-blue-100 text-blue-800',
  FINAL: 'bg-green-100 text-green-800',
  RETURNED: 'bg-orange-100 text-orange-800',
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

export default function QualityPage() {
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/quality/checks');
      if (!response.ok) throw new Error('Failed to fetch quality checks');
      const data = await response.json();
      setChecks(data.checks || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error fetching quality checks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingChecks = checks.filter(c => c.status === 'PENDING').length;
  const completedChecks = checks.filter(c => c.status === 'COMPLETED').length;
  const failedChecks = checks.filter(c => c.status === 'FAILED').length;
  const totalDefects = checks.reduce((sum, c) => sum + c.defectsFound, 0);

  const CheckCard = ({ check }: { check: QualityCheck }) => (
    <Card key={check.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-muted-foreground">{check.checkNumber}</span>
              <Badge className={typeColors[check.type as keyof typeof typeColors]}>
                {check.type.replace('_', ' ')}
              </Badge>
            </div>
            <CardTitle className="text-base">{check.product.name}</CardTitle>
            <CardDescription>SKU: {check.product.sku}</CardDescription>
          </div>
          <Badge className={statusColors[check.status as keyof typeof statusColors]}>
            {check.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Inspector: {check.inspector.name}</span>
          {check.defectsFound > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              {check.defectsFound} defects
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          Inspection Date: {new Date(check.inspectionDate).toLocaleDateString()}
        </div>
        {check.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{check.notes}</p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quality Control</h1>
          <p className="text-muted-foreground">Manage quality inspections and checks</p>
        </div>
        <Button onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Pending Checks" value={pendingChecks} icon={Clock} />
        <StatCard title="Completed" value={completedChecks} icon={CheckCircle} />
        <StatCard title="Failed" value={failedChecks} icon={XCircle} />
        <StatCard title="Total Defects" value={totalDefects} icon={AlertTriangle} />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Checks</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {checks.map(check => <CheckCard key={check.id} check={check} />)}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {checks.filter(c => c.status === 'PENDING').map(check => <CheckCard key={check.id} check={check} />)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {checks.filter(c => c.status === 'COMPLETED').map(check => <CheckCard key={check.id} check={check} />)}
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          {checks.filter(c => c.status === 'FAILED').map(check => <CheckCard key={check.id} check={check} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
