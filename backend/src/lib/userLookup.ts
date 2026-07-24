import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient<any, "public", any>;

export type ProfileUserInfo = {
    id: string;
    email: string;
    display_name: string | null;
};

export function normalizeEmail(value: unknown) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeDisplayName(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function loadProfileUsersByEmail(db: Db) {
    const { data, error } = await db
        .from("user_profiles")
        .select("user_id, email, display_name")
        .not("email", "is", null);
    if (error) throw error;

    const userByEmail = new Map<string, ProfileUserInfo>();
    const userById = new Map<string, ProfileUserInfo>();
    for (const row of data ?? []) {
        const email = normalizeEmail(row.email);
        if (!email) continue;
        const info = {
            id: row.user_id as string,
            email,
            display_name: normalizeDisplayName(row.display_name),
        };
        userByEmail.set(email, info);
        userById.set(info.id, info);
    }

    return { userByEmail, userById };
}

/**
 * Emails that have ACTUALLY activated their account — i.e. confirmed their
 * email or signed in at least once — read from auth.users via the admin API.
 *
 * This is deliberately distinct from "has a user_profiles row": a DB trigger
 * creates the profile row the moment an account is provisioned (e.g. when a
 * group invite calls generateLink), which happens BEFORE the student accepts.
 * So profile-existence over-reports registration; auth activation is the
 * ground truth for "this person has actually registered".
 */
export async function loadActivatedEmails(db: Db): Promise<Set<string>> {
    const activated = new Set<string>();
    const perPage = 1000;
    // Page through all auth users (admin-only surface; class-sized instances).
    for (let page = 1; page <= 50; page++) {
        const { data, error } = await db.auth.admin.listUsers({
            page,
            perPage,
        });
        const users = data?.users ?? [];
        if (error || users.length === 0) break;
        for (const u of users) {
            const email = normalizeEmail(u.email);
            if (!email) continue;
            const activatedAt =
                u.confirmed_at ?? u.email_confirmed_at ?? u.last_sign_in_at ?? null;
            if (activatedAt) activated.add(email);
        }
        if (users.length < perPage) break;
    }
    return activated;
}

export async function findProfileUserByEmail(db: Db, email: string) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    const { data, error } = await db
        .from("user_profiles")
        .select("user_id, email, display_name")
        .eq("email", normalized)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    return {
        id: data.user_id as string,
        email: normalized,
        display_name: normalizeDisplayName(data.display_name),
    };
}

export async function findMissingUserEmails(db: Db, emails: string[]) {
    const normalizedEmails = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
    if (normalizedEmails.length === 0) return [];

    const { data, error } = await db
        .from("user_profiles")
        .select("email")
        .in("email", normalizedEmails);
    if (error) throw error;

    const found = new Set(
        (data ?? [])
            .map((row) => normalizeEmail(row.email))
            .filter(Boolean),
    );
    return normalizedEmails.filter((email) => !found.has(email));
}

export async function syncProfileEmail(
    db: Db,
    userId: string,
    email: string | null | undefined,
) {
    const normalizedEmail = normalizeEmail(email);
    if (!userId || !normalizedEmail) return null;

    const { data: existing, error: loadError } = await db
        .from("user_profiles")
        .select("email")
        .eq("user_id", userId)
        .maybeSingle();
    if (loadError) return loadError;

    if (!existing) {
        const { error } = await db.from("user_profiles").insert({
            user_id: userId,
            email: normalizedEmail,
        });
        return error;
    }

    if (normalizeEmail(existing.email) === normalizedEmail) return null;

    const { error } = await db
        .from("user_profiles")
        .update({
            email: normalizedEmail,
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    return error;
}
