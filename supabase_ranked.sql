-- ==========================================================
-- Лига: кубки игроков на сервере (звание рядом с ником в «Друзьях»)
-- Запусти один раз в Supabase → SQL Editor (после основного supabase.sql).
-- Можно запускать повторно.
-- ==========================================================

alter table public.dj_players add column if not exists cups int not null default 0;
alter table public.dj_players add column if not exists ranked_best int not null default 0;

-- Клиент присылает кубки и лучший счёт лиги
create or replace function public.dj_ranked_report(
  p_id uuid, p_secret text, p_cups int, p_best int, p_secs int default 0, p_matches int default 0
) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform dj_check(p_id, p_secret);
  update dj_players
     set cups = greatest(0, least(coalesce(p_cups, 0), 7000)),
         ranked_best = greatest(ranked_best, greatest(0, least(coalesce(p_best, 0), 1000000000))),
         last_seen = now()
   where id = p_id;
  return json_build_object('ok', true);
end $$;

-- Топ игроков по кубкам
create or replace function public.dj_ranked_top(p_limit int default 20) returns json
language plpgsql security definer set search_path = public as $$
declare v json;
begin
  select coalesce(json_agg(x), '[]'::json) into v from (
    select p.name, p.cups
    from dj_players p
    where p.cups > 0
    order by p.cups desc, p.name
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  ) x;
  return v;
end $$;

-- Друзья: теперь с кубками (по ним рисуется звание)
create or replace function public.dj_friends(p_id uuid, p_secret text) returns json
language plpgsql security definer set search_path = public as $$
declare v json;
begin
  perform dj_check(p_id, p_secret);
  select coalesce(json_agg(x order by x.best desc, x.name), '[]'::json) into v from (
    select p.id, p.code, p.name, p.skin, p.arena, p.xp, p.best, p.cups, p.last_seen,
      (select coalesce(json_object_agg(s.arena, s.best), '{}'::json) from dj_scores s where s.player_id = p.id) as scores,
      exists (select 1 from dj_gifts g where g.from_id = p_id and g.to_id = p.id and g.day = current_date) as gifted
    from dj_friends f join dj_players p on p.id = f.friend_id
    where f.player_id = p_id
  ) x;
  return v;
end $$;

revoke all on function public.dj_ranked_report(uuid, text, int, int, int, int) from public;
revoke all on function public.dj_ranked_top(int) from public;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('grant execute on function
        public.dj_ranked_report(uuid, text, int, int, int, int),
        public.dj_ranked_top(int),
        public.dj_friends(uuid, text) to %I', r);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
