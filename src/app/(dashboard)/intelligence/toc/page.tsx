'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MiniMap,
  Node,
  NodeProps,
  useEdgesState,
  useNodesState,
} from 'react-flow-renderer';
import { AlertTriangle, GitBranch, RefreshCw, Shield, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfidenceBadge } from '@/components/intelligence/confidence-badge';

type TocNodeData = {
  label: string;
  kind: 'goal' | 'condition' | 'effect' | 'constraint' | 'injection' | 'outcome';
  description: string;
  confidence?: number;
  severity?: number;
  evidence?: string[];
};

type TocTree = {
  key: 'goal' | 'crt' | 'frt';
  label: string;
  description: string;
  nodes: Array<{ id: string; position: { x: number; y: number }; data: TocNodeData }>;
  edges: Array<{ id: string; source: string; target: string; label?: string }>;
};

type TocResponse = {
  success: boolean;
  data: {
    readinessStatus: string;
    primaryConstraint: {
      name: string;
      description: string | null;
      severity: number;
      confidence: number;
    } | null;
    trees: TocTree[];
  };
};

function toneForKind(kind: TocNodeData['kind']) {
  if (kind === 'goal') return 'border-emerald-300 bg-emerald-50';
  if (kind === 'constraint') return 'border-rose-300 bg-rose-50';
  if (kind === 'injection') return 'border-blue-300 bg-blue-50';
  if (kind === 'outcome') return 'border-teal-300 bg-teal-50';
  return 'border-slate-200 bg-white';
}

function FlowNode({ data, selected }: NodeProps<TocNodeData>) {
  return (
    <div
      className={`min-w-[220px] max-w-[260px] rounded-lg border p-4 shadow-sm ${
        toneForKind(data.kind)
      } ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{data.kind}</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{data.label}</p>
        </div>
        {typeof data.confidence === 'number' ? <ConfidenceBadge value={data.confidence} /> : null}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">{data.description}</p>
      {typeof data.severity === 'number' ? (
        <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
          Severity {data.severity}%
        </div>
      ) : null}
    </div>
  );
}

const nodeTypes = { intelligenceNode: FlowNode };

export default function TocWorkspacePage() {
  const [data, setData] = useState<TocResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTreeKey, setActiveTreeKey] = useState<'goal' | 'crt' | 'frt'>('goal');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const activeTree = useMemo(
    () => data?.trees.find((tree) => tree.key === activeTreeKey) ?? null,
    [activeTreeKey, data]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<TocNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  async function loadWorkspace() {
    const response = await fetch('/api/intelligence/toc');
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload?.error?.message || 'Failed to load TOC workspace.');
    }
    setData(payload.data);
  }

  useEffect(() => {
    loadWorkspace()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeTree) return;
    setNodes(
      activeTree.nodes.map<Node<TocNodeData>>((node) => ({
        ...node,
        type: 'intelligenceNode',
      }))
    );
    setEdges(activeTree.edges as Edge[]);
    setSelectedNodeId(activeTree.nodes[0]?.id ?? null);
  }, [activeTree, setEdges, setNodes]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">Loading TOC workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">TOC Tree Workspace</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Goal Trees align strategy, Current Reality Trees explain root causes, and Future Reality Trees map the likely effect of the next intervention.
          </p>
        </div>
        <Button variant="outline" onClick={() => loadWorkspace().catch((err) => setError(err.message))}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Trees
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Readiness gate</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{data?.readinessStatus ?? 'BLOCKED'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Primary constraint</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{data?.primaryConstraint?.name ?? 'No active constraint'}</p>
          </div>
          <div className="flex items-end">
            {data?.primaryConstraint ? <ConfidenceBadge value={data.primaryConstraint.confidence} /> : <Badge variant="outline">Awaiting scan</Badge>}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTreeKey} onValueChange={(value) => setActiveTreeKey(value as 'goal' | 'crt' | 'frt')}>
        <TabsList>
          <TabsTrigger value="goal">Goal Tree</TabsTrigger>
          <TabsTrigger value="crt">Current Reality</TabsTrigger>
          <TabsTrigger value="frt">Future Reality</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>{activeTree?.label}</CardTitle>
            <CardDescription>{activeTree?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[680px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                fitView
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable
              >
                <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#cbd5e1" />
                <Controls className="rounded-md border border-slate-200 bg-white shadow-sm" />
                <MiniMap className="rounded-md border border-slate-200 bg-white shadow-sm" />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-blue-600" />
                Node Inspection
              </CardTitle>
              <CardDescription>Click any node to see the confidence and evidence behind it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedNode ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selectedNode.data.kind}</Badge>
                    {typeof selectedNode.data.confidence === 'number' ? (
                      <ConfidenceBadge value={selectedNode.data.confidence} />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{selectedNode.data.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{selectedNode.data.description}</p>
                  </div>
                  {typeof selectedNode.data.severity === 'number' ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      Severity signal: <span className="font-semibold text-slate-950">{selectedNode.data.severity}%</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-slate-500">Select a node to inspect its evidence path.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                Evidence Stream
              </CardTitle>
              <CardDescription>Every tree node stays tethered to traceable telemetry and deterministic logic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedNode?.data.evidence?.length ? (
                selectedNode.data.evidence.map((item) => (
                  <div key={item} className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    {item}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No evidence lines were attached to this node yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Interpretation Guardrail
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-700">
              The canvas explains audited patterns. It does not replace human judgment, and it does not infer policy changes from low-confidence signals.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
