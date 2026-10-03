"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ExperienceForm } from "@/components/hotel/ExperienceForm";

export default function EditExperiencePage() {
    const params = useParams();
    const [experience, setExperience] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExperience = async () => {
            try {
                const res = await fetch(`/api/hotel/experiences/${params.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setExperience(data);
                }
            } catch (error) {
                console.error("Error fetching experience:", error);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchExperience();
        }
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!experience) {
        return <div>Experience not found</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Edit Experience</h2>
            </div>
            <div className="flex-1 space-y-4">
                <ExperienceForm initialData={experience} />
            </div>
        </div>
    );
}
