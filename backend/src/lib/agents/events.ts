/**
 * P1 — In-memory run event bus. Live SSE subscribers get step events while
 * a run executes in-process; run/step state is always persisted to the DB,
 * so a page refresh (or another device) recovers via polling GET /agents/:id.
 */

export type AgentEvent = {
    type:
        | "agent_plan"
        | "agent_status"
        | "agent_step_start"
        | "agent_step_delta"
        /** Model reasoning trace, streamed live so the run page can show it. */
        | "agent_step_reasoning"
        | "agent_step_review_start"
        | "agent_step_review_done"
        | "agent_step_done"
        | "agent_done"
        | "agent_error";
    runId: string;
    position?: number;
    role?: string;
    status?: string;
    delta?: string;
    payload?: unknown;
};

type Subscriber = (event: AgentEvent) => void;

const subscribers = new Map<string, Set<Subscriber>>();

export function subscribeRun(runId: string, fn: Subscriber): () => void {
    let set = subscribers.get(runId);
    if (!set) {
        set = new Set();
        subscribers.set(runId, set);
    }
    set.add(fn);
    return () => {
        set?.delete(fn);
        if (set && set.size === 0) subscribers.delete(runId);
    };
}

export function publishRunEvent(event: AgentEvent): void {
    const set = subscribers.get(event.runId);
    if (!set) return;
    for (const fn of set) {
        try {
            fn(event);
        } catch {
            /* subscriber errors never break the run */
        }
    }
}
