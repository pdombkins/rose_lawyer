/**
 * Central document management, folder level — helpers for the
 * library_folder_project_links table.
 *
 * A Library folder (library_folders, library_kind 'file') can be linked to
 * many projects. Any document filed inside a linked folder inherits that
 * folder's project links (see documentLinks.ts, which applies the override
 * semantics: a foldered document's own direct links are ignored in favour
 * of its folder's).
 */

import type { createServerSupabase } from "./supabase";

type Db = ReturnType<typeof createServerSupabase>;

/** Project IDs a given folder is linked into. */
export async function listProjectIdsForFolder(
  db: Db,
  folderId: string,
): Promise<string[]> {
  const { data } = await db
    .from("library_folder_project_links")
    .select("project_id")
    .eq("folder_id", folderId);
  return (data ?? []).map((r) => r.project_id as string);
}

/** Folder IDs linked into a given project. */
export async function listFolderIdsForProject(
  db: Db,
  projectId: string,
): Promise<string[]> {
  const { data } = await db
    .from("library_folder_project_links")
    .select("folder_id")
    .eq("project_id", projectId);
  return (data ?? []).map((r) => r.folder_id as string);
}

/**
 * Bulk map of folder_id → project_id[] for a set of folders. Used by the
 * admin matrix so a single query hydrates every folder row's checkboxes.
 */
export async function linksByFolder(
  db: Db,
  folderIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (folderIds.length === 0) return map;
  const { data } = await db
    .from("library_folder_project_links")
    .select("folder_id, project_id")
    .in("folder_id", folderIds);
  for (const r of (data ?? []) as {
    folder_id: string;
    project_id: string;
  }[]) {
    const list = map.get(r.folder_id) ?? [];
    list.push(r.project_id);
    map.set(r.folder_id, list);
  }
  return map;
}

/**
 * Replace the full set of project links for a folder. Inserts any missing
 * links and deletes any that are no longer present. Idempotent.
 */
export async function setFolderLinks(
  db: Db,
  folderId: string,
  projectIds: string[],
  linkedBy: string | null,
): Promise<void> {
  const desired = new Set(projectIds);
  const current = new Set(await listProjectIdsForFolder(db, folderId));

  const toAdd = [...desired].filter((p) => !current.has(p));
  const toRemove = [...current].filter((p) => !desired.has(p));

  if (toAdd.length > 0) {
    await db.from("library_folder_project_links").insert(
      toAdd.map((project_id) => ({
        folder_id: folderId,
        project_id,
        linked_by: linkedBy,
      })),
    );
  }
  if (toRemove.length > 0) {
    await db
      .from("library_folder_project_links")
      .delete()
      .eq("folder_id", folderId)
      .in("project_id", toRemove);
  }
}
