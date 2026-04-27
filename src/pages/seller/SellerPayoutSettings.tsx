import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Smartphone, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabaseClient";

const LOCK_DAYS = 14;

type PayoutSettingsRow = {
  id: string;
  vendor_id: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  bank_set_at: string | null;
  mobile_provider: string | null;
  mobile_number: string | null;
  mobile_account_name: string | null;
  mobile_set_at: string | null;
};

function daysUntilUnlock(setAt: string | null): number {
  if (!setAt) return 0;
  const unlockAt = new Date(setAt).getTime() + LOCK_DAYS * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((unlockAt - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

function LockBadge({ daysLeft }: { daysLeft: number }) {
  if (daysLeft <= 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
      <Lock size={12} />
      Locked for {daysLeft} more day{daysLeft !== 1 ? "s" : ""}
    </div>
  );
}

export default function SellerPayoutSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBank, setSavingBank] = useState(false);
  const [savingMobile, setSavingMobile] = useState(false);
  const [existing, setExisting] = useState<PayoutSettingsRow | null>(null);

  // Bank form
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");

  // Mobile form
  const [mobileProvider, setMobileProvider] = useState("MTN");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileName, setMobileName] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase || !user?.id) { setLoading(false); return; }

      const { data: vendorData } = await supabase
        .from("vendors")
        .select("id")
        .eq("owner_user_id", user.id)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      const vid = (vendorData as { id: string } | null)?.id ?? null;
      setVendorId(vid);
      if (!vid) { setLoading(false); return; }

      const { data } = await supabase
        .from("vendor_payout_settings")
        .select("*")
        .eq("vendor_id", vid)
        .maybeSingle();

      if (cancelled) return;
      const row = data as PayoutSettingsRow | null;
      setExisting(row);
      if (row) {
        setBankName(row.bank_name ?? "");
        setBankAccount(row.bank_account_number ?? "");
        setBankHolder(row.bank_account_holder ?? "");
        setMobileProvider(row.mobile_provider ?? "MTN");
        setMobileNumber(row.mobile_number ?? "");
        setMobileName(row.mobile_account_name ?? "");
      }
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [supabase, user?.id]);

  const bankLockDays = daysUntilUnlock(existing?.bank_set_at ?? null);
  const mobileLockDays = daysUntilUnlock(existing?.mobile_set_at ?? null);

  async function saveBank() {
    if (!supabase || !vendorId) return;
    if (!bankName.trim() || !bankAccount.trim() || !bankHolder.trim()) {
      toast({ title: "Fill in all bank fields", variant: "destructive" });
      return;
    }
    setSavingBank(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        vendor_id: vendorId,
        bank_name: bankName.trim(),
        bank_account_number: bankAccount.trim(),
        bank_account_holder: bankHolder.trim(),
        bank_set_at: existing?.bank_set_at ?? now,
        updated_at: now,
      };
      const { error } = existing
        ? await supabase.from("vendor_payout_settings").update(payload).eq("vendor_id", vendorId)
        : await supabase.from("vendor_payout_settings").insert({ ...payload, mobile_provider: null, mobile_number: null, mobile_account_name: null, mobile_set_at: null });
      if (error) throw error;
      // refresh
      const { data } = await supabase.from("vendor_payout_settings").select("*").eq("vendor_id", vendorId).maybeSingle();
      setExisting(data as PayoutSettingsRow | null);
      toast({ title: "Bank account saved" });
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setSavingBank(false);
    }
  }

  async function saveMobile() {
    if (!supabase || !vendorId) return;
    if (!mobileNumber.trim() || !mobileName.trim()) {
      toast({ title: "Fill in all mobile money fields", variant: "destructive" });
      return;
    }
    setSavingMobile(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        vendor_id: vendorId,
        mobile_provider: mobileProvider,
        mobile_number: mobileNumber.trim(),
        mobile_account_name: mobileName.trim(),
        mobile_set_at: existing?.mobile_set_at ?? now,
        updated_at: now,
      };
      const { error } = existing
        ? await supabase.from("vendor_payout_settings").update(payload).eq("vendor_id", vendorId)
        : await supabase.from("vendor_payout_settings").insert({ ...payload, bank_name: null, bank_account_number: null, bank_account_holder: null, bank_set_at: null });
      if (error) throw error;
      const { data } = await supabase.from("vendor_payout_settings").select("*").eq("vendor_id", vendorId).maybeSingle();
      setExisting(data as PayoutSettingsRow | null);
      toast({ title: "Mobile money saved" });
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setSavingMobile(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container py-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Payout Settings</h1>
            <p className="text-sm text-muted-foreground">Set where your earnings are sent. Each method locks for {LOCK_DAYS} days after saving.</p>
          </div>
          <Link to="/seller/payouts">
            <Button variant="outline" className="shrink-0">Back to Payouts</Button>
          </Link>
        </div>
      </div>

      <div className="container py-8 max-w-2xl space-y-6">
        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
        ) : !vendorId ? (
          <div className="rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            You don't have an approved store yet. <Link to="/sell" className="underline font-medium">Apply to sell</Link>.
          </div>
        ) : (
          <>
            {/* Bank Account */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center">
                      <Building2 size={18} className="text-blue-600" />
                    </div>
                    <CardTitle className="text-base">Bank Account</CardTitle>
                    {existing?.bank_account_number && bankLockDays <= 0 && (
                      <CheckCircle2 size={16} className="text-green-500" />
                    )}
                  </div>
                  <LockBadge daysLeft={bankLockDays} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {bankLockDays > 0 && (
                  <div className="flex gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>This account was recently saved and is locked for <strong>{bankLockDays} more day{bankLockDays !== 1 ? "s" : ""}</strong>. You can change it after the lock period ends.</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Bank name</label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Bank of Kigali" disabled={bankLockDays > 0} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Account number</label>
                  <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="000123456789" disabled={bankLockDays > 0} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Account holder name</label>
                  <Input value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} placeholder="Full name as on account" disabled={bankLockDays > 0} />
                </div>
                <Button
                  className="w-full rounded-lg"
                  onClick={() => void saveBank()}
                  disabled={savingBank || bankLockDays > 0}
                >
                  {savingBank ? "Saving…" : existing?.bank_account_number ? "Update bank account" : "Save bank account"}
                </Button>
              </CardContent>
            </Card>

            {/* Mobile Money */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-yellow-50 flex items-center justify-center">
                      <Smartphone size={18} className="text-yellow-600" />
                    </div>
                    <CardTitle className="text-base">Mobile Money</CardTitle>
                    {existing?.mobile_number && mobileLockDays <= 0 && (
                      <CheckCircle2 size={16} className="text-green-500" />
                    )}
                  </div>
                  <LockBadge daysLeft={mobileLockDays} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {mobileLockDays > 0 && (
                  <div className="flex gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>This number was recently saved and is locked for <strong>{mobileLockDays} more day{mobileLockDays !== 1 ? "s" : ""}</strong>.</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Provider</label>
                  <div className="flex gap-2">
                    {["MTN", "Airtel"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setMobileProvider(p)}
                        disabled={mobileLockDays > 0}
                        className={`flex-1 rounded-lg border py-2 text-sm font-medium transition disabled:opacity-50 ${mobileProvider === p ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 hover:border-gray-400"}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Phone number</label>
                  <Input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="+250 7XX XXX XXX" disabled={mobileLockDays > 0} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Account name</label>
                  <Input value={mobileName} onChange={(e) => setMobileName(e.target.value)} placeholder="Registered name" disabled={mobileLockDays > 0} />
                </div>
                <Button
                  className="w-full rounded-lg"
                  onClick={() => void saveMobile()}
                  disabled={savingMobile || mobileLockDays > 0}
                >
                  {savingMobile ? "Saving…" : existing?.mobile_number ? "Update mobile money" : "Save mobile money"}
                </Button>
              </CardContent>
            </Card>

            <p className="text-xs text-center text-muted-foreground">
              Payment methods are locked for {LOCK_DAYS} days after saving to protect your earnings. Contact support if you urgently need to change them.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
