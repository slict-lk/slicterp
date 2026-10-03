"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
    Bed, Users, Plus, Edit, Trash2, LayoutGrid,
    ChevronDown, ChevronRight, Image as ImageIcon,
    DollarSign, Sparkles, Save, Loader2, Search,
    Building2, Hash, Layers, BarChart3, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { RoomImages } from "@/components/hotel/room-images";
import { AmenitiesSelector } from "@/components/hotel/amenities-selector";
import { useSettings } from "@/components/providers/SettingsProvider";

// ─── Types ───────────────────────────────────────────────────────────
interface RoomType {
    id: string;
    name: string;
    description: string | null;
    basePrice: number;
    maxOccupancy: number;
    amenities: string[];
    images: string[];
    bedType: string | null;
    sizeSqM: number | null;
    rooms: HotelRoom[];
    _count: { rooms: number };
}

interface HotelRoom {
    id: string;
    roomNumber: string;
    floor: number | null;
    status: string;
    roomTypeId: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────
const BED_TYPES = [
    { value: "Single", label: "Single Bed" },
    { value: "Twin", label: "Twin Beds" },
    { value: "Double", label: "Double Bed" },
    { value: "Queen", label: "Queen Bed" },
    { value: "King", label: "King Bed" },
    { value: "Bunk", label: "Bunk Beds" },
];

const STATUS_STYLES: Record<string, string> = {
    AVAILABLE: "bg-emerald-100 text-emerald-700 border-emerald-200",
    OCCUPIED: "bg-red-100 text-red-700 border-red-200",
    RESERVED: "bg-purple-100 text-purple-700 border-purple-200",
    MAINTENANCE: "bg-amber-100 text-amber-700 border-amber-200",
    CLEANING: "bg-sky-100 text-sky-700 border-sky-200",
    DIRTY: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

// ─── Component ───────────────────────────────────────────────────────
export default function RoomManagementPage() {
    const { data: session } = useSession();
    const { settings } = useSettings();
    const currency = settings.currency || "$";
    const tenantId = (session?.user as unknown as { tenantId?: string })?.tenantId;

    // Data
    const [categories, setCategories] = useState<RoomType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Selection
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // Category Form Dialog
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<RoomType | null>(null);
    const [categoryForm, setCategoryForm] = useState({
        name: "",
        description: "",
        basePrice: "",
        maxOccupancy: "2",
        bedType: "Queen",
        sizeSqM: "",
        amenities: [] as string[],
        images: [] as string[],
    });
    const [savingCategory, setSavingCategory] = useState(false);

    // Unit Add
    const [addingUnit, setAddingUnit] = useState(false);
    const [newUnitNumber, setNewUnitNumber] = useState("");
    const [newUnitFloor, setNewUnitFloor] = useState("1");
    const [savingUnit, setSavingUnit] = useState(false);

    // Unit Edit Dialog (Overrides)
    const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<HotelRoom | null>(null);
    const [unitForm, setUnitForm] = useState({
        roomNumber: "",
        floor: "",
        status: "AVAILABLE",
        description: "",
        images: [] as string[],
    });
    const [savingUnitOverride, setSavingUnitOverride] = useState(false);

    // Delete
    const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "unit"; id: string; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // ─── Data Fetching ───────────────────────────────────────────────
    const fetchCategories = async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/hotel/room-types?tenantId=${tenantId}`);
            if (res.ok) {
                const data: RoomType[] = await res.json();
                setCategories(data);
                // Auto-select first category if none selected
                if (!selectedCategoryId && data.length > 0) {
                    setSelectedCategoryId(data[0].id);
                }
            }
        } catch {
            toast.error("Failed to load room data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tenantId) fetchCategories();
    }, [tenantId]);

    // ─── Derived Data ────────────────────────────────────────────────
    const selectedCategory = categories.find(c => c.id === selectedCategoryId) || null;

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalRooms = categories.reduce((sum, c) => sum + (c.rooms?.length || 0), 0);
    const availableRooms = categories.reduce(
        (sum, c) => sum + (c.rooms?.filter(r => r.status === "AVAILABLE").length || 0), 0
    );
    const occupiedRooms = categories.reduce(
        (sum, c) => sum + (c.rooms?.filter(r => r.status === "OCCUPIED" || r.status === "RESERVED").length || 0), 0
    );

    // ─── Category CRUD ──────────────────────────────────────────────
    const openCreateCategory = () => {
        setEditingCategory(null);
        setCategoryForm({
            name: "", description: "", basePrice: "", maxOccupancy: "2",
            bedType: "Queen", sizeSqM: "", amenities: [], images: [],
        });
        setIsCategoryDialogOpen(true);
    };

    const openEditCategory = (cat: RoomType) => {
        setEditingCategory(cat);
        setCategoryForm({
            name: cat.name,
            description: cat.description || "",
            basePrice: cat.basePrice.toString(),
            maxOccupancy: cat.maxOccupancy.toString(),
            bedType: cat.bedType || "Queen",
            sizeSqM: cat.sizeSqM?.toString() || "",
            amenities: cat.amenities || [],
            images: cat.images || [],
        });
        setIsCategoryDialogOpen(true);
    };

    const handleSaveCategory = async () => {
        if (!tenantId) return;
        setSavingCategory(true);
        try {
            const payload = {
                tenantId,
                name: categoryForm.name,
                description: categoryForm.description || null,
                basePrice: parseFloat(categoryForm.basePrice),
                maxOccupancy: parseInt(categoryForm.maxOccupancy),
                bedType: categoryForm.bedType,
                sizeSqM: categoryForm.sizeSqM ? parseFloat(categoryForm.sizeSqM) : null,
                amenities: categoryForm.amenities,
                images: categoryForm.images,
            };

            const url = editingCategory
                ? `/api/hotel/room-types/${editingCategory.id}`
                : "/api/hotel/room-types";
            const method = editingCategory ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to save");
            }

            toast.success(editingCategory ? "Category updated" : "Category created");
            setIsCategoryDialogOpen(false);
            await fetchCategories();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Error saving category";
            toast.error(message);
        } finally {
            setSavingCategory(false);
        }
    };

    // ─── Unit CRUD ───────────────────────────────────────────────────
    const handleAddUnit = async () => {
        if (!tenantId || !selectedCategoryId || !newUnitNumber.trim()) return;
        setSavingUnit(true);
        try {
            const res = await fetch("/api/hotel/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenantId,
                    roomNumber: newUnitNumber.trim(),
                    roomTypeId: selectedCategoryId,
                    floor: parseInt(newUnitFloor) || 1,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to add room");
            }

            toast.success(`Room ${newUnitNumber} created`);
            setNewUnitNumber("");
            setNewUnitFloor("1");
            setAddingUnit(false);
            await fetchCategories();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Error adding room";
            toast.error(message);
        } finally {
            setSavingUnit(false);
        }
    };

    const openEditUnit = (room: HotelRoom) => {
        setEditingUnit(room);
        setUnitForm({
            roomNumber: room.roomNumber,
            floor: room.floor?.toString() || "1",
            status: room.status,
            description: (room as any).description || "",
            images: (room as any).images || [],
        });
        setIsUnitDialogOpen(true);
    };

    const handleSaveUnitOverride = async () => {
        if (!tenantId || !editingUnit) return;
        setSavingUnitOverride(true);
        try {
            const res = await fetch(`/api/hotel/rooms/${editingUnit.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomNumber: unitForm.roomNumber,
                    floor: parseInt(unitForm.floor) || 1,
                    status: unitForm.status,
                    description: unitForm.description || null,
                    images: unitForm.images,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to update room");
            }

            toast.success(`Room ${unitForm.roomNumber} updated`);
            setIsUnitDialogOpen(false);
            await fetchCategories();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Error updating room";
            toast.error(message);
        } finally {
            setSavingUnitOverride(false);
        }
    };

    // ─── Delete ──────────────────────────────────────────────────────
    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const url = deleteTarget.type === "category"
                ? `/api/hotel/room-types/${deleteTarget.id}`
                : `/api/hotel/rooms/${deleteTarget.id}`;

            const res = await fetch(url, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to delete");
            }

            toast.success(`${deleteTarget.type === "category" ? "Category" : "Room"} deleted`);
            if (deleteTarget.type === "category" && deleteTarget.id === selectedCategoryId) {
                setSelectedCategoryId(null);
            }
            setDeleteTarget(null);
            await fetchCategories();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Error deleting";
            toast.error(message);
        } finally {
            setDeleting(false);
        }
    };

    // ─── Loading State ───────────────────────────────────────────────
    if (loading && categories.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // ─── Render ──────────────────────────────────────────────────────
    return (
        <div className="container mx-auto py-6 max-w-[1400px] space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Room Management</h1>
                    <p className="text-muted-foreground mt-1">Manage room categories and inventory in one place</p>
                </div>
                <Button onClick={openCreateCategory} size="lg" className="gap-2">
                    <Plus className="h-5 w-5" /> New Category
                </Button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <Layers className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{categories.length}</p>
                            <p className="text-xs text-muted-foreground">Categories</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100">
                            <Hash className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalRooms}</p>
                            <p className="text-xs text-muted-foreground">Total Rooms</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100">
                            <Building2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{availableRooms}</p>
                            <p className="text-xs text-muted-foreground">Available</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100">
                            <BarChart3 className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0}%
                            </p>
                            <p className="text-xs text-muted-foreground">Occupancy</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Master-Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
                {/* ─── Left Panel: Category List ──────────────────────── */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search categories..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <ScrollArea className="h-[560px]">
                        <div className="space-y-2 pr-2">
                            {filteredCategories.map(cat => (
                                <Card
                                    key={cat.id}
                                    className={cn(
                                        "cursor-pointer transition-all hover:shadow-md border-2",
                                        selectedCategoryId === cat.id
                                            ? "border-primary bg-primary/5 shadow-md"
                                            : "border-transparent hover:border-muted-foreground/20"
                                    )}
                                    onClick={() => setSelectedCategoryId(cat.id)}
                                >
                                    <CardContent className="p-3">
                                        <div className="flex items-start gap-3">
                                            {/* Thumbnail */}
                                            <div className="h-14 w-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden border">
                                                {cat.images?.[0] ? (
                                                    <img src={cat.images[0]} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center">
                                                        <Bed className="h-6 w-6 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold truncate">{cat.name}</h3>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                                    <span className="font-medium text-foreground">
                                                        {currency}{cat.basePrice}
                                                    </span>
                                                    <span>·</span>
                                                    <span className="flex items-center gap-0.5">
                                                        <Users className="h-3 w-3" /> {cat.maxOccupancy}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {cat.rooms?.length || 0} rooms
                                                    </Badge>
                                                    {cat.rooms?.filter(r => r.status === "AVAILABLE").length > 0 && (
                                                        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                                                            {cat.rooms.filter(r => r.status === "AVAILABLE").length} free
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {filteredCategories.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <LayoutGrid className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">No categories found</p>
                                    <p className="text-sm mt-1">Create your first room category to get started.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* ─── Right Panel: Category Detail ──────────────────── */}
                <div className="lg:col-span-8 xl:col-span-9">
                    {selectedCategory ? (
                        <Card className="h-full">
                            {/* Category Header */}
                            <CardHeader className="border-b">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden border flex-shrink-0">
                                            {selectedCategory.images?.[0] ? (
                                                <img src={selectedCategory.images[0]} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center">
                                                    <Bed className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl">{selectedCategory.name}</CardTitle>
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-md">
                                                {selectedCategory.description || "No description"}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                                                <Badge variant="outline" className="gap-1">
                                                    <DollarSign className="h-3 w-3" />
                                                    {currency}{selectedCategory.basePrice}/night
                                                </Badge>
                                                <Badge variant="outline" className="gap-1">
                                                    <Users className="h-3 w-3" />
                                                    Max {selectedCategory.maxOccupancy}
                                                </Badge>
                                                {selectedCategory.bedType && (
                                                    <Badge variant="outline" className="gap-1">
                                                        <Bed className="h-3 w-3" />
                                                        {selectedCategory.bedType}
                                                    </Badge>
                                                )}
                                                {selectedCategory.sizeSqM && (
                                                    <Badge variant="outline">
                                                        {selectedCategory.sizeSqM} m²
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditCategory(selectedCategory)}
                                            className="gap-1"
                                        >
                                            <Edit className="h-4 w-4" /> Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive gap-1"
                                            onClick={() => setDeleteTarget({
                                                type: "category",
                                                id: selectedCategory.id,
                                                name: selectedCategory.name,
                                            })}
                                        >
                                            <Trash2 className="h-4 w-4" /> Delete
                                        </Button>
                                    </div>
                                </div>

                                {/* Amenities */}
                                {selectedCategory.amenities.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-4">
                                        {selectedCategory.amenities.map(a => (
                                            <Badge key={a} variant="secondary" className="text-xs">
                                                {a}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardHeader>

                            {/* Units Table */}
                            <CardContent className="p-0">
                                <div className="p-4 flex items-center justify-between border-b bg-muted/30">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Hash className="h-4 w-4" />
                                        Room Units ({selectedCategory.rooms?.length || 0})
                                    </h3>
                                    <Button
                                        size="sm"
                                        onClick={() => setAddingUnit(true)}
                                        className="gap-1"
                                    >
                                        <Plus className="h-4 w-4" /> Add Room
                                    </Button>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Room Number</TableHead>
                                            <TableHead className="w-[100px]">Floor</TableHead>
                                            <TableHead className="w-[140px]">Status</TableHead>
                                            <TableHead className="text-right w-[100px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedCategory.rooms?.map(room => (
                                            <TableRow key={room.id}>
                                                <TableCell className="font-bold text-base">{room.roomNumber}</TableCell>
                                                <TableCell>Floor {room.floor || "-"}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-xs font-medium",
                                                            STATUS_STYLES[room.status] || "bg-gray-100 text-gray-700"
                                                        )}
                                                    >
                                                        {room.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => openEditUnit(room)}
                                                        title="Edit Unit Overrides"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => setDeleteTarget({
                                                            type: "unit",
                                                            id: room.id,
                                                            name: `Room ${room.roomNumber}`,
                                                        })}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {/* Inline Add Row */}
                                        {addingUnit && (
                                            <TableRow className="bg-primary/5">
                                                <TableCell>
                                                    <Input
                                                        placeholder="e.g. 101"
                                                        value={newUnitNumber}
                                                        onChange={e => setNewUnitNumber(e.target.value)}
                                                        className="h-9"
                                                        autoFocus
                                                        onKeyDown={e => {
                                                            if (e.key === "Enter") handleAddUnit();
                                                            if (e.key === "Escape") setAddingUnit(false);
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        placeholder="1"
                                                        value={newUnitFloor}
                                                        onChange={e => setNewUnitFloor(e.target.value)}
                                                        className="h-9 w-20"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                                                        AVAILABLE
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            onClick={handleAddUnit}
                                                            disabled={savingUnit || !newUnitNumber.trim()}
                                                            className="h-8"
                                                        >
                                                            {savingUnit ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Save className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8"
                                                            onClick={() => setAddingUnit(false)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {/* Empty State */}
                                        {(!selectedCategory.rooms || selectedCategory.rooms.length === 0) && !addingUnit && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                                    <Bed className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                                    <p className="font-medium">No rooms in this category</p>
                                                    <p className="text-sm mt-1">Click &quot;Add Room&quot; to create physical room units.</p>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="h-full flex items-center justify-center">
                            <div className="text-center text-muted-foreground py-20">
                                <LayoutGrid className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                <h3 className="text-xl font-medium">Select a Category</h3>
                                <p className="text-sm mt-2 max-w-sm mx-auto">
                                    Choose a room category from the left panel to view and manage its room units,
                                    or create a new category to get started.
                                </p>
                                <Button onClick={openCreateCategory} className="mt-6 gap-2">
                                    <Plus className="h-4 w-4" /> Create Category
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* ─── Category Form Dialog ──────────────────────────────── */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            {editingCategory ? "Edit Category" : "Create Room Category"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? "Update the category details. Changes will apply to all rooms in this category on the website."
                                : "Define a new room category. This will appear as a room type on your public website."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Basic Info */}
                        <section>
                            <div className="flex items-center gap-2 mb-3">
                                <Bed className="h-4 w-4 text-muted-foreground" />
                                <h4 className="font-semibold">Basic Information</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label>Category Name *</Label>
                                    <Input
                                        value={categoryForm.name}
                                        onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. Deluxe Ocean View"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Bed Type</Label>
                                    <Select
                                        value={categoryForm.bedType}
                                        onValueChange={v => setCategoryForm(f => ({ ...f, bedType: v }))}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {BED_TYPES.map(t => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Room Size (m²)</Label>
                                    <Input
                                        type="number"
                                        value={categoryForm.sizeSqM}
                                        onChange={e => setCategoryForm(f => ({ ...f, sizeSqM: e.target.value }))}
                                        placeholder="e.g. 45"
                                    />
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Pricing & Capacity */}
                        <section>
                            <div className="flex items-center gap-2 mb-3">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <h4 className="font-semibold">Pricing & Capacity</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Base Price (per night) *</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">{currency}</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="pl-10"
                                            value={categoryForm.basePrice}
                                            onChange={e => setCategoryForm(f => ({ ...f, basePrice: e.target.value }))}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Occupancy *</Label>
                                    <Select
                                        value={categoryForm.maxOccupancy}
                                        onValueChange={v => setCategoryForm(f => ({ ...f, maxOccupancy: v }))}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                                                <SelectItem key={n} value={n.toString()}>
                                                    {n} {n === 1 ? "Guest" : "Guests"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Description */}
                        <section>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={categoryForm.description}
                                    onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Describe the room features, view, special amenities..."
                                    rows={3}
                                />
                            </div>
                        </section>

                        <Separator />

                        {/* Images */}
                        <section>
                            <div className="flex items-center gap-2 mb-3">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                <h4 className="font-semibold">Images</h4>
                            </div>
                            <RoomImages
                                value={categoryForm.images}
                                onChange={images => setCategoryForm(f => ({ ...f, images }))}
                                maxImages={10}
                            />
                        </section>

                        <Separator />

                        {/* Amenities */}
                        <section>
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="h-4 w-4 text-muted-foreground" />
                                <h4 className="font-semibold">Amenities</h4>
                            </div>
                            <AmenitiesSelector
                                value={categoryForm.amenities}
                                onChange={amenities => setCategoryForm(f => ({ ...f, amenities }))}
                            />
                        </section>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveCategory}
                            disabled={savingCategory || !categoryForm.name || !categoryForm.basePrice}
                        >
                            {savingCategory ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {editingCategory ? "Update Category" : "Create Category"}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Unit Edit Dialog (Overrides) ─────────────────────── */}
            <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Room {unitForm.roomNumber}</DialogTitle>
                        <DialogDescription>
                            Customize this specific physical room. Leave fields blank to use category defaults.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Room Number</Label>
                                <Input
                                    value={unitForm.roomNumber}
                                    onChange={e => setUnitForm(f => ({ ...f, roomNumber: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Floor</Label>
                                <Input
                                    type="number"
                                    value={unitForm.floor}
                                    onChange={e => setUnitForm(f => ({ ...f, floor: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={unitForm.status}
                                onValueChange={v => setUnitForm(f => ({ ...f, status: v }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="AVAILABLE">Available</SelectItem>
                                    <SelectItem value="OCCUPIED">Occupied</SelectItem>
                                    <SelectItem value="RESERVED">Reserved</SelectItem>
                                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                    <SelectItem value="CLEANING">Cleaning</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator />

                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-blue-500" />
                                <h4 className="font-semibold">Boutique Overrides</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Upload specific physical photos of this room if it differs from the standard category photos.
                            </p>

                            <div className="space-y-2">
                                <Label>Unit Description Override</Label>
                                <Textarea
                                    value={unitForm.description}
                                    onChange={e => setUnitForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Leave blank to use category description..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Unit Image Overrides</Label>
                                <RoomImages
                                    value={unitForm.images}
                                    onChange={images => setUnitForm(f => ({ ...f, images }))}
                                    maxImages={5}
                                />
                            </div>
                        </section>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUnitDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveUnitOverride} disabled={savingUnitOverride}>
                            {savingUnitOverride ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" /> Save Overrides</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Delete Confirmation ───────────────────────────────── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget?.type === "category"
                                ? "This will permanently delete the category. You cannot delete a category that still has rooms assigned to it."
                                : "This will permanently remove this room from the system. Any future bookings for this room will need to be reassigned."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
