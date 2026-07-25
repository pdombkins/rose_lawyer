"use client";

import { useEffect, useState } from "react";
import type { Document, Workflow } from "../shared/types";
import {
    createTabularReview,
    runWorkflow,
    workflowPreflight,
    type PreflightAssessment,
} from "@/app/lib/roseApi";
import { useRouter } from "next/navigation";
import { useDirectoryData } from "../shared/useDirectoryData";
import { FileDirectory } from "../shared/FileDirectory";
import { useChatHistoryContext } from "@/app/contexts/ChatHistoryContext";
import { Modal } from "../modals/Modal";
import { ModalFieldLabel } from "../modals/ModalFieldLabel";
import { ModalSegmentedToggle } from "../modals/ModalSegmentedToggle";
import { ModalSelect } from "../modals/ModalSelect";
import { ModalTextarea } from "../modals/ModalTextarea";
import { WorkflowPickerContent } from "./WorkflowPickerContent";
import { PreflightGateBody } from "./PreflightGate";
import { workflowDetailPath } from "./workflowRoutes";

interface Props {
    workflows: Workflow[];
    workflow: Workflow | null;
    onClose: () => void;
    skipSelect?: boolean;
}

type Screen = "select" | "details" | "documents" | "preflight";

function SelectedWorkflowSummary({ workflow }: { workflow: Workflow }) {
    return (
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
            <span className="shrink-0 text-xs font-medium text-gray-700">
                Selected workflow
            </span>
            <span className="min-w-0 flex-1 truncate text-right text-xs text-gray-500">
                {workflow.metadata.title}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// UseWorkflowModal
// ---------------------------------------------------------------------------
export function UseWorkflowModal({ workflows, workflow, onClose, skipSelect = false }: Props) {
    const [screen, setScreen] = useState<Screen>("select");
    const [selected, setSelected] = useState<Workflow | null>(workflow);
    const [listSearch, setListSearch] = useState("");

    // Configure screen state
    const [inProject, setInProject] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
        null,
    );
    const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
    const [assistantPrompt, setAssistantPrompt] = useState("");
    const [saving, setSaving] = useState(false);
    // How an assistant workflow executes. "workflow" runs it through the agent
    // runtime — process map, live step position, per-step senior-partner
    // review and a completion report. "chat" is the older behaviour: apply the
    // workflow as a skill inside an ordinary assistant chat.
    const [runMode, setRunMode] = useState<"workflow" | "chat">("workflow");

    // Pre-flight gate — assesses the documents actually attached against the
    // workflow's steps before anything runs (see PreflightGate.tsx).
    const [preflight, setPreflight] = useState<PreflightAssessment | null>(null);
    const [preflightRunning, setPreflightRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const { saveChat, setNewChatMessages } = useChatHistoryContext();
    const { loading: dirLoading, projects } = useDirectoryData(
        screen === "details",
        "projects",
    );

    useEffect(() => {
        if (workflow) {
            setSelected(workflow);
            setScreen(skipSelect ? "details" : "select");
            setListSearch("");
        } else {
            setSelected(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflow?.id]);

    // Reset configure state on back
    useEffect(() => {
        if (screen === "select") {
            resetConfigureState();
        }
    }, [screen]);

    function resetConfigureState() {
        setInProject(false);
        setSelectedProjectId(null);
        setSelectedDocuments([]);
        setAssistantPrompt("");
        setRunMode("workflow");
        setPreflight(null);
        setPreflightRunning(false);
        setError(null);
    }

    function handleClose() {
        setSelected(null);
        setScreen("select");
        resetConfigureState();
        onClose();
    }

    if (!workflow) return null;
    const wf = selected ?? workflow;

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------

    /**
     * Step into the gate. The assessment reads the attached documents and
     * re-scores each workflow step for silent-failure risk against them, so it
     * runs here rather than on the documents screen — we need the final
     * selection, and it costs a model call.
     */
    async function handleRunPreflight() {
        setScreen("preflight");
        setPreflightRunning(true);
        setError(null);
        setPreflight(null);
        try {
            const { preflight: assessment } = await workflowPreflight(wf.id, {
                document_ids: selectedDocuments.map((d) => d.id),
                request: assistantPrompt.trim() || undefined,
            });
            setPreflight(assessment);
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "The pre-flight check could not be completed.",
            );
            // Fail open but visibly: the user can still proceed, and is told
            // the check didn't run rather than being shown a false all-clear.
            setPreflight({
                version: 1,
                overall_risk: "medium",
                requires_confirmation: false,
                summary:
                    "The pre-flight check could not be completed, so the documents have not been assessed against this workflow's steps. Treat the outputs with extra scrutiny.",
                findings: [],
                documents: [],
                assessed_at: new Date().toISOString(),
            });
        } finally {
            setPreflightRunning(false);
        }
    }

    /** "Stop and edit the workflow" — nothing has run. */
    function handleStopAndEdit() {
        const path = workflowDetailPath(wf);
        handleClose();
        router.push(path);
    }

    /**
     * Assistant workflows execute through the agent runtime, so the run gets
     * the process map, live step position, expanded reasoning, the
     * senior-partner review gate on every step, and the completion report.
     */
    async function handleRunAsWorkflow() {
        setSaving(true);
        setError(null);
        try {
            const { run_id } = await runWorkflow(wf.id, {
                request: assistantPrompt.trim() || undefined,
                document_ids: selectedDocuments.map((d) => d.id),
                project_id: inProject ? selectedProjectId : null,
                preflight: preflight ?? undefined,
                force: true, // the user has just answered the gate
            });
            handleClose();
            router.push(`/agents?run=${run_id}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not start the run");
        } finally {
            setSaving(false);
        }
    }

    async function handleStartChat() {
        setSaving(true);
        try {
            const projectId = inProject ? selectedProjectId! : undefined;
            const chatId = await saveChat(projectId);
            if (!chatId) return;
            const files = selectedDocuments.map((document) => ({
                filename: document.filename,
                document_id: document.id,
            }));
            const content = assistantPrompt.trim()
                ? `implement workflow\n${assistantPrompt.trim()}`
                : "implement workflow";
            setNewChatMessages([
                {
                    role: "user",
                    content,
                    files: files.length > 0 ? files : undefined,
                    workflow: { id: wf.id, title: wf.metadata.title },
                },
            ]);
            handleClose();
            router.push(
                projectId
                    ? `/projects/${projectId}/assistant/chat/${chatId}`
                    : `/assistant/chat/${chatId}`,
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleCreateReview() {
        const docIds = selectedDocuments.map((document) => document.id);
        const projectId = inProject ? selectedProjectId! : undefined;

        setSaving(true);
        try {
            const review = await createTabularReview({
                title: wf.metadata.title,
                document_ids: docIds,
                columns_config: wf.columns_config || [],
                workflow_id: wf.is_system ? undefined : wf.id,
                project_id: projectId,
            });
            handleClose();
            router.push(
                projectId
                    ? `/projects/${projectId}/tabular-reviews/${review.id}`
                    : `/tabular-reviews/${review.id}`,
            );
        } finally {
            setSaving(false);
        }
    }

    const selectedProject = projects.find((p) => p.id === selectedProjectId);
    const projectDocs = selectedProject?.documents ?? [];
    const projectOptions = projects.map((project) => ({
        value: project.id,
        label:
            project.name +
            (project.cm_number ? ` (#${project.cm_number})` : ""),
    }));
    const location = inProject ? "project" : "workspace";
    const locationOptions =
        wf.metadata.type === "assistant"
            ? [
                  { value: "workspace" as const, label: "Assistant" },
                  { value: "project" as const, label: "Project assistant" },
              ]
            : [
                  { value: "workspace" as const, label: "Tabular reviews" },
                  {
                      value: "project" as const,
                      label: "Project tabular reviews",
                  },
              ];

    const screenLabel =
        screen === "details"
            ? "Details"
            : screen === "documents"
              ? "Attach Documents"
              : "Pre-flight check";
    const breadcrumbs =
        screen === "select"
            ? ["Workflows", "Select workflow"]
            : [
                  <button
                      key="workflows"
                      type="button"
                      onClick={() => setScreen("select")}
                      className="transition-colors hover:text-gray-700"
                  >
                      Workflows
                  </button>,
                  wf.metadata.title,
                  wf.metadata.type === "assistant" ? "New Run" : "New Review",
                  screenLabel,
              ];

    const selectPageAction = () => {
        router.push(workflowDetailPath(wf));
        handleClose();
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
        <Modal
            open={!!workflow}
            onClose={handleClose}
            size={screen === "select" ? "xl" : "lg"}
            breadcrumbs={breadcrumbs}
            secondaryAction={
                screen === "select"
                    ? {
                          label: "View Page",
                          onClick: selectPageAction,
                      }
                    : screen === "details"
                      ? {
                          label: "Back",
                          onClick: () => setScreen("select"),
                          disabled: saving,
                      }
                      : screen === "documents"
                        ? {
                            label: "Back",
                            onClick: () => setScreen("details"),
                            disabled: saving,
                        }
                        : {
                            // At the gate the alternative to continuing is not
                            // "back" — it's stopping and fixing the workflow.
                            label: preflight?.requires_confirmation
                                ? "Stop & edit workflow"
                                : "Back",
                            onClick: preflight?.requires_confirmation
                                ? handleStopAndEdit
                                : () => setScreen("documents"),
                            disabled: saving || preflightRunning,
                            variant: preflight?.requires_confirmation
                                ? ("danger" as const)
                                : undefined,
                        }
            }
            primaryAction={
                screen === "select"
                    ? {
                          label: "Use",
                          onClick: () => setScreen("details"),
                      }
                    : screen === "details"
                      ? {
                            label: "Next",
                            onClick: () => setScreen("documents"),
                            disabled:
                                saving || (inProject && !selectedProjectId),
                        }
                    : screen === "documents"
                      ? {
                            label: "Run pre-flight check",
                            onClick: () => void handleRunPreflight(),
                            disabled:
                                saving ||
                                (inProject && !selectedProjectId) ||
                                (wf.metadata.type === "tabular" &&
                                    selectedDocuments.length === 0),
                        }
                    : wf.metadata.type === "assistant"
                      ? {
                            label: saving
                                ? "Starting…"
                                : preflight?.requires_confirmation
                                  ? "Continue anyway"
                                  : runMode === "workflow"
                                    ? "Run workflow"
                                    : "Start chat",
                            onClick:
                                runMode === "workflow"
                                    ? () => void handleRunAsWorkflow()
                                    : handleStartChat,
                            disabled: saving || preflightRunning || !preflight,
                        }
                      : {
                            label: saving
                                ? "Creating…"
                                : preflight?.requires_confirmation
                                  ? "Continue anyway"
                                  : "Create Review",
                            onClick: handleCreateReview,
                            disabled:
                                saving ||
                                preflightRunning ||
                                !preflight ||
                                selectedDocuments.length === 0,
                        }
            }
            cancelAction={false}
        >
            {/* ── SELECT SCREEN ── */}
            {screen === "select" && (
                <WorkflowPickerContent
                    workflows={workflows}
                    selected={wf}
                    onSelect={(next) => {
                        if (next) setSelected(next);
                    }}
                    search={listSearch}
                    onSearchChange={setListSearch}
                    workflowType="all"
                    previewMode="auto"
                    showTypeIcon
                    allowClearPreview={false}
                />
            )}

            {/* ── DETAILS SCREEN ── */}
            {screen === "details" && (
                <div className="flex min-h-0 flex-1 flex-col">
                    <SelectedWorkflowSummary workflow={wf} />

                    <div className="space-y-6">
                        <div>
                            <ModalFieldLabel as="p">Use in</ModalFieldLabel>
                            <ModalSegmentedToggle
                                value={location}
                                onChange={(value) => {
                                    setInProject(value === "project");
                                    setSelectedProjectId(null);
                                    setSelectedDocuments([]);
                                }}
                                options={locationOptions}
                            />
                        </div>

                        {inProject && (
                            <div>
                                <ModalFieldLabel htmlFor="workflow-project">
                                    Project
                                </ModalFieldLabel>
                                <ModalSelect
                                    id="workflow-project"
                                    value={selectedProjectId ?? ""}
                                    options={projectOptions}
                                    onChange={(value) => {
                                        setSelectedProjectId(value || null);
                                        setSelectedDocuments([]);
                                    }}
                                    placeholder={
                                        dirLoading
                                            ? "Loading projects..."
                                            : projects.length
                                            ? "Select project..."
                                            : "No projects found"
                                    }
                                    disabled={dirLoading || projects.length === 0}
                                />
                            </div>
                        )}

                        {wf.metadata.type === "assistant" && (
                            <div>
                                <ModalFieldLabel as="p">Run as</ModalFieldLabel>
                                <ModalSegmentedToggle
                                    value={runMode}
                                    onChange={setRunMode}
                                    options={[
                                        {
                                            value: "workflow" as const,
                                            label: "Guided workflow",
                                        },
                                        {
                                            value: "chat" as const,
                                            label: "Assistant chat",
                                        },
                                    ]}
                                />
                                <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
                                    {runMode === "workflow"
                                        ? "Runs the workflow's defined steps, shows you where it's up to, has a senior-partner review check each step's output against its acceptance criteria, and produces a process report at the end."
                                        : "Applies the workflow as instructions inside an ordinary chat. Faster and more flexible, but there is no step-by-step review or process report."}
                                </p>
                            </div>
                        )}

                        {wf.metadata.type === "assistant" && (
                            <div>
                                <ModalFieldLabel htmlFor="workflow-additional-message">
                                    Additional message
                                </ModalFieldLabel>
                                <ModalTextarea
                                    id="workflow-additional-message"
                                    value={assistantPrompt}
                                    onChange={(e) =>
                                        setAssistantPrompt(e.target.value)
                                    }
                                    placeholder="Add any additional instructions..."
                                    rows={4}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── DOCUMENTS SCREEN ── */}
            {screen === "documents" && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="flex min-h-0 flex-1 flex-col">
                        <FileDirectory
                            documents={inProject ? projectDocs : undefined}
                            selectedDocuments={selectedDocuments}
                            onChange={setSelectedDocuments}
                            showTabs={!inProject}
                        />
                    </div>
                </div>
            )}

            {/* ── PRE-FLIGHT GATE ── */}
            {screen === "preflight" && (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                    {error && (
                        <p className="mb-3 rounded-md bg-red-50 p-2.5 text-xs text-red-700">
                            {error}
                        </p>
                    )}
                    <PreflightGateBody
                        assessment={preflight}
                        running={preflightRunning}
                    />
                </div>
            )}
        </Modal>
    );
}
