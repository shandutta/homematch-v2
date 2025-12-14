-- Add AI-generated vibe fields to neighborhoods
alter table public.neighborhoods
  add column if not exists vibe_tagline text,
  add column if not exists vibe_summary text,
  add column if not exists vibe_keywords text[] default '{}'::text[],
  add column if not exists vibe_generated_at timestamptz,
  add column if not exists vibe_model text;

comment on column public.neighborhoods.vibe_tagline is 'Short hook describing the neighborhood vibe';
comment on column public.neighborhoods.vibe_summary is 'Two to three sentence AI-generated summary about the neighborhood feel';
comment on column public.neighborhoods.vibe_keywords is 'Concise descriptors captured from the vibe generation prompt';
comment on column public.neighborhoods.vibe_generated_at is 'Timestamp of the last vibe generation run';
comment on column public.neighborhoods.vibe_model is 'Model identifier used for the vibe generation run';
