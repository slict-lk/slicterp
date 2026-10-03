"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Package, Check, X, Building, UserCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ModuleRequest {
  id: string;
  moduleId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  tenant: { name: string; companyName: string };
  requestedBy: { name: string; email: string };
  processedBy?: { name: string; email: string } | null;
  adminNotes?: string | null;
}

export default function ModuleRequestsAdminPage() {
  const [requests, setRequests] = useState<ModuleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/admin/module-requests?status=all");
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      } else {
        toast.error(data.error || "Failed to load requests");
      }
    } catch (error) {
      toast.error("An error occurred while fetching requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/module-requests/${id}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }

      toast.success("Module request approved successfully. Notification sent to tenant.");
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve request.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Module Approvals</h1>
          <p className="text-slate-500 mt-2">Manage customer requests for new ERP modules.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Tenant / Company</th>
                <th className="px-6 py-4">Requested Module</th>
                <th className="px-6 py-4">Requested By</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y border-slate-200">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    No module requests found.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Building className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{req.tenant.name}</p>
                          <p className="text-slate-500 text-xs">{req.tenant.companyName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900 capitalize px-2 py-1 bg-slate-100 rounded-md">
                        {req.moduleId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">{req.requestedBy.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(new Date(req.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant="secondary" 
                        className={
                          req.status === "PENDING"
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : req.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-rose-100 text-rose-700 border-rose-200"
                        }
                      >
                        {req.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === "PENDING" && (
                        <Button 
                          size="sm" 
                          className="bg-slate-900 hover:bg-slate-800 text-white shadow-none"
                          disabled={processingId === req.id}
                          onClick={() => handleApprove(req.id)}
                        >
                          {processingId === req.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 mr-2" />
                          )}
                          Approve
                        </Button>
                      )}
                      
                      {req.status !== "PENDING" && (
                        <span className="text-slate-400 text-xs flex justify-end gap-1 items-center">
                           Processed by {req.processedBy?.name || "System"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
