'use client';

import { useEffect, useState } from 'react';
import { ModuleStatsWidget } from './ModuleStatsWidget';
import { BookOpen, Home, Utensils, Hotel, MessageCircle, Zap } from 'lucide-react';

export function NewModulesSection({ tenantId }: { tenantId: string }) {
  const [stats, setStats] = useState({
    courses: 0,
    properties: 0,
    restaurantTables: 0,
    hotelRooms: 0,
    activeChats: 0,
    automationRules: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [tenantId]);

  const fetchStats = async () => {
    try {
      // Fetch stats from APIs
      const [courses, properties, tables, rooms, chats, rules] = await Promise.all([
        fetch(`/api/courses?tenantId=${tenantId}`).then(r => r.json()),
        fetch(`/api/properties?tenantId=${tenantId}`).then(r => r.json()),
        fetch(`/api/restaurant/tables?tenantId=${tenantId}`).then(r => r.json()),
        fetch(`/api/hotel/rooms?tenantId=${tenantId}`).then(r => r.json()),
        fetch(`/api/livechat?tenantId=${tenantId}&status=ACTIVE`).then(r => r.json()),
        fetch(`/api/automation/rules?tenantId=${tenantId}&isActive=true`).then(r => r.json()),
      ]);

      setStats({
        courses: Array.isArray(courses) ? courses.length : 0,
        properties: Array.isArray(properties) ? properties.length : 0,
        restaurantTables: Array.isArray(tables) ? tables.length : 0,
        hotelRooms: Array.isArray(rooms) ? rooms.length : 0,
        activeChats: Array.isArray(chats) ? chats.length : 0,
        automationRules: Array.isArray(rules) ? rules.length : 0,
      });
    } catch (error) {
      console.error('Failed to fetch module stats:', error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">New Modules Overview</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ModuleStatsWidget
          title="Active Courses"
          value={stats.courses}
          description="eLearning platform"
          icon={BookOpen}
        />
        <ModuleStatsWidget
          title="Properties Listed"
          value={stats.properties}
          description="Real estate inventory"
          icon={Home}
        />
        <ModuleStatsWidget
          title="Restaurant Tables"
          value={stats.restaurantTables}
          description="Table management"
          icon={Utensils}
        />
        <ModuleStatsWidget
          title="Hotel Rooms"
          value={stats.hotelRooms}
          description="Room inventory"
          icon={Hotel}
        />
        <ModuleStatsWidget
          title="Active Chats"
          value={stats.activeChats}
          description="Live support sessions"
          icon={MessageCircle}
        />
        <ModuleStatsWidget
          title="Automation Rules"
          value={stats.automationRules}
          description="Active workflows"
          icon={Zap}
        />
      </div>
    </div>
  );
}
