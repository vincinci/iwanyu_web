import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth";
import { useMarketplace } from "@/context/marketplace";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { useToast } from "@/hooks/use-toast";
import { Check, Upload, Camera, CreditCard, Store, ArrowRight, ArrowLeft, Loader2, Mail, User } from "lucide-react";

type Step = "account" | "verify-email" | "identity" | "store" | "done";

const STEPS: { id: Step; label: string; description: string }[] = [
  { id: "account", label: "Create account", description: "Sign up to get started" },
  { id: "verify-email", label: "Check email", description: "Confirm your email" },
  { id: "identity", label: "Verify you", description: "Upload your ID and photo" },
  { id: "store", label: "Store details", description: "Name your store" },
  { id: "done", label: "Done", description: "Start selling" },
];

export default function SellerOnboardingPage() {
  const navigate = useNavigate();
  const { user, setRole } = useAuth();
  const { createVendor, refresh } = useMarketplace();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  // Form state
  const [storeName, setStoreName] = useState("");
  const [location, setLocation] = useState("Kigali, Rwanda");
  const [phone, setPhone] = useState("");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Check if user already has a store
  const [existingVendor, setExistingVendor] = useState<{ id: string; name: string } | null>(null);
  const [checkingVendor, setCheckingVendor] = useState(true);

  useEffect(() => {
    async function checkExistingVendor() {
      if (!user || !supabase) {
        setCheckingVendor(false);
        return;
      }
      
      const { data } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("owner_user_id", user.id)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();

      if (data) {
        setExistingVendor(data as { id: string; name: string });
      }
      setCheckingVendor(false);
    }

    checkExistingVendor();
  }, [user, supabase]);

  // Calculate current step
  const getCurrentStep = (): Step => {
    if (!user) return "account";
    if (!user.emailConfirmed) return "verify-email";
    if (existingVendor) return "done";
    if (!selfiePreview || !idFrontPreview) return "identity";
    return "store";
  };

  const currentStep = getCurrentStep();
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // File handlers
  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Upload images to Cloudinary
  const uploadImages = async (): Promise<{ selfieUrl: string; idFrontUrl: string; idBackUrl?: string } | null> => {
    if (!supabase || !user) return null;

    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) {
      toast({ title: "Please sign in again", variant: "destructive" });
      return null;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const accessToken = session.access_token;

      // Upload selfie
      setUploadProgress(10);
      const selfieResult = await uploadImageToCloudinary(selfieFile!, {
        folder: "seller-verification",
        accessToken,
      });

      // Upload ID front
      setUploadProgress(40);
      const idFrontResult = await uploadImageToCloudinary(idFrontFile!, {
        folder: "seller-verification",
        accessToken,
      });

      // Upload ID back (optional)
      let idBackUrl: string | undefined;
      if (idBackFile) {
        setUploadProgress(70);
        const idBackResult = await uploadImageToCloudinary(idBackFile, {
          folder: "seller-verification",
          accessToken,
        });
        idBackUrl = idBackResult.url;
      }

      setUploadProgress(100);
      return {
        selfieUrl: selfieResult.url,
        idFrontUrl: idFrontResult.url,
        idBackUrl,
      };
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload images. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Create store
  const handleCreateStore = async () => {
    if (!user || !supabase) return;

    if (!storeName.trim()) {
      toast({ title: "Store name is required", variant: "destructive" });
      return;
    }

    if (!selfieFile || !idFrontFile) {
      toast({ title: "Please upload your photo and ID", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      // Upload images first
      const images = await uploadImages();
      if (!images) {
        setSubmitting(false);
        return;
      }

      // Set role to seller
      await setRole("seller");

      // Create vendor with verification images
      const vendor = await createVendor({
        name: storeName.trim(),
        location: location.trim() || undefined,
        verified: false,
        ownerUserId: user.id,
        status: "approved",
      });

      // Update vendor with verification images
      await supabase
        .from("vendors")
        .update({
          selfie_url: images.selfieUrl,
          id_front_url: images.idFrontUrl,
          id_back_url: images.idBackUrl || null,
          phone: phone.trim() || null,
          email: user.email,
          verification_status: "pending",
        })
        .eq("id", vendor.id);

      await refresh();

      toast({
        title: "Store created!",
        description: "Welcome to Iwanyu. Your store is ready.",
      });

      setExistingVendor({ id: vendor.id, name: vendor.name });
    } catch (error) {
      console.error("Store creation failed:", error);
      toast({
        title: "Could not create store",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Resend verification email
  const resendVerificationEmail = async () => {
    if (!supabase || !user) return;

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email!,
      });

      if (error) throw error;

      toast({
        title: "Email sent",
        description: "Please check your inbox.",
      });
    } catch (error) {
      toast({
        title: "Could not send email",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  if (checkingVendor) {
    return (
      <StorefrontPage>
        <div className="container min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      </StorefrontPage>
    );
  }

  return (
    <StorefrontPage>
      <div className="container min-h-screen py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Seller</h1>
            <p className="text-gray-600">Simple steps to open your store</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-10">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isComplete = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isLast = index === STEPS.length - 1;

                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          isComplete
                            ? "bg-green-500 text-white"
                            : isCurrent
                            ? "bg-amber-400 text-black"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {isComplete ? <Check size={18} /> : index + 1}
                      </div>
                      <span
                        className={`mt-2 text-xs text-center hidden md:block ${
                          isCurrent ? "text-gray-900 font-medium" : "text-gray-500"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div
                        className={`flex-1 h-1 mx-2 rounded ${
                          isComplete ? "bg-green-500" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
            {/* Step 1: Account */}
            {currentStep === "account" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <User size={28} className="text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Create your account</h2>
                <p className="text-gray-600 mb-6">
                  First, you need an account. This takes less than 1 minute.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  <strong>What happens next:</strong> After signing up, you will verify your email,
                  then upload your ID to prove who you are.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/signup?next=/sell">
                    <Button className="w-full sm:w-auto rounded-full bg-amber-400 text-black hover:bg-amber-500">
                      Create account <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                  <Link to="/login?next=/sell">
                    <Button variant="outline" className="w-full sm:w-auto rounded-full">
                      I have an account
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Step 2: Verify Email */}
            {currentStep === "verify-email" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail size={28} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
                <p className="text-gray-600 mb-4">
                  We sent a link to <strong>{user?.email}</strong>
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Click the link in the email to confirm your account. Then come back here.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  <strong>What happens next:</strong> After confirming, you will upload your photo and ID.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={resendVerificationEmail}
                  >
                    Send email again
                  </Button>
                  <Button
                    className="rounded-full bg-amber-400 text-black hover:bg-amber-500"
                    onClick={() => window.location.reload()}
                  >
                    I confirmed my email
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Identity Verification */}
            {currentStep === "identity" && (
              <div>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard size={28} className="text-purple-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Verify your identity</h2>
                  <p className="text-gray-600">
                    Upload a photo of yourself and your ID card. This keeps our marketplace safe.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Selfie Upload */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Your photo (selfie) *
                    </Label>
                    <p className="text-xs text-gray-500 mb-3">
                      Take a clear photo of your face. Look at the camera.
                    </p>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={(e) => handleFileSelect(e, setSelfieFile, setSelfiePreview)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                          selfiePreview
                            ? "border-green-300 bg-green-50"
                            : "border-gray-300 hover:border-amber-400"
                        }`}
                      >
                        {selfiePreview ? (
                          <div className="flex items-center gap-4">
                            <img
                              src={selfiePreview}
                              alt="Your photo"
                              className="w-20 h-20 rounded-full object-cover"
                            />
                            <div className="text-left">
                              <p className="font-medium text-green-700">Photo uploaded</p>
                              <p className="text-sm text-gray-500">Click to change</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Camera size={32} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">
                              Click to take a photo or select from gallery
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ID Front Upload */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      ID card (front) *
                    </Label>
                    <p className="text-xs text-gray-500 mb-3">
                      Take a photo of the front of your national ID or passport.
                    </p>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileSelect(e, setIdFrontFile, setIdFrontPreview)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                          idFrontPreview
                            ? "border-green-300 bg-green-50"
                            : "border-gray-300 hover:border-amber-400"
                        }`}
                      >
                        {idFrontPreview ? (
                          <div className="flex items-center gap-4">
                            <img
                              src={idFrontPreview}
                              alt="ID front"
                              className="w-24 h-16 rounded-lg object-cover"
                            />
                            <div className="text-left">
                              <p className="font-medium text-green-700">ID front uploaded</p>
                              <p className="text-sm text-gray-500">Click to change</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">
                              Click to upload ID front
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ID Back Upload (Optional) */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      ID card (back) - optional
                    </Label>
                    <p className="text-xs text-gray-500 mb-3">
                      If your ID has info on the back, upload it here.
                    </p>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileSelect(e, setIdBackFile, setIdBackPreview)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                          idBackPreview
                            ? "border-green-300 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {idBackPreview ? (
                          <div className="flex items-center gap-4">
                            <img
                              src={idBackPreview}
                              alt="ID back"
                              className="w-20 h-14 rounded-lg object-cover"
                            />
                            <div className="text-left">
                              <p className="font-medium text-green-700">ID back uploaded</p>
                              <p className="text-sm text-gray-500">Click to change</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Click to upload ID back (optional)</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 text-center">
                    <strong>What happens next:</strong> After uploading, you will enter your store name.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Store Details */}
            {currentStep === "store" && (
              <div>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Store size={28} className="text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Create your store</h2>
                  <p className="text-gray-600">
                    Almost done! Give your store a name.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="storeName" className="text-sm font-medium text-gray-700">
                      Store name *
                    </Label>
                    <Input
                      id="storeName"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Example: Kigali Fashion Shop"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This is the name customers will see.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Phone number (optional)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+250 7XX XXX XXX"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      We may contact you about your store.
                    </p>
                  </div>

                  {uploading && (
                    <div className="bg-amber-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin text-amber-600" size={20} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800">Uploading images...</p>
                          <div className="w-full bg-amber-200 rounded-full h-2 mt-2">
                            <div
                              className="bg-amber-500 h-2 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleCreateStore}
                    disabled={submitting || uploading || !storeName.trim()}
                    className="w-full rounded-full bg-amber-400 text-black hover:bg-amber-500 h-12 text-base"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Creating store...
                      </>
                    ) : (
                      <>
                        Create my store <ArrowRight size={18} className="ml-2" />
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelfieFile(null);
                      setSelfiePreview(null);
                      setIdFrontFile(null);
                      setIdFrontPreview(null);
                    }}
                    className="w-full text-gray-500"
                  >
                    <ArrowLeft size={16} className="mr-2" /> Go back to ID upload
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Done */}
            {currentStep === "done" && existingVendor && (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={36} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your store is ready!</h2>
                <p className="text-gray-600 mb-2">
                  Store name: <strong>{existingVendor.name}</strong>
                </p>
                <p className="text-sm text-gray-500 mb-8">
                  You can now add products and start selling.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/seller">
                    <Button className="w-full sm:w-auto rounded-full bg-amber-400 text-black hover:bg-amber-500">
                      Open my dashboard
                    </Button>
                  </Link>
                  <Link to="/seller/products/new">
                    <Button variant="outline" className="w-full sm:w-auto rounded-full">
                      Add my first product
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Need help? Contact us at{" "}
              <a href="mailto:support@iwanyu.store" className="text-amber-600 hover:underline">
                support@iwanyu.store
              </a>
            </p>
          </div>
        </div>
      </div>
    </StorefrontPage>
  );
}
