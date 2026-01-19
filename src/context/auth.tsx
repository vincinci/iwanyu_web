/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthRole } from "@/types/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
  role: AuthRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  signOut: () => Promise<void>;
  setRole: (role: AuthRole) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Load user profile from database and merge with auth metadata
 */
async function buildAuthUser(supabase: ReturnType<typeof getSupabaseClient>, authUser: User): Promise<AuthUser> {
  if (!supabase) {
    // Fallback if no supabase client
    return {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name || authUser.user_metadata?.full_name,
      picture: authUser.user_metadata?.picture || authUser.user_metadata?.avatar_url,
      role: "buyer",
    };
  }

  // Fetch profile from database
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", authUser.id)
    .maybeSingle();

  // Merge database profile with OAuth metadata
  return {
    id: authUser.id,
    email: authUser.email,
    name: profile?.full_name || authUser.user_metadata?.name || authUser.user_metadata?.full_name,
    picture: profile?.avatar_url || authUser.user_metadata?.picture || authUser.user_metadata?.avatar_url,
    role: profile?.role || "buyer",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const supabase = getSupabaseClient();

  /**
   * Load user from current session
   */
  const loadUser = async () => {
    if (!supabase) {
      setIsReady(true);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const authUser = await buildAuthUser(supabase, session.user);
      setUser(authUser);
    } else {
      setUser(null);
    }
    
    setIsReady(true);
  };

  /**
   * Initialize auth on mount
   */
  useEffect(() => {
    loadUser();
  }, []);

  /**
   * Listen for auth state changes
   */
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const authUser = await buildAuthUser(supabase, session.user);
        setUser(authUser);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Keep existing user, don't reload from database on every token refresh
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isReady,
      signOut: async () => {
        if (supabase) {
          await supabase.auth.signOut();
        }
        setUser(null);
      },
      setRole: async (role: AuthRole) => {
        if (!supabase) throw new Error("Supabase is not configured");
        if (!user) throw new Error("Not signed in");
        
        // Update role in database
        const { error } = await supabase
          .from("profiles")
          .update({ role })
          .eq("id", user.id);
        
        if (error) throw new Error(error.message);
        
        // Update local state
        setUser((prev) => (prev ? { ...prev, role } : prev));
      },
      refreshUser: async () => {
        await loadUser();
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
