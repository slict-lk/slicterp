'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_AMENITIES = [
    { id: 'wifi', label: 'Free WiFi', icon: '📶' },
    { id: 'ac', label: 'Air Conditioning', icon: '❄️' },
    { id: 'tv', label: 'Smart TV', icon: '📺' },
    { id: 'minibar', label: 'Minibar', icon: '🍷' },
    { id: 'safe', label: 'Safe', icon: '🔒' },
    { id: 'hairdryer', label: 'Hair Dryer', icon: '💨' },
    { id: 'iron', label: 'Iron', icon: '👔' },
    { id: 'coffee', label: 'Coffee Maker', icon: '☕' },
    { id: 'balcony', label: 'Balcony', icon: '🌅' },
    { id: 'ocean-view', label: 'Ocean View', icon: '🌊' },
    { id: 'pool', label: 'Pool Access', icon: '🏊' },
    { id: 'gym', label: 'Gym Access', icon: '🏋️' },
    { id: 'spa', label: 'Spa Access', icon: '💆' },
    { id: 'parking', label: 'Free Parking', icon: '🅿️' },
    { id: 'breakfast', label: 'Breakfast Included', icon: '🍳' },
    { id: 'room-service', label: 'Room Service', icon: '🛎️' },
];

interface AmenitiesSelectorProps {
    value: string[];
    onChange: (amenities: string[]) => void;
}

export function AmenitiesSelector({ value = [], onChange }: AmenitiesSelectorProps) {
    const [customInput, setCustomInput] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);

    // Separate default and custom amenities
    const defaultIds = DEFAULT_AMENITIES.map(a => a.label);
    const customAmenities = value.filter(v => !defaultIds.includes(v));

    const toggleAmenity = (amenity: string) => {
        if (value.includes(amenity)) {
            onChange(value.filter(v => v !== amenity));
        } else {
            onChange([...value, amenity]);
        }
    };

    const addCustom = () => {
        if (customInput.trim() && !value.includes(customInput.trim())) {
            onChange([...value, customInput.trim()]);
            setCustomInput('');
            setShowCustomInput(false);
        }
    };

    const removeCustom = (amenity: string) => {
        onChange(value.filter(v => v !== amenity));
    };

    return (
        <div className="space-y-4">
            {/* Default Amenities Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {DEFAULT_AMENITIES.map((amenity) => (
                    <button
                        key={amenity.id}
                        type="button"
                        onClick={() => toggleAmenity(amenity.label)}
                        className={cn(
                            "flex items-center gap-2 p-3 rounded-lg border text-left transition-all",
                            value.includes(amenity.label)
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-background border-border hover:bg-muted"
                        )}
                    >
                        <span className="text-lg">{amenity.icon}</span>
                        <span className="text-sm font-medium">{amenity.label}</span>
                    </button>
                ))}
            </div>

            {/* Custom Amenities */}
            {customAmenities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {customAmenities.map((amenity) => (
                        <Badge
                            key={amenity}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                        >
                            {amenity}
                            <button
                                type="button"
                                onClick={() => removeCustom(amenity)}
                                className="ml-1 hover:text-destructive"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Add Custom */}
            {showCustomInput ? (
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter custom amenity..."
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                        autoFocus
                    />
                    <Button type="button" onClick={addCustom}>Add</Button>
                    <Button type="button" variant="ghost" onClick={() => setShowCustomInput(false)}>
                        Cancel
                    </Button>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomInput(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Amenity
                </Button>
            )}

            <p className="text-xs text-muted-foreground">
                {value.length} amenities selected
            </p>
        </div>
    );
}
