-- =====================================================================
-- Teaching content visibility — vector search across instructor content
--
-- WHY
-- Playbooks, clauses, knowledge-base chunks and Library documents are all
-- scoped to their owner. That is right for a firm and wrong for a class: the
-- instructor seeds the teaching content under one account, and every student
-- then searches their own (empty) library. As at 30 July 2026 there were
-- 0 kb_chunks and 0 workflow_shares, so `search_knowledge`, `list_playbooks`,
-- `review_against_playbook` and `search_clauses` returned nothing for the
-- entire cohort.
--
-- WHAT THIS ADDS
-- A `teaching_owners uuid[]` parameter on the two vector-search functions.
-- The backend computes it as the creators of the user_groups the caller
-- belongs to (see backend/src/lib/teachingContent.ts) — so it is empty for
-- ordinary users and non-empty only for students in a cohort. Read-only:
-- nothing here grants write access, and the write paths are untouched.
--
-- Additive. The existing 4- and 5-argument overloads are left in place, and
-- PostgREST resolves by argument NAME, so old callers are unaffected.
-- =====================================================================

create or replace function public.match_kb_chunks(
  query_embedding vector,
  match_owner uuid,
  match_count integer default 6,
  filter_doc_type text default null,
  accessible_projects uuid[] default null,
  teaching_owners uuid[] default null
)
returns table (
  document_id uuid,
  title text,
  doc_type text,
  chunk_index integer,
  content text,
  similarity double precision
)
language sql
stable
as $function$
  select c.document_id, d.title, d.doc_type, c.chunk_index, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.kb_chunks c
  join public.kb_documents d on d.id = c.document_id
  where c.embedding is not null
    and (filter_doc_type is null or d.doc_type = filter_doc_type)
    and (
      (c.project_id is null and c.owner_id = match_owner)
      or (c.project_id is not null
          and accessible_projects is not null
          and c.project_id = any(accessible_projects))
      -- Cohort teaching content: unfiled chunks owned by an instructor whose
      -- group the caller belongs to.
      or (c.project_id is null
          and teaching_owners is not null
          and c.owner_id = any(teaching_owners))
    )
  order by c.embedding <=> query_embedding
  limit greatest(1, match_count);
$function$;

create or replace function public.match_clauses(
  query_embedding vector,
  match_owner uuid,
  match_count integer default 6,
  filter_agreement_type text default null,
  accessible_projects uuid[] default null,
  teaching_owners uuid[] default null
)
returns table (
  id uuid,
  title text,
  agreement_type text,
  body text,
  guidance text,
  tags text[],
  similarity double precision
)
language sql
stable
as $function$
  select c.id, c.title, c.agreement_type, c.body, c.guidance, c.tags,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.clauses c
  where c.embedding is not null
    and (filter_agreement_type is null or c.agreement_type = filter_agreement_type)
    and (
      (c.project_id is null and c.owner_id = match_owner)
      or (c.project_id is not null
          and accessible_projects is not null
          and c.project_id = any(accessible_projects))
      or (c.project_id is null
          and teaching_owners is not null
          and c.owner_id = any(teaching_owners))
    )
  order by c.embedding <=> query_embedding
  limit greatest(1, match_count);
$function$;
