-- Create a dedicated RBAC authority table for human/admin service-role access.
--
-- `user_profiles.role` is application profile data and must not authorize the
-- server-side Supabase service-role client. This table is the explicit source of
-- truth for that authority. It intentionally has no authenticated INSERT,
-- UPDATE, or DELETE policy, so ordinary application users cannot self-promote.

begin;

create table if not exists public.admin_role_assignments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  reason text,
  expires_at timestamptz,
  constraint admin_role_assignments_role_check check (role in ('admin')),
  constraint admin_role_assignments_reason_length check (reason is null or char_length(reason) <= 500)
);

comment on table public.admin_role_assignments is
  'Dedicated RBAC authority for human/admin Supabase service-role access. Do not derive service-role authority from user_profiles.role.';
comment on column public.admin_role_assignments.user_id is
  'Auth user that has been granted an explicit admin/service-role-capable assignment.';
comment on column public.admin_role_assignments.created_by is
  'Auth user or bootstrap/service operation that granted the assignment; nullable for service-only bootstrap runs.';
comment on column public.admin_role_assignments.expires_at is
  'Optional expiration timestamp; expired assignments must fail closed in application authorization.';

alter table public.admin_role_assignments enable row level security;

revoke all on table public.admin_role_assignments from anon;
revoke all on table public.admin_role_assignments from authenticated;

grant select on table public.admin_role_assignments to authenticated;
grant all on table public.admin_role_assignments to service_role;
grant all on table public.admin_role_assignments to supabase_auth_admin;

drop policy if exists admin_role_assignments_self_select on public.admin_role_assignments;
create policy admin_role_assignments_self_select
  on public.admin_role_assignments
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and enabled = true
    and (expires_at is null or expires_at > now())
  );

-- No authenticated INSERT/UPDATE/DELETE policy is created here. Assignment
-- administration must happen through an approved service-role/bootstrap process
-- or a future audited admin-management path, not through self-service app RLS.

commit;

-- DOWN:
-- BEGIN;
-- DROP POLICY IF EXISTS admin_role_assignments_self_select ON public.admin_role_assignments;
-- DROP TABLE IF EXISTS public.admin_role_assignments;
-- COMMIT;
