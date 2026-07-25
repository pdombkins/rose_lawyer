"use client";

/**
 * Duplicate-and-edit.
 *
 * Built-in workflows are read-only, and a shared workflow may be read-only
 * too. This takes an editable copy and then lets the user describe the changes
 * in plain English — the model proposes a full revision, the user reviews what
 * changed and applies it. Nothing is written to the copy until they click
 * Apply, and the original is never touched.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import {
    duplicateWorkflow,
    updateWorkflow,
    workflowEditChat,
    type WorkflowEditProposal,
} from "@/app/lib/roseApi";
import type { Workflow } from "../shared/types";
import { Modal } from "../modals/Modal";
import { ModalFieldLabel } from "../modals/ModalFieldLabel";
import { ModalTextInput } from "../modals/ModalTextInput";

type ChatEntry = {
    role: "user" | "assistant";
    content: string;
    proposal?: WorkflowEditProposal;
};

const SUGGESTIONS = [
    "Make every step extract the operative clause verbatim before it analyses it.",
    "Add a step that verifies each citation before the memo is finalised.",
    "Split the review step so each document is assessed separately before any cross-document comparison.",
    "Narrow this to NSW and say so explicitly in the instructions.",
];

export function WorkflowEditChatModal({
    open,
    workflow,
    onClose,
    onSaved,
}: {
    open: boolean;
    workflow: Workflow | null;
    onClose: () => void;
    /** Fired with the new copy once it exists, so the caller can navigate. */
    onSaved: (copy: Workflow) => void;
}) {
    const [stage, setStage] = useState<"name" | "chat">("name");
    const [title, setTitle] = useState("");
    const [copy, setCopy] = useState<Workflow | null>(null);
    const [entries, setEntries] = useState<ChatEntry[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        setStage("name");
        setCopy(null);
        setEntries([]);
        setInput("");
        setError(null);
        setTitle(workflow ? `${workflow.metadata.title} (my copy)` : "");
    }, [open, workflow]);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [entries, busy]);

    if (!workflow) return null;

    async function handleCreateCopy() {
        if (!workflow || busy) return;
        setBusy(true);
        setError(null);
        try {
            const created = await duplicateWorkflow(
                workflow.id,
                title.trim() || undefined,
            );
            setCopy(created);
            setStage("chat");
            setEntries([
                {
                    role: "assistant",
                    content: `I've made you an editable copy called "${created.metadata.title}". Tell me what you want to change and I'll rewrite the workflow — you'll see exactly what changed before anything is saved.`,
                },
            ]);
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Could not duplicate workflow",
            );
        } finally {
            setBusy(false);
        }
    }

    async function handleSend(text: string) {
        const message = text.trim();
        if (!message || !copy || busy) return;
        const nextEntries: ChatEntry[] = [
            ...entries,
            { role: "user", content: message },
        ];
        setEntries(nextEntries);
        setInput("");
        setBusy(true);
        setError(null);
        try {
            const proposal = await workflowEditChat(
                copy.id,
                nextEntries.map((e) => ({ role: e.role, content: e.content })),
            );
            setEntries([
                ...nextEntries,
                { role: "assistant", content: proposal.reply, proposal },
            ]);
        } catch (e) {
            setError(e instanceof Error ? e.message : "The edit request failed");
        } finally {
            setBusy(false);
        }
    }

    async function handleApply(proposal: WorkflowEditProposal) {
        if (!copy || applying) return;
        setApplying(true);
        setError(null);
        try {
            const updated = await updateWorkflow(copy.id, {
                ...(proposal.skill_md != null
                    ? { skill_md: proposal.skill_md }
                    : {}),
                ...(proposal.columns_config != null
                    ? { columns_config: proposal.columns_config }
                    : {}),
            });
            setCopy(updated);
            setEntries((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "Saved to your copy. The process map will be re-derived from the new instructions when you open the overview.",
                },
            ]);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save changes");
        } finally {
            setApplying(false);
        }
    }

    const latestProposal = [...entries]
        .reverse()
        .find((e) => e.proposal?.skill_md || e.proposal?.columns_config)?.proposal;

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            breadcrumbs={[
                "Workflows",
                workflow.metadata.title,
                stage === "name" ? "Make a copy" : "Edit with AI",
            ]}
            secondaryAction={
                stage === "chat" && copy
                    ? {
                          label: "Open my copy",
                          onClick: () => onSaved(copy),
                      }
                    : undefined
            }
            primaryAction={
                stage === "name"
                    ? {
                          label: busy ? "Creating…" : "Create copy",
                          onClick: () => void handleCreateCopy(),
                          disabled: busy || !title.trim(),
                      }
                    : {
                          label: "Done",
                          onClick: () => (copy ? onSaved(copy) : onClose()),
                      }
            }
            cancelAction={false}
        >
            {stage === "name" ? (
                <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-gray-600">
                        {workflow.is_system
                            ? "Built-in workflows can't be changed directly. "
                            : ""}
                        You&apos;ll get your own editable copy of{" "}
                        <span className="font-medium text-gray-800">
                            {workflow.metadata.title}
                        </span>
                        , then you can describe the changes you want in plain
                        English. The original stays as it is.
                    </p>
                    <div>
                        <ModalFieldLabel htmlFor="wf-copy-title">
                            Name for your copy
                        </ModalFieldLabel>
                        <ModalTextInput
                            id="wf-copy-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Change of Control Review — NSW"
                        />
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                </div>
            ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                    <div
                        ref={scrollRef}
                        className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
                    >
                        {entries.map((entry, i) => (
                            <div key={i}>
                                <div
                                    className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                                        entry.role === "user"
                                            ? "ml-auto max-w-[85%] bg-gray-900 text-white"
                                            : "max-w-[95%] bg-gray-50 text-gray-800"
                                    }`}
                                >
                                    {entry.content}
                                </div>
                                {entry.proposal &&
                                    (entry.proposal.skill_md ||
                                        entry.proposal.columns_config) && (
                                        <div className="mt-2 rounded-xl border border-gray-200 bg-white p-3">
                                            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700">
                                                <Sparkles className="h-3.5 w-3.5 text-gray-400" />
                                                Proposed changes
                                            </p>
                                            {entry.proposal.changes.length >
                                            0 ? (
                                                <ul className="list-inside list-disc space-y-0.5 text-xs leading-snug text-gray-600">
                                                    {entry.proposal.changes.map(
                                                        (c, j) => (
                                                            <li key={j}>{c}</li>
                                                        ),
                                                    )}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-gray-500">
                                                    The instructions were
                                                    rewritten.
                                                </p>
                                            )}
                                            {entry.proposal.notes && (
                                                <p className="mt-2 rounded-md bg-amber-50 p-2 text-[11px] text-amber-800">
                                                    {entry.proposal.notes}
                                                </p>
                                            )}
                                            <details className="mt-2">
                                                <summary className="cursor-pointer text-[11px] text-gray-500 hover:text-gray-700">
                                                    View the full revised
                                                    instructions
                                                </summary>
                                                <pre className="mt-1.5 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-gray-50 p-2 font-sans text-[11px] leading-snug text-gray-700">
                                                    {entry.proposal.skill_md ??
                                                        "(instructions unchanged)"}
                                                </pre>
                                            </details>
                                            {entry.proposal ===
                                                latestProposal && (
                                                <button
                                                    onClick={() =>
                                                        void handleApply(
                                                            entry.proposal!,
                                                        )
                                                    }
                                                    disabled={applying}
                                                    className="mt-2.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                                                >
                                                    {applying
                                                        ? "Saving…"
                                                        : "Apply to my copy"}
                                                </button>
                                            )}
                                        </div>
                                    )}
                            </div>
                        ))}
                        {busy && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Rewriting the workflow…
                            </div>
                        )}
                        {entries.length <= 1 && !busy && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {SUGGESTIONS.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => void handleSend(s)}
                                        className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="mt-2 text-xs text-red-600">{error}</p>
                    )}

                    <div className="mt-3 flex shrink-0 items-end gap-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleSend(input);
                                }
                            }}
                            rows={2}
                            placeholder="Describe the change you want…"
                            className="min-h-0 flex-1 resize-none rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-gray-400"
                        />
                        <button
                            onClick={() => void handleSend(input)}
                            disabled={busy || !input.trim()}
                            className="rounded-md bg-gray-900 p-2 text-white disabled:opacity-40"
                            title="Send"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
