"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Package, Home, Kanban, Stethoscope, Store, Calculator, Users, Utensils, Factory, LineChart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
  price: number;
}

export default function MarketplacePage() {
  const { data: session } = useSession();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fake payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/modules", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setModules(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error(err);
          setLoading(false);
        }
      });
      
    return () => controller.abort();
  }, []);

  const openPaymentModal = (mod: Module) => {
    setSelectedModule(mod);
    setPaymentModalOpen(true);
  };

  const handleRequestModule = async () => {
    if (!selectedModule) return;
    
    setProcessingPayment(true);
    
    // Simulate payment delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const res = await fetch("/api/modules/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: selectedModule.id, action: "ENABLE" }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      toast.success(`Successfully purchased ${selectedModule.name}. Waiting for Super Admin approval.`);
      setPaymentModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request module.");
    } finally {
      setProcessingPayment(false);
      setSelectedModule(null);
    }
  };

  const getIcon = (iconName: string) => {
    const IconClass = "w-8 h-8 text-primary";
    switch (iconName) {
      case "Calculator": return <Calculator className={IconClass} />;
      case "Users": return <Users className={IconClass} />;
      case "LineChart": return <LineChart className={IconClass} />;
      case "Package": return <Package className={IconClass} />;
      case "Kanban": return <Kanban className={IconClass} />;
      case "Stethoscope": return <Stethoscope className={IconClass} />;
      case "Home": return <Home className={IconClass} />;
      case "Factory": return <Factory className={IconClass} />;
      case "Store": return <Store className={IconClass} />;
      case "Utensils": return <Utensils className={IconClass} />;
      default: return <Package className={IconClass} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-muted-foreground animate-pulse">Loading Marketplace...</span>
      </div>
    );
  }

  // Determine which modules are already enabled
  const enabledModules = session?.user?.enabledModuleIds || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4 max-w-2xl mx-auto mt-6">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Unlock More Capabilities
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Scale your business with our enterprise-grade modules. Purchase exactly what you need, when you need it.
        </p>
      </section>

      {/* Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => {
          const isEnabled = enabledModules.includes(mod.id);
          return (
            <Card 
              key={mod.id} 
              className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
            >
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  {getIcon(mod.icon)}
                </div>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{mod.name}</CardTitle>
                  {isEnabled && <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-none">Active</Badge>}
                </div>
                <CardDescription className="text-slate-500 mt-2 line-clamp-3">
                  {mod.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  {mod.features?.map((feat: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary opacity-70" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="border-t border-slate-100 dark:border-slate-800 pt-6">
                <div className="w-full flex items-center justify-between">
                  <div className="font-semibold text-lg text-slate-900 dark:text-white">
                    ${mod.price} <span className="text-sm font-normal text-slate-500">/mo</span>
                  </div>
                  <Button 
                    onClick={() => openPaymentModal(mod)} 
                    disabled={isEnabled}
                    variant={isEnabled ? "outline" : "default"}
                  >
                    {isEnabled ? "Installed" : "Request Module"}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </section>

      {/* Fake Payment Modal */}
      {paymentModalOpen && selectedModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden outline-none animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-2xl font-semibold">Complete Purchase</h2>
              <p className="text-slate-500 mt-1">You are requesting the {selectedModule.name} module.</p>
            </div>
            
            <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
              {/* Receipt Summary */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>{selectedModule.name} Module</span>
                  <span className="font-medium text-slate-900 dark:text-white">${selectedModule.price}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 text-sm mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <span>Billed Frequency</span>
                  <span>Monthly</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 text-sm mt-2">
                  <span>Setup Fee</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between items-center font-semibold text-lg mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white">
                  <span>Total Today</span>
                  <span>${selectedModule.price}</span>
                </div>
              </div>

              {/* Fake Credit Card Form */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="card-number" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Card Information</label>
                  <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800">
                     <span className="text-slate-400">💳</span>
                     <input id="card-number" type="text" placeholder="XXXX XXXX XXXX XXXX" className="bg-transparent outline-none w-full text-slate-900 dark:text-white placeholder:text-slate-400" disabled />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="card-expiry" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Expiry Date</label>
                    <input id="card-expiry" type="text" placeholder="MM/YY" className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 w-full bg-white dark:bg-slate-800 outline-none text-slate-900 dark:text-white placeholder:text-slate-400" disabled />
                  </div>
                  <div>
                    <label htmlFor="card-cvc" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">CVC</label>
                    <input id="card-cvc" type="text" placeholder="123" className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 w-full bg-white dark:bg-slate-800 outline-none text-slate-900 dark:text-white placeholder:text-slate-400" disabled />
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1 mt-4">
                  <ShieldCheck className="w-3 h-3" /> Secure payment powered by MockStripe
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setPaymentModalOpen(false)}
                disabled={processingPayment}
              >
                Cancel
              </Button>
              <Button 
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                onClick={handleRequestModule}
                disabled={processingPayment}
              >
                {processingPayment ? "Processing..." : `Pay $${selectedModule.price}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
