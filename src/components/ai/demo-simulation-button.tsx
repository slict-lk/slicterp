'use client';

import { useState } from 'react';
import { Play, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function DemoSimulationButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const runSimulation = async () => {
    setIsLoading(true);
    setIsSuccess(false);

    try {
      const response = await fetch('/api/test/trigger-workflows');
      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast.success('Simulation Successful', {
          description: 'CRM and Accounting events published. Check the Audit log and Inbox.',
        });
      } else {
        throw new Error(data.error || 'Failed to run simulation');
      }
    } catch (error: any) {
      toast.error('Simulation Failed', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-6 shadow-sm ring-1 ring-violet-500/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-violet-900 flex items-center gap-2">
            <Play className="h-4 w-4 fill-current" />
            Product Demo Simulator
          </h3>
          <p className="mt-1 text-sm text-violet-700/80 leading-relaxed">
            Click to simulate high-impact business events (CRM Opportunities & Large Invoices). 
            This will trigger your active workflows and force sensitive actions into the **Approval Inbox** for demonstration.
          </p>
        </div>
        
        <Button 
          onClick={runSimulation}
          disabled={isLoading}
          className="bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 shrink-0 gap-2 min-w-[140px]"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSuccess ? (
            <Check className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isLoading ? 'Triggering...' : isSuccess ? 'Triggered!' : 'Run Simulation'}
        </Button>
      </div>
      
      {isSuccess && (
        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 animate-in fade-in slide-in-from-top-1">
          <Check className="h-3 w-3" />
          Success! Navigate to the Audit Trail or Approval Inbox to see the results.
        </div>
      )}
    </div>
  );
}
