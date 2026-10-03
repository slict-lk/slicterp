"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Search, Mail, Filter } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";

export default function InquiriesPage() {
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const fetchInquiries = async () => {
        try {
            const res = await fetch("/api/hotel/contact");
            if (res.ok) {
                const data = await res.json();
                setInquiries(data);
            }
        } catch (error) {
            console.error("Error fetching inquiries:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInquiries();
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/hotel/contact/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                toast.success("Status updated");
                fetchInquiries(); // Refresh list
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            toast.error("Something went wrong");
        }
    };

    const filteredInquiries = inquiries.filter((inquiry) => {
        const matchesSearch =
            inquiry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inquiry.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inquiry.subject?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || inquiry.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inquiries</h1>
                    <p className="text-muted-foreground">Manage guest messages and contact requests.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Messages</CardTitle>
                    <div className="flex items-center gap-4 py-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search name, email, or subject..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="NEW">New</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="RESOLVED">Resolved</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sender</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInquiries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No inquiries found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredInquiries.map((inquiry) => (
                                            <TableRow key={inquiry.id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{inquiry.name}</span>
                                                        <span className="text-xs text-muted-foreground">{inquiry.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col max-w-[300px]">
                                                        <span className="font-medium truncate">{inquiry.subject}</span>
                                                        <span className="text-xs text-muted-foreground truncate">{inquiry.message}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(inquiry.createdAt), "MMM dd, yyyy HH:mm")}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        inquiry.status === 'NEW' ? 'destructive' :
                                                            inquiry.status === 'RESOLVED' ? 'default' : 'secondary'
                                                    }>
                                                        {inquiry.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Select
                                                        defaultValue={inquiry.status}
                                                        onValueChange={(val) => updateStatus(inquiry.id, val)}
                                                    >
                                                        <SelectTrigger className="w-[130px] h-8 ml-auto">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="NEW">New</SelectItem>
                                                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
