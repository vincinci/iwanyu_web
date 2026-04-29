import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/languageContext";
import { useMarketplace } from "@/context/marketplace";
import type { OrderStatus } from "@/types/order";
import { formatMoney } from "@/lib/money";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

const SELLER_STATUSES: OrderStatus[] = ["Placed", "Processing", "Shipped", "Delivered", "Cancelled"];

export default function SellerOrdersPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { getVendorsForOwner } = useMarketplace();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const isAdmin = user?.role === "admin";
  const ownedVendorIds = useMemo(() => {
    if (!user || isAdmin) return [];
    return getVendorsForOwner(user.id).map((v) => v.id);
  }, [user, isAdmin, getVendorsForOwner]);

  const ownedVendorIdSet = useMemo(() => new Set(ownedVendorIds), [ownedVendorIds]);

  type DbOrderRow = {
    id: string;
    buyer_email: string | null;
    created_at: string;
    total_rwf: number;
    status: OrderStatus;
  };

  type DbOrderItemRow = {
    order_id: string;
    product_id: string;
    vendor_id: string;
    title: string;
    price_rwf: number;
    quantity: number;
    vendor_payout_rwf: number;
    image_url: string | null;
    status: OrderStatus;
    created_at: string;
  };

  type SellerOrder = {
    id: string;
    createdAt: string;
    buyerEmail: string;
    total: number;
    status: OrderStatus;
    items: Array<{
      productId: string;
      vendorId: string;
      title: string;
      price: number;
      quantity: number;
      payout: number;
      image: string;
      status: OrderStatus;
    }>;
  };

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<SellerOrder[]>([]);

  function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (err && typeof err === "object") {
      const maybeMessage = (err as { message?: unknown }).message;
      if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) return maybeMessage;
      const maybeError = (err as { error?: unknown }).error;
      if (typeof maybeError === "string" && maybeError.trim().length > 0) return maybeError;
    }
    return t("seller.unknownError");
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!supabase || !user) {
        setOrders([]);
        return;
      }

      setLoading(true);
      try {
        let itemsQuery = supabase
          .from("order_items")
          .select("order_id, product_id, vendor_id, title, price_rwf, quantity, vendor_payout_rwf, image_url, status, created_at")
          .order("created_at", { ascending: false });

        if (!isAdmin) {
          if (ownedVendorIds.length === 0) {
            if (!cancelled) setOrders([]);
            return;
          }
          itemsQuery = itemsQuery.in("vendor_id", ownedVendorIds);
        }

        const { data: itemRows, error: itemsErr } = await itemsQuery;
        if (itemsErr) throw itemsErr;

        const items = (itemRows ?? []) as DbOrderItemRow[];
        const orderIds = Array.from(new Set(items.map((i) => i.order_id)));
        if (orderIds.length === 0) {
          if (!cancelled) setOrders([]);
          return;
        }

        const { data: orderRows, error: ordersErr } = await supabase
          .from("orders")
          .select("id, buyer_email, created_at, total_rwf, status")
          .in("id", orderIds)
          .order("created_at", { ascending: false });

        const byId = new Map<string, SellerOrder>();
        if (!ordersErr) {
          for (const o of (orderRows ?? []) as DbOrderRow[]) {
            byId.set(o.id, {
              id: o.id,
              createdAt: o.created_at,
              buyerEmail: o.buyer_email ?? "",
              total: Number(o.total_rwf ?? 0),
              status: o.status,
              items: [],
            });
          }
        }

        for (const i of items) {
          if (!byId.has(i.order_id)) {
            byId.set(i.order_id, {
              id: i.order_id,
              createdAt: i.created_at,
              buyerEmail: "",
              total: 0,
              status: i.status,
              items: [],
            });
          }

          const parent = byId.get(i.order_id);
          if (!parent) continue;
          parent.items.push({
            productId: i.product_id,
            vendorId: i.vendor_id,
            title: i.title,
            price: Number(i.price_rwf ?? 0),
            quantity: Number(i.quantity ?? 1),
            payout: Number(i.vendor_payout_rwf ?? 0),
            image: i.image_url ?? "",
            status: i.status,
          });
        }

        for (const order of byId.values()) {
          if (Number(order.total ?? 0) <= 0) {
            order.total = order.items.reduce(
              (sum, it) => sum + Number(it.price || 0) * Math.max(1, Number(it.quantity || 1)),
              0
            );
          }
        }

        const next = Array.from(byId.values())
          .filter((o) => o.items.length > 0)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (!cancelled) setOrders(next);
      } catch (e) {
        if (!cancelled) {
          setOrders([]);
          toast({
            title: t("seller.ordersLoadFailed"),
            description: getErrorMessage(e),
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [supabase, user, isAdmin, ownedVendorIds, toast, t]);

  const visibleOrders = useMemo(() => {
    if (isAdmin) return orders;
    return orders.map((o) => ({
      ...o,
      items: o.items.filter((i) => ownedVendorIdSet.has(i.vendorId)),
    }));
  }, [orders, isAdmin, ownedVendorIdSet]);

  return (
    <div className="dashboard-shell">
      <div className="dashboard-topbar">
        <div className="container">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t("seller.ordersTitle")}</h1>
            <p className="text-sm text-gray-600">{t("seller.ordersSubtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/seller">
              <Button size="sm" variant="outline" className="rounded-full">{t("seller.dashboard")}</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="text-base">{t("seller.loading")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">{t("seller.fetchingOrders")}</CardContent>
          </Card>
        ) : visibleOrders.length === 0 ? (
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="text-base">{t("seller.noOrdersYet")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              {t("seller.noOrdersDesc")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {visibleOrders.map((o) => {
              const relevantItems = o.items;

              // payout = vendor_payout_rwf (93% after platform fee). Fall back to price×qty if 0.
              const sellerPayout = relevantItems.reduce((sum, i) => {
                const p = Number(i.payout || 0);
                return sum + (p > 0 ? p : Number(i.price || 0) * Math.max(1, Number(i.quantity || 1)));
              }, 0);

              return (
                <Card key={o.id} className="dashboard-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
                      <span>{t("seller.order")} #{o.id}</span>
                      <span className="text-sm font-medium text-gray-700">{new Date(o.createdAt).toLocaleString()}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div className="text-gray-700">
                        {t("seller.buyer")}: <span className="font-medium text-gray-900">{o.buyerEmail}</span>
                        <span className="mx-2">•</span>
                        {t("seller.total")}: <span className="font-medium text-gray-900">{formatMoney(o.total)}</span>
                        {!isAdmin ? (
                          <>
                            <span className="mx-2">•</span>
                            Your earnings: <span className="font-semibold text-green-700">{formatMoney(sellerPayout)}</span>
                          </>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-600">{t("seller.orderStatus")}</div>
                        <div className="text-sm font-medium text-gray-900">{o.status}</div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="text-sm font-medium text-gray-900">{t("seller.items")}</div>
                      <div className="mt-2 grid gap-2">
                        {relevantItems.map((i) => (
                          <div key={`${o.id}:${i.productId}`} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                            <div className="text-gray-700">
                              <span className="font-medium text-gray-900">{i.title}</span>
                              <span className="mx-2">•</span>
                              {t("seller.qty")}: <span className="font-medium text-gray-900">{i.quantity}</span>
                            </div>

                            <div className="flex items-center gap-3">
                              <Select
                                value={i.status ?? "Placed"}
                                onValueChange={async (v) => {
                                  if (!supabase) return;
                                  const nextStatus = v as OrderStatus;
                                  try {
                                    // Update the item-level status
                                    const { error: itemErr } = await supabase
                                      .from("order_items")
                                      .update({ status: nextStatus })
                                      .eq("order_id", o.id)
                                      .eq("product_id", i.productId);

                                    if (itemErr) throw new Error(itemErr.message);

                                    // Also update the order-level status so the buyer sees the change
                                    const { error: orderErr } = await supabase
                                      .from("orders")
                                      .update({ status: nextStatus })
                                      .eq("id", o.id);

                                    setOrders((prev) =>
                                      prev.map((ord) => {
                                        if (ord.id !== o.id) return ord;
                                        return {
                                          ...ord,
                                          status: orderErr ? ord.status : nextStatus,
                                          items: ord.items.map((it) =>
                                            it.productId === i.productId ? { ...it, status: nextStatus } : it
                                          ),
                                        };
                                      })
                                    );

                                    toast({
                                      title: `Status updated to ${nextStatus}`,
                                      description: orderErr
                                        ? "Item status was saved, but order header status update is blocked by permissions."
                                        : undefined,
                                    });

                                    // Notify buyer on key status changes (fire-and-forget)
                                    const emailTemplate: Record<string, string> = {
                                      Shipped: "order_shipped",
                                      Delivered: "order_completed",
                                      Cancelled: "order_cancelled",
                                    };
                                    if (o.buyerEmail && emailTemplate[nextStatus]) {
                                      supabase.functions.invoke("send-email", {
                                        body: {
                                          template: emailTemplate[nextStatus],
                                          to: o.buyerEmail,
                                          data: { orderId: o.id },
                                        },
                                      }).catch(() => {});
                                    }
                                  } catch (e) {
                                    toast({
                                      title: t("seller.updateFailed"),
                                      description: getErrorMessage(e),
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SELLER_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="font-medium text-gray-900">{formatMoney(i.price * i.quantity)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
