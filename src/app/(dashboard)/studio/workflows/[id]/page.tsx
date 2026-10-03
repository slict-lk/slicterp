"use client";

import { useState, useCallback, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactFlow, {
    MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge,
    Connection, Edge, Node, Handle, Position, BackgroundVariant
} from 'react-flow-renderer';
import { useWorkflow, useUpdateWorkflowMutation } from '@/hooks/use-studio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save, Workflow, Zap, GitBranch, ArrowRight, Loader2, Trash2, Settings2 } from 'lucide-react';

// Reusing same exact nodes as builder
const TriggerNode = ({ data, selected }: any) => (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[180px] ${selected ? 'border-amber-500' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-2 pb-2 border-b">
            <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Zap className="h-3 w-3" />
            </div>
            <div className="font-bold text-sm text-slate-800">Trigger</div>
        </div>
        <div className="text-xs text-slate-500 mt-1">{data.label || 'Select trigger event'}</div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500" />
    </div>
);

const ConditionNode = ({ data, selected }: any) => (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[180px] ${selected ? 'border-indigo-500' : 'border-slate-200'}`}>
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
        <div className="flex items-center gap-2 mb-2 pb-2 border-b">
            <div className="h-6 w-6 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600">
                <GitBranch className="h-3 w-3" />
            </div>
            <div className="font-bold text-sm text-slate-800">Condition</div>
        </div>
        <div className="text-xs text-slate-500 mt-1">{data.label || 'If / Else'}</div>
        <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-3 bg-emerald-500 -ml-4" style={{ left: '30%' }} />
        <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-3 bg-red-500 -mr-4" style={{ left: '70%' }} />
    </div>
);

const ActionNode = ({ data, selected }: any) => (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[180px] ${selected ? 'border-emerald-500' : 'border-slate-200'}`}>
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
        <div className="flex items-center gap-2 mb-2 pb-2 border-b">
            <div className="h-6 w-6 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-600">
                <ArrowRight className="h-3 w-3" />
            </div>
            <div className="font-bold text-sm text-slate-800">Action</div>
        </div>
        <div className="text-xs text-slate-500 mt-1">{data.label || 'Execute task'}</div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-emerald-500" />
    </div>
);

const nodeTypes = { triggerNode: TriggerNode, conditionNode: ConditionNode, actionNode: ActionNode };

export default function EditWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const workflowId = resolvedParams.id;
    const router = useRouter();

    const { data: workflow, isLoading } = useWorkflow(workflowId);
    const updateMutation = useUpdateWorkflowMutation(workflowId);

    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    const [name, setName] = useState('');
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    useEffect(() => {
        if (workflow) {
            setName(workflow.name);

            if (workflow.nodes && Array.isArray(workflow.nodes)) {
                setNodes(workflow.nodes.map((n: any) => ({
                    ...n,
                    data: { ...n.config, type: n.type, label: n.config?.label || `${n.type} node`, config: n.config }
                })));
            }

            if (workflow.edges && Array.isArray(workflow.edges)) {
                setEdges(workflow.edges);
            }
        }
    }, [workflow, setNodes, setEdges]);

    const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((event: any) => {
        event.preventDefault();

        const type = event.dataTransfer.getData('application/reactflow');
        if (typeof type === 'undefined' || !type || !reactFlowInstance) return;

        const position = reactFlowInstance.project({
            x: event.clientX - event.target.getBoundingClientRect().left,
            y: event.clientY - event.target.getBoundingClientRect().top,
        });

        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type,
            position,
            data: { label: `${type.replace('Node', '')} node`, type: type.replace('Node', ''), config: {} },
        };

        setNodes((nds) => nds.concat(newNode));
    }, [reactFlowInstance, setNodes]);

    const onNodeClick = (_: any, node: Node) => {
        setSelectedNode(node);
    };

    const updateNodeData = (key: string, value: any) => {
        if (!selectedNode) return;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    const newData = { ...node.data, config: { ...node.data.config, [key]: value } };
                    if (key === 'actionType') newData.label = value === 'send_email' ? 'Send Email' : 'Update Record';
                    if (key === 'logic') newData.label = `Condition: ${value}`;
                    return { ...node, data: newData };
                }
                return node;
            })
        );
        setSelectedNode((prev: any) => ({ ...prev, data: { ...prev.data, config: { ...prev.data.config, [key]: value } } }));
    };

    const handleSave = async () => {
        if (!name.trim()) return;

        try {
            const triggerNode = nodes.find(n => n.type === 'triggerNode' || n.data?.type === 'trigger');
            if (!triggerNode) {
                toast.error('Workflow must have at least one trigger node');
                return;
            }

            const payload = {
                name,
                trigger: triggerNode.data.config?.event || 'event',
                triggerType: triggerNode.data.config?.event || 'event',
                triggerConfig: triggerNode.data.config || {},
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.data.type || n.type,
                    config: n.data.config,
                    position: n.position
                })),
                edges: edges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle,
                    targetHandle: e.targetHandle
                }))
            };

            await updateMutation.mutateAsync(payload);
            toast.success('Workflow updated');
            router.push('/studio/workflows');
        } catch (err: any) {
            toast.error(err.message || 'Failed to save workflow');
        }
    };

    if (isLoading) {
        return <div className="h-[calc(100vh-4rem)] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1600px] mx-auto overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b bg-white shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full">
                        <Link href="/studio/workflows"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded-md flex items-center justify-center">
                            <Workflow className="h-4 w-4" />
                        </div>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="font-bold text-lg h-8 border-transparent hover:border-slate-200 focus:border-indigo-500 w-64 shadow-none bg-transparent"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/studio/workflows">Cancel</Link>
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                        {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Update Workflow
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 h-full overflow-hidden bg-slate-50">
                <div className="w-64 border-r bg-white p-4 flex flex-col gap-6 shrink-0 z-10 overflow-y-auto">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Triggers</h3>
                        <div
                            className="flex items-center gap-3 p-3 rounded-md border border-slate-200 bg-amber-50 cursor-grab hover:border-amber-400 transition-colors"
                            onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'triggerNode'); e.dataTransfer.effectAllowed = 'move'; }}
                            draggable
                        >
                            <Zap className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-medium text-slate-700">Event Trigger</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Logic</h3>
                        <div
                            className="flex items-center gap-3 p-3 rounded-md border border-slate-200 bg-indigo-50 cursor-grab hover:border-indigo-400 transition-colors mb-2"
                            onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'conditionNode'); e.dataTransfer.effectAllowed = 'move'; }}
                            draggable
                        >
                            <GitBranch className="h-4 w-4 text-indigo-500" />
                            <span className="text-sm font-medium text-slate-700">If / Else Condition</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Actions</h3>
                        <div
                            className="flex items-center gap-3 p-3 rounded-md border border-slate-200 bg-emerald-50 cursor-grab hover:border-emerald-400 transition-colors mb-2"
                            onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'actionNode'); e.dataTransfer.effectAllowed = 'move'; }}
                            draggable
                        >
                            <ArrowRight className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-medium text-slate-700">Data Action</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes}
                        fitView
                        className="bg-slate-50"
                    >
                        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
                        <Controls className="bg-white shadow-md border border-slate-100 rounded-md" />
                        <MiniMap className="bg-white shadow-md border border-slate-100 rounded-md" />
                    </ReactFlow>
                </div>

                <div className="w-80 border-l bg-white shrink-0 z-10 overflow-y-auto hidden lg:block">
                    <div className="p-4 border-b bg-slate-50/50">
                        <h2 className="font-semibold text-slate-800">Configuration</h2>
                        <p className="text-xs text-slate-500">Select a node to edit its properties.</p>
                    </div>

                    <div className="p-4">
                        {!selectedNode ? (
                            <div className="text-center p-8 text-slate-400 flex flex-col items-center">
                                <Settings2 className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">No node selected</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-slate-500 font-bold">Node Type</Label>
                                    <div className="font-medium text-sm">{selectedNode.type?.replace('Node', '')}</div>
                                </div>

                                {/* Logic properties are mirrored here from the builder */}
                                {selectedNode.type === 'triggerNode' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Target Module</Label>
                                            <Select value={selectedNode.data.config?.target || ''} onValueChange={v => updateNodeData('target', v)}>
                                                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="invoices">Invoices</SelectItem>
                                                    <SelectItem value="sales_orders">Sales Orders</SelectItem>
                                                    <SelectItem value="users">Users</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Event</Label>
                                            <Select value={selectedNode.data.config?.event || ''} onValueChange={v => updateNodeData('event', v)}>
                                                <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="created">Record Created</SelectItem>
                                                    <SelectItem value="updated">Record Updated</SelectItem>
                                                    <SelectItem value="deleted">Record Deleted</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}

                                {selectedNode.type === 'conditionNode' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Field to Check</Label>
                                            <Input value={selectedNode.data.config?.field || ''} onChange={e => updateNodeData('field', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Logic Operator</Label>
                                            <Select value={selectedNode.data.config?.operator || ''} onValueChange={v => updateNodeData('operator', v)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="equals">Equals</SelectItem>
                                                    <SelectItem value="not_equals">Does Not Equal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Value</Label>
                                            <Input value={selectedNode.data.config?.value || ''} onChange={e => updateNodeData('value', e.target.value)} />
                                        </div>
                                    </>
                                )}

                                {selectedNode.type === 'actionNode' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Action Type</Label>
                                            <Select value={selectedNode.data.config?.actionType || ''} onValueChange={v => updateNodeData('actionType', v)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="send_email">Send Email</SelectItem>
                                                    <SelectItem value="update_record">Update Record</SelectItem>
                                                    <SelectItem value="http_request">HTTP Webhook</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}

                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full mt-8"
                                    onClick={() => { setNodes(nodes.filter(n => n.id !== selectedNode.id)); setSelectedNode(null); }}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Node
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
