"use client";

import { EventForm } from "@/components/hotel/EventForm";

export default function NewEventPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Create Event</h2>
            </div>
            <div className="flex-1 space-y-4">
                <EventForm />
            </div>
        </div>
    );
}
