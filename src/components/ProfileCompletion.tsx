import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";

type ProfileCompletionProps = {
  onComplete: () => void;
  onSkip: () => void;
};

type ProfileState = {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  country: string;
};

export function ProfileCompletion({ onComplete, onSkip }: ProfileCompletionProps) {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileState>({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    country: "Rwanda",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load saved draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('profile_draft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setProfile(prev => ({ ...prev, ...draft }));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save draft to localStorage whenever form changes
  useEffect(() => {
    if (profile.full_name || profile.phone || profile.address || profile.city) {
      localStorage.setItem('profile_draft', JSON.stringify(profile));
    }
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user || !supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, phone, address, city, country")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        setProfile({
          full_name: data?.full_name ?? user.name ?? "",
          phone: data?.phone ?? "",
          address: data?.address ?? "",
          city: data?.city ?? "",
          country: data?.country ?? "Rwanda",
        });
      } catch {
        if (!cancelled) {
          setProfile((p) => ({ ...p, full_name: p.full_name || user?.name || "" }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  const handleSave = async () => {
    if (!user || !supabase) return;

    if (!profile.full_name.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your full name.",
        variant: "warning" as any,
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: profile.full_name.trim(),
        phone: profile.phone.trim() || null,
        address: profile.address.trim() || null,
        city: profile.city.trim() || null,
        country: profile.country.trim() || null,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "✓ Profile completed",
        description: "Your profile has been saved successfully.",
        variant: "success" as any,
      });

      // Clear draft from localStorage
      localStorage.removeItem('profile_draft');

      onComplete();
    } catch {
      toast({
        title: "⚠ Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl text-iwanyu-primary">Complete Your Profile</CardTitle>
            <p className="text-gray-600 mt-2">Help us personalize your experience on iwanyu marketplace</p>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600" onClick={onSkip}>
            <X size={20} />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <div className="h-2 flex-1 bg-gray-200 rounded-full">
              <div className="h-2 bg-iwanyu-primary rounded-full w-1/4"></div>
            </div>
            <span className="text-sm text-gray-500">Step 1 of 1</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                className="w-full"
                placeholder="Enter your full name"
                value={profile.full_name}
                onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <Input
                  type="tel"
                  className="w-full"
                  placeholder="+250 xxx xxx xxx"
                  value={profile.phone}
                  onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <Input
                  type="text"
                  className="w-full"
                  placeholder="Kigali"
                  value={profile.city}
                  onChange={(e) => setProfile((prev) => ({ ...prev, city: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <Input
                type="text"
                className="w-full"
                placeholder="Street address"
                value={profile.address}
                onChange={(e) => setProfile((prev) => ({ ...prev, address: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <Input
                type="text"
                className="w-full"
                value={profile.country}
                onChange={(e) => setProfile((prev) => ({ ...prev, country: e.target.value }))}
                disabled={loading}
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex flex-col-reverse md:flex-row gap-3 justify-between">
              <Button variant="outline" className="w-full md:w-auto" onClick={onSkip} disabled={saving}>
                Skip for now
              </Button>
              <Button
                className="w-full md:w-auto bg-iwanyu-primary hover:bg-iwanyu-primary/90"
                onClick={handleSave}
                disabled={saving || loading || !profile.full_name.trim()}
              >
                {saving ? "Saving..." : "Complete Profile"}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-3 text-center">
              You can always update this information later in your account settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
