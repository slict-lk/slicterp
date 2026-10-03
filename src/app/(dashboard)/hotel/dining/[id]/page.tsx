"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DiningVenueForm } from "@/components/hotel/DiningVenueForm";

export default function EditDiningVenuePage() {
    const params = useParams();
    const [venue, setVenue] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVenue = async () => {
            try {
                const res = await fetch(`/api/hotel/dining/${params.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setVenue(data);
                }
            } catch (error) {
                console.error("Error fetching venue:", error);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchVenue();
        }
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!venue) {
        return <div>Venue not found</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Edit Venue</h2>
            </div>
            <div className="flex-1 space-y-4">
                <DiningVenueForm initialData={venue} />
            </div>
        </div>
    );
}
