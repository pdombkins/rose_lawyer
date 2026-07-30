/**
 * Cohort teaching content (LAWS3850 and any future class).
 *
 * THE PROBLEM
 * Playbooks, clauses, knowledge-base chunks and Library documents are scoped
 * to their owner — correct for a firm, wrong for a class. The instructor seeds
 * the teaching content under one account and every student then searches their
 * own empty library. Before this existed, `search_knowledge`,
 * `list_playbooks`, `review_against_playbook` and `search_clauses` all
 * returned nothing for the entire cohort, silently.
 *
 * THE RULE
 * A user who belongs to one or more `user_groups` may READ the unfiled
 * content owned by the creators of those groups. Nothing more:
 *
 *   - Read only. Every write path still keys on `owner_id = caller`, so a
 *     student who tries to edit a seeded playbook gets the same 404/403 they
 *     did before. They duplicate instead, which is the behaviour we want —
 *     the instructor copy stays authoritative.
 *   - Group-derived, not hardcoded. The owners come from
 *     `user_groups.created_by` for the groups the caller is actually in, so a
 *     second instructor or a second course works with no code change.
 *   - Empty for everyone else. A user in no group gets `[]`, and every call
 *     site treats `[]` as "behave exactly as before".
 *
 * Deliberately NOT covered: project-scoped content, which already has its own
 * path via `project_group_grants` (see lib/groupAccess.ts).
 */

import type { createServerSupabase } from "./supabase";
import { listUserGroupIds } from "./groupAccess";

type Db = ReturnType<typeof createServerSupabase>;

/**
 * User ids whose unfiled teaching content this caller may read.
 * Empty unless the caller belongs to at least one student group.
 */
export async function listTeachingOwnerIds(
    userId: string,
    userEmail: string | null | undefined,
    db: Db,
): Promise<string[]> {
    // Group membership is email-keyed until a student first signs in, and all
    // 36 LAWS3850 rows had a null user_id. The tool dispatcher doesn't carry
    // an email, so resolve it here rather than threading it through every
    // call site — listUserGroupIds then backfills user_id on the way past.
    const email =
        userEmail ??
        (
            (
                await db
                    .from("user_profiles")
                    .select("email")
                    .eq("id", userId)
                    .maybeSingle()
            ).data as { email?: string | null } | null
        )?.email ??
        null;

    const groupIds = await listUserGroupIds(userId, email, db);
    if (groupIds.length === 0) return [];

    const { data, error } = await db
        .from("user_groups")
        .select("created_by")
        .in("id", groupIds);
    if (error) {
        // Fail closed: a lookup failure must not widen access, and must not
        // break the caller's own content either.
        console.error("[teachingContent] group owner lookup failed:", error.message);
        return [];
    }

    const owners = ((data ?? []) as { created_by: string | null }[])
        .map((g) => g.created_by)
        .filter((id): id is string => !!id && id !== userId);
    return [...new Set(owners)];
}

/**
 * Owner ids to read across: the caller first, then any teaching owners.
 * Convenience for the `.in("owner_id", ids)` read paths.
 */
export async function listReadableOwnerIds(
    userId: string,
    userEmail: string | null | undefined,
    db: Db,
): Promise<string[]> {
    const teaching = await listTeachingOwnerIds(userId, userEmail, db);
    return [userId, ...teaching];
}
