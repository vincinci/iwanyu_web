import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/languageContext";
import { useToast } from "@/hooks/use-toast";
import { getSellerProfileMissingFields, isSellerProfileComplete } from "@/lib/sellerProfile";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type SellerSettingsForm = {
    storeName: string;
    supportEmail: string;
    location: string;
    phone: string;
    description: string;
};

type VendorRow = {
    id: string;
    name: string | null;
    email: string | null;
    location: string | null;
    phone: string | null;
    logo_url: string | null;
    logo_path: string | null;
    banner_url: string | null;
    banner_path: string | null;
    description: string | null;
    profile_completed: boolean | null;
};

export default function SellerSettingsPage() {
  const { user } = useAuth();
    const { t } = useLanguage();
    const { toast } = useToast();
    const supabase = getSupabaseClient();

    const [vendorId, setVendorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string>("");
    const [logoPath, setLogoPath] = useState<string>("");
    const [bannerUrl, setBannerUrl] = useState<string>("");
    const [bannerPath, setBannerPath] = useState<string>("");
    const [form, setForm] = useState<SellerSettingsForm>({
        storeName: "",
        supportEmail: user?.email ?? "",
        location: "",
        phone: "",
        description: "",
    });

    const descriptionDraftKey = useMemo(() => {
        if (!user?.id) return null;
        return `iwanyu:seller:settings:description:${user.id}`;
    }, [user?.id]);

    useEffect(() => {
        if (!descriptionDraftKey) return;
        const draft = localStorage.getItem(descriptionDraftKey);
        if (!draft) return;
        setForm((prev) => ({ ...prev, description: draft }));
    }, [descriptionDraftKey]);

    useEffect(() => {
        if (!descriptionDraftKey) return;
        localStorage.setItem(descriptionDraftKey, form.description);
    }, [descriptionDraftKey, form.description]);

    useEffect(() => {
        let cancelled = false;

        async function loadSettings() {
            if (!user?.id || !supabase) return;
            setLoading(true);

            try {
                const { data, error } = await supabase
                    .from("vendors")
                    .select("id, name, email, location, phone, logo_url, logo_path, banner_url, banner_path, description, profile_completed")
                    .eq("owner_user_id", user.id)
                    .order("updated_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (cancelled) return;
                if (error) throw error;

                const row = (data ?? null) as VendorRow | null;
                setVendorId(row?.id ?? null);
                setForm((prev) => ({
                    ...prev,
                    storeName: row?.name ?? prev.storeName,
                    supportEmail: row?.email ?? user.email ?? prev.supportEmail,
                    location: row?.location ?? prev.location,
                    phone: row?.phone ?? prev.phone,
                    description: row?.description ?? prev.description,
                }));
                setLogoUrl(row?.logo_url ?? "");
                setLogoPath(row?.logo_path ?? "");
                setBannerUrl(row?.banner_url ?? "");
                setBannerPath(row?.banner_path ?? "");
            } catch {
                if (!cancelled) {
                    toast({
                        title: t("sellerSettings.loadFailedTitle"),
                        description: t("sellerSettings.loadFailedDesc"),
                        variant: "destructive",
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadSettings();
        return () => {
            cancelled = true;
        };
    }, [supabase, toast, user?.email, user?.id]);

    async function saveSettings() {
        if (!supabase || !user?.id) return;

        const trimmedName = form.storeName.trim();
        if (!trimmedName) {
            toast({
                title: t("sellerSettings.storeNameRequiredTitle"),
                description: t("sellerSettings.storeNameRequiredDesc"),
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            const nextVendorId = vendorId ?? `vendor-${user.id.slice(0, 8)}`;
            const profileCompleted = isSellerProfileComplete({
                name: trimmedName,
                email: form.supportEmail,
                phone: form.phone,
                location: form.location,
                description: form.description,
                logo_url: logoUrl,
                banner_url: bannerUrl,
            });

            const payload = {
                id: nextVendorId,
                owner_user_id: user.id,
                name: trimmedName,
                email: form.supportEmail.trim() || null,
                location: form.location.trim() || null,
                phone: form.phone.trim() || null,
                description: form.description.trim() || null,
                logo_url: logoUrl || null,
                logo_path: logoPath || null,
                banner_url: bannerUrl || null,
                banner_path: bannerPath || null,
                profile_completed: profileCompleted,
                status: "approved",
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase.from("vendors").upsert(payload, {
                onConflict: "id",
            });

            if (error) throw error;
            setVendorId(nextVendorId);
            const missing = getSellerProfileMissingFields({
                name: trimmedName,
                email: form.supportEmail,
                phone: form.phone,
                location: form.location,
                description: form.description,
                logo_url: logoUrl,
                banner_url: bannerUrl,
            });

            if (missing.length === 0) {
                toast({
                    title: t("sellerSettings.savedTitle"),
                    description: t("sellerSettings.savedCompleteDesc"),
                });
            } else {
                toast({
                    title: t("sellerSettings.savedTitle"),
                    description: `${t("sellerSettings.savedIncompletePrefix")} ${missing.join(", ")}.`,
                });
            }
        } catch {
            toast({
                title: t("sellerSettings.saveFailedTitle"),
                description: t("sellerSettings.saveFailedDesc"),
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    async function uploadBrandingFile(file: File, kind: "logo" | "banner") {
        if (!supabase || !user?.id) return;

        const isImage = file.type.startsWith("image/");
        if (!isImage) {
            toast({
                title: t("sellerSettings.unsupportedFileTitle"),
                description: t("sellerSettings.unsupportedFileDesc"),
                variant: "destructive",
            });
            return;
        }

        const maxBytes = 8 * 1024 * 1024;
        if (file.size > maxBytes) {
            toast({
                title: t("sellerSettings.fileTooLargeTitle"),
                description: t("sellerSettings.fileTooLargeDesc"),
                variant: "destructive",
            });
            return;
        }

        const ext = file.name.includes(".")
            ? file.name.substring(file.name.lastIndexOf(".") + 1).toLowerCase()
            : "jpg";
        const storagePath = `${user.id}/${kind}-${Date.now()}.${ext}`;

        if (kind === "logo") setUploadingLogo(true);
        if (kind === "banner") setUploadingBanner(true);

        try {
            const currentPath = kind === "logo" ? logoPath : bannerPath;
            if (currentPath) {
                await supabase.storage.from("vendor-branding").remove([currentPath]);
            }

            const { error: uploadError } = await supabase.storage
                .from("vendor-branding")
                .upload(storagePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type,
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from("vendor-branding").getPublicUrl(storagePath);
            const publicUrl = data.publicUrl;

            if (kind === "logo") {
                setLogoUrl(publicUrl);
                setLogoPath(storagePath);
            } else {
                setBannerUrl(publicUrl);
                setBannerPath(storagePath);
            }

            toast({
                title: kind === "logo" ? t("sellerSettings.logoUploadedTitle") : t("sellerSettings.bannerUploadedTitle"),
                description: t("sellerSettings.uploadedDesc"),
            });
        } catch {
            toast({
                title: t("sellerSettings.uploadFailedTitle"),
                description: `${t("sellerSettings.uploadFailedPrefix")} ${kind}. ${t("sellerSettings.uploadFailedSuffix")}`,
                variant: "destructive",
            });
        } finally {
            if (kind === "logo") setUploadingLogo(false);
            if (kind === "banner") setUploadingBanner(false);
        }
    }

    const missingFields = useMemo(
        () =>
            getSellerProfileMissingFields({
                name: form.storeName,
                email: form.supportEmail,
                phone: form.phone,
                location: form.location,
                description: form.description,
                logo_url: logoUrl,
                banner_url: bannerUrl,
            }),
        [bannerUrl, form.description, form.location, form.phone, form.storeName, form.supportEmail, logoUrl],
    );

  return (
    <StorefrontPage>
            <div className="dashboard-shell">
                <div className="container py-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-semibold text-gray-900">{t("seller.storeSettings")}</h1>
                <p className="text-gray-500">{t("seller.storeSettingsPageDesc")}</p>
            </div>
            <Link to="/seller">
                <Button variant="outline">{t("seller.backToDashboard")}</Button>
            </Link>
        </div>

        <div className="space-y-8">
            {/* General Information */}
            <div className="dashboard-card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("seller.storeInformation")}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t("seller.storeName")}</label>
                                                <Input
                                                    value={form.storeName}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, storeName: e.target.value }))}
                                                    placeholder={`${user?.name ?? "Your"} Shop`}
                                                />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t("seller.supportEmail")}</label>
                                                <Input
                                                    value={form.supportEmail}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, supportEmail: e.target.value }))}
                                                    placeholder={user?.email || "support@example.com"}
                                                />
                                        </div>
                                        <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t("sellerSettings.storeLocation")}</label>
                                                <Input
                                                    value={form.location}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                                                    placeholder="Kigali, Rwanda"
                                                />
                                        </div>
                                        <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t("sellerSettings.supportPhone")}</label>
                                                <Input
                                                    value={form.phone}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="+2507..."
                                                />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t("seller.storeDescription")}</label>
                                                <textarea
                                                    value={form.description}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                                    className="w-full min-h-[100px] rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                                                    placeholder={t("seller.describeStore")}
                                                />
                                                <p className="mt-2 text-xs text-gray-500">
                                                    {t("sellerSettings.descriptionDraftHint")}
                                                </p>
                    </div>
                </div>
            </div>

            {/* Branding */}
            <div className="dashboard-card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("seller.branding")}</h2>
                <div className="flex items-center gap-6">
                    <label className="h-24 w-24 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs overflow-hidden cursor-pointer">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Store logo" className="h-full w-full object-cover" />
                        ) : (
                            t("seller.uploadLogo")
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                void uploadBrandingFile(file, "logo");
                            }}
                        />
                    </label>
                    <div className="text-xs text-gray-500">
                        {uploadingLogo ? t("sellerSettings.uploadingLogo") : t("sellerSettings.logoHelp")}
                    </div>
                    <label className="flex-1 h-32 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs overflow-hidden cursor-pointer">
                        {bannerUrl ? (
                            <img src={bannerUrl} alt="Store banner" className="h-full w-full object-cover" />
                        ) : (
                            t("seller.uploadBanner")
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                void uploadBrandingFile(file, "banner");
                            }}
                        />
                    </label>
                    <div className="text-xs text-gray-500">
                        {uploadingBanner ? t("sellerSettings.uploadingBanner") : t("sellerSettings.bannerHelp")}
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {missingFields.length === 0
                    ? t("sellerSettings.profileComplete")
                    : `${t("sellerSettings.profileIncompletePrefix")} ${missingFields.join(", ")}.`}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                            <Button
                                onClick={saveSettings}
                                disabled={saving || loading || !supabase || !user}
                                className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-8"
                            >
                                {saving ? t("sellerSettings.saving") : t("seller.saveChanges")}
                            </Button>
            </div>
        </div>
                </div>
            </div>
    </StorefrontPage>
  );
}
