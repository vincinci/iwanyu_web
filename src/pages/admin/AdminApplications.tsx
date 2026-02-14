import { BadgeCheck, Users, ClipboardList, Boxes, ShieldAlert, CheckCircle2, X, Clock, Search, Percent } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMarketplace } from "@/context/marketplace";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/languageContext";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { createId } from "@/lib/ids";

const nav = [
  { label: "Overview", icon: ClipboardList, href: "/admin" },
  { label: "Vendors", icon: Users, href: "/admin/vendors" },
  { label: "Products", icon: Boxes, href: "/admin/products" },
  { label: "Discounts", icon: Percent, href: "/admin/discounts" },
  { label: "Applications", icon: BadgeCheck, href: "/admin/applications", active: true },
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

export default function AdminApplicationsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const { refresh } = useMarketplace();
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [allApplications, setAllApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("vendor_applications")
        .select("id, owner_user_id, store_name, location, status, vendor_id, created_at")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setAllApplications(data as VendorApplication[]);
        setApplications(data.filter(a => a.status === "pending") as VendorApplication[]);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filteredApplications = useMemo(() => {
    let result = statusFilter === "all" ? allApplications : allApplications.filter(a => a.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.store_name.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q));
    }
    return result;
  }, [allApplications, statusFilter, searchQuery]);

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <ShieldAlert size={48} className="mx-auto mb-6 text-gray-300" strokeWidth={1} />
          <h2 className="text-2xl font-bold mb-2">{t("admin.accessDenied")}</h2>
          <p className="text-gray-500 mb-6">{t("admin.privilegesRequired")}</p>
          <Link to="/"><Button variant="outline" className="rounded-full">{t("admin.home")}</Button></Link>
        </div>
      </div>
    );
  }

  async function approveApplication(app: VendorApplication) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const vendorId = createId("v");
    
    const { error: vendorErr } = await supabase.from("vendors").insert({
      id: vendorId,
      name: app.store_name,
      location: app.location,
      verified: false,
      owner_user_id: app.owner_user_id,
      status: "approved",
    });
    if (vendorErr) throw new Error(vendorErr.message);

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ role: "seller", updated_at: new Date().toISOString() })
      .eq("id", app.owner_user_id);
    if (profileErr) throw new Error(profileErr.message);

    const { error: appErr } = await supabase
      .from("vendor_applications")
      .update({ status: "approved", vendor_id: vendorId, updated_at: new Date().toISOString() })
      .eq("id", app.id);
    if (appErr) throw new Error(appErr.message);

    setAllApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "approved" as const, vendor_id: vendorId } : a));
    await refresh();
  }

  async function rejectApplication(app: VendorApplication) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const { error } = await supabase
      .from("vendor_applications")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", app.id);
    if (error) throw new Error(error.message);

    setAllApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "rejected" as const } : a));
  }

  const pendingCount = allApplications.filter(a => a.status === "pending").length;
  const approvedCount = allApplications.filter(a => a.status === "approved").length;
  const rejectedCount = allApplications.filter(a => a.status === "rejected").length;

  return (
    <div className="dashboard-shell">
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="iwanyu" className="h-14 w-auto" />
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <Link to="/admin" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Admin</Link>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900 font-semibold text-sm">{t("admin.applications")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">← {t("admin.storefront")}</Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-56 shrink-0">
            <nav className="dashboard-sidebar flex flex-col gap-1">
              {nav.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    item.active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                  {item.label === "Applications" && pendingCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                  )}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold">{t("admin.vendorApplications")}</h1>
                <p className="text-sm text-gray-500">{allApplications.length} {t("admin.totalApplications")}</p>
              </div>
              <div className="flex gap-3">
                <div className="relative w-48">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={t("admin.search")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
            </div>

            {/* Stats Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === "pending" ? "bg-amber-100 text-amber-700" : "bg-white text-gray-500 hover:bg-gray-100 border border-slate-200"
                }`}
              >
                <Clock size={14} className="inline mr-1.5" />
                {t("admin.pending")} ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter("approved")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === "approved" ? "bg-green-100 text-green-700" : "bg-white text-gray-500 hover:bg-gray-100 border border-slate-200"
                }`}
              >
                <CheckCircle2 size={14} className="inline mr-1.5" />
                {t("admin.approved")} ({approvedCount})
              </button>
              <button
                onClick={() => setStatusFilter("rejected")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === "rejected" ? "bg-red-100 text-red-700" : "bg-white text-gray-500 hover:bg-gray-100 border border-slate-200"
                }`}
              >
                <X size={14} className="inline mr-1.5" />
                {t("admin.rejected")} ({rejectedCount})
              </button>
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-100 border border-slate-200"
                }`}
              >
                {t("admin.all")} ({allApplications.length})
              </button>
            </div>

            {/* Applications List */}
            {loading ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <p className="text-gray-500">{t("admin.loadingApplications")}</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="bg-white rounded-xl p-12 border border-dashed border-gray-200 text-center">
                <BadgeCheck size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">{t("admin.noApplicationsFound")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    className={`bg-white rounded-xl p-6 border transition-all ${
                      app.status === "pending" ? "border-amber-200 bg-gradient-to-r from-amber-50 to-white" :
                      app.status === "approved" ? "border-green-200" : "border-red-200"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-lg">{app.store_name}</h4>
                          {app.status === "pending" && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">PENDING</span>
                          )}
                          {app.status === "approved" && (
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">APPROVED</span>
                          )}
                          {app.status === "rejected" && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">REJECTED</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{app.location || t("admin.noLocationSpecified")}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {t("admin.applied")}: {new Date(app.created_at).toLocaleDateString()} • {t("admin.user")}: {app.owner_user_id.slice(0, 8)}...
                        </p>
                      </div>

                      {app.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            className="rounded-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={async () => {
                              try {
                                await approveApplication(app);
                                toast({ title: t("admin.approved"), description: `${app.store_name} ${t("admin.canNowSell")}` });
                              } catch (e) {
                                toast({ title: t("admin.failed"), description: e instanceof Error ? e.message : t("admin.unknownError"), variant: "destructive" });
                              }
                            }}
                          >
                            <CheckCircle2 size={16} className="mr-1" /> {t("admin.approve")}
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-full hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                            onClick={async () => {
                              try {
                                await rejectApplication(app);
                                toast({ title: t("admin.rejected") });
                              } catch (e) {
                                toast({ title: t("admin.failed"), description: e instanceof Error ? e.message : t("admin.unknownError"), variant: "destructive" });
                              }
                            }}
                          >
                            <X size={16} className="mr-1" /> {t("admin.reject")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
