'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MapPin,
  TrendingUp,
  Users,
  AlertTriangle,
  School,
  ShoppingCart,
  Train,
  Coffee,
  Hospital,
  DollarSign,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NeighborhoodInsightsProps {
  insights: {
    walkScore?: number;
    transitScore?: number;
    bikeScore?: number;
    medianIncome?: number;
    populationCount?: number;
    medianAge?: number;
    crimeRate?: 'LOW' | 'MODERATE' | 'HIGH';
    schools?: Array<{
      name: string;
      rating: number;
      distance: number;
      type: string;
    }>;
    amenities?: Array<{
      name: string;
      category: string;
      distance: number;
    }>;
    pointsOfInterest?: Array<{
      name: string;
      category: string;
      distance: number;
    }>;
    publicTransport?: Array<{
      type: string;
      name: string;
      distance: number;
    }>;
  };
}

export function NeighborhoodInsights({ insights }: NeighborhoodInsightsProps) {
  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-400';
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score?: number) => {
    if (!score) return 'N/A';
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 50) return 'Good';
    if (score >= 25) return 'Fair';
    return 'Poor';
  };

  const getCrimeRateColor = (rate?: string): "secondary" | "destructive" | "default" | "outline" => {
    switch (rate) {
      case 'LOW':
        return 'default';
      case 'MODERATE':
        return 'secondary';
      case 'HIGH':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('food') || cat.includes('restaurant')) return <Coffee className="h-4 w-4" />;
    if (cat.includes('shop') || cat.includes('store')) return <ShoppingCart className="h-4 w-4" />;
    if (cat.includes('health') || cat.includes('medical')) return <Hospital className="h-4 w-4" />;
    if (cat.includes('school') || cat.includes('education')) return <School className="h-4 w-4" />;
    return <MapPin className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Neighborhood Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Walkability Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.walkScore !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Walk Score</span>
                <Badge variant="outline">{getScoreLabel(insights.walkScore)}</Badge>
              </div>
              <Progress value={insights.walkScore} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {insights.walkScore}/100 - Daily errands {insights.walkScore >= 70 ? 'do not' : 'may'} require a car
              </p>
            </div>
          )}

          {insights.transitScore !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Transit Score</span>
                <Badge variant="outline">{getScoreLabel(insights.transitScore)}</Badge>
              </div>
              <Progress value={insights.transitScore} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {insights.transitScore}/100 - {insights.transitScore >= 70 ? 'Excellent' : 'Limited'} public transit
              </p>
            </div>
          )}

          {insights.bikeScore !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bike Score</span>
                <Badge variant="outline">{getScoreLabel(insights.bikeScore)}</Badge>
              </div>
              <Progress value={insights.bikeScore} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {insights.bikeScore}/100 - {insights.bikeScore >= 70 ? 'Very' : 'Somewhat'} bikeable
              </p>
            </div>
          )}
        </div>

        {/* Demographics & Safety */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
          {insights.medianIncome && (
            <div className="flex items-start gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Median Income</p>
                <p className="text-lg font-bold">
                  ${(insights.medianIncome / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          )}

          {insights.populationCount && (
            <div className="flex items-start gap-2">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Population</p>
                <p className="text-lg font-bold">
                  {insights.populationCount.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {insights.medianAge && (
            <div className="flex items-start gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Median Age</p>
                <p className="text-lg font-bold">{insights.medianAge} years</p>
              </div>
            </div>
          )}

          {insights.crimeRate && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Crime Rate</p>
                <Badge variant={getCrimeRateColor(insights.crimeRate)}>
                  {insights.crimeRate}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="schools" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="schools">
              <School className="h-4 w-4 mr-2" />
              Schools
            </TabsTrigger>
            <TabsTrigger value="amenities">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Amenities
            </TabsTrigger>
            <TabsTrigger value="transport">
              <Train className="h-4 w-4 mr-2" />
              Transit
            </TabsTrigger>
            <TabsTrigger value="poi">
              <MapPin className="h-4 w-4 mr-2" />
              POI
            </TabsTrigger>
          </TabsList>

          {/* Schools Tab */}
          <TabsContent value="schools" className="space-y-3">
            {insights.schools && insights.schools.length > 0 ? (
              insights.schools.map((school, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{school.name}</p>
                    <p className="text-sm text-muted-foreground">{school.type}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{school.rating}/10</Badge>
                      <span className="text-sm text-muted-foreground">
                        {school.distance.toFixed(1)} mi
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No school data available</p>
            )}
          </TabsContent>

          {/* Amenities Tab */}
          <TabsContent value="amenities" className="space-y-3">
            {insights.amenities && insights.amenities.length > 0 ? (
              insights.amenities.map((amenity, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    {getCategoryIcon(amenity.category)}
                    <div>
                      <p className="font-medium">{amenity.name}</p>
                      <p className="text-sm text-muted-foreground">{amenity.category}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {amenity.distance.toFixed(1)} mi
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No amenities data available</p>
            )}
          </TabsContent>

          {/* Public Transport Tab */}
          <TabsContent value="transport" className="space-y-3">
            {insights.publicTransport && insights.publicTransport.length > 0 ? (
              insights.publicTransport.map((transport, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    <Train className="h-4 w-4" />
                    <div>
                      <p className="font-medium">{transport.name}</p>
                      <p className="text-sm text-muted-foreground">{transport.type}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {transport.distance.toFixed(1)} mi
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No transport data available</p>
            )}
          </TabsContent>

          {/* Points of Interest Tab */}
          <TabsContent value="poi" className="space-y-3">
            {insights.pointsOfInterest && insights.pointsOfInterest.length > 0 ? (
              insights.pointsOfInterest.map((poi, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    {getCategoryIcon(poi.category)}
                    <div>
                      <p className="font-medium">{poi.name}</p>
                      <p className="text-sm text-muted-foreground">{poi.category}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {poi.distance.toFixed(1)} mi
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No POI data available</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

