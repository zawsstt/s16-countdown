/**
 * ============================================================================
 * SUPABASE 弹幕通道
 * ============================================================================
 * 线上部署后，所有访客的弹幕都通过 Supabase 落库 + Realtime 广播，实现「所有人
 * 都能看到所有人的弹幕」。本地开发或 Supabase 不可用时自动降级到 Express + ws。
 *
 * 设计要点（避免页面卡顿）：
 *  1. 首屏只拉最近 200 条，不做全量查询；
 *  2. Realtime 只订阅 INSERT / UPDATE 两类事件，不订阅全表变更；
 *  3. 收到的消息先进缓冲区，每 400ms 合并成一次 setState，避免高频重渲染；
 *  4. 任何一步失败都静默降级，不阻塞页面渲染。
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DanmakuMessage } from '../../server';

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://ksdqlgumqqmuvprodamj.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  'sb_publishable_1gycgKZJILim9lNXFmr0kA_w6HvOohO';

export const DANMAKU_TABLE = 'danmaku';
/** 首屏最多拉取的历史弹幕条数 */
export const DANMAKU_FETCH_LIMIT = 200;
/** 前端列表最多保留条数 */
export const DANMAKU_MAX_ITEMS = 200;

interface DanmakuRow {
  id: string;
  text: string;
  author: string | null;
  team: string | null;
  color: string | null;
  lane: number | null;
  likes: number | null;
  created_at: string | null;
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return client;
}

function rowToMessage(row: DanmakuRow): DanmakuMessage {
  const team: DanmakuMessage['team'] =
    row.team === 'GEN' || row.team === 'BLG' ? row.team : 'NEUTRAL';
  return {
    id: row.id,
    text: row.text,
    author: row.author || '召唤师',
    team,
    color: row.color || (team === 'GEN' ? '#f5b800' : team === 'BLG' ? '#00d2ff' : '#ffffff'),
    timestamp: row.created_at ? Date.parse(row.created_at) : Date.now(),
    lane: typeof row.lane === 'number' ? row.lane : 0,
    likes: typeof row.likes === 'number' ? row.likes : 1,
  };
}

/**
 * 拉取最近弹幕。
 * @returns 成功返回按时间正序排列的数组（可能是空数组）；失败/未建表返回 null（调用方据此降级）
 */
export async function fetchRecentDanmaku(limit = DANMAKU_FETCH_LIMIT): Promise<DanmakuMessage[] | null> {
  try {
    const { data, error } = await getSupabase()
      .from(DANMAKU_TABLE)
      .select('id,text,author,team,color,lane,likes,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return null;
    return (data as DanmakuRow[]).slice().reverse().map(rowToMessage);
  } catch {
    return null;
  }
}

export interface DanmakuSubscriptionHandlers {
  onInsert: (msg: DanmakuMessage) => void;
  onUpdate: (msg: DanmakuMessage) => void;
  /** 在线人数（来自 Supabase Realtime Presence，纯静态部署时替代 WebSocket 的在线统计） */
  onPresence?: (onlineCount: number) => void;
  /** 订阅通道就绪回调 */
  onReady?: () => void;
}

/** 订阅弹幕实时变更 + 在线人数，返回取消订阅函数 */
export function subscribeDanmaku(handlers: DanmakuSubscriptionHandlers): () => void {
  let channel: ReturnType<SupabaseClient['channel']> | null = null;
  try {
    const client = getSupabase();
    const presenceKey = `u-${Math.random().toString(36).slice(2, 10)}`;
    channel = client.channel('public:danmaku', {
      config: { presence: { key: presenceKey } },
    });

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: DANMAKU_TABLE },
        (payload) => {
          const row = payload.new as DanmakuRow;
          if (row && row.id && row.text) handlers.onInsert(rowToMessage(row));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: DANMAKU_TABLE },
        (payload) => {
          const row = payload.new as DanmakuRow;
          if (row && row.id) handlers.onUpdate(rowToMessage(row));
        }
      )
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel?.presenceState() || {};
          const count = Object.keys(state).length;
          if (count > 0) handlers.onPresence?.(count);
        } catch {
          // presence 不可用不影响弹幕
        }
      });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        handlers.onReady?.();
        // 上报自己在看，供其他访客统计在线人数
        channel?.track({ online_at: new Date().toISOString() }).catch(() => {});
      }
    });
  } catch {
    return () => {};
  }

  return () => {
    try {
      if (channel) getSupabase().removeChannel(channel);
    } catch {
      // ignore
    }
  };
}

/** 写入一条弹幕，返回是否成功 */
export async function insertDanmaku(msg: DanmakuMessage): Promise<boolean> {
  try {
    const { error } = await getSupabase().from(DANMAKU_TABLE).insert({
      id: msg.id,
      text: msg.text.slice(0, 120),
      author: msg.author.slice(0, 24),
      team: msg.team,
      color: msg.color,
      lane: msg.lane,
      likes: msg.likes,
    });
    return !error;
  } catch {
    return false;
  }
}

/** 点赞自增（走 SECURITY DEFINER 函数，不开放表级 update 权限） */
export async function likeDanmaku(id: string): Promise<void> {
  try {
    await getSupabase().rpc('increment_danmaku_likes', { target_id: id });
  } catch {
    // 点赞失败不影响主流程
  }
}
