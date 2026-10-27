-- Fill public.profiles from the users already linked in public.mobile_clients.
-- This keeps public.mobile_clients as the source of truth for the app.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'customer', 'cliente', 'empleado', 'delivery'));

insert into public.profiles (id, full_name, phone, role, created_at)
select
  mobile_clients.auth_user_id,
  mobile_clients.full_name,
  mobile_clients.phone,
  coalesce(nullif(mobile_clients.role, ''), 'cliente'),
  coalesce(mobile_clients.created_at, now())
from public.mobile_clients
where mobile_clients.auth_user_id is not null
on conflict (id) do update
set
  full_name = excluded.full_name,
  phone = excluded.phone,
  role = excluded.role;

create or replace function public.sync_profile_from_mobile_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.auth_user_id is null then
    return new;
  end if;

  insert into public.profiles (id, full_name, phone, role, created_at)
  values (
    new.auth_user_id,
    new.full_name,
    new.phone,
    coalesce(nullif(new.role, ''), 'cliente'),
    coalesce(new.created_at, now())
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone = excluded.phone,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists mobile_clients_sync_profile on public.mobile_clients;
create trigger mobile_clients_sync_profile
after insert or update of auth_user_id, full_name, phone, role
on public.mobile_clients
for each row
execute function public.sync_profile_from_mobile_client();
