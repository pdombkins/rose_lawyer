import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Real authentication, shared with Rose.
 *
 * The former version also carried a `demoUser` read from localStorage, which
 * let anyone act as anyone with no account at all. That is gone: identity now
 * comes from the Supabase session, which is the same session Rose established
 * (same origin, same project). `isAdmin` mirrors Rose's user_profiles.is_admin
 * and is what gates the instructor-only screens.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadAdmin = async (u: User | null) => {
      if (!u) {
        if (active) setIsAdmin(false);
        return;
      }
      // Rose locks public.user_profiles down: RLS on, no policies, no grant to
      // `authenticated` — it is only ever read by Rose's backend with the
      // service-role key. So reading it directly from here fails with
      // "permission denied". ks.is_admin() is SECURITY DEFINER and derives the
      // answer from auth.uid(), which is exactly what the ks RLS policies use.
      const { data, error } = await supabase.rpc('is_admin');
      if (error) console.warn('is_admin lookup failed:', error.message);
      if (active) setIsAdmin(Boolean(data));
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        if (!active) return;
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
        void loadAdmin(s?.user ?? null);
      },
    );

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      void loadAdmin(s?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Signs the student out of Rose too — one session, one sign-out.
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
  };

  return {
    user,
    session,
    isAdmin,
    loading,
    signOut,
    isAuthenticated: !!user,
  };
}
