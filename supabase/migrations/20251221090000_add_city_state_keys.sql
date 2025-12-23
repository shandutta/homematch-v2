-- Add generated keys for fast city/state filtering
alter table neighborhoods
  add column if not exists city_state_key text generated always as (
    lower(trim(city)) || '|' || lower(trim(state))
  ) stored;

alter table properties
  add column if not exists city_state_key text generated always as (
    lower(trim(city)) || '|' || lower(trim(state))
  ) stored;

create index if not exists neighborhoods_city_state_key_idx
  on neighborhoods (city_state_key);

create index if not exists properties_city_state_key_idx
  on properties (city_state_key);
