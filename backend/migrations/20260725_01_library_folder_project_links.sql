-- Central document management, extended to folders — link a Library folder
-- (library_folders, library_kind = 'file') to any number of projects.
--
-- Mirrors document_project_links (20260724_01), but at the folder level:
-- every document filed inside a linked folder inherits that folder's project
-- links (override, not additive — see documentLinks.ts/folderLinks.ts). This
-- lets an admin organise Library documents into folders (e.g. "Group A
-- matter docs") and link the whole folder to a project once, instead of
-- ticking every document individually.
--
-- Used by:
--   * Admin → Documents (folder rows get their own project-link checkboxes)
--   * Project document listings + buildProjectDocContext (a document's
--     effective project links resolve through its folder when it has one)
--
-- Access control is enforced in backend code, same pattern as
-- document_project_links. RLS is enabled to match the rest of the schema;
-- the service role bypasses.
--
-- Run in the Supabase SQL editor.

create table if not exists public.library_folder_project_links (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.library_folders(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  linked_by uuid,
  created_at timestamptz not null default now(),
  unique (folder_id, project_id)
);

create index if not exists idx_lfpl_project on public.library_folder_project_links(project_id);
create index if not exists idx_lfpl_folder on public.library_folder_project_links(folder_id);

alter table public.library_folder_project_links enable row level security;
