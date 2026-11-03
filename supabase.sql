-- ==========================================================
-- Doodle Jump Ultimate: друзья, подарки и таблицы лидеров
-- Вставь целиком в Supabase → SQL Editor → New query и нажми Run.
-- Скрипт можно запускать повторно: он ничего не сломает.
--
-- Как устроена защита:
-- * Таблицы закрыты (RLS включён, правил доступа нет) — напрямую их не прочитать и не изменить.
-- * Игра работает только через функции ниже. Каждое изменение проверяет секрет игрока
--   (в базе хранится только его хэш), поэтому чужие данные изменить нельзя.
-- ==========================================================

create table if not exists public.dj_players (
  id          uuid primary key default gen_random_uuid(),
  secret_hash text not null,
  code        text not null unique,
  name        text not null,
  skin        text not null default 'classic',
  arena       int  not null default 1,
  xp          bigint not null default 0,
  best        int  not null default 0,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create table if not exists public.dj_scores (
  player_id  uuid not null references public.dj_players(id) on delete cascade,
  arena      int  not null,
  best       int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player_id, arena)
);

create table if not exists public.dj_weekly (
  player_id uuid not null references public.dj_players(id) on delete cascade,
  week      date not null,
  best      int  not null default 0,
  primary key (player_id, week)
);

create table if not exists public.dj_friends (
  player_id  uuid not null references public.dj_players(id) on delete cascade,
  friend_id  uuid not null references public.dj_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, friend_id),
  check (player_id <> friend_id)
);

create table if not exists public.dj_gifts (
  id         bigint generated always as identity primary key,
  from_id    uuid not null references public.dj_players(id) on delete cascade,
  to_id      uuid not null references public.dj_players(id) on delete cascade,
  amount     int  not null,
  day        date not null default current_date,
  claimed    boolean not null default false,
  created_at timestamptz not null default now(),
  unique (from_id, to_id, day)
);

create index if not exists dj_players_best_idx on public.dj_players (best desc);
create index if not exists dj_scores_arena_idx on public.dj_scores (arena, best desc);
create index if not exists dj_weekly_week_idx  on public.dj_weekly (week, best desc);
create index if not exists dj_friends_friend_idx on public.dj_friends (friend_id);
create index if not exists dj_gifts_to_idx on public.dj_gifts (to_id) where not claimed;

alter table public.dj_players enable row level security;
alter table public.dj_scores  enable row level security;
alter table public.dj_weekly  enable row level security;
alter table public.dj_friends enable row level security;
alter table public.dj_gifts   enable row level security;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.dj_players, public.dj_scores, public.dj_weekly, public.dj_friends, public.dj_gifts from %I', r);
    end if;
  end loop;
end $$;

-- ---------- служебные функции (снаружи недоступны) ----------

create or replace function public.dj_hash(p_secret text) returns text
language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex')
$$;

create or replace function public.dj_check(p_id uuid, p_secret text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_id is null or p_secret is null or length(p_secret) < 16
     or not exists (select 1 from dj_players where id = p_id and secret_hash = dj_hash(p_secret)) then
    raise exception 'auth' using errcode = '28000';
  end if;
end $$;

create or replace function public.dj_clean_name(p_name text) returns text
language sql immutable set search_path = public as $$
  select case when length(n) between 2 and 16 then n end
  from (select btrim(regexp_replace(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]<>]', '', 'g'), '\s+', ' ', 'g')) as n) t
$$;

-- ---------- функции для игры ----------

-- Новый игрок: возвращает id и код друга
create or replace function public.dj_register(p_secret text, p_name text default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_code text; v_name text;
  v_abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if p_secret is null or length(p_secret) not between 16 and 128 then
    raise exception 'bad secret' using errcode = '22023';
  end if;
  v_name := coalesce(dj_clean_name(p_name), 'Игрок ' || (1000 + floor(random() * 9000))::int);
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_abc, 1 + floor(random() * length(v_abc))::int, 1);
    end loop;
    begin
      insert into dj_players (secret_hash, code, name) values (dj_hash(p_secret), v_code, v_name) returning id into v_id;
      exit;
    exception when unique_violation then
      -- такой код уже есть, пробуем другой
    end;
  end loop;
  return json_build_object('id', v_id, 'code', v_code, 'name', v_name);
end $$;

-- Отправка прогресса: имя, скин, арена, опыт, рекорды по аренам и рекорд недели
create or replace function public.dj_sync(
  p_id uuid, p_secret text, p_name text, p_skin text, p_arena int, p_xp bigint,
  p_scores jsonb, p_week date, p_week_best int
) returns json
language plpgsql security definer set search_path = public as $$
declare v json;
begin
  perform dj_check(p_id, p_secret);

  update dj_players set
    name      = coalesce(dj_clean_name(p_name), name),
    skin      = left(coalesce(nullif(p_skin, ''), skin), 24),
    arena     = greatest(1, least(30, coalesce(p_arena, arena))),
    xp        = greatest(xp, least(coalesce(p_xp, 0), 1000000000000)),
    last_seen = now()
  where id = p_id;

  insert into dj_scores (player_id, arena, best)
  select p_id, e.key::int, least(e.value::bigint, 50000000)::int
  from jsonb_each_text(case when jsonb_typeof(p_scores) = 'object' then p_scores else '{}'::jsonb end) e
  where e.key ~ '^[0-9]{1,2}$' and e.key::int between 1 and 30 and e.value ~ '^[0-9]{1,9}$' and e.value::bigint > 0
  on conflict (player_id, arena) do update
    set best = excluded.best, updated_at = now()
    where excluded.best > dj_scores.best;

  update dj_players set best = coalesce((select max(best) from dj_scores where player_id = p_id), 0) where id = p_id;

  if p_week is not null and coalesce(p_week_best, 0) > 0
     and p_week between current_date - 13 and current_date + 1 then
    insert into dj_weekly (player_id, week, best) values (p_id, p_week, least(p_week_best, 50000000))
    on conflict (player_id, week) do update set best = excluded.best where excluded.best > dj_weekly.best;
  end if;

  select json_build_object(
    'name', p.name, 'code', p.code,
    'gifts', (select count(*) from dj_gifts g where g.to_id = p_id and not g.claimed),
    'friends', (select count(*) from dj_friends f where f.player_id = p_id)
  ) into v from dj_players p where p.id = p_id;
  return v;
end $$;

-- Добавить друга по коду (дружба сразу взаимная)
create or replace function public.dj_add_friend(p_id uuid, p_secret text, p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare v_f uuid; v_name text;
begin
  perform dj_check(p_id, p_secret);
  select id, name into v_f, v_name from dj_players
  where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if v_f is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if v_f = p_id then return json_build_object('ok', false, 'error', 'self'); end if;
  if exists (select 1 from dj_friends where player_id = p_id and friend_id = v_f) then
    return json_build_object('ok', false, 'error', 'already', 'name', v_name);
  end if;
  if (select count(*) from dj_friends where player_id = p_id) >= 100 then
    return json_build_object('ok', false, 'error', 'limit');
  end if;
  insert into dj_friends (player_id, friend_id) values (p_id, v_f), (v_f, p_id) on conflict do nothing;
  return json_build_object('ok', true, 'name', v_name);
end $$;

create or replace function public.dj_remove_friend(p_id uuid, p_secret text, p_friend uuid) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform dj_check(p_id, p_secret);
  delete from dj_friends where (player_id = p_id and friend_id = p_friend) or (player_id = p_friend and friend_id = p_id);
  return json_build_object('ok', true);
end $$;

-- Список друзей с рекордами
create or replace function public.dj_friends(p_id uuid, p_secret text) returns json
language plpgsql security definer set search_path = public as $$
declare v json;
begin
  perform dj_check(p_id, p_secret);
  select coalesce(json_agg(x order by x.best desc, x.name), '[]'::json) into v from (
    select p.id, p.code, p.name, p.skin, p.arena, p.xp, p.best, p.last_seen,
      (select coalesce(json_object_agg(s.arena, s.best), '{}'::json) from dj_scores s where s.player_id = p.id) as scores,
      exists (select 1 from dj_gifts g where g.from_id = p_id and g.to_id = p.id and g.day = current_date) as gifted
    from dj_friends f join dj_players p on p.id = f.friend_id
    where f.player_id = p_id
  ) x;
  return v;
end $$;

-- Подарок другу: 50 монет, раз в день каждому
create or replace function public.dj_send_gift(p_id uuid, p_secret text, p_to uuid) returns json
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform dj_check(p_id, p_secret);
  if not exists (select 1 from dj_friends where player_id = p_id and friend_id = p_to) then
    return json_build_object('ok', false, 'error', 'not_friend');
  end if;
  insert into dj_gifts (from_id, to_id, amount) values (p_id, p_to, 50) on conflict do nothing;
  get diagnostics n = row_count;
  return json_build_object('ok', n > 0, 'error', case when n = 0 then 'already' end);
end $$;

-- Забрать подарки
create or replace function public.dj_claim_gifts(p_id uuid, p_secret text) returns json
language plpgsql security definer set search_path = public as $$
declare v json;
begin
  perform dj_check(p_id, p_secret);
  with c as (
    update dj_gifts set claimed = true where to_id = p_id and not claimed returning from_id, amount
  )
  select json_build_object(
    'total', coalesce(sum(c.amount), 0),
    'count', count(*),
    'from', coalesce(json_agg(distinct p.name) filter (where p.name is not null), '[]'::json)
  ) into v
  from c left join dj_players p on p.id = c.from_id;
  return v;
end $$;

-- Таблица лидеров: kind = 'all' | 'arena' | 'week'
create or replace function public.dj_leaderboard(p_kind text, p_arena int default 1, p_week date default null, p_id uuid default null) returns json
language sql stable security definer set search_path = public as $$
  with b as (
    select id as pid, best from dj_players where p_kind = 'all' and best > 0
    union all
    select player_id, best from dj_scores where p_kind = 'arena' and arena = p_arena and best > 0
    union all
    select player_id, best from dj_weekly where p_kind = 'week' and week = p_week and best > 0
  ), r as (
    select pid, best, rank() over (order by best desc) as rk from b
  )
  select json_build_object(
    'top', coalesce((
      select json_agg(json_build_object('rank', t.rk, 'name', p.name, 'skin', p.skin, 'best', t.best, 'me', t.pid = p_id) order by t.rk, p.name)
      from (select * from r order by rk limit 50) t join dj_players p on p.id = t.pid
    ), '[]'::json),
    'me', (select json_build_object('rank', rk, 'best', best) from r where pid = p_id),
    'total', (select count(*) from b)
  )
$$;

-- ---------- права: наружу открыты только функции для игры ----------
revoke all on function public.dj_hash(text) from public;
revoke all on function public.dj_check(uuid, text) from public;
revoke all on function public.dj_clean_name(text) from public;
revoke all on function public.dj_register(text, text) from public;
revoke all on function public.dj_sync(uuid, text, text, text, int, bigint, jsonb, date, int) from public;
revoke all on function public.dj_add_friend(uuid, text, text) from public;
revoke all on function public.dj_remove_friend(uuid, text, uuid) from public;
revoke all on function public.dj_friends(uuid, text) from public;
revoke all on function public.dj_send_gift(uuid, text, uuid) from public;
revoke all on function public.dj_claim_gifts(uuid, text) from public;
revoke all on function public.dj_leaderboard(text, int, date, uuid) from public;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function public.dj_hash(text), public.dj_check(uuid, text), public.dj_clean_name(text) from %I', r);
      execute format('grant execute on function
        public.dj_register(text, text),
        public.dj_sync(uuid, text, text, text, int, bigint, jsonb, date, int),
        public.dj_add_friend(uuid, text, text),
        public.dj_remove_friend(uuid, text, uuid),
        public.dj_friends(uuid, text),
        public.dj_send_gift(uuid, text, uuid),
        public.dj_claim_gifts(uuid, text),
        public.dj_leaderboard(text, int, date, uuid) to %I', r);
    end if;
  end loop;
end $$;

-- обновить кэш API, чтобы функции стали доступны сразу
notify pgrst, 'reload schema';
