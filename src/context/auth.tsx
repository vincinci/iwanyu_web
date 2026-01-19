/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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

function buildBaseUser(authUser: User): AuthUser {
  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name || authUser.user_metadata?.full_name,
    picture: authUser.user_metadata?.picture || authUser.user_metadata?.avatar_url,
    role: "buyer",
  };
}

type ProfileRow = {
  role: AuthRole | null;
  full_name: string | null;
  avatar_url: string | null;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then((value) => {
        window.clearTimeout(id);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(id);
        reject(err);
      });
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const supabase = getSupabaseClient();
  const activeUserIdRef = useRef<string | null>(null);

  const hydrateFromProfile = useCallback(
    async (authUser: User, baseUser: AuthUser) => {
      if (!supabase) return;

      try {
        const result = await withTimeout(
          supabase
            .from("profiles")
            .select("role, full_name, avatar_url")
            .eq("id", authUser.id)
            .maybeSingle(),
          6000
        );

        if (result.error) return;
        const profile = (result.data ?? null) as ProfileRow | null;

        const hydrated: AuthUser = {
          ...baseUser,
          name: profile?.full_name || baseUser.name,
          picture: profile?.avatar_url || baseUser.picture,
          role: (profile?.role ?? "buyer") as AuthRole,
        };

        if (activeUserIdRef.current === baseUser.id) {
          setUser(hydrated);
        }
      } catch {
        // Non-blocking: keep base user if profile is slow/unavailable.
      }
    },
    [supabase]
  );

  const setUserFromAuth = useCallback(
    (authUser: User) => {
      const baseUser = buildBaseUser(authUser);
      activeUserIdRef.current = baseUser.id;
      setUser(baseUser);
      void hydrateFromProfile(authUser, baseUser);
    },
    [hydrateFromProfile]
  );

  /**
   * Load user from current session
   */
  const loadUser = useCallback(async () => {
    if (!supabase) {
      setUser(null);
      setIsReady(true);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setUserFromAuth(session.user);
    } else {
      activeUserIdRef.current = null;
      setUser(null);
    }
    
    setIsReady(true);
  }, [supabase, setUserFromAuth]);

  /**
   * Initialize auth on mount
   */
  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  /**
   * Listen for auth state changes
   */
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserFromAuth(session.user);
        setIsReady(true);
      } else if (event === "SIGNED_OUT") {
        activeUserIdRef.current = null;
        setUser(null);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Keep existing user, don't reload from database on every token refresh
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, setUserFromAuth]);

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
    [user, isReady, supabase, loadUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
