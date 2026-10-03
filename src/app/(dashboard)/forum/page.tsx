
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Search, Plus, TrendingUp, Users, Clock, ThumbsUp } from 'lucide-react';
import Link from 'next/link';

const FORUM_CATEGORIES = [
    { id: 'general', name: 'General Discussion', count: 124, color: 'bg-blue-100 text-blue-700' },
    { id: 'support', name: 'Support & Help', count: 85, color: 'bg-green-100 text-green-700' },
    { id: 'ideas', name: 'Feature Requests', count: 56, color: 'bg-purple-100 text-purple-700' },
    { id: 'announcements', name: 'Announcements', count: 12, color: 'bg-amber-100 text-amber-700' },
];

const POPULAR_TOPICS = [
    {
        id: 1,
        title: 'Best practices for inventory management in 2025',
        author: { name: 'Sarah Wilson', image: '', initials: 'SW' },
        category: 'General Discussion',
        replies: 24,
        views: 156,
        likes: 45,
        time: '2 hours ago',
        isHot: true,
    },
    {
        id: 2,
        title: 'How to customize invoice templates?',
        author: { name: 'Mike Chen', image: '', initials: 'MC' },
        category: 'Support & Helper',
        replies: 12,
        views: 89,
        likes: 8,
        time: '5 hours ago',
        isHot: false,
    },
    {
        id: 3,
        title: 'Feature Request: Dark mode for mobile app',
        author: { name: 'Alex Johnson', image: '', initials: 'AJ' },
        category: 'Feature Requests',
        replies: 56,
        views: 432,
        likes: 120,
        time: '1 day ago',
        isHot: true,
    },
    {
        id: 4,
        title: 'Q4 Product Roadmap Update',
        author: { name: 'SLICT Team', image: '', initials: 'ST' },
        category: 'Announcements',
        replies: 0,
        views: 1205,
        likes: 250,
        time: '2 days ago',
        isHot: true,
    },
];

export default function ForumPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Community Forum</h1>
                    <p className="text-slate-500">Connect, share, and learn from other users</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input placeholder="Search discussions..." className="pl-10" />
                    </div>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4" />
                        New Topic
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Categories</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-1">
                            {FORUM_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                                >
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">{cat.name}</span>
                                    <Badge variant="secondary" className="text-xs font-normal bg-slate-100 text-slate-500">
                                        {cat.count}
                                    </Badge>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Community Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Users className="h-4 w-4" />
                                    <span className="text-sm">Members</span>
                                </div>
                                <span className="font-semibold">2,543</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <MessageSquare className="h-4 w-4" />
                                    <span className="text-sm">Topics</span>
                                </div>
                                <span className="font-semibold">892</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-sm">Online Now</span>
                                </div>
                                <span className="font-semibold text-green-600">145</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Feed */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                        <Button variant="ghost" size="sm" className="font-medium text-blue-600 bg-blue-50">Latest</Button>
                        <Button variant="ghost" size="sm" className="text-slate-600">Top</Button>
                        <Button variant="ghost" size="sm" className="text-slate-600">Unanswered</Button>
                    </div>

                    {POPULAR_TOPICS.map((topic) => (
                        <Card key={topic.id} className="hover:shadow-md transition-shadow cursor-pointer border-slate-200">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex flex-col items-center gap-1 min-w-[50px]">
                                        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 text-slate-600">
                                            <ThumbsUp className="h-4 w-4 mb-1" />
                                            <span className="text-sm font-bold">{topic.likes}</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-xs font-normal text-slate-500 border-slate-200">
                                                {topic.category}
                                            </Badge>
                                            {topic.isHot && (
                                                <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-100 flex items-center gap-1">
                                                    <TrendingUp className="h-3 w-3" /> Hot
                                                </Badge>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2 hover:text-blue-600 truncate">
                                            {topic.title}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarImage src={topic.author.image} />
                                                    <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                                                        {topic.author.initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span>{topic.author.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{topic.time}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MessageSquare className="h-3 w-3" />
                                                <span>{topic.replies} replies</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
