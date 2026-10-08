-- DEPTHGATE — Hall da Fama Online, Desafio Diário e Sistema de Perfis na Nuvem
-- ==============================================================================
-- INSTRUÇÕES DE INSTALAÇÃO NO SUPABASE:
-- 1. Acesse o painel do Supabase: https://supabase.com/dashboard/project/drkypjvlclvjzfuakjeo
-- 2. No menu lateral esquerdo, clique no ícone "SQL Editor" > botão "New query".
-- 3. Cole todo o conteúdo deste arquivo e clique no botão verde "RUN" (ou pressione Ctrl+Enter).
--
-- (Opcional - para Supabase Auth nativo sem restrição de e-mails):
-- No menu lateral: "Authentication" > "Providers" > "Email" > desmarque "Confirm email" e clique em Save.
-- ==============================================================================

-- 1. TABELA DE PONTUAÇÕES DO RANKING (HALL DA FAMA & DESAFIO DIÁRIO)
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
  avatar      text, -- Suporte a foto/avatar do jogador no ranking
  -- O desafio diário precisa da data; o ranking geral não
  constraint daily_tem_dia check ((mode = 'daily' and day is not null) or (mode = 'endless' and day is null)),
  -- O dia enviado só pode ser hoje ou ontem (UTC)
  constraint dia_recente check (day is null or day between (now() at time zone 'utc')::date - 1 and (now() at time zone 'utc')::date)
);

-- Garante a coluna 'avatar' caso a tabela 'scores' já existisse anteriormente
alter table public.scores add column if not exists avatar text;

create index if not exists scores_rank_idx  on public.scores (mode, score desc);
create index if not exists scores_daily_idx on public.scores (mode, day, score desc);

alter table public.scores enable row level security;

-- Políticas de segurança para pontuações:
drop policy if exists "ranking: leitura publica" on public.scores;
create policy "ranking: leitura publica" on public.scores
  for select using (true);

drop policy if exists "ranking: envio publico" on public.scores;
create policy "ranking: envio publico" on public.scores
  for insert with check (true);

drop policy if exists "ranking: exclusao publica" on public.scores;
create policy "ranking: exclusao publica" on public.scores
  for delete using (true);


-- 2. TABELA DE PERFIS DE JOGADORES (SINCRONIZAÇÃO DE PERFIL E FOTO ENTRE DISPOSITIVOS)
-- Permite login em qualquer PC, celular ou navegador sem depender de confirmação por e-mail.
create table if not exists public.profiles (
  id             text primary key, -- email ou username normalizado em minúsculas
  username       text not null check (char_length(username) between 1 and 24),
  email          text,
  avatar_type    text not null default 'hero' check (avatar_type in ('hero', 'custom')),
  avatar_hero    text default 'warrior',
  avatar_custom  text, -- Miniatura compactada em base64 (~2-3 KB)
  platform       text default 'browser',
  password_hash  text not null, -- Hash SHA-256 seguro da senha
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);

alter table public.profiles enable row level security;

-- Políticas de segurança para perfis:
-- Leitura pública: qualquer jogador pode ver nomes e avatares (para o ranking e amigos)
drop policy if exists "profiles: leitura publica" on public.profiles;
create policy "profiles: leitura publica" on public.profiles
  for select using (true);

-- Inserção pública: qualquer usuário pode se cadastrar
drop policy if exists "profiles: insercao publica" on public.profiles;
create policy "profiles: insercao publica" on public.profiles
  for insert with check (true);

-- Atualização pública: permite atualizar o próprio perfil
drop policy if exists "profiles: atualizacao publica" on public.profiles;
create policy "profiles: atualizacao publica" on public.profiles
  for update using (true);
