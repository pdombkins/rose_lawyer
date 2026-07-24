"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    FileText,
    FolderOpen,
    Folder as FolderIcon,
    FolderPlus,
    Upload,
    Trash2,
    Check,
    Pencil,
    X,
} from "lucide-react";
import { useUserProfile } from "@/app/contexts/UserProfileContext";
import {
    adminGetDocumentLibrary,
    adminSetDocumentLinks,
    adminSetFolderLinks,
    uploadStandaloneDocument,
    deleteDocument,
    createLibraryFolder,
    renameLibraryFolder,
    deleteLibraryFolder,
    moveLibraryDocument,
    RoseApiError,
    type AdminDocLibraryEntry,
    type AdminDocLibraryFolder,
    type AdminDocLibraryProject,
} from "@/app/lib/roseApi";

const NO_FOLDER = "__none__";

export default function AdminDocumentsPage() {
    const router = useRouter();
    const { profile, loading: profileLoading } = useUserProfile();

    const [documents, setDocuments] = useState<AdminDocLibraryEntry[]>([]);
    const [folders, setFolders] = useState<AdminDocLibraryFolder[]>([]);
    const [projects, setProjects] = useState<AdminDocLibraryProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    // Cell in-flight state, keyed `${docId or folderId}:${projectId}`.
    const [savingCell, setSavingCell] = useState<Set<string>>(new Set());
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] =
        useState<AdminDocLibraryEntry | null>(null);
    const [movingIds, setMovingIds] = useState<Set<string>>(new Set());

    const [creatingFolder, setCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [creatingFolderBusy, setCreatingFolderBusy] = useState(false);

    const [renamingFolderId, setRenamingFolderId] = useState<string | null>(
        null,
    );
    const [renameFolderValue, setRenameFolderValue] = useState("");
    const [renameFolderBusy, setRenameFolderBusy] = useState(false);

    const [confirmDeleteFolder, setConfirmDeleteFolder] =
        useState<AdminDocLibraryFolder | null>(null);
    const [deletingFolderId, setDeletingFolderId] = useState<string | null>(
        null,
    );

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!profileLoading && profile && !profile.isAdmin) {
            router.push("/assistant");
        }
    }, [profile, profileLoading, router]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminGetDocumentLibrary();
            setDocuments(data.documents);
            setFolders(data.folders);
            setProjects(data.projects);
        } catch (err) {
            setError(
                err instanceof RoseApiError
                    ? err.message
                    : "Could not load documents.",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (profile?.isAdmin) void load();
    }, [profile?.isAdmin, load]);

    const isDocLinked = (doc: AdminDocLibraryEntry, projectId: string) =>
        doc.linked_project_ids.includes(projectId);
    const isFolderLinked = (
        folder: AdminDocLibraryFolder,
        projectId: string,
    ) => folder.linked_project_ids.includes(projectId);

    async function toggleDocLink(doc: AdminDocLibraryEntry, projectId: string) {
        const cellKey = `doc:${doc.id}:${projectId}`;
        if (savingCell.has(cellKey)) return;
        const nextIds = isDocLinked(doc, projectId)
            ? doc.linked_project_ids.filter((id) => id !== projectId)
            : [...doc.linked_project_ids, projectId];

        setDocuments((prev) =>
            prev.map((d) =>
                d.id === doc.id ? { ...d, linked_project_ids: nextIds } : d,
            ),
        );
        setSavingCell((prev) => new Set(prev).add(cellKey));
        try {
            const res = await adminSetDocumentLinks(doc.id, nextIds);
            setDocuments((prev) =>
                prev.map((d) =>
                    d.id === doc.id
                        ? { ...d, linked_project_ids: res.project_ids }
                        : d,
                ),
            );
        } catch {
            setDocuments((prev) =>
                prev.map((d) =>
                    d.id === doc.id
                        ? { ...d, linked_project_ids: doc.linked_project_ids }
                        : d,
                ),
            );
        } finally {
            setSavingCell((prev) => {
                const next = new Set(prev);
                next.delete(cellKey);
                return next;
            });
        }
    }

    async function toggleFolderLink(
        folder: AdminDocLibraryFolder,
        projectId: string,
    ) {
        const cellKey = `folder:${folder.id}:${projectId}`;
        if (savingCell.has(cellKey)) return;
        const nextIds = isFolderLinked(folder, projectId)
            ? folder.linked_project_ids.filter((id) => id !== projectId)
            : [...folder.linked_project_ids, projectId];

        setFolders((prev) =>
            prev.map((f) =>
                f.id === folder.id ? { ...f, linked_project_ids: nextIds } : f,
            ),
        );
        setSavingCell((prev) => new Set(prev).add(cellKey));
        try {
            const res = await adminSetFolderLinks(folder.id, nextIds);
            setFolders((prev) =>
                prev.map((f) =>
                    f.id === folder.id
                        ? { ...f, linked_project_ids: res.project_ids }
                        : f,
                ),
            );
        } catch {
            setFolders((prev) =>
                prev.map((f) =>
                    f.id === folder.id
                        ? { ...f, linked_project_ids: folder.linked_project_ids }
                        : f,
                ),
            );
        } finally {
            setSavingCell((prev) => {
                const next = new Set(prev);
                next.delete(cellKey);
                return next;
            });
        }
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) e.target.value = "";
        if (!file) return;
        setUploading(true);
        setError(null);
        try {
            await uploadStandaloneDocument(file);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed.");
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(doc: AdminDocLibraryEntry) {
        setDeletingId(doc.id);
        setConfirmDelete(null);
        try {
            await deleteDocument(doc.id);
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        } catch (err) {
            setError(err instanceof RoseApiError ? err.message : "Delete failed.");
        } finally {
            setDeletingId(null);
        }
    }

    async function handleMoveDocument(
        doc: AdminDocLibraryEntry,
        folderId: string | null,
    ) {
        setMovingIds((prev) => new Set(prev).add(doc.id));
        setError(null);
        try {
            await moveLibraryDocument("files", doc.id, folderId);
            await load();
        } catch (err) {
            setError(
                err instanceof RoseApiError ? err.message : "Could not move document.",
            );
        } finally {
            setMovingIds((prev) => {
                const next = new Set(prev);
                next.delete(doc.id);
                return next;
            });
        }
    }

    async function handleCreateFolder() {
        const name = newFolderName.trim();
        if (!name || creatingFolderBusy) return;
        setCreatingFolderBusy(true);
        setError(null);
        try {
            await createLibraryFolder("files", name);
            setNewFolderName("");
            setCreatingFolder(false);
            await load();
        } catch (err) {
            setError(
                err instanceof RoseApiError ? err.message : "Could not create folder.",
            );
        } finally {
            setCreatingFolderBusy(false);
        }
    }

    async function handleRenameFolder(folder: AdminDocLibraryFolder) {
        const name = renameFolderValue.trim();
        if (!name || renameFolderBusy) return;
        setRenameFolderBusy(true);
        setError(null);
        try {
            await renameLibraryFolder("files", folder.id, name);
            setRenamingFolderId(null);
            await load();
        } catch (err) {
            setError(
                err instanceof RoseApiError ? err.message : "Could not rename folder.",
            );
        } finally {
            setRenameFolderBusy(false);
        }
    }

    async function handleDeleteFolder(folder: AdminDocLibraryFolder) {
        setDeletingFolderId(folder.id);
        setConfirmDeleteFolder(null);
        setError(null);
        try {
            await deleteLibraryFolder("files", folder.id);
            await load();
        } catch (err) {
            setError(
                err instanceof RoseApiError ? err.message : "Could not delete folder.",
            );
        } finally {
            setDeletingFolderId(null);
        }
    }

    if (profileLoading || (!profile?.isAdmin && loading)) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
            </div>
        );
    }
    if (!profile?.isAdmin) return null;

    const unfiledDocs = documents.filter((d) => !d.folder_id);
    const docsByFolder = new Map<string, AdminDocLibraryEntry[]>();
    for (const doc of documents) {
        if (!doc.folder_id) continue;
        const list = docsByFolder.get(doc.folder_id) ?? [];
        list.push(doc);
        docsByFolder.set(doc.folder_id, list);
    }

    const colCount = 2 + projects.length + 1;

    return (
        <div className="h-full overflow-auto bg-gray-50/80">
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
                {/* Header */}
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                        <FolderOpen className="h-5 w-5 text-gray-700" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl font-semibold text-gray-900">
                            Documents
                        </h1>
                        <p className="text-sm text-gray-500">
                            Share your Library documents (or whole folders) to any
                            projects. A tick links a live reference — updating or
                            removing the document here updates every linked
                            project. Documents inside a linked folder inherit the
                            folder&apos;s project links.
                        </p>
                    </div>
                    <button
                        onClick={() => setCreatingFolder(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        <FolderPlus className="h-4 w-4" />
                        New folder
                    </button>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700">
                        {uploading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                            <Upload className="h-4 w-4" />
                        )}
                        Upload document
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            disabled={uploading}
                            onChange={handleUpload}
                        />
                    </label>
                </div>

                {creatingFolder && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200">
                        <FolderIcon className="h-4 w-4 shrink-0 text-gray-400" />
                        <input
                            autoFocus
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void handleCreateFolder();
                                if (e.key === "Escape") {
                                    setCreatingFolder(false);
                                    setNewFolderName("");
                                }
                            }}
                            placeholder="Folder name"
                            className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-gray-400"
                        />
                        <button
                            onClick={() => void handleCreateFolder()}
                            disabled={!newFolderName.trim() || creatingFolderBusy}
                            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                        >
                            {creatingFolderBusy ? "Creating…" : "Create"}
                        </button>
                        <button
                            onClick={() => {
                                setCreatingFolder(false);
                                setNewFolderName("");
                            }}
                            className="rounded-md px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
                    </div>
                ) : documents.length === 0 && folders.length === 0 ? (
                    <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-200">
                        <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-500">
                            No Library documents yet. Upload one to start sharing
                            it to projects.
                        </p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-200">
                        <p className="text-sm text-gray-500">
                            No projects to share to yet.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
                        <table className="min-w-full border-separate border-spacing-0 text-sm">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 z-10 border-b border-gray-100 bg-white px-4 py-3 text-left font-medium text-gray-500">
                                        Document / folder
                                    </th>
                                    <th className="border-b border-gray-100 bg-white px-3 py-3 text-left font-medium text-gray-500">
                                        Folder
                                    </th>
                                    {projects.map((p) => (
                                        <th
                                            key={p.id}
                                            className="border-b border-gray-100 bg-white px-3 py-3 text-center font-medium text-gray-500"
                                        >
                                            <span
                                                className="mx-auto block w-32 whitespace-normal break-words leading-tight"
                                                title={p.name}
                                            >
                                                {p.name}
                                            </span>
                                        </th>
                                    ))}
                                    <th className="border-b border-gray-100 bg-white px-3 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {folders.map((folder) => {
                                    const folderDocs =
                                        docsByFolder.get(folder.id) ?? [];
                                    return (
                                        <FragmentRows key={folder.id}>
                                            <tr className="bg-gray-50/70">
                                                <td className="sticky left-0 z-10 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <FolderIcon className="h-4 w-4 shrink-0 text-amber-500" />
                                                        {renamingFolderId ===
                                                        folder.id ? (
                                                            <>
                                                                <input
                                                                    autoFocus
                                                                    value={
                                                                        renameFolderValue
                                                                    }
                                                                    onChange={(e) =>
                                                                        setRenameFolderValue(
                                                                            e.target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    onKeyDown={(e) => {
                                                                        if (
                                                                            e.key ===
                                                                            "Enter"
                                                                        )
                                                                            void handleRenameFolder(
                                                                                folder,
                                                                            );
                                                                        if (
                                                                            e.key ===
                                                                            "Escape"
                                                                        )
                                                                            setRenamingFolderId(
                                                                                null,
                                                                            );
                                                                    }}
                                                                    className="rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500"
                                                                />
                                                                <button
                                                                    onClick={() =>
                                                                        void handleRenameFolder(
                                                                            folder,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        renameFolderBusy
                                                                    }
                                                                    className="rounded p-1 text-gray-400 hover:text-gray-700"
                                                                    title="Save"
                                                                >
                                                                    <Check className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        setRenamingFolderId(
                                                                            null,
                                                                        )
                                                                    }
                                                                    className="rounded p-1 text-gray-400 hover:text-gray-700"
                                                                    title="Cancel"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span
                                                                className="max-w-[220px] truncate font-medium text-gray-800"
                                                                title={folder.name}
                                                            >
                                                                {folder.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="border-b border-gray-100 px-3 py-2.5 text-xs text-gray-400">
                                                    {folderDocs.length}{" "}
                                                    {folderDocs.length === 1
                                                        ? "document"
                                                        : "documents"}
                                                </td>
                                                {projects.map((p) => {
                                                    const linked = isFolderLinked(
                                                        folder,
                                                        p.id,
                                                    );
                                                    const cellKey = `folder:${folder.id}:${p.id}`;
                                                    const busy =
                                                        savingCell.has(cellKey);
                                                    return (
                                                        <td
                                                            key={p.id}
                                                            className="border-b border-gray-100 px-3 py-2.5 text-center"
                                                        >
                                                            <button
                                                                onClick={() =>
                                                                    void toggleFolderLink(
                                                                        folder,
                                                                        p.id,
                                                                    )
                                                                }
                                                                disabled={busy}
                                                                aria-label={`${linked ? "Unlink" : "Link"} folder ${folder.name} ${linked ? "from" : "to"} ${p.name}`}
                                                                className={`inline-flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                                                                    linked
                                                                        ? "border-amber-600 bg-amber-500 text-white"
                                                                        : "border-gray-300 bg-white hover:border-gray-500"
                                                                } ${busy ? "opacity-50" : ""}`}
                                                            >
                                                                {linked && (
                                                                    <Check className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                                <td className="border-b border-gray-100 px-3 py-2.5 text-right">
                                                    {confirmDeleteFolder?.id ===
                                                    folder.id ? (
                                                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                                            <span className="text-xs text-red-600">
                                                                {folderDocs.length > 0
                                                                    ? `Delete folder + ${folderDocs.length} doc${folderDocs.length === 1 ? "" : "s"}?`
                                                                    : "Delete folder?"}
                                                            </span>
                                                            <button
                                                                onClick={() =>
                                                                    void handleDeleteFolder(
                                                                        folder,
                                                                    )
                                                                }
                                                                disabled={
                                                                    deletingFolderId ===
                                                                    folder.id
                                                                }
                                                                className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                                            >
                                                                {deletingFolderId ===
                                                                folder.id
                                                                    ? "Deleting…"
                                                                    : "Delete"}
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setConfirmDeleteFolder(
                                                                        null,
                                                                    )
                                                                }
                                                                className="rounded px-1.5 py-1 text-xs text-gray-400 hover:text-gray-600"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setRenamingFolderId(
                                                                        folder.id,
                                                                    );
                                                                    setRenameFolderValue(
                                                                        folder.name,
                                                                    );
                                                                }}
                                                                title="Rename folder"
                                                                className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setConfirmDeleteFolder(
                                                                        folder,
                                                                    )
                                                                }
                                                                title="Delete folder"
                                                                className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                            {folderDocs.map((doc) => (
                                                <tr key={doc.id} className="group">
                                                    <td className="sticky left-0 z-10 border-b border-gray-50 bg-white px-4 py-3 pl-9 group-hover:bg-gray-50/60">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                                                            <span
                                                                className="max-w-[220px] truncate text-gray-800"
                                                                title={doc.filename}
                                                            >
                                                                {doc.filename}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="border-b border-gray-50 px-3 py-3 group-hover:bg-gray-50/60">
                                                        <FolderSelect
                                                            doc={doc}
                                                            folders={folders}
                                                            disabled={movingIds.has(
                                                                doc.id,
                                                            )}
                                                            onChange={(folderId) =>
                                                                void handleMoveDocument(
                                                                    doc,
                                                                    folderId,
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                    {projects.map((p) => {
                                                        const linked =
                                                            isFolderLinked(
                                                                folder,
                                                                p.id,
                                                            );
                                                        return (
                                                            <td
                                                                key={p.id}
                                                                className="border-b border-gray-50 px-3 py-3 text-center group-hover:bg-gray-50/60"
                                                            >
                                                                <span
                                                                    title={`Linked via folder "${folder.name}"`}
                                                                    className={`inline-flex h-5 w-5 items-center justify-center rounded border ${
                                                                        linked
                                                                            ? "border-amber-300 bg-amber-50 text-amber-600"
                                                                            : "border-gray-200 bg-gray-50 text-transparent"
                                                                    }`}
                                                                >
                                                                    {linked && (
                                                                        <Check className="h-3.5 w-3.5" />
                                                                    )}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="border-b border-gray-50 px-3 py-3 text-right group-hover:bg-gray-50/60">
                                                        {confirmDelete?.id ===
                                                        doc.id ? (
                                                            <span className="inline-flex items-center gap-1.5">
                                                                <button
                                                                    onClick={() =>
                                                                        void handleDelete(
                                                                            doc,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        deletingId ===
                                                                        doc.id
                                                                    }
                                                                    className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                                                >
                                                                    {deletingId ===
                                                                    doc.id
                                                                        ? "Deleting…"
                                                                        : "Delete"}
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        setConfirmDelete(
                                                                            null,
                                                                        )
                                                                    }
                                                                    className="rounded px-1.5 py-1 text-xs text-gray-400 hover:text-gray-600"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() =>
                                                                    setConfirmDelete(
                                                                        doc,
                                                                    )
                                                                }
                                                                disabled={
                                                                    !!deletingId
                                                                }
                                                                title="Delete document"
                                                                className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </FragmentRows>
                                    );
                                })}

                                {folders.length > 0 && unfiledDocs.length > 0 && (
                                    <tr>
                                        <td
                                            colSpan={colCount}
                                            className="border-b border-gray-100 bg-gray-50/40 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-400"
                                        >
                                            Unfiled
                                        </td>
                                    </tr>
                                )}

                                {unfiledDocs.map((doc) => (
                                    <tr key={doc.id} className="group">
                                        <td className="sticky left-0 z-10 border-b border-gray-50 bg-white px-4 py-3 group-hover:bg-gray-50/60">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                                                <span
                                                    className="max-w-[260px] truncate text-gray-800"
                                                    title={doc.filename}
                                                >
                                                    {doc.filename}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="border-b border-gray-50 px-3 py-3 group-hover:bg-gray-50/60">
                                            <FolderSelect
                                                doc={doc}
                                                folders={folders}
                                                disabled={movingIds.has(doc.id)}
                                                onChange={(folderId) =>
                                                    void handleMoveDocument(
                                                        doc,
                                                        folderId,
                                                    )
                                                }
                                            />
                                        </td>
                                        {projects.map((p) => {
                                            const linked = isDocLinked(doc, p.id);
                                            const cellKey = `doc:${doc.id}:${p.id}`;
                                            const busy = savingCell.has(cellKey);
                                            return (
                                                <td
                                                    key={p.id}
                                                    className="border-b border-gray-50 px-3 py-3 text-center group-hover:bg-gray-50/60"
                                                >
                                                    <button
                                                        onClick={() =>
                                                            void toggleDocLink(
                                                                doc,
                                                                p.id,
                                                            )
                                                        }
                                                        disabled={busy}
                                                        aria-label={`${linked ? "Unlink" : "Link"} ${doc.filename} ${linked ? "from" : "to"} ${p.name}`}
                                                        className={`inline-flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                                                            linked
                                                                ? "border-gray-900 bg-gray-900 text-white"
                                                                : "border-gray-300 bg-white hover:border-gray-500"
                                                        } ${busy ? "opacity-50" : ""}`}
                                                    >
                                                        {linked && (
                                                            <Check className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                        <td className="border-b border-gray-50 px-3 py-3 text-right group-hover:bg-gray-50/60">
                                            {confirmDelete?.id === doc.id ? (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <button
                                                        onClick={() =>
                                                            void handleDelete(doc)
                                                        }
                                                        disabled={
                                                            deletingId === doc.id
                                                        }
                                                        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                                    >
                                                        {deletingId === doc.id
                                                            ? "Deleting…"
                                                            : "Delete"}
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setConfirmDelete(null)
                                                        }
                                                        className="rounded px-1.5 py-1 text-xs text-gray-400 hover:text-gray-600"
                                                    >
                                                        Cancel
                                                    </button>
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() =>
                                                        setConfirmDelete(doc)
                                                    }
                                                    disabled={!!deletingId}
                                                    title="Delete document"
                                                    className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className="mt-4 text-xs text-gray-400">
                    Linked documents appear in each project&apos;s document list
                    (read-only) and are available to that project&apos;s
                    assistant and agents. Deleting a document here removes it
                    everywhere it is linked. Deleting a folder deletes the
                    documents inside it too.
                </p>
            </div>
        </div>
    );
}

/** Plain passthrough — lets a `.map()` callback return a folder header row
 * plus its document rows as siblings inside `<tbody>` without an extra DOM
 * wrapper element (tables don't tolerate a wrapping <div>/<tbody>). */
function FragmentRows({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

function FolderSelect({
    doc,
    folders,
    disabled,
    onChange,
}: {
    doc: AdminDocLibraryEntry;
    folders: AdminDocLibraryFolder[];
    disabled: boolean;
    onChange: (folderId: string | null) => void;
}) {
    return (
        <select
            value={doc.folder_id ?? NO_FOLDER}
            disabled={disabled}
            onChange={(e) => {
                const value = e.target.value;
                onChange(value === NO_FOLDER ? null : value);
            }}
            className="max-w-[160px] rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-gray-400 disabled:opacity-50"
        >
            <option value={NO_FOLDER}>No folder</option>
            {folders.map((f) => (
                <option key={f.id} value={f.id}>
                    {f.name}
                </option>
            ))}
        </select>
    );
}
