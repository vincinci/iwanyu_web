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

  console.log('AuthProvider render - user:', user ? { email: user.email, name: user.name, id: user.id } : 'null', 'isReady:', isReady);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      console.log('=== AUTH INIT START ===');
      if (!supabase) {
        console.log('No supabase client');
        if (!cancelled) setIsReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const s = data.session;
      
      console.log('Auth init - session check:', { 
        hasSession: !!s, 
        email: s?.user?.email,
        userId: s?.user?.id,
        hasUserMetadata: !!s?.user?.user_metadata,
        metadata: s?.user?.user_metadata 
      });
      
      if (s?.user) {
        console.log('Session found, loading profile...');
        const profile = await loadProfileRole(supabase, s.user.id);
        console.log('Profile loaded:', profile);
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
        console.log('Auth init - SETTING USER:', next);
        if (!cancelled) {
          setUserState(next);
          console.log('User state SET successfully');
        }
      } else {
        console.log('Auth init - no session found');
        if (!cancelled) setUserState(null);
      }

      if (!cancelled) setIsReady(true);
      console.log('=== AUTH INIT END ===');
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('=== AUTH STATE CHANGE EVENT ===');
      console.log('Event:', event);
      console.log('Session:', { 
        hasSession: !!session, 
        email: session?.user?.email,
        userId: session?.user?.id 
      });
      
      if (event === "SIGNED_IN" && session?.user) {
        console.log('SIGNED_IN event - loading profile...');
        const profile = await loadProfileRole(supabase, session.user.id);
        console.log('Profile loaded:', profile);
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
        console.log('SIGNED_IN - SETTING USER STATE:', next);
        setUserState(next);
        console.log('User state SET via SIGNED_IN event');
      } else if (event === "SIGNED_OUT") {
        console.log('SIGNED_OUT - clearing user state');
        setUserState(null);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        console.log('TOKEN_REFRESHED - keeping existing user');
        // Don't reload profile on every token refresh
      } else {
        console.log('Other event:', event, '- no action');
      }
      console.log('=== AUTH STATE CHANGE END ===');
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
