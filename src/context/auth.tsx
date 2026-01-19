/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthRole } from "@/types/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";

export type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
  role?: AuthRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  signOut: () => Promise<void>;
  setRole: (role: AuthRole) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type DbProfile = {
  role: AuthRole;
  full_name: string | null;
  avatar_url: string | null;
};

async function loadProfileRole(supabase: ReturnType<typeof getSupabaseClient>, userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return (data ?? null) as DbProfile | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const supabase = getSupabaseClient();

  console.log('AuthProvider render - user:', user ? { email: user.email, isReady } : 'null', 'isReady:', isReady);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!supabase) {
        if (!cancelled) setIsReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const s = data.session;
      
      console.log('Auth init - session check:', { hasSession: !!s, email: s?.user?.email });
      
      if (s?.user) {
        const profile = await loadProfileRole(supabase, s.user.id);
        const metadata = s.user.user_metadata as { full_name?: string; name?: string; avatar_url?: string; picture?: string } | null;

        const next: AuthUser = {
          id: s.user.id,
          email: s.user.email ?? undefined,
          name:
            profile?.full_name ??
            metadata?.full_name ??
            metadata?.name,
          picture:
            profile?.avatar_url ??
            metadata?.avatar_url ??
            metadata?.picture,
          role: profile?.role ?? "buyer",
        };
        console.log('Auth init - setting user:', next, 'metadata:', metadata);
        setUserState(next);
      } else {
        console.log('Auth init - no session found');
        setUserState(null);
      }

      if (!cancelled) setIsReady(true);
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, 'User:', session?.user?.email);
      
      if (session?.user) {
        const profile = await loadProfileRole(supabase, session.user.id);
        const metadata = session.user.user_metadata as { full_name?: string; name?: string; avatar_url?: string; picture?: string } | null;

        const next: AuthUser = {
          id: session.user.id,
          email: session.user.email ?? undefined,
          name:
            profile?.full_name ??
            metadata?.full_name ??
            metadata?.name,
          picture:
            profile?.avatar_url ??
            metadata?.avatar_url ??
            metadata?.picture,
          role: profile?.role ?? "buyer",
        };
        console.log('Setting user state:', next, 'metadata:', metadata);
        setUserState(next);
      } else {
        console.log('Clearing user state');
        setUserState(null);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isReady,
      signOut: async () => {
        if (!supabase) {
          setUserState(null);
          return;
        }
        await supabase.auth.signOut();
        setUserState(null);
      },
      setRole: async (role) => {
        if (!supabase) throw new Error("Supabase is not configured");
        if (!user) throw new Error("Not signed in");
        const { error } = await supabase.from("profiles").update({ role }).eq("id", user.id);
        if (error) throw new Error(error.message);
        setUserState((prev) => (prev ? { ...prev, role } : prev));
      },
    }),
    [user, isReady, supabase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
