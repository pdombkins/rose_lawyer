/**
 * Kendry & Slate operations that need server-side privileges.
 * Mounted at /ks.
 *
 * WHY THESE ARE HERE rather than Supabase edge functions.
 *
 * The old K&S project had eight edge functions, every one deployed with
 * `verify_jwt: false` and the service-role key — unauthenticated endpoints
 * with unrestricted database access. Anyone who knew a URL could reorder
 * another group's tasks. That was the last surviving piece of the "no
 * authentication" architecture the merge otherwise removed, and RLS cannot
 * help there because service-role bypasses it by design.
 *
 * Moving the interactive ones into the Rose backend means they inherit
 * `requireAuth`, matter-membership checks and the audit log, like every other
 * Rose route. The long-running batch jobs stay as edge functions (they need
 * EdgeRuntime.waitUntil) but were re-deployed with verify_jwt + an admin check.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";
import { recordAudit } from "../lib/audit";
import { accessibleMatterIds, assertMatterAccess } from "../lib/ks";

export const ksRouter = Router();

const KS = () => createServerSupabase().schema("ks");

/**
 * POST /ks/tasks/reorder
 * Body: { matter_id, positions: [{ id, order_position }] }
 *
 * Replaces the `batch-update-tasks` edge function. The frontend previously
 * fell back to N individual client updates when that function failed —
 * which works, but is exactly the write-amplification pattern the trigger
 * consolidation was meant to remove. One statement here means one recompute.
 */
ksRouter.post("/tasks/reorder", requireAuth, async (req, res) => {
    const userId = res.locals.userId as string;
    const matterId =
        typeof req.body?.matter_id === "string" ? req.body.matter_id : "";
    const positions = Array.isArray(req.body?.positions)
        ? (req.body.positions as unknown[])
        : [];

    if (!matterId) return void res.status(400).json({ detail: "matter_id is required" });
    if (positions.length === 0)
        return void res.status(400).json({ detail: "positions must be a non-empty array" });
    if (positions.length > 500)
        return void res.status(400).json({ detail: "too many positions (max 500)" });

    const parsed: { id: string; order_position: number }[] = [];
    for (const p of positions) {
        const row = p as { id?: unknown; order_position?: unknown };
        if (typeof row.id !== "string" || typeof row.order_position !== "number") {
            return void res
                .status(400)
                .json({ detail: "each position needs { id: string, order_position: number }" });
        }
        parsed.push({ id: row.id, order_position: row.order_position });
    }

    try {
        await assertMatterAccess(userId, matterId);

        // Every task must belong to the matter the caller is authorised for.
        // Without this, a caller with access to matter A could pass task ids
        // from matter B and reorder someone else's Gantt chart.
        const ids = parsed.map((p) => p.id);
        const { data: owned, error: ownErr } = await KS()
            .from("tasks")
            .select("id")
            .eq("matter_id", matterId)
            .in("id", ids);
        if (ownErr) throw new Error(ownErr.message);

        const ownedIds = new Set((owned ?? []).map((t) => t.id as string));
        const foreign = ids.filter((id) => !ownedIds.has(id));
        if (foreign.length > 0) {
            return void res.status(403).json({
                detail: `${foreign.length} task(s) do not belong to that matter`,
            });
        }

        // order_position only — deliberately narrow. Reordering must not be a
        // route through which any other column can be written.
        await Promise.all(
            parsed.map((p) =>
                KS()
                    .from("tasks")
                    .update({ order_position: p.order_position })
                    .eq("id", p.id)
                    .eq("matter_id", matterId),
            ),
        );

        recordAudit({
            actorId: userId,
            eventType: "tool_call",
            resourceType: "project",
            resourceId: matterId,
            detail: { action: "ks_task_reorder", count: parsed.length },
        });

        res.json({ ok: true, updated: parsed.length });
    } catch (err) {
        const msg = (err as Error).message;
        const status = msg.includes("don't have access") ? 403 : 500;
        res.status(status).json({ detail: msg });
    }
});

/**
 * GET /ks/health
 * Replaces the `webhook-time-entry` "ping" action, which was the only thing
 * the two diagnostic panels actually used it for. Reports whether the caller
 * can reach the backend AND what K&S scope they have — more useful than a
 * bare pong, and it needs no service-role privileges.
 */
ksRouter.get("/health", requireAuth, async (req, res) => {
    const userId = res.locals.userId as string;
    try {
        const started = Date.now();
        const access = await accessibleMatterIds(userId);
        res.json({
            ok: true,
            is_admin: access.isAdmin,
            accessible_matters: access.matterIds.length,
            latency_ms: Date.now() - started,
        });
    } catch (err) {
        res.status(500).json({ ok: false, detail: (err as Error).message });
    }
});
