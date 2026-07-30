import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Supabase client for the Kendry & Slate practice-management system.
 *
 * Post-merge (30 Jul 2026) this points at the SAME Supabase project as Rose,
 * reading the K&S tables from the `ks` schema. Three consequences worth
 * knowing before you change anything here:
 *
 * 1. AUTH IS SHARED. K&S is served from rose.lawyer/firm — same origin as
 *    Rose — and both apps use the default `sb-<ref>-auth-token` localStorage
 *    key. A student who signed in to Rose is already signed in here. Do not
 *    set a custom `storageKey`: that is precisely what would break SSO.
 *
 * 2. THERE IS NO DEMO MODE. Every request carries the student's real JWT and
 *    is filtered by RLS in the `ks` schema. Reads cover the whole firm; writes
 *    require membership of that matter (ks.matter_members), which is
 *    provisioned automatically when they accept their class-group invitation.
 *
 * 3. THE PERSONA IS NOT THE IDENTITY. Students still act as James, Aisha etc.
 *    (ks.profiles = fee earners), but every write also records `performed_by`
 *    = the real student. See ProfileContext for the "Acting as" model.
 */

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://vmdswdlkaxlklgvsvuqi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_EfbhXx3f1fdgHta5N1OmkA_zDGt98p8';

// The `'ks'` type argument is load-bearing: it tells supabase-js which schema
// the generated Relationships describe, so embedded selects infer as objects
// or arrays correctly. Drop it and ~24 call sites stop compiling.
export const supabase = createClient<Database, 'ks'>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    // No storageKey override — sharing Rose's session is the point.
  },
  global: {
    headers: { 'X-Client-Info': 'kendry-slate-web' },
  },
  db: {
    // All K&S tables now live in `ks`, alongside Rose's `public`.
    schema: 'ks',
  },
  realtime: {
    params: { eventsPerSecond: 2 },
  },
});
