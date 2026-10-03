'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, ScanBarcode, Car, AlertCircle, Check, Loader2, ArrowLeft } from 'lucide-react';
import { searchPartsFuzzy } from '@/lib/actions/search';
import { VehicleSelector } from '@/components/automotive/VehicleSelector';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShopModePage() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                performSearch(query);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    const performSearch = async (term: string) => {
        setLoading(true);
        try {
            const data = await searchPartsFuzzy(term);
            setResults(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-6 -m-6 md:-m-8 font-sans selection:bg-primary/30">
            {/* Header */}
            {/* Header */}
            <header className="flex items-center justify-between mb-8 sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md py-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <Link href="/automotive">
                        <Button variant="ghost" className="text-neutral-400 hover:text-white hover:bg-white/5 transition-colors pl-2 pr-2 md:pl-4 md:pr-4">
                            <ArrowLeft className="mr-0 md:mr-2 h-6 w-6" /> <span className="hidden md:inline">Back</span>
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            Shop <span className="text-neutral-600">/</span> Mode
                        </h1>
                    </div>
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium border border-emerald-500/20 flex items-center gap-2 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                    <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div className="absolute top-0 left-0 w-full h-full rounded-full bg-emerald-500 animate-ping opacity-75" />
                    </div>
                    <span className="hidden md:inline">System Online</span>
                    <span className="md:hidden">Online</span>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1800px] mx-auto">

                {/* Left Panel: Search & Context */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Big Search Bar with Scanner Effect */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 via-purple-500/50 to-blue-500/50 rounded-2xl opacity-20 group-hover:opacity-40 transition-opacity blur duration-500" />
                        <div className="relative bg-neutral-900/90 rounded-2xl overflow-hidden">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-8 w-8 text-neutral-500 group-focus-within:text-primary transition-colors" />
                            <Input
                                className="h-20 pl-20 pr-20 text-2xl bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-neutral-600"
                                placeholder="Scan VIN or Search Part #..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                            {/* Scanner Line Animation */}
                            <div className="absolute top-0 bottom-0 right-20 w-[1px] bg-primary/0 pointer-events-none">
                                <div className="absolute top-0 w-[40px] h-full right-0 bg-gradient-to-l from-primary/10 to-transparent group-focus-within:opacity-100 opacity-0 transition-opacity" />
                            </div>

                            <Button className="absolute right-4 top-4 h-12 w-12 rounded-xl bg-neutral-800 hover:bg-primary hover:text-primary-foreground transition-all duration-300" size="icon">
                                <ScanBarcode className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>

                    {/* Results Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading ? (
                            <div className="col-span-full py-20 text-center text-neutral-500 flex flex-col items-center gap-4">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="text-lg animate-pulse">Scanning Inventory Database...</p>
                            </div>
                        ) : query.length > 0 && results.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-neutral-600 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/50">
                                <ScanBarcode className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p className="text-xl font-medium">No matches found</p>
                                <p className="text-sm mt-2">Try a different search term or scan again</p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {results.map((item, idx) => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                                    >
                                        <Card
                                            className="bg-neutral-900/50 border-neutral-800 hover:border-primary/50 hover:bg-neutral-900 transition-all duration-300 cursor-pointer group relative overflow-hidden backdrop-blur-sm"
                                        >
                                            <div className="p-5 flex gap-4 relative z-10">
                                                <div className="h-20 w-20 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors shadow-inner">
                                                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">RACK</span>
                                                    <code className="text-lg font-bold font-mono text-white group-hover:text-primary transition-colors">{item.rackLocation || 'N/A'}</code>
                                                </div>
                                                <div className="flex-1 min-w-0 py-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-bold text-lg truncate text-white leading-none group-hover:text-primary transition-colors">{item.product.name}</h3>
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-xs font-mono text-neutral-400 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
                                                            {item.oemCode}
                                                        </span>
                                                        <div className="h-1 w-1 rounded-full bg-neutral-700" />
                                                        <span className={`text-xs font-bold ${item.product.stockQty > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {item.product.stockQty > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-xs text-neutral-500 truncate">
                                                        <div className="flex items-center gap-1.5 bg-neutral-800/50 px-2 py-1 rounded-full">
                                                            <Check className="h-3 w-3 text-emerald-500" />
                                                            <span>Fits: <span className="text-neutral-300">{item.vehicleModels[0] || 'Universal'}</span></span>
                                                            {item.vehicleModels.length > 1 && <span className="text-neutral-500">+{item.vehicleModels.length - 1}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Stock Level Indicator - Vertical Bar */}
                                                <div className="w-1.5 h-full absolute right-0 top-0 bottom-0 bg-neutral-800">
                                                    <div
                                                        className={`w-full absolute bottom-0 transition-all duration-1000 ${item.product.stockQty > 5 ? 'bg-emerald-500' :
                                                            item.product.stockQty > 0 ? 'bg-amber-500' : 'bg-red-500'
                                                            }`}
                                                        style={{ height: `${Math.min((item.product.stockQty / 20) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Hover Glow Effect */}
                                            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {/* Right Panel: Vehicle Context */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-neutral-900 border-neutral-800 h-full">
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Car className="h-5 w-5 text-primary" />
                                    Active Vehicle
                                </h2>
                                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                                    <VehicleSelector onSelect={setSelectedVehicle} selectedVehicle={selectedVehicle} />
                                    {selectedVehicle && (
                                        <div className="mt-4 space-y-2 text-sm text-neutral-400">
                                            <div className="flex justify-between">
                                                <span>Engine:</span>
                                                <span className="text-white font-mono">{selectedVehicle.engine}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Year:</span>
                                                <span className="text-white">{selectedVehicle.yearStart} - {selectedVehicle.yearEnd || 'Present'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-orange-900/10 border border-orange-900/20">
                                <h3 className="text-orange-400 font-bold mb-2 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> Quick Actions
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white h-12">
                                        Scan VIN
                                    </Button>
                                    <Button variant="outline" className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white h-12">
                                        Check Oil
                                    </Button>
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
