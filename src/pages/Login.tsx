import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import StorefrontPage from "@/components/StorefrontPage";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const supabase = getSupabaseClient();

  const state = location.state as { from?: { pathname?: string } } | null;
  const nextPath = state?.from?.pathname || "/account";

  useEffect(() => {
    if (user) navigate(nextPath, { replace: true });
  }, [user, navigate, nextPath]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      // Don't navigate here - let the useEffect handle it when user state updates
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError("Supabase is not configured");
      return;
    }

    setError(null);

    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });

    if (e) setError(e.message);
  };

  return (
    <StorefrontPage>
      <div className="container py-10">
        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">Sign in to manage your account and sell products.</p>

              {supabase ? (
                <>
                  <form onSubmit={handleEmailLogin} className="space-y-3">
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
                        className="mt-1"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign in"}
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
                Don't have an account?{" "}
                <Link to="/signup" className="font-semibold text-iwanyu-primary hover:underline">
                  Sign up
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
