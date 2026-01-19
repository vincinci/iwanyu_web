import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import StorefrontPage from "@/components/StorefrontPage";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useEffect } from "react";

export default function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const supabase = getSupabaseClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/account", { replace: true });
  }, [user, navigate]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
          },
        },
      });

      if (signUpError) throw signUpError;

      navigate("/account");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!supabase) {
      setError("Supabase is not configured");
      return;
    }

    setError(null);

    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/account` },
    });

    if (e) setError(e.message);
  };

  return (
    <StorefrontPage>
      <div className="container py-10">
        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Create account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">Sign up to shop and sell on iwanyu marketplace.</p>

              {supabase ? (
                <>
                  <form onSubmit={handleEmailSignup} className="space-y-3">
                    <div>
                      <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                        Full name (optional)
                      </Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="mt-1"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90"
                      disabled={loading}
                    >
                      {loading ? "Creating account..." : "Sign up"}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="rounded-lg border border-iwanyu-border bg-white p-4 text-sm text-gray-700">
                  <div className="font-semibold">Supabase auth is not configured</div>
                  <div className="mt-1 text-gray-600">
                    Set <span className="font-mono">VITE_SUPABASE_URL</span> and{" "}
                    <span className="font-mono">VITE_SUPABASE_ANON_KEY</span>.
                  </div>
                </div>
              )}

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
              ) : null}

              <div className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-iwanyu-primary hover:underline">
                  Sign in
                </Link>
              </div>

              <Button variant="outline" className="w-full rounded-full" onClick={() => navigate("/")}>
                Continue shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </StorefrontPage>
  );
}
