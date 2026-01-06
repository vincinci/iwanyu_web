import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth";
import { useMarketplace } from "@/context/marketplace";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { createId } from "@/lib/ids";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

export default function VendorApplicationPage() {
  const navigate = useNavigate();
  const { user, setRole } = useAuth();
  const { createVendor, getVendorsForOwner, refresh } = useMarketplace();
  const supabase = getSupabaseClient();

  const [step, setStep] = useState(1);
  const [storeName, setStoreName] = useState("");
  const [location, setLocation] = useState("Kigali, Rwanda");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const myVendors = useMemo(() => (user ? getVendorsForOwner(user.id) : []), [user, getVendorsForOwner]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/vendor-application" } } });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (myVendors.length > 0) {
      navigate("/seller");
    }
  }, [myVendors, navigate]);

  const canProceedStep1 = storeName.trim().length >= 2;
  const canProceedStep2 = location.trim().length >= 2;
  const canSubmit = canProceedStep1 && canProceedStep2;

  const handleSubmit = async () => {
    if (!supabase || !user) return;

    setSubmitting(true);
    try {
      await setRole("seller");

      const vendorId = createId("v");
      const { error: vendorErr } = await supabase.from("vendors").insert({
        id: vendorId,
        name: storeName.trim(),
        location: location.trim(),
        verified: false,
        owner_user_id: user.id,
        status: 'approved',
      });

      if (vendorErr) throw new Error(vendorErr.message);

      const applicationId = createId("va");
      const { error: appErr } = await supabase.from("vendor_applications").insert({
        id: applicationId,
        owner_user_id: user.id,
        store_name: storeName.trim(),
        location: location.trim(),
        status: "approved",
        vendor_id: vendorId,
      });

      if (appErr) throw new Error(appErr.message);

      await refresh();
      navigate("/seller");
    } catch (e) {
      console.error("Vendor application failed:", e);
      alert(e instanceof Error ? e.message : "Application failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <StorefrontPage>
        <div className="container py-10 text-center">
          <p className="text-gray-600">Please sign in to continue.</p>
        </div>
      </StorefrontPage>
    );
  }

  return (
    <StorefrontPage>
      <div className="container py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-iwanyu-foreground">Become a seller</h1>
          <p className="mt-1 text-gray-600">Complete the 3-step application to start selling on iwanyu.</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-1 items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                  s < step
                    ? "bg-green-500 text-white"
                    : s === step
                    ? "bg-iwanyu-primary text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {s < step ? <Check size={20} /> : s}
              </div>
              {s < 3 && <div className={`mx-2 h-1 flex-1 ${s < step ? "bg-green-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Step 1: Store information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="storeName" className="text-sm font-medium text-gray-700">
                    Store name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="storeName"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Your store name"
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-gray-600">Choose a unique name for your store.</p>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Store description (optional)
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell customers about your store"
                    className="mt-1"
                    rows={4}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1 rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90"
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                  >
                    Next
                  </Button>
                  <Link to="/" className="flex-1">
                    <Button variant="outline" className="w-full rounded-full">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Step 2: Business details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                    Location <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Country"
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-gray-600">Where are you based?</p>
                </div>

                <div>
                  <Label htmlFor="contactPhone" className="text-sm font-medium text-gray-700">
                    Contact phone (optional)
                  </Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+250 XXX XXX XXX"
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1 rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90"
                    onClick={() => setStep(3)}
                    disabled={!canProceedStep2}
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Step 3: Review and submit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 rounded-lg border border-iwanyu-border bg-gray-50 p-4 text-sm">
                  <div>
                    <div className="font-semibold text-gray-700">Store name</div>
                    <div className="text-gray-900">{storeName}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700">Location</div>
                    <div className="text-gray-900">{location}</div>
                  </div>
                  {description && (
                    <div>
                      <div className="font-semibold text-gray-700">Description</div>
                      <div className="text-gray-900">{description}</div>
                    </div>
                  )}
                  {contactPhone && (
                    <div>
                      <div className="font-semibold text-gray-700">Contact phone</div>
                      <div className="text-gray-900">{contactPhone}</div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  <div className="font-semibold">Auto-approval enabled</div>
                  <div className="mt-1">
                    Your vendor account will be created immediately. You can start listing products right away!
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1 rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90"
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                  >
                    {submitting ? "Creating store..." : "Submit application"}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have a store?{" "}
          <Link to="/seller" className="font-semibold text-iwanyu-primary hover:underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    </StorefrontPage>
  );
}
