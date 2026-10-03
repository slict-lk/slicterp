"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Loader2, Mail, ExternalLink, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

type Quote = {
    id: string;
    createdAt: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    status: string;
    vehicle: {
        id: string;
        make: string;
        model: string;
        year: number;
        stockNumber: string;
        fobPrice: number;
        photos: { url: string }[];
    };
    country: { name: string };
    port: { name: string; shippingMethod: string };
    totalCIF: number | null;
    shippingCost: number | null;
    insuranceCost: number | null;
    inspectionFee: number | null;
    askForPrice: boolean;
};

export default function QuoteRequestsPage() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/vehicle-export/quotes");
            const data = await res.json();
            setQuotes(data);
        } catch {
            toast.error("Failed to load quotes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, []);

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await fetch(`/api/vehicle-export/quotes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            toast.success("Status updated");
            fetchQuotes();
        } catch {
            toast.error("Failed to update status");
        }
    };

    const handleSendQuote = async () => {
        if (!selectedQuote) return;
        try {
            const res = await fetch(`/api/vehicle-export/quotes/${selectedQuote.id}/send-quote`, {
                method: "POST",
            });
            if (!res.ok) throw new Error();
            toast.success("Quote sent via email");
            handleStatusUpdate(selectedQuote.id, "QUOTED");
        } catch {
            toast.error("Failed to send quote");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Quote Requests</h1>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>CIF Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                        ) : quotes.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8">No requests found</TableCell></TableRow>
                        ) : (
                            quotes.map((q) => (
                                <TableRow key={q.id}>
                                    <TableCell>{format(new Date(q.createdAt), "MMM d, yyyy")}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{q.name}</div>
                                        <div className="text-xs text-muted-foreground">{q.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        {q.vehicle.year} {q.vehicle.make} {q.vehicle.model}
                                    </TableCell>
                                    <TableCell>
                                        {q.country.name} - {q.port.name}
                                        <div className="text-xs text-muted-foreground">{q.port.shippingMethod}</div>
                                    </TableCell>
                                    <TableCell className="font-bold">
                                        {q.askForPrice ? "On Request" : `$${q.totalCIF?.toLocaleString()}`}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={q.status} />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="outline" size="sm" onClick={() => setSelectedQuote(q)}>
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Sheet open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
                <SheetContent className="w-[600px] sm:w-[540px] overflow-y-auto">
                    {selectedQuote && (
                        <div className="space-y-6">
                            <SheetHeader>
                                <SheetTitle>Quote Request Details</SheetTitle>
                            </SheetHeader>

                            {/* Customer Info */}
                            <div className="bg-muted p-4 rounded-lg space-y-2">
                                <h3 className="font-semibold">Customer Information</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>Name: {selectedQuote.name}</div>
                                    <div>Phone: {selectedQuote.phone}</div>
                                    <div className="col-span-2">Email: {selectedQuote.email}</div>
                                    <div className="col-span-2">Address: {selectedQuote.address}</div>
                                </div>
                            </div>

                            {/* Vehicle Info */}
                            <div className="flex gap-4 border p-4 rounded-lg">
                                {selectedQuote.vehicle.photos[0] && (
                                    <div className="relative w-24 h-24 flex-shrink-0">
                                        <Image
                                            src={selectedQuote.vehicle.photos[0].url}
                                            alt="Vehicle"
                                            fill
                                            className="object-cover rounded"
                                        />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-lg">
                                        {selectedQuote.vehicle.year} {selectedQuote.vehicle.make} {selectedQuote.vehicle.model}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">Stock #: {selectedQuote.vehicle.stockNumber}</p>
                                    <a
                                        href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001'}/${selectedQuote.vehicle.stockNumber}/vehicles/${selectedQuote.vehicle.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary text-sm flex items-center mt-2 hover:underline"
                                    >
                                        View Vehicle <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                </div>
                            </div>

                            {/* Pricing Breakdown */}
                            <div className="space-y-3 border p-4 rounded-lg">
                                <h3 className="font-semibold">Pricing Breakdown (Snapshot)</h3>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span>FOB Price:</span>
                                        <span>${selectedQuote.vehicle.fobPrice?.toLocaleString() ?? "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Shipping ({selectedQuote.port.shippingMethod}):</span>
                                        <span>{selectedQuote.shippingCost ? `$${selectedQuote.shippingCost}` : "TBD"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Insurance:</span>
                                        <span>{selectedQuote.insuranceCost ? `$${selectedQuote.insuranceCost}` : "TBD"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Inspection:</span>
                                        <span>{selectedQuote.inspectionFee ? `$${selectedQuote.inspectionFee}` : "TBD"}</span>
                                    </div>
                                    <div className="border-t my-2 pt-2 flex justify-between font-bold text-lg">
                                        <span>Total CIF:</span>
                                        <span>{selectedQuote.totalCIF ? `$${selectedQuote.totalCIF.toLocaleString()}` : "Price/Req"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 pt-4">
                                <Button onClick={handleSendQuote} className="w-full">
                                    <Mail className="w-4 h-4 mr-2" /> Send Official Quote Email
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => handleStatusUpdate(selectedQuote.id, "CONTACTED")}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> Mark Contacted
                                    </Button>
                                    <Button variant="outline" className="flex-1" onClick={() => handleStatusUpdate(selectedQuote.id, "CLOSED")}>
                                        Close Request
                                    </Button>
                                </div>
                            </div>

                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDING: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        CONTACTED: "bg-blue-100 text-blue-800 hover:bg-blue-100",
        QUOTED: "bg-green-100 text-green-800 hover:bg-green-100",
        CLOSED: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
}
