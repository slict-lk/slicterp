'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle, Smartphone } from 'lucide-react';
import { searchCompatibleParts } from '@/lib/actions/search';
import { VehicleSelector } from './VehicleSelector';

export default function FitmentSearchManager() {
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [parts, setParts] = useState<any[]>([]);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        if (!selectedVehicle) return;

        setLoading(true);
        try {
            const results = await searchCompatibleParts({
                make: selectedVehicle.make,
                model: selectedVehicle.model,
                year: selectedVehicle.yearStart.toString()
            });
            setParts(results);
            setSearched(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-br from-background to-muted/20 border-primary/20 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                        Fitment Search tool
                        <Badge variant="outline" className="ml-auto font-normal text-muted-foreground">
                            Advanced Cross-Reference
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Select a vehicle to find compatible parts. OEM cross-reference included automatically.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full relative z-20">
                            <label className="text-sm font-medium mb-1.5 block">Select Vehicle</label>
                            <VehicleSelector onSelect={setSelectedVehicle} selectedVehicle={selectedVehicle} />
                        </div>

                        <Button
                            onClick={handleSearch}
                            disabled={!selectedVehicle || loading}
                            className="bg-primary hover:bg-primary/90 h-12 px-8 min-w-[120px]"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Search
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {searched && parts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                        No compatible parts found for this vehicle.
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {parts.map((part) => (
                            <Card key={part.id} className="group hover:border-primary/50 transition-colors">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="secondary" className="mb-2">{part.partType}</Badge>
                                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                            <CheckCircle className="w-3 h-3 mr-1" /> Fits Verified
                                        </Badge>
                                    </div>
                                    <CardTitle className="leading-tight">{part.product.name}</CardTitle>
                                    <CardDescription>{part.product.sku}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">OEM Code:</span>
                                            <span className="font-mono bg-muted px-1 rounded">{part.oemCode || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Price:</span>
                                            <span className="font-bold">${part.product.salePrice.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Stock:</span>
                                            <span className={part.product.stockQty > 0 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                                                {part.product.stockQty > 0 ? `${part.product.stockQty} Units` : 'Out of Stock'}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
