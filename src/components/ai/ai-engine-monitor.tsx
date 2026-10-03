'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Gauge,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EngineStatus {
  available: boolean;
  connected: boolean;
  model: string;
  modelLoaded: boolean;
  lastCheck: string;
  error?: string;
}

interface EngineConfig {
  enabled: boolean;
  model: string;
  fallbackMode: boolean;
}

export default function AIEngineMonitor() {
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/ai/engine/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
        setConfig(data.config);
        setError(null);
      } else {
        setError('Failed to fetch AI engine status');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleInitialize = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/ai/engine', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
        setError(null);
      } else {
        setError('Failed to initialize AI engine');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex items-center justify-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="h-5 w-5 text-violet-600" />
          </motion.div>
          <p className="text-sm text-slate-600">Loading AI Engine status...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Main Status Card */}
      <Card className={cn(
        'p-6 border-2 transition-all',
        status?.available
          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200'
          : 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Status Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'p-3 rounded-lg',
                status?.available
                  ? 'bg-emerald-200'
                  : 'bg-amber-200'
              )}
            >
              {status?.available ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-700" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-700" />
              )}
            </motion.div>

            {/* Status Info */}
            <div>
              <h3 className={cn(
                'text-lg font-bold mb-1',
                status?.available ? 'text-emerald-900' : 'text-amber-900'
              )}>
                {status?.available ? 'AI Engine Active' : 'AI Engine Fallback Mode'}
              </h3>
              <p className={cn(
                'text-sm',
                status?.available ? 'text-emerald-800' : 'text-amber-800'
              )}>
                {status?.available
                  ? 'Local AI engine is running and ready to process requests'
                  : 'AI engine is in fallback/offline mode. Configure Groq or start Ollama to enable real AI responses.'}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={fetchStatus}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <motion.div
              animate={{ rotate: refreshing ? 360 : 0 }}
              transition={{
                duration: 1,
                repeat: refreshing ? Infinity : 0,
                ease: 'linear',
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </motion.div>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Status Grid */}
      {status && config && (
        <div className="grid grid-cols-2 gap-4">
          {/* Connected Status */}
          <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 mb-1">Connection</p>
                <p className="text-sm font-semibold text-slate-900">
                  {status.connected ? '✅ Connected' : '❌ Disconnected'}
                </p>
              </div>
              <Server className="h-5 w-5 text-blue-600" />
            </div>
          </Card>

          {/* Model Status */}
          <Card className="p-4 border-l-4 border-l-purple-500 bg-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 mb-1">Model</p>
                <p className="text-sm font-semibold text-slate-900 capitalize">
                  {status.model}
                </p>
              </div>
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
          </Card>

          {/* Model Loaded Status */}
          <Card className="p-4 border-l-4 border-l-green-500 bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 mb-1">Model Loaded</p>
                <p className="text-sm font-semibold text-slate-900">
                  {status.modelLoaded ? '✅ Yes' : '⏳ No'}
                </p>
              </div>
              <Activity className="h-5 w-5 text-green-600" />
            </div>
          </Card>

          {/* Last Check */}
          <Card className="p-4 border-l-4 border-l-slate-500 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 mb-1">Last Check</p>
                <p className="text-sm font-semibold text-slate-900">
                  {new Date(status.lastCheck).toLocaleTimeString()}
                </p>
              </div>
              <Clock className="h-5 w-5 text-slate-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Configuration Info */}
      {config && (
        <Card className="p-4 bg-slate-50 border-l-4 border-l-indigo-500">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Engine Enabled</span>
              <span className={cn(
                'text-sm font-semibold',
                config.enabled ? 'text-emerald-700' : 'text-slate-600'
              )}>
                {config.enabled ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Fallback Mode</span>
              <span className={cn(
                'text-sm font-semibold',
                config.fallbackMode ? 'text-amber-700' : 'text-emerald-700'
              )}>
                {config.fallbackMode ? '⚠️ Enabled' : '✅ Disabled'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Initialize Button */}
      {!status?.available && (
        <Button
          onClick={handleInitialize}
          disabled={refreshing}
          className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 gap-2"
        >
          {refreshing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="h-4 w-4" />
            </motion.div>
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Initialize AI Engine
        </Button>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Getting Started - Option 1: Groq (Recommended)
        </h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside mb-4">
          <li>Get free API key: <code className="bg-blue-100 px-1 rounded">https://console.groq.com</code></li>
          <li>Add to .env: <code className="bg-blue-100 px-1 rounded">GROQ_API_KEY=gsk_...</code></li>
          <li>Restart this application</li>
          <li>AI features will activate automatically ✅</li>
        </ol>
        
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Option 2: Local Ollama (No API Key)
        </h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Install Ollama: <code className="bg-blue-100 px-1 rounded">https://ollama.ai</code></li>
          <li>Start Ollama: <code className="bg-blue-100 px-1 rounded">ollama serve</code></li>
          <li>Pull a model: <code className="bg-blue-100 px-1 rounded">ollama pull llama2</code></li>
          <li>Refresh this page to see status update</li>
        </ol>
      </div>
    </div>
  );
}
