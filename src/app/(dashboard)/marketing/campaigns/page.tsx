'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Plus } from 'lucide-react';

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState([]);

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const res = await fetch('/api/marketing/campaigns');
                if (res.ok) {
                    const data = await res.json();
                    setCampaigns(data);
                }
            } catch (error) {
                console.error('Failed to fetch campaigns:', error);
            }
        };
        fetchCampaigns();
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Marketing Campaigns</h1>
                    <p className="text-gray-600">Manage marketing campaigns and promotions</p>
                </div>
                <Button><Plus className="h-4 w-4 mr-2" />New Campaign</Button>
            </div>
            <div className="grid gap-4">
                {campaigns.map((campaign: any) => (
                    <Card key={campaign.id}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-4">
                                    <div className="h-12 w-12 rounded-full bg-pink-100 flex items-center justify-center">
                                        <Megaphone className="h-6 w-6 text-pink-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{campaign.name}</h3>
                                        <p className="text-sm text-gray-500">{campaign.channel} • {campaign.audience} recipients</p>
                                    </div>
                                </div>
                                <Badge>{campaign.status}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
