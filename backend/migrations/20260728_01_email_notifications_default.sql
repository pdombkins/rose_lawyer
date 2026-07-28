-- 2026-07-28 — Turn notification email on by default.
--
-- `user_profiles.email_notifications` defaulted to false and NOBODY had ever
-- turned it on (0 of 39 profiles), so `sendEmailIfEnabled()` in
-- backend/src/lib/notifications.ts returned early every time and not one
-- notification email had ever been sent. That surfaced as "the email server
-- isn't working" alongside the unrelated invite-link incident.
--
-- For a teaching instance the useful default is on. The opt-in gate in the
-- application code is unchanged — students can still switch it off at
-- Account -> Features.
--
-- `handle_new_user()` inserts only (user_id, email), so it does not override
-- the column default: every future account inherits the new value.
--
-- ALREADY APPLIED to the Rose.Lawyer project on 2026-07-28.

alter table public.user_profiles
  alter column email_notifications set default true;

update public.user_profiles
  set email_notifications = true,
      updated_at = now()
  where email_notifications = false;
