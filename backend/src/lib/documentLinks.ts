/**
 * Central document management — helpers for the document_project_links table.
 *
 * A canonical document (typically a Library document owned by the
 * instructor/admin, project_id null) can be linked to many projects. Links
 * are live references, not copies: the bytes live once, and every project
 * the document is linked to sees the current version.
 *
 * Folder override: a document filed inside a Library folder that is itself
 * linked to projects (library_folder_project_links, see folderLinks.ts)
 * inherits ONLY the folder's project links — its own direct
 * document_project_links rows (if any, e.g. left over from before it was
 * filed) are ignored while it has a folder. Move it back to "no folder" and
 * its direct links (or lack thereof) take over again. This is an override,
 * not a union, so a document's admin UI stays a single source of truth: the
 * folder's checkboxes when foldered, its own when not.
 *
 * Access rule (enforced in access.ts): a user with access to a project can
 * read any document linked to that project (directly, or via its folder).
 */

import type { createServerSupabase } from "./supabase";
import {
    linksByFolder,
    listFolderIdsForProject,
    listProjectIdsForFolder,
} from "./folderLinks";

type Db = ReturnType<typeof createServerSupabase>;

/** Document IDs linked into a given project, directly or via a linked folder. */
export async function listLinkedDocumentIdsForProject(
    db: Db,
    projectId: string,
): Promise<string[]> {
    const [{ data: directLinks }, folderIds] = await Promise.all([
        db
            .from("document_project_links")
            .select("document_id")
            .eq("project_id", projectId),
        listFolderIdsForProject(db, projectId),
    ]);
    const directIds = (directLinks ?? []).map((r) => r.document_id as string);

    let folderDocIds: string[] = [];
    if (folderIds.length > 0) {
        const { data } = await db
            .from("documents")
            .select("id")
            .in("library_folder_id", folderIds);
        folderDocIds = (data ?? []).map((r) => r.id as string);
    }

    // Folder overrides direct links: a document that now sits in a folder
    // only counts via that folder's link, not any stale direct link.
    let validDirectIds = directIds;
    if (directIds.length > 0) {
        const { data } = await db
            .from("documents")
            .select("id, library_folder_id")
            .in("id", directIds);
        validDirectIds = ((data ?? []) as {
            id: string;
            library_folder_id: string | null;
        }[])
            .filter((d) => !d.library_folder_id)
            .map((d) => d.id);
    }

    return [...new Set([...validDirectIds, ...folderDocIds])];
}

/** Project IDs a given document is linked into (its folder's, if foldered). */
export async function listProjectIdsForDocument(
    db: Db,
    documentId: string,
): Promise<string[]> {
    const { data: doc } = await db
        .from("documents")
        .select("library_folder_id")
        .eq("id", documentId)
        .maybeSingle();
    const folderId =
        (doc as { library_folder_id?: string | null } | null)
            ?.library_folder_id ?? null;
    if (folderId) return listProjectIdsForFolder(db, folderId);

    const { data } = await db
        .from("document_project_links")
        .select("project_id")
        .eq("document_id", documentId);
    return (data ?? []).map((r) => r.project_id as string);
}

/**
 * Bulk map of document_id → project_id[] for a set of documents. Used by the
 * admin matrix so a single query hydrates every checkbox row. Foldered
 * documents resolve to their folder's links (override); unfiled documents
 * resolve to their own direct links.
 */
export async function linksByDocument(
    db: Db,
    documentIds: string[],
): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (documentIds.length === 0) return map;

    const { data: rawDocs } = await db
        .from("documents")
        .select("id, library_folder_id")
        .in("id", documentIds);
    const docRows = (rawDocs ?? []) as {
        id: string;
        library_folder_id: string | null;
    }[];

    const folderIds = [
        ...new Set(
            docRows
                .filter((d) => d.library_folder_id)
                .map((d) => d.library_folder_id as string),
        ),
    ];
    const folderMap =
        folderIds.length > 0
            ? await linksByFolder(db, folderIds)
            : new Map<string, string[]>();

    const unfiledIds = docRows
        .filter((d) => !d.library_folder_id)
        .map((d) => d.id);
    const directMap = new Map<string, string[]>();
    if (unfiledIds.length > 0) {
        const { data } = await db
            .from("document_project_links")
            .select("document_id, project_id")
            .in("document_id", unfiledIds);
        for (const r of (data ?? []) as {
            document_id: string;
            project_id: string;
        }[]) {
            const list = directMap.get(r.document_id) ?? [];
            list.push(r.project_id);
            directMap.set(r.document_id, list);
        }
    }

    for (const d of docRows) {
        map.set(
            d.id,
            d.library_folder_id
                ? (folderMap.get(d.library_folder_id) ?? [])
                : (directMap.get(d.id) ?? []),
        );
    }
    return map;
}

/**
 * Load the full document rows linked into a project (excluding docs whose
 * project_id already equals this project — those are the project's own and
 * are listed separately). Each returned row is tagged is_linked so the UI can
 * render a read-only "Shared" badge and callers can suppress destructive ops.
 */
export async function loadLinkedDocumentsForProject(
    db: Db,
    projectId: string,
): Promise<Record<string, unknown>[]> {
    const ids = await listLinkedDocumentIdsForProject(db, projectId);
    if (ids.length === 0) return [];
    const { data } = await db
        .from("documents")
        .select("*")
        .in("id", ids);
    const rows = ((data ?? []) as Record<string, unknown>[])
        // A document that already belongs to this project is not "linked in".
        .filter((d) => (d.project_id as string | null) !== projectId);
    if (rows.length === 0) return [];

    // Carry the SOURCE Library folder's name through. A linked document is a
    // single row shared across every project it is linked into, so its
    // `folder_id` (a project_subfolders id) cannot place it in each of those
    // projects' folder trees — which is why linked docs arrive flat. Passing
    // the Library folder name lets the UI group them under a read-only
    // heading instead of dumping 31 files at the project root.
    const folderIds = [
        ...new Set(
            rows
                .map((d) => d.library_folder_id as string | null)
                .filter((id): id is string => !!id),
        ),
    ];
    const folderNameById = new Map<string, string>();
    if (folderIds.length > 0) {
        const { data: folders } = await db
            .from("library_folders")
            .select("id, name")
            .in("id", folderIds);
        for (const f of (folders ?? []) as { id: string; name: string }[]) {
            folderNameById.set(f.id, f.name);
        }
    }

    return rows.map((d) => ({
        ...d,
        is_linked: true,
        linked_folder_name:
            folderNameById.get(d.library_folder_id as string) ?? null,
    }));
}

/**
 * Replace the full set of project links for a document. Inserts any missing
 * links and deletes any that are no longer present. Idempotent.
 */
export async function setDocumentLinks(
    db: Db,
    documentId: string,
    projectIds: string[],
    linkedBy: string | null,
): Promise<void> {
    const desired = new Set(projectIds);
    const current = new Set(await listProjectIdsForDocument(db, documentId));

    const toAdd = [...desired].filter((p) => !current.has(p));
    const toRemove = [...current].filter((p) => !desired.has(p));

    if (toAdd.length > 0) {
        await db.from("document_project_links").insert(
            toAdd.map((project_id) => ({
                document_id: documentId,
                project_id,
                linked_by: linkedBy,
            })),
        );
    }
    if (toRemove.length > 0) {
        await db
            .from("document_project_links")
            .delete()
            .eq("document_id", documentId)
            .in("project_id", toRemove);
    }
}
