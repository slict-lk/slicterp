"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

type Country = {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
};

type Port = {
    id: string;
    name: string;
    countryId: string;
    shippingMethod: string;
    shippingCost: number | null;
    insuranceCost: number | null;
    inspectionFee: number | null;
    isDefault: boolean;
};

export default function ShippingSetupPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Shipping Setup</h1>
            </div>

            <Tabs defaultValue="countries" className="w-full">
                <TabsList>
                    <TabsTrigger value="countries">Countries</TabsTrigger>
                    <TabsTrigger value="ports">Ports</TabsTrigger>
                </TabsList>

                <TabsContent value="countries" className="mt-4">
                    <CountriesManager />
                </TabsContent>

                <TabsContent value="ports" className="mt-4">
                    <PortsManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function CountriesManager() {
    const [countries, setCountries] = useState<Country[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({ name: "", code: "" });

    const fetchCountries = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/vehicle-export/shipping/countries");
            const data = await res.json();
            setCountries(data);
        } catch (error) {
            toast.error("Failed to load countries");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCountries();
    }, []);

    const handleSubmit = async () => {
        try {
            const res = await fetch("/api/vehicle-export/shipping/countries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (!res.ok) throw new Error();
            toast.success("Country added");
            setIsOpen(false);
            setFormData({ name: "", code: "" });
            fetchCountries();
        } catch {
            toast.error("Failed to add country");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this country?")) return;
        try {
            await fetch(`/api/vehicle-export/shipping/countries/${id}`, { method: "DELETE" });
            toast.success("Country deleted");
            fetchCountries();
        } catch {
            toast.error("Failed to delete");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2" /> Add Country</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add Country</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                            <Input
                                placeholder="Country Name (e.g. Sri Lanka)"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <Input
                                placeholder="ISO Code (e.g. LK)"
                                value={formData.code}
                                maxLength={2}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                            <Button onClick={handleSubmit} className="w-full">Create</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-4">Loading...</TableCell></TableRow>
                        ) : countries.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell>{c.code}</TableCell>
                                <TableCell>{c.name}</TableCell>
                                <TableCell>{c.isActive ? "Active" : "Inactive"}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function PortsManager() {
    const [countries, setCountries] = useState<Country[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string>("");
    const [ports, setPorts] = useState<Port[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        shippingMethod: "RORO",
        shippingCost: "",
        insuranceCost: "",
        inspectionFee: "",
        isDefault: false
    });

    useEffect(() => {
        fetch("/api/vehicle-export/shipping/countries")
            .then(res => res.json())
            .then(data => {
                setCountries(data);
                if (data.length > 0) setSelectedCountry(data[0].id);
            });
    }, []);

    useEffect(() => {
        if (!selectedCountry) return;
        setLoading(true);
        fetch(`/api/vehicle-export/shipping/ports?countryId=${selectedCountry}`)
            .then(res => res.json())
            .then(setPorts)
            .finally(() => setLoading(false));
    }, [selectedCountry]);

    const handleSubmit = async () => {
        try {
            const res = await fetch("/api/vehicle-export/shipping/ports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    countryId: selectedCountry,
                    shippingCost: formData.shippingCost ? Number(formData.shippingCost) : null,
                    insuranceCost: formData.insuranceCost ? Number(formData.insuranceCost) : null,
                    inspectionFee: formData.inspectionFee ? Number(formData.inspectionFee) : null,
                }),
            });
            if (!res.ok) throw new Error();
            toast.success("Port added");
            setIsOpen(false);
            // Refresh
            fetch(`/api/vehicle-export/shipping/ports?countryId=${selectedCountry}`)
                .then(res => res.json())
                .then(setPorts);
        } catch {
            toast.error("Failed to add port");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this port?")) return;
        await fetch(`/api/vehicle-export/shipping/ports/${id}`, { method: "DELETE" });
        setPorts(ports.filter(p => p.id !== id));
        toast.success("Port deleted");
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <select
                    className="border rounded px-3 py-2 w-64"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                >
                    {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={!selectedCountry}><Plus className="w-4 h-4 mr-2" /> Add Port</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add Port</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                            <Input
                                placeholder="Port Name (e.g. Hambantota)"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <select
                                className="w-full border rounded px-3 py-2"
                                value={formData.shippingMethod}
                                onChange={(e) => setFormData({ ...formData, shippingMethod: e.target.value })}
                            >
                                <option value="RORO">RORO</option>
                                <option value="CONTAINER">Container</option>
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                                <Input type="number" placeholder="Shipping Cost ($)" value={formData.shippingCost} onChange={e => setFormData({ ...formData, shippingCost: e.target.value })} />
                                <Input type="number" placeholder="Insurance Cost ($)" value={formData.insuranceCost} onChange={e => setFormData({ ...formData, insuranceCost: e.target.value })} />
                                <Input type="number" placeholder="Inspection Fee ($)" value={formData.inspectionFee} onChange={e => setFormData({ ...formData, inspectionFee: e.target.value })} />
                            </div>
                            <p className="text-xs text-muted-foreground">Leave costs blank to show "Ask for Price"</p>

                            <Button onClick={handleSubmit} className="w-full">Create</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Shipping</TableHead>
                            <TableHead>Insurance</TableHead>
                            <TableHead>Inspection</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-4">Loading...</TableCell></TableRow>
                        ) : ports.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-4">No ports found</TableCell></TableRow>
                        ) : (
                            ports.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.name}</TableCell>
                                    <TableCell>{p.shippingMethod}</TableCell>
                                    <TableCell>{p.shippingCost ? `$${p.shippingCost}` : "On Request"}</TableCell>
                                    <TableCell>{p.insuranceCost ? `$${p.insuranceCost}` : "-"}</TableCell>
                                    <TableCell>{p.inspectionFee ? `$${p.inspectionFee}` : "-"}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
