'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Brush,
    SprayCan,
    CheckCircle2,
    AlertTriangle,
    Clock,
    User,
    RefreshCw,
    Loader2,
    ListTodo,
    LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface HousekeepingRoom {
    id: string;
    roomNumber: string;
    roomType: string;
    status: string; // AVAILABLE, OCCUPIED
    housekeepingStatus: 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_ORDER' | 'IN_PROGRESS';
    lastCleanedAt?: string;
    lastCleanedBy?: string;
}

interface HousekeepingTask {
    id: string;
    roomId: string;
    room: { roomNumber: string };
    taskType: string;
    priority: string;
    status: string;
    assignedTo: string;
    notes?: string;
    createdAt: string;
}

export default function HousekeepingPage() {
    const { data: session } = useSession();
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;

    const [loading, setLoading] = useState(true);
    const [rooms, setRooms] = useState<HousekeepingRoom[]>([]);
    const [myTasks, setMyTasks] = useState<HousekeepingTask[]>([]);
    const [filter, setFilter] = useState('ALL');
    const [selectedRoom, setSelectedRoom] = useState<HousekeepingRoom | null>(null);
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
    const [newStatus, setNewStatus] = useState<string>('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (tenantId) {
            fetchData();
        }
    }, [tenantId]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchRooms(), fetchMyTasks()]);
        setLoading(false);
    };

    const fetchRooms = async () => {
        try {
            const res = await fetch(`/api/hotel/rooms?tenantId=${tenantId}`);
            if (res.ok) {
                setRooms(await res.json());
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
            toast.error('Failed to load room status');
        }
    };

    const fetchMyTasks = async () => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/hotel/housekeeping/tasks?tenantId=${tenantId}&assignedTo=${userId}&status=ASSIGNED`);
            if (res.ok) {
                setMyTasks(await res.json());
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    const handleStatusUpdate = async () => {
        if (!selectedRoom || !newStatus) return;

        try {
            setProcessing(true);
            const res = await fetch(`/api/hotel/rooms/${selectedRoom.id}/housekeeping`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    updatedBy: userId
                }),
            });

            if (res.ok) {
                toast.success(`Room ${selectedRoom.roomNumber} marked as ${newStatus}`);
                setIsUpdateDialogOpen(false);
                fetchRooms();
            } else {
                toast.error('Update failed');
            }
        } catch (error) {
            toast.error('Update failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleTaskComplete = async (taskId: string) => {
        // Logic to complete task (omitted for MVP, just showing list)
        toast.info("Task completion logic here");
    };

    const openUpdateDialog = (room: HousekeepingRoom) => {
        setSelectedRoom(room);
        setNewStatus(room.housekeepingStatus);
        setIsUpdateDialogOpen(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CLEAN': return 'bg-emerald-500 hover:bg-emerald-600';
            case 'DIRTY': return 'bg-red-500 hover:bg-red-600';
            case 'INSPECTED': return 'bg-blue-500 hover:bg-blue-600';
            case 'OUT_OF_ORDER': return 'bg-gray-500 hover:bg-gray-600';
            case 'IN_PROGRESS': return 'bg-amber-500 hover:bg-amber-600';
            default: return 'bg-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'CLEAN': return <CheckCircle2 className="h-4 w-4" />;
            case 'DIRTY': return <Brush className="h-4 w-4" />;
            case 'INSPECTED': return <CheckCircle2 className="h-4 w-4" />;
            case 'OUT_OF_ORDER': return <AlertTriangle className="h-4 w-4" />;
            case 'IN_PROGRESS': return <SprayCan className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    // Filter rooms
    const filteredRooms = filter === 'ALL'
        ? rooms
        : rooms.filter(r => r.housekeepingStatus === filter);

    // Calculate stats
    const stats = {
        clean: rooms.filter(r => r.housekeepingStatus === 'CLEAN').length,
        dirty: rooms.filter(r => r.housekeepingStatus === 'DIRTY').length,
        inspected: rooms.filter(r => r.housekeepingStatus === 'INSPECTED').length,
        ooo: rooms.filter(r => r.housekeepingStatus === 'OUT_OF_ORDER').length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                        Housekeeping
                    </h1>
                    <p className="text-muted-foreground">Room status board and task management</p>
                </div>
                <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-emerald-600">Clean</p>
                        <p className="text-2xl font-bold text-emerald-700">{stats.clean}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-emerald-200" />
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-red-600">Dirty</p>
                        <p className="text-2xl font-bold text-red-700">{stats.dirty}</p>
                    </div>
                    <Brush className="h-8 w-8 text-red-200" />
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-blue-600">Inspected</p>
                        <p className="text-2xl font-bold text-blue-700">{stats.inspected}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-blue-200" />
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Out of Order</p>
                        <p className="text-2xl font-bold text-gray-700">{stats.ooo}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-gray-200" />
                </div>
            </div>

            <Tabs defaultValue="board" className="w-full">
                <TabsList>
                    <TabsTrigger value="board" className="gap-2"><LayoutGrid className="h-4 w-4" /> Room Board</TabsTrigger>
                    <TabsTrigger value="tasks" className="gap-2"><ListTodo className="h-4 w-4" /> My Tasks</TabsTrigger>
                    <TabsTrigger value="staff" className="gap-2"><User className="h-4 w-4" /> Staff Stats</TabsTrigger>
                </TabsList>

                {/* ROOM BOARD TAB */}
                <TabsContent value="board" className="mt-4">
                    <Tabs defaultValue="ALL" onValueChange={setFilter} className="w-full">
                        <div className="flex justify-between items-center mb-4">
                            <TabsList>
                                <TabsTrigger value="ALL">All Rooms</TabsTrigger>
                                <TabsTrigger value="DIRTY">Dirty</TabsTrigger>
                                <TabsTrigger value="CLEAN">Clean</TabsTrigger>
                                <TabsTrigger value="INSPECTED">Inspected</TabsTrigger>
                                <TabsTrigger value="OUT_OF_ORDER">Out of Order</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Room Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {filteredRooms.map((room) => (
                                <div
                                    key={room.id}
                                    onClick={() => openUpdateDialog(room)}
                                    className="group cursor-pointer relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-md hover:scale-[1.02]"
                                >
                                    {/* Status Bar */}
                                    <div className={`h-2 w-full ${getStatusColor(room.housekeepingStatus)}`} />

                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-2xl font-bold font-mono tracking-tight">
                                                {room.roomNumber}
                                            </span>
                                            <Badge variant={room.status === 'AVAILABLE' ? 'secondary' : 'default'} className="text-[10px]">
                                                {room.status === 'AVAILABLE' ? 'Vacant' : 'Occupied'}
                                            </Badge>
                                        </div>

                                        <div className="text-xs text-muted-foreground mb-3 font-medium">
                                            {room.roomType}
                                        </div>

                                        <div className="flex items-center gap-2 text-xs">
                                            <Badge
                                                variant="outline"
                                                className={`gap-1 border-0 ${room.housekeepingStatus === 'DIRTY' ? 'bg-red-100 text-red-700' :
                                                    room.housekeepingStatus === 'CLEAN' ? 'bg-emerald-100 text-emerald-700' :
                                                        room.housekeepingStatus === 'INSPECTED' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}
                                            >
                                                {getStatusIcon(room.housekeepingStatus)}
                                                {room.housekeepingStatus}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Tabs>
                </TabsContent>

                {/* MY TASKS TAB */}
                <TabsContent value="tasks" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Tasks</CardTitle>
                            <CardDescription>Cleaning assignments and work orders assigned to you</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {myTasks.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    No tasks assigned to you right now. Only tasks with status 'ASSIGNED' (not completed) appear here.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Room</TableHead>
                                            <TableHead>Task</TableHead>
                                            <TableHead>Assigned</TableHead>
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {myTasks.map((task) => (
                                            <TableRow key={task.id}>
                                                <TableCell>
                                                    <Badge variant={task.priority === 'HIGH' || task.priority === 'URGENT' ? 'destructive' : 'secondary'}>
                                                        {task.priority}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono font-bold">{task.room?.roomNumber}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{task.taskType}</div>
                                                    <div className="text-xs text-muted-foreground">{task.notes}</div>
                                                </TableCell>
                                                <TableCell>{format(new Date(task.createdAt), 'MMM d, h:mm a')}</TableCell>
                                                <TableCell>
                                                    <Button size="sm" onClick={() => handleTaskComplete(task.id)}>Mark Complete</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* STAFF STATS TAB */}
                <TabsContent value="staff" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Staff Performance</CardTitle>
                            <CardDescription>Overview of housekeeping tasks by staff member</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground opacity-50">
                                Staff performance metrics and history will appear here.
                                (Requires full Task History implementation)
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Update Status Modal */}
            <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Update Room Status</DialogTitle>
                        <DialogDescription>
                            Change housekeeping status for Room {selectedRoom?.roomNumber}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'DIRTY', label: 'Dirty', color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' },
                                { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' },
                                { id: 'CLEAN', label: 'Clean', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' },
                                { id: 'INSPECTED', label: 'Inspected', color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
                                { id: 'OUT_OF_ORDER', label: 'Out of Order', color: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setNewStatus(opt.id)}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${newStatus === opt.id
                                        ? 'ring-2 ring-primary ring-offset-2 ' + opt.color
                                        : opt.color
                                        }`}
                                >
                                    {getStatusIcon(opt.id)} {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleStatusUpdate} disabled={processing}>
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
