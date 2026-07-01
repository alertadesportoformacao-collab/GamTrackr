-- Schema base GamTrackr

create table if not exists clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        text,
  team_limit  integer,
  created_at  timestamptz not null default now()
);

create table if not exists modalities (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists event_types (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  icon            text,
  color           text not null default '#3b82f6',
  sort_order      integer not null default 0,
  modality_id     uuid references modalities(id) on delete cascade,
  registro_tipo   text not null default 'realtime' check (registro_tipo in ('realtime','postmatch')),
  requer_jogador  boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text,
  name           text,
  role           text not null default 'club_opp' check (role in ('super_admin','admin_club','club_opp')),
  club_id        uuid references clubs(id) on delete set null,
  can_open_games boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists escaloes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  club_id     uuid not null references clubs(id) on delete cascade,
  modality_id uuid references modalities(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists players (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  number           integer,
  position         text,
  escalao_id       uuid not null references escaloes(id) on delete cascade,
  birth_date       date,
  escalao_superior boolean not null default false,
  fpf_link         text,
  photo_url        text,
  created_at       timestamptz not null default now()
);

create table if not exists games (
  id          uuid primary key default gen_random_uuid(),
  escalao_id  uuid not null references escaloes(id) on delete cascade,
  opponent    text not null,
  game_date   date not null,
  location    text,
  status      text not null default 'active' check (status in ('active','finished')),
  youtube_url text,
  created_at  timestamptz not null default now()
);

create table if not exists game_events (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id) on delete cascade,
  event_type_id uuid not null references event_types(id) on delete restrict,
  player_id     uuid references players(id) on delete set null,
  minute        integer,
  synced_at     timestamptz,
  created_at    timestamptz not null default now()
);

-- RLS
alter table clubs       enable row level security;
alter table modalities  enable row level security;
alter table event_types enable row level security;
alter table profiles    enable row level security;
alter table escaloes    enable row level security;
alter table players     enable row level security;
alter table games       enable row level security;
alter table game_events enable row level security;

-- Policies: super_admin vê tudo
create policy "super_admin all" on clubs       for all using (exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'));
create policy "super_admin all" on modalities  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'));
create policy "super_admin all" on event_types for all using (exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'));
create policy "super_admin all" on profiles    for all using (exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'));
create policy "super_admin all" on escaloes    for all using (exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'));
create policy "super_admin all" on players     for all using (exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'));
create policy "super_admin all" on games       for all using (exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'));
create policy "super_admin all" on game_events for all using (exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'));

-- Policies: admin_club e club_opp veem o seu clube
create policy "club read own" on clubs for select using (
  id = (select club_id from profiles where id = auth.uid())
);
create policy "club read modalities" on modalities for select using (auth.role() = 'authenticated');
create policy "club read event_types" on event_types for select using (auth.role() = 'authenticated');

create policy "own profile" on profiles for select using (id = auth.uid());
create policy "own profile update" on profiles for update using (id = auth.uid());

create policy "club escaloes" on escaloes for all using (
  club_id = (select club_id from profiles where id = auth.uid())
);
create policy "club players" on players for all using (
  escalao_id in (select id from escaloes where club_id = (select club_id from profiles where id = auth.uid()))
);
create policy "club games" on games for all using (
  escalao_id in (select id from escaloes where club_id = (select club_id from profiles where id = auth.uid()))
);
create policy "club game_events" on game_events for all using (
  game_id in (
    select g.id from games g
    join escaloes e on e.id = g.escalao_id
    where e.club_id = (select club_id from profiles where id = auth.uid())
  )
);
