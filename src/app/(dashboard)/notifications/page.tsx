'use client';

import { useState } from 'react';
import { Bell, Check, CheckCheck, Mail, MailOpen, Trash2, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import { formatDistanceToNow } from '@/lib/utils';
import Link from 'next/link';

const TYPE_COLORS: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-700',
  SUCCESS: 'bg-green-100 text-green-700',
  WARNING: 'bg-amber-100 text-amber-700',
  ERROR: 'bg-red-100 text-red-700',
};

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const handleToggleRead = (id: string, isRead: boolean) => {
    if (isRead) return;
    markAsRead([id]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                filter === 'unread' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && notifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-slate-200 rounded-full mb-4" />
                <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-200 rounded" />
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No notifications</p>
              <p className="text-sm text-slate-400 mt-1">
                {filter === 'unread' ? 'You have no unread notifications' : 'Notifications will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    !notification.isRead
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {!notification.isRead
                      ? <Mail className="h-5 w-5" />
                      : <MailOpen className="h-5 w-5" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`text-sm font-medium truncate ${
                            !notification.isRead ? 'text-slate-900' : 'text-slate-600'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(notification.createdAt)}
                          </span>
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[notification.type] || 'bg-slate-100 text-slate-600'}`}>
                            {notification.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleRead(notification.id, notification.isRead)}
                            className="h-8 w-8 p-0"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
                        {notification.link && (
                          <Link href={notification.link}>
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 hover:text-blue-700">
                              View
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
