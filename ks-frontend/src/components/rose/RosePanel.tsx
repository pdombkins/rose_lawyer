import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Loader2, Sparkles, X } from "lucide-react";

/**
 * Rose, embedded in the K&S matter workspace.
 *
 * A lawyer working a matter reaches for their AI tools without leaving the
 * matter — so Rose opens in a side panel here rather than as a separate
 * destination. Three things make that work with no glue code:
 *
 *  1. Same origin. Both apps are served from rose.lawyer (K&S at /firm), so
 *     the iframe shares the Supabase session. No second login, no token
 *     passing, nothing in the URL to leak.
 *  2. `ks.matter_projects` maps a matter to its Rose project, so the panel is
 *     scoped to THIS matter's documents and chats rather than dumping the user
 *     at Rose's front door.
 *  3. Rose hides its own sidebar when framed (see frontend (pages)/layout.tsx),
 *     so the panel shows the tool, not a second navigation.
 *
 * Access is not this component's job: the iframe is a normal Rose page load,
 * so Rose applies the same project access checks it always does. If a user
 * somehow reached a project id they cannot read, Rose refuses it — the panel
 * cannot widen anything.
 */

type RoseTab = "assistant" | "documents" | "workflows";

const TABS: { value: RoseTab; label: string; path: (p: string) => string }[] = [
  { value: "assistant", label: "Assistant", path: (p) => `/projects/${p}/assistant` },
  { value: "documents", label: "Documents", path: (p) => `/projects/${p}` },
  // Workflows are not project-scoped in Rose — this is the shared library the
  // student picks the week's exercise from.
  { value: "workflows", label: "Workflows", path: () => `/workflows` },
];

/** Rose project id for a matter, or null while loading / if unmapped. */
export function useMatterRoseProject(matterId: string | undefined) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!matterId) {
      setProjectId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    // RLS scopes this to matters the caller can read (matter_projects_read_scoped).
    // A matter can map to several projects — one per group for the shared
    // teaching matter — but a given user can only read their own, so taking the
    // first row returns the right one for them.
    supabase
      .from("matter_projects")
      .select("project_id")
      .eq("matter_id", matterId)
      .limit(1)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.warn("[RosePanel] project lookup failed:", error.message);
        setProjectId(data?.[0]?.project_id ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [matterId]);

  return { projectId, loading };
}

export function RosePanel({
  open,
  onOpenChange,
  projectId,
  matterTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  matterTitle?: string;
}) {
  const [tab, setTab] = useState<RoseTab>("assistant");
  const active = TABS.find((t) => t.value === tab) ?? TABS[0];
  const src = projectId ? active.path(projectId) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[680px]"
      >
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Sparkles className="h-4 w-4 shrink-0 text-primary-burgundy" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Rose</p>
            {matterTitle && (
              <p className="truncate text-xs text-muted-foreground">
                {matterTitle}
              </p>
            )}
          </div>
          {src && (
            <Button variant="ghost" size="sm" asChild>
              {/* Escape hatch: the full app, in a new tab, so the matter stays open. */}
              <a href={src} target="_blank" rel="noopener noreferrer" title="Open in a new tab">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as RoseTab)} className="border-b px-4 py-2">
          <TabsList className="w-full">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="min-h-0 flex-1">
          {src ? (
            // key on src so switching tabs reloads rather than pushing history
            // into the iframe — otherwise the panel's back behaviour surprises.
            <iframe
              key={src}
              src={src}
              title="Rose"
              className="h-full w-full border-0"
              // Same-origin: the iframe needs the session cookie and must be
              // able to script itself. No allow-top-navigation, so nothing in
              // the panel can navigate the host page out from under the user.
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <p className="text-sm text-muted-foreground">
                This matter has no Rose project yet. One is created
                automatically for every matter — if this persists, tell your
                instructor.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Header button + panel, for a matter page. */
export function RosePanelButton({
  matterId,
  matterTitle,
}: {
  matterId: string | undefined;
  matterTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const { projectId, loading } = useMatterRoseProject(matterId);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        Rose
      </Button>
      <RosePanel
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        matterTitle={matterTitle}
      />
    </>
  );
}
