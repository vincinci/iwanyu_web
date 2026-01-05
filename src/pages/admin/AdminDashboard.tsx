import { BadgeCheck, Boxes, ClipboardList, CreditCard, ShieldAlert, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMarketplace } from "@/context/marketplace";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { createId } from "@/lib/ids";
import { formatMoney } from "@/lib/money";
import { getAllCategoryOptions, isRealCategoryName, normalizeCategoryName } from "@/lib/categories";

const nav = [
  { label: "Overview", icon: ClipboardList, href: "/admin" },
  { label: "Vendors", icon: Users, href: "/admin" },
  { label: "Products", icon: Boxes, href: "/admin" },
  { label: "Orders", icon: ClipboardList, href: "/admin" },
  { label: "Payouts", icon: CreditCard, href: "/admin" },
  { label: "Trust & Safety", icon: ShieldAlert, href: "/admin" },
  { label: "Verification", icon: BadgeCheck, href: "/admin" },
];

type VendorApplication = {
  id: string;
  owner_user_id: string;
  store_name: string;
  location: string | null;
  status: "pending" | "approved" | "rejected";
  vendor_id: string | null;
  created_at: string;
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const { products, vendors, refresh } = useMarketplace();

  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const categoryOptions = useMemo(() => getAllCategoryOptions(), []);

  const [categoryEdits, setCategoryEdits] = useState<Record<string, string>>({});

  async function updateProductCategory(productId: string, category: string) {
    if (!supabase) throw new Error("Supabase is not configured");
    const next = category.trim();
    if (!next) throw new Error("Missing category");
    const { error } = await supabase.from("products").update({ category: next }).eq("id", productId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  const productToDelete = useMemo(
    () => (deleteProductId ? products.find((p) => p.id === deleteProductId) : undefined),
    [deleteProductId, products]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) return;
      setLoadingApps(true);
      const { data, error } = await supabase
        .from("vendor_applications")
        .select("id, owner_user_id, store_name, location, status, vendor_id, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        setApplications([]);
      } else {
        setApplications((data ?? []) as VendorApplication[]);
      }
      setLoadingApps(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function approveApplication(app: VendorApplication) {
    if (!supabase) throw new Error("Supabase is not configured");
    const vendorId = createId("v");
    const { error: vendorErr } = await supabase.from("vendors").insert({
      id: vendorId,
      name: app.store_name,
      location: app.location,
      verified: false,
      owner_user_id: app.owner_user_id,
    });
    if (vendorErr) throw new Error(vendorErr.message);

    const { error: appErr } = await supabase
      .from("vendor_applications")
      .update({ status: "approved", vendor_id: vendorId, updated_at: new Date().toISOString() })
      .eq("id", app.id);
    if (appErr) throw new Error(appErr.message);

    setApplications((prev) => prev.filter((x) => x.id !== app.id));
    await refresh();
  }

  async function rejectApplication(app: VendorApplication) {
    if (!supabase) throw new Error("Supabase is not configured");
    const { error } = await supabase
      .from("vendor_applications")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", app.id);
    if (error) throw new Error(error.message);

    setApplications((prev) => prev.filter((x) => x.id !== app.id));
  }

  async function toggleVendorRevoke(vendorId: string, currentRevoked: boolean) {
    if (!supabase) throw new Error("Supabase is not configured");
    const { error } = await supabase
      .from("vendors")
      .update({ revoked: !currentRevoked })
      .eq("id", vendorId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function deleteProductWithReason() {
    if (!supabase) throw new Error("Supabase is not configured");
    if (!user) throw new Error("Not signed in");
    if (!productToDelete) throw new Error("Missing product");

    const vendorId = productToDelete.vendorId;
    const reason = deleteReason.trim();
    if (reason.length < 5) throw new Error("Please provide a short reason (min 5 chars)");

    const vendorName = vendors.find((v) => v.id === vendorId)?.name ?? "Vendor";
    const title = `Product removed: ${productToDelete.title}`;
    const message = `Your product was removed by admin (${vendorName}). Reason: ${reason}`;

    const { error: notifyErr } = await supabase.from("vendor_notifications").insert({
      vendor_id: vendorId,
      product_id: productToDelete.id,
      type: "product_removed",
      title,
      message,
      created_by: user.id,
    });
    if (notifyErr) throw new Error(notifyErr.message);

    const { error: deleteErr } = await supabase.from("products").delete().eq("id", productToDelete.id);
    if (deleteErr) throw new Error(deleteErr.message);

    setDeleteOpen(false);
    setDeleteProductId(null);
    setDeleteReason("");
    await refresh();
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-iwanyu-foreground">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Marketplace operations (starter).</p>
          </div>
          <Link to="/">
            <Button variant="outline" className="rounded-full">Storefront</Button>
          </Link>
        </div>
      </div>

      <div className="container py-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-gray-200 bg-white p-3 h-fit">
          <nav className="space-y-1">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <item.icon size={18} className="text-gray-500" />
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active vendors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-xs text-gray-600">Metrics</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Open disputes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-xs text-gray-600">Metrics</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pending payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{formatMoney(0)}</div>
                <div className="text-xs text-gray-600">Metrics</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vendor applications</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700">
              {loadingApps ? (
                <div className="text-gray-600">Loading...</div>
              ) : applications.length === 0 ? (
                <div className="text-gray-600">No pending applications.</div>
              ) : (
                <div className="space-y-3">
                  {applications.map((a) => (
                    <div key={a.id} className="rounded-lg border border-iwanyu-border bg-white p-4">
                      <div className="font-semibold text-gray-900">{a.store_name}</div>
                      <div className="mt-1 text-xs text-gray-600">Owner: {a.owner_user_id}</div>
                      {a.location ? <div className="mt-1 text-xs text-gray-600">Location: {a.location}</div> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90"
                          onClick={async () => {
                            try {
                              await approveApplication(a);
                              toast({ title: "Approved", description: "Vendor created and application approved." });
                            } catch (e) {
                              toast({
                                title: "Approve failed",
                                description: e instanceof Error ? e.message : "Unknown error",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-full"
                          onClick={async () => {
                            try {
                              await rejectApplication(a);
                              toast({ title: "Rejected", description: "Application rejected." });
                            } catch (e) {
                              toast({
                                title: "Reject failed",
                                description: e instanceof Error ? e.message : "Unknown error",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendors</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700">
              {vendors.length === 0 ? (
                <div className="text-gray-600">No vendors.</div>
              ) : (
                <div className="space-y-3">
                  {vendors.map((v) => (
                    <div key={v.id} className="rounded-lg border border-iwanyu-border bg-white p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{v.name}</div>
                          <div className="mt-1 text-xs text-gray-600">
                            {v.location ?? "No location"} • {v.verified ? "Verified" : "Unverified"}
                          </div>
                          {v.revoked ? (
                            <div className="mt-2 inline-block rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                              Revoked
                            </div>
                          ) : null}
                        </div>
                        <Button
                          variant={v.revoked ? "outline" : "destructive"}
                          className="rounded-full"
                          onClick={async () => {
                            try {
                              await toggleVendorRevoke(v.id, v.revoked ?? false);
                              toast({
                                title: v.revoked ? "Unrevoked" : "Revoked",
                                description: v.revoked
                                  ? "Vendor can now sell products."
                                  : "Vendor cannot sell products.",
                              });
                            } catch (e) {
                              toast({
                                title: "Failed",
                                description: e instanceof Error ? e.message : "Unknown error",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          {v.revoked ? "Unrevoke" : "Revoke"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700">
              {products.length === 0 ? (
                <div className="text-gray-600">No products.</div>
              ) : (
                <div className="space-y-3">
                  {products.slice(0, 50).map((p) => {
                    const vendor = vendors.find((v) => v.id === p.vendorId);
                    const current = normalizeCategoryName(p.category);
                    const selected = categoryEdits[p.id] ?? (isRealCategoryName(current) ? current : "");
                    return (
                      <div key={p.id} className="rounded-lg border border-iwanyu-border bg-white p-4">
                        <div className="font-semibold text-gray-900">{p.title}</div>
                        <div className="mt-1 text-xs text-gray-600">
                          Vendor: {vendor?.name ?? "Unknown"} • Price: {formatMoney(p.price)} • Stock: {p.inStock ? "In" : "Out"}
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                          <div>
                            <div className="text-xs font-medium text-gray-700">Category</div>
                            {categoryOptions.length === 0 ? (
                              <div className="mt-1 text-xs text-gray-500">No categories yet.</div>
                            ) : (
                              <Select
                                value={selected}
                                onValueChange={(v) =>
                                  setCategoryEdits((prev) => ({
                                    ...prev,
                                    [p.id]: v,
                                  }))
                                }
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categoryOptions.map((c) => (
                                    <SelectItem key={c} value={c}>
                                      {c}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          <div className="flex gap-2 md:justify-end">
                            <Button
                              variant="outline"
                              className="rounded-full"
                              disabled={categoryOptions.length === 0 || !selected || selected === current}
                              onClick={async () => {
                                try {
                                  await updateProductCategory(p.id, selected);
                                  toast({ title: "Updated", description: "Category saved." });
                                } catch (e) {
                                  toast({
                                    title: "Update failed",
                                    description: e instanceof Error ? e.message : "Unknown error",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Save category
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link to={`/product/${p.id}`}>
                            <Button variant="outline" className="rounded-full">View</Button>
                          </Link>
                          <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() => {
                              setDeleteProductId(p.id);
                              setDeleteReason("");
                              setDeleteOpen(true);
                            }}
                          >
                            Delete + notify vendor
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {products.length > 50 ? (
                    <div className="text-xs text-gray-500">Showing first 50 products.</div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Must-have admin features for a modern marketplace</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-2">
              <div>• Vendor onboarding + KYC/verification</div>
              <div>• Product moderation & category management</div>
              <div>• Order oversight + refunds/returns</div>
              <div>• Payouts + fees + tax reports</div>
              <div>• Fraud/risk rules + audit logs (events)</div>
              <div>• Dispute management & support tooling</div>
            </CardContent>
          </Card>
        </section>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the product and sends a policy notification to the vendor.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Reason</div>
            <Textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Explain what policy was violated..." />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                try {
                  await deleteProductWithReason();
                  toast({ title: "Deleted", description: "Product removed and vendor notified." });
                } catch (err) {
                  toast({
                    title: "Delete failed",
                    description: err instanceof Error ? err.message : "Unknown error",
                    variant: "destructive",
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
