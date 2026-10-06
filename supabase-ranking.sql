-- DEPTHGATE — Hall da Fama online e Desafio Diário
-- Cole tudo no Supabase: menu "SQL Editor" > "New query" > Run.

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  mode        text not null check (mode in ('endless','daily')),
  day         date,
  player_name text not null check (char_length(player_name) between 1 and 16),
  class_id    text not null check (char_length(class_id) <= 24),
  depth       int  not null check (depth between 1 and 999),
  score       int  not null check (score between 0 and 50000000),
  elapsed_ms  int  not null check (elapsed_ms between 0 and 86400000),
  seed        text check (char_length(seed) <= 32),
  version     text check (char_length(version) <= 16),
  -- o desafio diário precisa da data; o ranking geral não
  constraint daily_tem_dia check ((mode = 'daily' and day is not null) or (mode = 'endless' and day is null)),
  -- o dia enviado só pode ser hoje ou ontem (UTC), para impedir pontuação em dias antigos
  constraint dia_recente check (day is null or day between (now() at time zone 'utc')::date - 1 and (now() at time zone 'utc')::date)
);

create index if not exists scores_rank_idx  on public.scores (mode, score desc);
create index if not exists scores_daily_idx on public.scores (mode, day, score desc);

alter table public.scores enable row level security;

-- qualquer pessoa pode LER o ranking
drop policy if exists "ranking: leitura publica" on public.scores;
create policy "ranking: leitura publica" on public.scores
  for select using (true);

-- qualquer pessoa pode ENVIAR uma pontuação (não pode editar nem apagar)
drop policy if exists "ranking: envio publico" on public.scores;
create policy "ranking: envio publico" on public.scores
  for insert with check (true);
