-- ============================================================================
-- WORLDS 2026 导播台 · 弹幕表
-- 在 Supabase 控制台 → SQL Editor 里整段粘贴执行一次即可。
-- 执行后页面会自动从「本地弹幕」切换到「线上共享弹幕」，无需改任何代码。
-- ============================================================================

-- 1) 弹幕表
create table if not exists public.danmaku (
  id          text primary key,
  text        text        not null check (char_length(text) between 1 and 120),
  author      text        not null default '召唤师',
  team        text        not null default 'NEUTRAL' check (team in ('GEN', 'BLG', 'NEUTRAL')),
  color       text        not null default '#ffffff',
  lane        integer     not null default 0,
  likes       integer     not null default 1,
  created_at  timestamptz not null default now()
);

-- 2) 查询索引：按时间倒序取最近 N 条
create index if not exists danmaku_created_at_idx
  on public.danmaku (created_at desc);

-- 3) 行级安全：所有人可读、可发；不给 update / delete 权限
alter table public.danmaku enable row level security;

drop policy if exists "danmaku_public_read"   on public.danmaku;
drop policy if exists "danmaku_public_insert" on public.danmaku;

create policy "danmaku_public_read"
  on public.danmaku for select
  using (true);

create policy "danmaku_public_insert"
  on public.danmaku for insert
  with check (
    char_length(text) between 1 and 120
    and team in ('GEN', 'BLG', 'NEUTRAL')
  );

-- 4) 开启 Realtime 广播（已加入过则跳过，重复执行不会报错）
do $$
begin
  alter publication supabase_realtime add table public.danmaku;
exception
  when duplicate_object then null;
  when others then null;
end $$;

-- 5) 点赞自增函数（避免开放表级 update 权限）
create or replace function public.increment_danmaku_likes(target_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.danmaku
     set likes = likes + 1
   where id = target_id;
$$;

grant execute on function public.increment_danmaku_likes(text) to anon, authenticated;

-- 6) 可选：清理 7 天前的旧弹幕，避免表无限增长
--    （Supabase 免费版支持 pg_cron，如需定时清理可在 Database → Cron 里挂这个函数）
create or replace function public.prune_old_danmaku()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.danmaku where created_at < now() - interval '7 days';
$$;
