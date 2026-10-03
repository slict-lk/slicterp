'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle,
    X,
    Send,
    Loader2,
    Sparkles,
    Bot,
    User,
    TrendingUp,
    Package,
    Users,
    Clock,
    Copy,
    RotateCcw,
    Trash2,
    ChevronDown,
    Plus,
    Menu,
    ChevronRight,
    RefreshCw,
    Lock,
    Maximize2,
    Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface Message {
    id: string;
    role: 'USER' | 'ASSISTANT' | 'SYSTEM';
    content: string;
    functionCalls?: any[];
    createdAt: Date | string;
}

interface Conversation {
    id: string;
    title?: string;
    modelId?: string;
    messages: Message[];
    createdAt: Date | string;
    updatedAt: Date | string;
}

export default function AIChatAssistant() {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    // Sidebar closed by default on mobile (handled via CSS/Logic checking? No, just default true is fine if responsively hidden, but for overlay logic, maybe start false if mobile?)
    // Let's rely on standard state but user requests optimization.
    // Better to default sidebarOpen to false so mobile users see chat immediately.
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [availableModels, setAvailableModels] = useState<any[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const tenantId = session?.user?.tenantId || null;
    const sessionLoading = !session && typeof session === 'undefined';

    useEffect(() => {
        if (isOpen && tenantId && !sessionLoading) {
            if (conversations.length === 0) fetchConversations();
            if (availableModels.length === 0) fetchModels();
        }
    }, [isOpen, conversations.length, availableModels.length, tenantId, sessionLoading]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const deleteMessage = (id: string) => {
        setMessages(messages.filter(m => m.id !== id));
    };

    const fetchModels = async () => {
        if (!tenantId) return;
        try {
            const response = await fetch(`/api/ai/chat/models`);
            if (response.ok) {
                const data = await response.json();
                setAvailableModels(data);
                if (data.length > 0 && !selectedModelId) {
                    setSelectedModelId(data[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching models:', error);
        }
    };

    const fetchConversations = async () => {
        if (!tenantId) return;
        try {
            const response = await fetch(
                `/api/ai/chat/conversations?tenantId=${tenantId}`
            );
            if (response.ok) {
                const data = await response.json();
                setConversations(data);
            } else if (response.status === 401) {
                console.error('Unauthorized - please log in');
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        }
    };

    const fetchConversation = async (conversationId: string) => {
        if (!tenantId) return;
        setIsLoading(true);
        // Optional: clear messages immediately to show loading state if desired, or keep old ones until new load
        setMessages([]);
        try {
            const response = await fetch(
                `/api/ai/chat/${conversationId}?tenantId=${tenantId}`
            );
            if (response.ok) {
                const data = await response.json();
                setCurrentConversation(data);
                setMessages(data.messages);
                if (data.modelId) {
                    setSelectedModelId(data.modelId);
                }
            }
        } catch (error) {
            console.error('Error fetching conversation:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const startNewConversation = async (message: string) => {
        if (!tenantId) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/chat/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId,
                    message,
                    modelId: selectedModelId,
                }),
            });

            if (response.ok) {
                const conversation = await response.json();
                setCurrentConversation(conversation);
                setMessages(conversation.messages);
                setConversations([conversation, ...conversations]);
            } else if (response.status === 401) {
                console.error('Unauthorized - please log in');
            }
        } catch (error) {
            console.error('Error creating conversation:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteConversation = async (e: React.MouseEvent, conversationId: string) => {
        if (!tenantId) return;
        e.stopPropagation(); // Prevent opening the chat
        if (!confirm('Are you sure you want to delete this chat?')) return;

        try {
            const response = await fetch(
                `/api/ai/chat/${conversationId}?tenantId=${tenantId}`,
                { method: 'DELETE' }
            );

            if (response.ok) {
                setConversations(conversations.filter(c => c.id !== conversationId));
                if (currentConversation?.id === conversationId) {
                    setCurrentConversation(null);
                    setMessages([]);
                }
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    };

    const sendMessage = async (message: string) => {
        if (!message.trim() || !tenantId) return;

        if (!currentConversation) {
            await startNewConversation(message);
            setInput('');
            return;
        }

        // Add user message optimistically
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'USER',
            content: message,
            createdAt: new Date(),
        };
        setMessages([...messages, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Use new local AI engine endpoint
            const response = await fetch(`/api/ai/chat/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: currentConversation.id,
                    message,
                    tenantId,
                    modelId: selectedModelId,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const assistantMessage: Message = {
                    id: data.message.id,
                    role: 'ASSISTANT',
                    content: data.message.content,
                    functionCalls: data.functionCall ? [data.functionCall] : undefined,
                    createdAt: data.message.createdAt,
                };
                setMessages((prev) => [...prev, assistantMessage]);
            } else if (response.status === 401) {
                console.error('Unauthorized - please log in');
            } else {
                const errorData = await response.json();
                console.error('❌ AI Completion Error Payload:', errorData);
                const assistantErrorMessage: Message = {
                    id: Date.now().toString(),
                    role: 'ASSISTANT',
                    content: `⚠️ Error: ${errorData.details || errorData.error || 'Failed to generate completion.'}\nPlease check your AI provider configuration.`,
                    createdAt: new Date(),
                };
                setMessages((prev) => [...prev, assistantErrorMessage]);
            }
        } catch (error) {
            console.error('❌ Error sending message fetch catch:', error);
            const assistantErrorMessage: Message = {
                id: Date.now().toString(),
                role: 'ASSISTANT',
                content: `⚠️ Connection Error: Failed to reach the AI engine. Ensure the server is running.`,
                createdAt: new Date(),
            };
            setMessages((prev) => [...prev, assistantErrorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleNewConversation = () => {
        setCurrentConversation(null);
        setMessages([]);
        setInput('');
        inputRef.current?.focus();
    };

    const suggestedQueries = [
        { icon: TrendingUp, label: 'Show sales summary', query: 'Show me sales summary for this month' },
        { icon: Package, label: 'Inventory status', query: 'What is my current inventory status?' },
        { icon: Users, label: 'Recent customers', query: 'Show me recent customers' },
        { icon: Clock, label: 'Pending tasks', query: 'What are my pending tasks?' },
    ];

    if (!tenantId) {
        return null;
    }

    return (
        <>
            {/* Floating Chat Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button
                                size="lg"
                                className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 border border-white/20"
                                onClick={() => setIsOpen(true)}
                            >
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                >
                                    <Sparkles className="h-7 w-7 text-white" />
                                </motion.div>
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={cn(
                            "fixed z-50 flex flex-col shadow-2xl bg-white/95 backdrop-blur-xl overflow-hidden ring-0 transition-all duration-300",
                            isFullScreen 
                                ? "inset-0 w-full h-[100dvh] rounded-none border-none md:ring-0" 
                                : "inset-0 md:inset-auto md:bottom-6 md:right-6 w-full h-[100dvh] md:w-[600px] lg:w-[750px] md:h-[80vh] md:max-h-[750px] md:rounded-3xl border-none md:border md:border-white/20 md:ring-1 md:ring-black/5"
                        )}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-violet-600/95 to-indigo-600/95 backdrop-blur-md p-4 text-white shadow-sm shrink-0 z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner">
                                        <Bot className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">AI Assistant</h3>
                                        <div className="flex items-center gap-1.5 opacity-90">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                                            </span>
                                            <p className="text-xs font-medium tracking-wide">We're online</p>
                                        </div>
                                    </div>
                                </div>
                                {availableModels.length > 0 && (
                                    <div className="hidden md:flex items-center mx-4 flex-1 justify-end px-4">
                                        <Select
                                            value={selectedModelId || undefined}
                                            onValueChange={setSelectedModelId}
                                            disabled={!!currentConversation}
                                        >
                                            <SelectTrigger className="h-8 bg-white/10 border-white/20 text-white min-w-[160px] max-w-[220px] text-xs font-medium focus:ring-0 focus:ring-offset-0">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    {!!currentConversation && <Lock className="h-3 w-3 opacity-70" />}
                                                    <SelectValue placeholder="Select Model" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableModels.map(model => (
                                                    <SelectItem key={model.id} value={model.id} className="text-xs font-medium flex items-center gap-2">
                                                        {model.provider === 'GOOGLE' && '🔮 '}
                                                        {model.provider === 'GROQ' && '⚡ '}
                                                        {model.provider === 'OLLAMA' && '🦙 '}
                                                        {model.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-white hover:bg-white/20 rounded-full transition-colors"
                                        onClick={handleNewConversation}
                                        title="Start New Chat"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-white hover:bg-white/20 rounded-full transition-colors"
                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                        title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                                    >
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-white hover:bg-white/20 rounded-full transition-colors hidden md:flex"
                                        onClick={() => setIsFullScreen(!isFullScreen)}
                                        title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                                    >
                                        {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-white hover:bg-white/20 rounded-full transition-colors"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex flex-1 overflow-hidden relative">
                            {/* Loading Overlay for Navigation */}
                            <AnimatePresence>
                                {isLoading && messages.length === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-20 bg-white/50 backdrop-blur-sm flex items-center justify-center"
                                    >
                                        <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Sidebar */}
                            <AnimatePresence mode="wait">
                                {sidebarOpen && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 280, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="absolute inset-y-0 left-0 z-30 w-full md:relative md:w-[280px] border-r border-gray-100 bg-white/95 backdrop-blur-xl md:bg-gray-50/50 flex flex-col overflow-hidden"
                                    >
                                        <div className="p-4">
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start gap-2 bg-white hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-all shadow-sm group"
                                                onClick={handleNewConversation}
                                            >
                                                <div className="h-6 w-6 rounded-full bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors">
                                                    <Plus className="h-3.5 w-3.5 text-violet-700" />
                                                </div>
                                                <span className="font-medium">New Chat</span>
                                            </Button>
                                        </div>

                                        <div className="px-4 pb-2">
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2 mb-2">Recent Chats</p>
                                        </div>

                                        <div className="flex-1 overflow-y-auto space-y-1 px-3 pb-3 custom-scrollbar">
                                            {conversations.length === 0 ? (
                                                <div className="text-sm text-gray-400 text-center py-8 italic">
                                                    No history... yet
                                                </div>
                                            ) : (
                                                conversations.map((conv) => (
                                                    <motion.div
                                                        key={conv.id}
                                                        layout
                                                        onClick={() => fetchConversation(conv.id)}
                                                        className={cn(
                                                            'w-full text-left px-3 py-3 rounded-xl text-sm transition-all flex items-start gap-3 group relative overflow-hidden cursor-pointer',
                                                            currentConversation?.id === conv.id
                                                                ? 'bg-white shadow-md text-violet-900 ring-1 ring-violet-100'
                                                                : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
                                                        )}
                                                    >
                                                        {currentConversation?.id === conv.id && (
                                                            <motion.div
                                                                layoutId="activeIndicator"
                                                                className="absolute left-0 top-2 bottom-2 w-1 bg-violet-500 rounded-r-full"
                                                            />
                                                        )}
                                                        <MessageCircle className={cn(
                                                            "h-4 w-4 mt-0.5 flex-shrink-0 transition-colors",
                                                            currentConversation?.id === conv.id ? "text-violet-600" : "text-gray-400 group-hover:text-gray-600"
                                                        )} />
                                                        <span className="truncate flex-1 font-medium">
                                                            {conv.title || 'Untitled Conversation'}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                            onClick={(e) => deleteConversation(e, conv.id)}
                                                            title="Delete Chat"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Messages Area */}
                            <div className="flex-1 flex flex-col overflow-hidden bg-white/50 relative">
                                {/* Messages List */}
                                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
                                    {messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center px-6 max-w-md mx-auto">
                                            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-100 to-indigo-50 flex items-center justify-center mb-6 shadow-inner">
                                                <Sparkles className="h-10 w-10 text-violet-500" />
                                            </div>
                                            <h4 className="text-2xl font-bold text-gray-800 mb-3 tracking-tight">
                                                Good Afternoon!
                                            </h4>
                                            <p className="text-gray-500 mb-8 leading-relaxed">
                                                I'm ready to help you manage your business. Check your sales, inventory, or just ask me anything.
                                            </p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                                                {suggestedQueries.map((suggestion, idx) => (
                                                    <motion.button
                                                        key={idx}
                                                        whileHover={{ scale: 1.02, y: -2 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => sendMessage(suggestion.query)}
                                                        className="p-4 rounded-xl border border-gray-100 bg-white hover:border-violet-200 hover:shadow-md hover:shadow-violet-100 transition-all text-left shadow-sm group"
                                                    >
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-violet-50 transition-colors">
                                                                <suggestion.icon className="h-4 w-4 text-violet-600" />
                                                            </div>
                                                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Try this</span>
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-700 group-hover:text-violet-700 transition-colors">
                                                            {suggestion.label}
                                                        </p>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {messages.map((message, idx) => {
                                                const isFirst = idx === 0;
                                                const prevMessage = messages[idx - 1];
                                                const currentDate = new Date(message.createdAt);
                                                const prevDate = prevMessage ? new Date(prevMessage.createdAt) : null;

                                                let showDateDivider = false;
                                                let dateLabel = '';

                                                if (isFirst || (prevDate && currentDate.toDateString() !== prevDate.toDateString())) {
                                                    showDateDivider = true;
                                                    const today = new Date();
                                                    const yesterday = new Date(today);
                                                    yesterday.setDate(yesterday.getDate() - 1);

                                                    if (currentDate.toDateString() === today.toDateString()) {
                                                        dateLabel = 'Today';
                                                    } else if (currentDate.toDateString() === yesterday.toDateString()) {
                                                        dateLabel = 'Yesterday';
                                                    } else {
                                                        dateLabel = currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
                                                    }
                                                }

                                                return (
                                                    <div key={message.id || idx}>
                                                        {showDateDivider && (
                                                            <div className="flex items-center justify-center my-6">
                                                                <span className="text-[10px] font-medium text-gray-400 bg-gray-50/80 px-3 py-1 rounded-full border border-gray-100">
                                                                    {dateLabel}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                            onMouseEnter={() => setHoveredMessageId(message.id || idx.toString())}
                                                            onMouseLeave={() => setHoveredMessageId(null)}
                                                            className={cn(
                                                                'flex gap-4 group mb-6',
                                                                message.role === 'USER' ? 'justify-end pl-12' : 'justify-start pr-12'
                                                            )}
                                                        >
                                                            {message.role === 'ASSISTANT' && (
                                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-200 mt-1">
                                                                    <Bot className="h-6 w-6 text-white" />
                                                                </div>
                                                            )}

                                                            <div className={cn("flex flex-col gap-1 min-w-0 max-w-[85%]", message.role === 'USER' ? 'items-end' : 'items-start')}>
                                                                <div className="flex items-end gap-2 group-hover:translate-x-0 transition-transform">
                                                                    <div
                                                                        className={cn(
                                                                            'px-5 py-3.5 shadow-sm relative text-sm leading-relaxed',
                                                                            message.role === 'USER'
                                                                                ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm'
                                                                                : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm hover:shadow-md hover:border-gray-200 transition-all'
                                                                        )}
                                                                    >
                                                                        <div className="whitespace-pre-wrap">{message.content}</div>

                                                                        {/* Function calls badge */}
                                                                        {message.functionCalls && message.functionCalls.length > 0 && (
                                                                            <div className="mt-3 pt-3 border-t border-dashed border-gray-300/30">
                                                                                <div className="flex items-center gap-1.5 text-xs opacity-70">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                                                    <span>Processed with {message.functionCalls.length} tool{message.functionCalls.length > 1 ? 's' : ''}</span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Message Meta/Actions */}
                                                                <div className={cn(
                                                                    "h-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity px-1",
                                                                    message.role === 'USER' ? 'flex-row-reverse' : 'flex-row'
                                                                )}>
                                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                                                        onClick={() => copyToClipboard(message.content, message.id || idx.toString())}
                                                                    >
                                                                        {copiedId === (message.id || idx.toString()) ? (
                                                                            <span className="text-xs text-green-500 font-bold">✓</span>
                                                                        ) : (
                                                                            <Copy className="h-3 w-3" />
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {message.role === 'USER' && (
                                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-white flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                                                    <User className="h-5 w-5 text-gray-500" />
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    </div>
                                                );
                                            })}

                                            {isLoading && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="flex gap-4 mb-6"
                                                >
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-200">
                                                        <Bot className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-2">
                                                        <span className="text-sm text-gray-500 font-medium mr-2">Thinking</span>
                                                        <div className="flex gap-1">
                                                            {[0, 1, 2].map((i) => (
                                                                <motion.div
                                                                    key={i}
                                                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                                                    transition={{ delay: i * 0.15, duration: 1, repeat: Infinity }}
                                                                    className="w-1.5 h-1.5 rounded-full bg-violet-500"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Quick Reply / Suggested Chips (Contextual Mock) */}
                                            {messages.length > 0 && !isLoading && (
                                                <div className="flex gap-2 overflow-x-auto pb-2 px-12 no-scrollbar mask-gradient-right">
                                                    {suggestedQueries.slice(0, 2).map((sq, idx) => (
                                                        <motion.button
                                                            key={idx}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => sendMessage(sq.query)}
                                                            className="whitespace-nowrap px-4 py-2 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold border border-violet-100 hover:bg-violet-100 hover:border-violet-200 transition-all shadow-sm"
                                                        >
                                                            {sq.label}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            )}
                                            <div ref={messagesEndRef} className="h-4" />
                                        </>
                                    )}
                                </div>

                                {/* Input Area */}
                                <div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 shrink-0">
                                    <form onSubmit={handleSubmit} className="relative">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Type your message..."
                                            className="w-full pl-5 pr-14 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm placeholder:text-gray-400 shadow-inner"
                                            disabled={isLoading}
                                        />
                                        <div className="absolute right-2 top-2">
                                            <Button
                                                type="submit"
                                                size="icon"
                                                disabled={!input.trim() || isLoading}
                                                className={cn(
                                                    "h-10 w-10 rounded-xl transition-all duration-300",
                                                    input.trim()
                                                        ? "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/30"
                                                        : "bg-gray-100 text-gray-400"
                                                )}
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <Send className="h-5 w-5 ml-0.5" />
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                    <div className="text-[10px] text-center text-gray-300 mt-2">
                                        AI can make mistakes. Check important info.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
