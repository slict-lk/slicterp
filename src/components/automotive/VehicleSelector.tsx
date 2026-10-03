'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, CarFront, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { searchVehicles } from '@/lib/actions/search';

// Simple debounce hook
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

interface VehicleSelectorProps {
    onSelect: (vehicle: any) => void;
    selectedVehicle?: any;
}

export function VehicleSelector({ onSelect, selectedVehicle }: VehicleSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [vehicles, setVehicles] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);

    const debouncedSearch = useDebounceValue(search, 300);

    React.useEffect(() => {
        async function fetchVehicles() {
            if (debouncedSearch.length < 2) {
                setVehicles([]);
                return;
            }
            setLoading(true);
            try {
                const results = await searchVehicles(debouncedSearch);
                setVehicles(results);
            } catch (error) {
                console.error('Failed to search vehicles:', error);
                setVehicles([]);
            }
            setLoading(false);
        }
        fetchVehicles();
    }, [debouncedSearch]);

    const handleSelect = (vehicle: any) => {
        onSelect(vehicle);
        setOpen(false);
        setSearch("");
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-12"
                >
                    {selectedVehicle ? (
                        <div className="flex items-center gap-2 text-left">
                            <CarFront className="h-4 w-4 text-primary" />
                            <div className="flex flex-col leading-tight">
                                <span className="font-semibold">{selectedVehicle.yearStart} {selectedVehicle.make} {selectedVehicle.model}</span>
                                <span className="text-xs text-muted-foreground">Engine: {selectedVehicle.engine || 'N/A'}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CarFront className="h-4 w-4" />
                            Select Vehicle...
                        </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0" align="start">
                <div className="flex flex-col">
                    {/* Search Input */}
                    <div className="flex items-center border-b px-3 py-2">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                            placeholder="Search make, model, engine..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border-0 p-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                    </div>

                    {/* Results List */}
                    <div className="max-h-[300px] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Searching...
                            </div>
                        ) : vehicles.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                {search.length < 2 ? 'Type at least 2 characters to search...' : 'No vehicle found.'}
                            </div>
                        ) : (
                            <div className="p-1">
                                {vehicles.map((vehicle) => (
                                    <button
                                        key={vehicle.id}
                                        type="button"
                                        onClick={() => handleSelect(vehicle)}
                                        className={cn(
                                            "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                                            "hover:bg-slate-100 dark:hover:bg-slate-800",
                                            selectedVehicle?.id === vehicle.id && "bg-slate-100 dark:bg-slate-800"
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedVehicle?.id === vehicle.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col text-left">
                                            <span>{vehicle.yearStart} {vehicle.make} {vehicle.model}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {vehicle.engine ? `Engine: ${vehicle.engine}` : 'All Engines'}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
