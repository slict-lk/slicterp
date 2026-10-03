"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, MapPin, Loader2, Utensils, Calendar } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DiningPage() {
    const router = useRouter();
    const [venues, setVenues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchVenues = async () => {
            try {
                const res = await fetch("/api/hotel/dining");
                if (res.ok) {
                    const data = await res.json();
                    setVenues(data);
                }
            } catch (error) {
                console.error("Error fetching venues:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVenues();
    }, []);

    const filteredVenues = venues.filter((venue) =>
        venue.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dining Venues</h1>
                    <p className="text-muted-foreground">Manage your restaurants, bars, and dining areas.</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" asChild>
                        <Link href="/hotel/dining/reservations">
                            <Calendar className="mr-2 h-4 w-4" />
                            View Reservations
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/hotel/dining/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Venue
                        </Link>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Venues</CardTitle>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search venues..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
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
                                        <TableHead>Name</TableHead>
                                        <TableHead>Cuisine</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredVenues.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No venues found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredVenues.map((venue) => (
                                            <TableRow key={venue.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{venue.name}</span>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{venue.description}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{venue.cuisineType || "N/A"}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center text-muted-foreground">
                                                        <MapPin className="mr-1 h-3 w-3" />
                                                        {venue.location || "On-site"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={venue.isFeatured ? "default" : "secondary"}>
                                                        {venue.isFeatured ? "Featured" : "Standard"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/hotel/dining/${venue.id}`}>Edit</Link>
                                                    </Button>
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
