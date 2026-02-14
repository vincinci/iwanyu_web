import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, ClipboardList, Percent, Search, ShieldAlert, Tag, Trash2, Users, Boxes } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/languageContext";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DiscountCodeRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  amount_rwf: number | null;
  percentage: number | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  min_subtotal_rwf: number;
  max_redemptions: number | null;
  redeemed_count: number;
  created_at: string;
};

const nav = [
  { label: "Overview", icon: ClipboardList, href: "/admin" },
  { label: "Vendors", icon: Users, href: "/admin/vendors" },
  { label: "Products", icon: Boxes, href: "/admin/products" },
  { label: "Discounts", icon: Percent, href: "/admin/discounts", active: true },
  { label: "Applications", icon: BadgeCheck, href: "/admin/applications" },
];

export default function AdminDiscountsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const supabase = getSupabaseClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DiscountCodeRow[]>([]);
  const [search, setSearch] = useState("");

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [percentage, setPercentage] = useState("10");
  const [amountRwf, setAmountRwf] = useState("1000");
  const [minSubtotalRwf, setMinSubtotalRwf] = useState("0");
  const [maxRedemptions, setMaxRedemptions] = useState("");

  async function load() {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("discount_codes")
        .select(
          "id, code, description, discount_type, amount_rwf, percentage, active, starts_at, ends_at, min_subtotal_rwf, max_redemptions, redeemed_count, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      setRows((data ?? []) as DiscountCodeRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.code.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q));
  }, [rows, search]);

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <ShieldAlert size={48} className="mx-auto mb-6 text-gray-300" strokeWidth={1} />
          <h2 className="text-2xl font-bold mb-2">{t("admin.accessDenied")}</h2>
          <p className="text-gray-500 mb-6">{t("admin.privilegesRequired")}</p>
          <Link to="/">
            <Button variant="outline" className="rounded-full">
              {t("admin.home")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  async function createCode() {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));

    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length < 3) throw new Error(t("admin.codeMin"));

    const minSubtotal = Math.max(0, Math.round(Number(minSubtotalRwf || 0)));

    const payload: Partial<DiscountCodeRow> & {
      code: string;
      discount_type: "percentage" | "fixed";
      min_subtotal_rwf: number;
      created_by: string;
    } = {
      code: normalizedCode,
      description: description.trim() ? description.trim() : null,
      discount_type: type,
      min_subtotal_rwf: minSubtotal,
      max_redemptions: maxRedemptions.trim() ? Math.max(0, Math.round(Number(maxRedemptions))) : null,
      created_by: user.id,
      active: true,
      amount_rwf: null,
      percentage: null,
    };

    if (type === "percentage") {
      const pct = Math.max(1, Math.min(100, Math.round(Number(percentage))));
      payload.percentage = pct;
    } else {
      const amt = Math.max(0, Math.round(Number(amountRwf)));
      payload.amount_rwf = amt;
    }

    const { error } = await supabase.from("discount_codes").insert(payload);
    if (error) throw new Error(error.message);

    setCode("");
    setDescription("");
    toast({ title: t("admin.created"), description: `${t("admin.discountCode")} ${normalizedCode} ${t("admin.createdLower")}` });
    await load();
  }

  async function toggleActive(row: DiscountCodeRow) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const { error } = await supabase.from("discount_codes").update({ active: !row.active }).eq("id", row.id);
    if (error) throw new Error(error.message);
    await load();
  }

  async function deleteCode(row: DiscountCodeRow) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const ok = window.confirm(`${t("admin.deleteCodeConfirm")} ${row.code}?`);
    if (!ok) return;
    const { error } = await supabase.from("discount_codes").delete().eq("id", row.id);
    if (error) throw new Error(error.message);
    await load();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200/70">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="iwanyu" className="h-14 w-auto" />
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <Link
                to="/admin"
                className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                Admin
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900 font-semibold text-sm">{t("admin.discounts")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              ← {t("admin.storefront")}
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-56 shrink-0">
            <nav className="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-2">
              {nav.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <main className="flex-1 space-y-6">
            {/* Create */}
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Tag size={16} className="text-amber-600" />
                <h1 className="text-xl font-bold">{t("admin.createDiscountCode")}</h1>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-500">{t("admin.code")}</label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SAVE10" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">{t("admin.description")}</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="10% off"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">{t("admin.type")}</label>
                  <Select value={type} onValueChange={(v) => setType(v as "percentage" | "fixed")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t("admin.percentage")}</SelectItem>
                      <SelectItem value="fixed">{t("admin.fixedAmountRwf")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">{t("admin.value")}</label>
                  {type === "percentage" ? (
                    <Input
                      value={percentage}
                      onChange={(e) => setPercentage(e.target.value)}
                      placeholder="10"
                      inputMode="numeric"
                    />
                  ) : (
                    <Input
                      value={amountRwf}
                      onChange={(e) => setAmountRwf(e.target.value)}
                      placeholder="1000"
                      inputMode="numeric"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500">{t("admin.minSubtotalRwf")}</label>
                  <Input
                    value={minSubtotalRwf}
                    onChange={(e) => setMinSubtotalRwf(e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">{t("admin.maxRedemptionsOptional")}</label>
                  <Input
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                    placeholder=""
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  className="rounded-full bg-black text-white hover:bg-gray-800"
                  onClick={async () => {
                    try {
                      await createCode();
                    } catch (e) {
                      toast({
                        title: t("admin.failed"),
                        description: e instanceof Error ? e.message : t("admin.unknownError"),
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {t("admin.create")}
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <div className="font-semibold">{t("admin.discountCodes")}</div>
                <div className="relative w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={t("admin.searchCodes")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.code")}</TableHead>
                    <TableHead>{t("admin.type")}</TableHead>
                    <TableHead>{t("admin.minSubtotal")}</TableHead>
                    <TableHead>{t("admin.redeemed")}</TableHead>
                    <TableHead>{t("admin.status")}</TableHead>
                    <TableHead className="text-right">{t("admin.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-semibold">{r.code}</TableCell>
                      <TableCell>
                        {r.discount_type === "percentage"
                          ? `${r.percentage ?? 0}%`
                          : `${r.amount_rwf ?? 0} RWF`}
                      </TableCell>
                      <TableCell>{r.min_subtotal_rwf}</TableCell>
                      <TableCell>
                        {r.redeemed_count}
                        {r.max_redemptions ? ` / ${r.max_redemptions}` : ""}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {r.active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={async () => {
                              try {
                                await toggleActive(r);
                              } catch (e) {
                                toast({
                                  title: "Failed",
                                  description: e instanceof Error ? e.message : "Unknown error",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            {r.active ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-full"
                            onClick={async () => {
                              try {
                                await deleteCode(r);
                              } catch (e) {
                                toast({
                                  title: "Failed",
                                  description: e instanceof Error ? e.message : "Unknown error",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-10">
                        No discount codes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
