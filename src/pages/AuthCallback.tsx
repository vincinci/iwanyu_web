import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const next = searchParams.get("next") || "/account";

    if (!supabase) {
      setError("Authentication is not configured.");
      return;
    }

    const authError = searchParams.get("error_description") || searchParams.get("error");
    if (authError) {
      setError(authError);
      return;
    }

    const code = searchParams.get("code");

    async function completeAuth() {
      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error("Could not complete Google sign-in.");
          }
        }

        navigate(next, { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not complete authentication.");
      }
    }

    void completeAuth();
  }, [navigate, searchParams]);

  return (
    <StorefrontPage>
      <div className="container py-20">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center">
          {error ? (
            <>
              <h1 className="text-xl font-semibold text-gray-900">Google sign-in failed</h1>
              <p className="mt-3 text-sm text-gray-600">{error}</p>
              <button
                className="mt-6 rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white"
                onClick={() => navigate("/login", { replace: true })}
              >
                Back to login
              </button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-900">Completing sign-in</h1>
              <p className="mt-3 text-sm text-gray-600">Please wait while we securely sign you in.</p>
            </>
          )}
        </div>
      </div>
    </StorefrontPage>
  );
}
