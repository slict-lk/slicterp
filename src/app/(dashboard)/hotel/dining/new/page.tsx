"use client";

import { DiningVenueForm } from "@/components/hotel/DiningVenueForm";

export default function NewDiningVenuePage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Create Venue</h2>
            </div>
            <div className="flex-1 space-y-4">
                <DiningVenueForm />
            </div>
        </div>
    );
}
