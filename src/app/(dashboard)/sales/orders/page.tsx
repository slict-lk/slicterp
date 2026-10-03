"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  ShieldAlert,
  PackagePlus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search,
  ArrowUpDown,
  Eye,
  Clock,
  DollarSign,
  Package,
  TrendingUp,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SalesOrderV2 {
  id: string;
  orderNumber: string;
  status: string;
  approvalStatus: string;
  fulfillmentStatus: string;
  invoiceStatus: string;
  customerAccountId?: string | null;
  sourceQuoteId?: string | null;
  grandTotal: number;
  approvalReason?: string | null;
  expectedDeliveryDate?: Date | null;
  createdAt: Date;
  metadata?: any;
  approvals?: Array<{ status: string; ruleCode?: string; reason?: string }>;
  fulfillmentRequests?: Array<{ id: string; status: string; requestNumber?: string }>;
}

type FilterType = "ALL" | "PENDING" | "APPROVED" | "FULFILLMENT";
type SortField = "date" | "total" | "status";
type SortDir = "asc" | "desc";

export default function SalesOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SalesOrderV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [orderToReject, setOrderToReject] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sales/orders?v2=1");
      if (response.ok) {
        const payload = await response.json();
        const items = payload.items || payload.data || (Array.isArray(payload) ? payload : []);
        setOrders(
          items.map((o: any) => ({
            ...o,
            createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
            expectedDeliveryDate: o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate) : null,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load canonical sales orders:", error);
      toast.error("Failed to load orders", { description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      setBusyOrderId(orderId);
      const response = await fetch(`/api/sales/orders/${orderId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "APPROVED",
          reason: "Approved from Order Control Panel",
          ruleCode: "MANUAL_REVIEW",
        }),
      });
      if (response.ok) {
        await loadOrders();
        toast.success("Order approved", {
          description: "The order has been approved successfully.",
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
      } else {
        toast.error("Approval failed", { description: "Could not approve the order." });
      }
    } catch (error) {
      console.error("Error approving order:", error);
      toast.error("Approval failed", { description: "An unexpected error occurred." });
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleRejectOrder = async () => {
    if (!orderToReject) return;
    try {
      setBusyOrderId(orderToReject);
      const response = await fetch(`/api/sales/orders/${orderToReject}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REJECTED",
          reason: "Rejected from Order Control Panel",
          ruleCode: "MANUAL_REVIEW",
        }),
      });
      if (response.ok) {
        await loadOrders();
        toast.success("Order rejected", {
          description: "The order has been rejected.",
          icon: <XCircle className="h-4 w-4" />,
        });
      } else {
        toast.error("Rejection failed", { description: "Could not reject the order." });
      }
    } catch (error) {
      console.error("Error rejecting order:", error);
      toast.error("Rejection failed", { description: "An unexpected error occurred." });
    } finally {
      setBusyOrderId(null);
      setOrderToReject(null);
      setRejectDialogOpen(false);
    }
  };

  const handleRequestFulfillment = async (orderId: string) => {
    try {
      setBusyOrderId(orderId);
      const response = await fetch(`/api/sales/orders/${orderId}/fulfillment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillmentType: "INVENTORY",
          markStatus: "REQUESTED",
          orderStatus: "IN_PROGRESS",
        }),
      });
      if (response.ok) {
        await loadOrders();
        toast.success("Fulfillment requested", {
          description: "Order has been handed off to inventory.",
          icon: <PackagePlus className="h-4 w-4" />,
        });
      } else {
        toast.error("Fulfillment failed", { description: "Could not create fulfillment request." });
      }
    } catch (error) {
      console.error("Error creating fulfillment request:", error);
      toast.error("Fulfillment failed", { description: "An unexpected error occurred." });
    } finally {
      setBusyOrderId(null);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "date" ? "desc" : "asc");
    }
  };

  const filterCounts = useMemo(() => {
    const approval = (o: SalesOrderV2) => String(o.approvalStatus || "").toUpperCase();
    const fulfillment = (o: SalesOrderV2) => String(o.fulfillmentStatus || "").toUpperCase();
    return {
      ALL: orders.length,
      PENDING: orders.filter((o) => approval(o) === "PENDING").length,
      APPROVED: orders.filter((o) => approval(o) === "APPROVED" || String(o.status).toUpperCase() === "CONFIRMED").length,
      FULFILLMENT: orders.filter((o) => ["REQUESTED", "PENDING", "IN_PROGRESS"].includes(fulfillment(o))).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const approval = (o: SalesOrderV2) => String(o.approvalStatus || "").toUpperCase();
    const fulfillment = (o: SalesOrderV2) => String(o.fulfillmentStatus || "").toUpperCase();

    let result = orders.filter((order) => {
      if (filter === "PENDING") return approval(order) === "PENDING";
      if (filter === "APPROVED") return approval(order) === "APPROVED" || String(order.status).toUpperCase() === "CONFIRMED";
      if (filter === "FULFILLMENT") return ["REQUESTED", "PENDING", "IN_PROGRESS"].includes(fulfillment(order));
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customerAccountId?.toLowerCase().includes(q) ||
          o.id?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "date") return dir * (a.createdAt.getTime() - b.createdAt.getTime());
      if (sortField === "total") return dir * (Number(a.grandTotal) - Number(b.grandTotal));
      return dir * String(a.status).localeCompare(String(b.status));
    });

    return result;
  }, [orders, filter, searchQuery, sortField, sortDir]);

  const pendingExposure = orders
    .filter((o) => String(o.approvalStatus).toUpperCase() === "PENDING")
    .reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Workspace</h1>
          <p className="text-muted-foreground mt-1">
            Manage sales orders, approvals, and fulfillment handoffs.
          </p>
        </div>
        <Button variant="outline" onClick={loadOrders} disabled={loading} className="self-start">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Package className="h-5 w-5" />}
          tone="slate"
          label="Total Orders"
          value={String(orders.length)}
          hint="Active canonical orders"
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
          label="Pending Approval"
          value={String(filterCounts.PENDING)}
          hint="Awaiting review"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          tone="blue"
          label="Awaiting Fulfillment"
          value={String(filterCounts.FULFILLMENT)}
          hint="Sent to inventory"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
          label="Approval Exposure"
          value={new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(pendingExposure)}
          hint="Value of blocked orders"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Order Control Panel
            </CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[220px]"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSort("date")}
                  className="text-xs"
                >
                  <ArrowUpDown className="mr-1 h-3 w-3" />
                  Date
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSort("total")}
                  className="text-xs"
                >
                  <DollarSign className="mr-1 h-3 w-3" />
                  Amount
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b">
            <Filter className="h-4 w-4 text-muted-foreground mr-1" />
            {(["ALL", "PENDING", "APPROVED", "FULFILLMENT"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className="gap-1.5"
              >
                {f === "ALL" ? "All" : f === "PENDING" ? "Pending" : f === "APPROVED" ? "Approved" : "Fulfillment"}
                <Badge
                  variant={filter === f ? "secondary" : "outline"}
                  className="h-5 px-1.5 text-[10px] font-medium"
                >
                  {filterCounts[f]}
                </Badge>
              </Button>
            ))}
          </div>

          {loading ? (
            <OrderCardSkeleton />
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No orders found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {searchQuery
                  ? `No orders match "${searchQuery}". Try a different search term.`
                  : "No orders match the current filter. Try selecting a different filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const approval = String(order.approvalStatus || "").toUpperCase();
                const fulfillment = String(order.fulfillmentStatus || "").toUpperCase();
                const canApprove = approval === "PENDING";
                const canFulfill =
                  approval === "APPROVED" &&
                  !["REQUESTED", "IN_PROGRESS", "FULFILLED"].includes(fulfillment);
                const triggers =
                  order.metadata?.approvalEvaluation?.triggers ??
                  (order.approvals || []).filter((a) => String(a.status).toUpperCase() === "PENDING");
                const isBusy = busyOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => router.push(`/sales/orders/${order.id}`)}
                            className="font-semibold text-primary hover:underline truncate"
                          >
                            {order.orderNumber}
                          </button>
                          <StatusBadge approval={approval} />
                          <Badge variant="outline" className="font-normal">
                            {String(order.status || "DRAFT").toUpperCase()}
                          </Badge>
                          {fulfillment !== "NOT_STARTED" && fulfillment && (
                            <Badge variant="outline" className="font-normal">
                              Fulfillment: {fulfillment}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(Number(order.grandTotal || 0))}
                          </span>
                          <span>Account: {order.customerAccountId || "—"}</span>
                          {order.expectedDeliveryDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due {order.expectedDeliveryDate.toLocaleDateString()}
                            </span>
                          )}
                          <span>Created {order.createdAt.toLocaleDateString()}</span>
                        </div>

                        {Array.isArray(triggers) && triggers.length > 0 && (
                          <div className="space-y-1.5">
                            {triggers.slice(0, 2).map((t: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 border border-amber-200"
                              >
                                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{t.reason || t.ruleCode || "Approval required"}</span>
                              </div>
                            ))}
                            {triggers.length > 2 && (
                              <p className="text-xs text-amber-600 pl-5">
                                +{triggers.length - 2} more trigger{triggers.length - 2 > 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/sales/orders/${order.id}`)}
                          disabled={isBusy}
                        >
                          <Eye className="mr-1.5 h-4 w-4" />
                          View
                        </Button>
                        {canApprove && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => handleApproveOrder(order.id)}
                              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                            >
                              <CheckCircle2 className="mr-1.5 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => {
                                setOrderToReject(order.id);
                                setRejectDialogOpen(true);
                              }}
                              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                            >
                              <XCircle className="mr-1.5 h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}
                        {canFulfill && (
                          <Button
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleRequestFulfillment(order.id)}
                          >
                            {isBusy ? (
                              <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                              <PackagePlus className="mr-1.5 h-4 w-4" />
                            )}
                            Handoff to Inventory
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this order? This action cannot be undone and the order will be marked as rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectOrder}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ approval }: { approval: string }) {
  if (approval === "PENDING") {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        Pending Approval
      </Badge>
    );
  }
  if (approval === "REJECTED") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  if (approval === "APPROVED") {
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
        Approved
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Not Required
    </Badge>
  );
}

function KpiCard({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  tone: "slate" | "amber" | "blue" | "red";
  label: string;
  value: string;
  hint: string;
}) {
  const tones = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const iconColors = {
    slate: "text-slate-500",
    amber: "text-amber-500",
    blue: "text-blue-500",
    red: "text-rose-500",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
        <span className={iconColors[tone]}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-1">{hint}</p>
    </div>
  );
}

function OrderCardSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
