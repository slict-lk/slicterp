"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Search, Calendar as CalendarIcon, Filter } from "lucide-react";
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

export default function EventRegistrationsPage() {
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        const fetchRegistrations = async () => {
            try {
                const res = await fetch("/api/hotel/events/registrations");
                if (res.ok) {
                    const data = await res.json();
                    setRegistrations(data);
                }
            } catch (error) {
                console.error("Error fetching registrations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRegistrations();
    }, []);

    const filteredRegistrations = registrations.filter((reg) => {
        const matchesSearch =
            reg.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.event?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || reg.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Event Registrations</h1>
                    <p className="text-muted-foreground">Manage guest lists for your events.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registrations</CardTitle>
                    <div className="flex items-center gap-4 py-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search guest, email, or event..."
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
                                <SelectItem value="REGISTERED">Registered</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                <SelectItem value="ATTENDED">Attended</SelectItem>
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
                                        <TableHead>Guest</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Attendees</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRegistrations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No registrations found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredRegistrations.map((reg) => (
                                            <TableRow key={reg.id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{reg.guestName}</span>
                                                        <span className="text-xs text-muted-foreground">{reg.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">{reg.event?.name || "Unknown Event"}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>{reg.event?.startDate ? format(new Date(reg.event.startDate), "MMM dd, yyyy") : "N/A"}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Registered: {format(new Date(reg.createdAt), "MMM dd")}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{reg.attendeesCount} ppl</TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        reg.status === 'REGISTERED' ? 'default' :
                                                            reg.status === 'ATTENDED' ? 'outline' :
                                                                reg.status === 'CANCELLED' ? 'destructive' : 'secondary'
                                                    }>
                                                        {reg.status}
                                                    </Badge>
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
