"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Truck, ShieldCheck, FileText, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface OrderLine {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    tax: number;
}

interface SalesOrderV2 {
    id: string;
    orderNumber: string;
    status: string;
    approvalStatus: string;
    fulfillmentStatus: string;
    invoiceStatus: string;
    customerAccountId?: string;
    grandTotal: number;
    currency?: string;
    lines?: OrderLine[];
    approvals?: any[];
    fulfillmentRequests?: any[];
}

export default function SalesOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<SalesOrderV2 | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            loadOrder(params.id as string);
        }
    }, [params.id]);

    const loadOrder = async (id: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/sales/orders/${id}`);
            if (response.ok) {
                const data = await response.json();
                setOrder(data);
            }
        } catch (error) {
            console.error("Failed to load canonical order:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-32 w-full" />
                <div className="grid grid-cols-2 gap-6">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center p-12">
                <h2 className="text-2xl font-bold">Order Not Found</h2>
                <Button variant="link" onClick={() => router.back()}>Return</Button>
            </div>
        );
    }

    const approval = String(order.approvalStatus || "NOT_REQUIRED").toUpperCase();
    const fulfillment = String(order.fulfillmentStatus || "NOT_STARTED").toUpperCase();
    const invoicing = String(order.invoiceStatus || "NOT_INVOICED").toUpperCase();

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => router.push("/sales/orders")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Orders
            </Button>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Order {order.orderNumber}</h1>
                    <div className="flex gap-2 mt-2">
                        <Badge variant="outline">
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            {approval}
                        </Badge>
                        <Badge variant="outline">
                            <Package className="mr-1 h-3 w-3" />
                            {fulfillment}
                        </Badge>
                        <Badge variant="outline">
                            <FileText className="mr-1 h-3 w-3" />
                            {invoicing}
                        </Badge>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Grand Total</p>
                    <p className="text-2xl font-bold">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency || "USD" }).format(order.grandTotal || 0)}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Line Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {order.lines && order.lines.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.lines.map((line) => (
                                        <TableRow key={line.id}>
                                            <TableCell className="font-medium">{line.description || "N/A"}</TableCell>
                                            <TableCell>{line.quantity || 0}</TableCell>
                                            <TableCell>{new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency || "USD" }).format(line.unitPrice || 0)}</TableCell>
                                            <TableCell className="text-right">
                                                {new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency || "USD" }).format(
                                                    (line.quantity || 0) * (line.unitPrice || 0) - (line.discount || 0) + (line.tax || 0)
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center p-4">No lines found.</p>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fulfillment Status</CardTitle>
                            <CardDescription>Inventory reservation and shipping handoff.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {order.fulfillmentRequests && order.fulfillmentRequests.length > 0 ? (
                                <div className="space-y-3">
                                    {order.fulfillmentRequests.map((req, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <Truck className="h-5 w-5 text-slate-500" />
                                                <div>
                                                    <p className="text-sm font-medium">{req.requestNumber || `REQ-${req.id.slice(0, 8)}`}</p>
                                                    <p className="text-xs text-muted-foreground">Status: {String(req.status).toUpperCase()}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline">Inventory Handoff</Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-6 border-dashed border-2 rounded-lg bg-muted/20">
                                    <p className="text-muted-foreground text-sm">No active fulfillment requests.</p>
                                    <Button variant="outline" size="sm" className="mt-4" disabled={approval !== "APPROVED"}>
                                        Request Fulfillment
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Accounting Handoff</CardTitle>
                            <CardDescription>Draft invoices and payment linkage.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center p-6 border-dashed border-2 rounded-lg bg-muted/20">
                                <p className="text-muted-foreground text-sm">Generate invoice draft for accounting.</p>
                                <Button variant="outline" size="sm" className="mt-4" disabled={fulfillment === "NOT_STARTED"}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Draft Invoice
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
