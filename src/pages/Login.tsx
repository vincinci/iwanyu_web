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

  // Handle OAuth callback
  useEffect(() => {
    if (!supabase) return;

    const handleOAuthCallback = async () => {
      // Check for OAuth code in URL params (PKCE flow)
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      
      // Also check for access_token in hash (implicit flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      
      if (code || accessToken) {
        console.log('OAuth callback detected', { hasCode: !!code, hasToken: !!accessToken });
        
        // Give Supabase time to exchange the code for a session
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if session exists
        const { data } = await supabase.auth.getSession();
        console.log('Session after OAuth:', { hasSession: !!data.session, email: data.session?.user?.email });
        
        if (data.session) {
          // Clear the OAuth parameters from URL
          window.history.replaceState(null, '', window.location.pathname);
          
          // Force a full page reload to ensure auth state is properly initialized
          // This is more reliable than React Router navigation for OAuth callbacks
          window.location.href = nextPath;
        } else {
          console.error('No session found after OAuth callback');
          // Retry once more
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: retryData } = await supabase.auth.getSession();
          if (retryData.session) {
            window.history.replaceState(null, '', window.location.pathname);
            window.location.href = nextPath;
          }
        }
      }
    };

    handleOAuthCallback();
  }, [supabase, nextPath, navigate]);

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
      options: { 
        redirectTo: `${window.location.origin}/account`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
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

                  <div className="relative">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-500">
                      OR
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full rounded-full"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
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
