'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Image as ImageIcon, Maximize2, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VirtualTour {
  id: string;
  title: string;
  description?: string;
  tourType: '360_IMAGE' | 'VIDEO' | 'MATTERPORT' | 'EMBEDDED';
  url: string;
  embedCode?: string;
  images: string[];
  thumbnail?: string;
  viewCount: number;
}

interface VirtualTourViewerProps {
  tours: VirtualTour[];
  propertyTitle: string;
}

export function VirtualTourViewer({ tours, propertyTitle }: VirtualTourViewerProps) {
  const [selectedTour, setSelectedTour] = useState<VirtualTour | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [current360Index, setCurrent360Index] = useState(0);

  if (!tours || tours.length === 0) {
    return null;
  }

  const handleTourClick = async (tour: VirtualTour) => {
    setSelectedTour(tour);
    setIsFullscreen(true);
    setCurrent360Index(0);

    // Track view
    try {
      await fetch('/api/properties/virtual-tours/view', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tour.id }),
      });
    } catch (error) {
      console.error('Failed to track tour view:', error);
    }
  };

  const renderTourContent = (tour: VirtualTour) => {
    switch (tour.tourType) {
      case 'VIDEO':
        return (
          <div className="aspect-video w-full">
            <video
              src={tour.url}
              controls
              className="w-full h-full rounded-lg"
              autoPlay={isFullscreen}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'MATTERPORT':
      case 'EMBEDDED':
        return tour.embedCode ? (
          <div
            className="aspect-video w-full"
            dangerouslySetInnerHTML={{ __html: tour.embedCode }}
          />
        ) : (
          <iframe
            src={tour.url}
            className="w-full aspect-video rounded-lg"
            allowFullScreen
            title={tour.title}
          />
        );

      case '360_IMAGE':
        return (
          <div className="space-y-4">
            <div className="aspect-video w-full relative">
              <img
                src={tour.images[current360Index] || tour.url}
                alt={`${tour.title} - View ${current360Index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {tour.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrent360Index(index)}
                    className={`w-3 h-3 rounded-full ${
                      index === current360Index
                        ? 'bg-white'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </div>
            {tour.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {tour.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrent360Index(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      index === current360Index
                        ? 'border-primary'
                        : 'border-transparent'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="aspect-video w-full flex items-center justify-center bg-muted rounded-lg">
            <p className="text-muted-foreground">Unsupported tour type</p>
          </div>
        );
    }
  };

  const getTourIcon = (tourType: string) => {
    switch (tourType) {
      case 'VIDEO':
        return <Play className="h-4 w-4" />;
      case '360_IMAGE':
        return <ImageIcon className="h-4 w-4" />;
      default:
        return <Maximize2 className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            Virtual Tours
            <Badge variant="secondary">{tours.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tours.length === 1 ? (
            <div
              className="relative cursor-pointer group"
              onClick={() => handleTourClick(tours[0])}
            >
              <div className="aspect-video w-full rounded-lg overflow-hidden">
                {tours[0].thumbnail ? (
                  <img
                    src={tours[0].thumbnail}
                    alt={tours[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    {getTourIcon(tours[0].tourType)}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                <Button size="lg" variant="secondary">
                  {getTourIcon(tours[0].tourType)}
                  <span className="ml-2">Start Virtual Tour</span>
                </Button>
              </div>
              <div className="mt-2">
                <h4 className="font-semibold">{tours[0].title}</h4>
                {tours[0].description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {tours[0].description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <Tabs defaultValue={tours[0].id}>
              <TabsList className="w-full justify-start overflow-x-auto">
                {tours.map((tour) => (
                  <TabsTrigger key={tour.id} value={tour.id}>
                    {getTourIcon(tour.tourType)}
                    <span className="ml-2">{tour.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {tours.map((tour) => (
                <TabsContent key={tour.id} value={tour.id} className="space-y-4">
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => handleTourClick(tour)}
                  >
                    <div className="aspect-video w-full rounded-lg overflow-hidden">
                      {tour.thumbnail ? (
                        <img
                          src={tour.thumbnail}
                          alt={tour.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          {getTourIcon(tour.tourType)}
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                      <Button size="lg" variant="secondary">
                        {getTourIcon(tour.tourType)}
                        <span className="ml-2">Start Tour</span>
                      </Button>
                    </div>
                  </div>
                  {tour.description && (
                    <p className="text-sm text-muted-foreground">{tour.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{tour.viewCount} views</span>
                    <Badge variant="outline">{tour.tourType.replace('_', ' ')}</Badge>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedTour?.title} - {propertyTitle}
            </DialogTitle>
            {selectedTour?.description && (
              <DialogDescription>{selectedTour.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {selectedTour && renderTourContent(selectedTour)}
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedTour?.viewCount} views
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(selectedTour?.url, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Tab
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

