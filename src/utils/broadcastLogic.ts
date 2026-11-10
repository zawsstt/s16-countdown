export type BroadcastSlotId = 'promo_video' | 'data_preview';

/**
 * 提前预热加载阈值（秒）：倒计时剩余 5 分钟（300 秒）以内时开始提前预热加载媒体资源
 */
export const SLOT_PREWARM_LEAD_SECONDS = 300;

export interface CountdownFormatted {
  mode: 'finals_date';
  primaryDisplay: string; // e.g. "04D 10:04:22"
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isZero: boolean;
  subLabel: string;
}

export interface SlotCountdownState {
  slotId: BroadcastSlotId;
  label: string;
  display: string; // MM:SS
  remainingSeconds: number;
  elapsedSeconds: number;
  cycleSeconds: number;
  progressPercent: number; // 0..100
  /** 倒计时进入最后 5 分钟（<= 300 秒）时为 true，触发底层提前预热缓冲 */
  shouldPrewarm: boolean;
  shouldTrigger: boolean;
}

export interface BroadcastSlotQueueState {
  activeSlot: BroadcastSlotId | null;
  pendingSlots: BroadcastSlotId[];
}

/**
 * Formats target timestamp difference into a broadcast countdown object.
 * Merges days into 24-hour total hours (e.g. 04D 06:00:00 -> 102:00:00) for clear, direct reading
 * until the Grand Finals start time in Beijing Time (UTC+8).
 */
export function calculateFinalsCountdown(nowMs: number, targetMs: number): CountdownFormatted {
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const totalHours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  const hh = String(totalHours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  const primaryDisplay = `${hh}:${mm}:${ss}`;

  return {
    mode: 'finals_date',
    primaryDisplay,
    days,
    hours,
    minutes,
    seconds,
    totalSeconds: diffSec,
    isZero: diffSec === 0,
    subLabel:
      totalHours > 0
        ? `距离北京时间周日凌晨 03:00 决赛还有 ${totalHours} 小时 ${minutes} 分钟`
        : '北京时间周日凌晨 03:00 决战即将打响',
  };
}

/**
 * Computes a clock offset so that periodic broadcast slot timers start at `initialRemainingSeconds` (default 180s = 03:00)
 * before the next 45-minute mark, allowing immediate 3-minute countdown verification & pre-warming on page load.
 *
 * 用 45 分钟作为对齐网格：2700 秒是 900 秒（赛事前瞻周期）的整数倍，
 * 所以两个倒计时会同时从 03:00 开始，不会互相错位。
 */
export function getInitialSlotClockOffsetMs(realNowMs: number, initialRemainingSeconds = 180): number {
  const gridMs = 2700 * 1000; // 45 分钟
  const nextGridMs = Math.ceil((realNowMs + 1000) / gridMs) * gridMs;
  const targetStartMs = nextGridMs - initialRemainingSeconds * 1000;
  return targetStartMs - realNowMs;
}

/**
 * Returns the official Worlds 2026 Grand Finals start timestamp in Beijing Time (UTC+8):
 * Barclays Center, Brooklyn, NY — Saturday, Nov 14, 2026 14:00 EST
 * = Sunday, Nov 15, 2026 03:00:00 Beijing Time (UTC+8).
 */
export function getFinalsTargetTimestamp(): number {
  return new Date('2026-11-15T03:00:00+08:00').getTime();
}

/**
 * Calculates the 45-minute countdown ("宣传片倒计时", 每 45 分钟触发一次)
 * Enables `shouldPrewarm` when remainingSeconds <= 300 (last 5 minutes before trigger)
 */
export function calculatePromoSlotCountdown(nowMs: number): SlotCountdownState {
  const cycleSeconds = 2700; // 45 分钟一轮
  const totalSec = Math.floor(nowMs / 1000);
  const elapsedSeconds = ((totalSec % cycleSeconds) + cycleSeconds) % cycleSeconds;
  const remainingSeconds = elapsedSeconds === 0 ? 0 : cycleSeconds - elapsedSeconds;
  const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const ss = String(remainingSeconds % 60).padStart(2, '0');
  const progressPercent =
    elapsedSeconds === 0 ? 100 : Math.round((elapsedSeconds / cycleSeconds) * 1000) / 10;

  return {
    slotId: 'promo_video',
    label: '宣传片倒计时',
    display: `${mm}:${ss}`,
    remainingSeconds,
    elapsedSeconds,
    cycleSeconds,
    progressPercent,
    shouldPrewarm: remainingSeconds <= SLOT_PREWARM_LEAD_SECONDS,
    shouldTrigger: elapsedSeconds === 0,
  };
}

/**
 * Calculates the "赛事前瞻倒计时" slot countdown (15-minute cycle aligned on the hour -> triggers at :00:00, :15:00, :30:00, :45:00)
 * Enables `shouldPrewarm` when remainingSeconds <= 300 (last 5 minutes before trigger)
 */
export function calculateDataPreviewSlotCountdown(nowMs: number): SlotCountdownState {
  const cycleSeconds = 900; // 15-minute frequency (:00, :15, :30, :45 of every hour)
  const totalSec = Math.floor(nowMs / 1000);
  const elapsedSeconds = ((totalSec % cycleSeconds) + cycleSeconds) % cycleSeconds;
  const remainingSeconds = elapsedSeconds === 0 ? 0 : cycleSeconds - elapsedSeconds;
  const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const ss = String(remainingSeconds % 60).padStart(2, '0');
  const progressPercent =
    elapsedSeconds === 0 ? 100 : Math.round((elapsedSeconds / cycleSeconds) * 1000) / 10;

  return {
    slotId: 'data_preview',
    label: '赛事前瞻倒计时',
    display: `${mm}:${ss}`,
    remainingSeconds,
    elapsedSeconds,
    cycleSeconds,
    progressPercent,
    shouldPrewarm: remainingSeconds <= SLOT_PREWARM_LEAD_SECONDS,
    shouldTrigger: elapsedSeconds === 0,
  };
}

/**
 * Enqueues triggered broadcast slots according to the priority rule:
 * - When both "宣传片倒计时" (promo_video) and "赛事前瞻倒计时" (data_preview) trigger simultaneously (at :00 and :30),
 *   "promo_video" ALWAYS plays first, and "data_preview" is queued behind it so it plays immediately after all promo videos finish.
 * - Avoids duplicate entries in the queue.
 */
export function enqueueBroadcastSlots(
  currentState: BroadcastSlotQueueState,
  triggeredSlots: BroadcastSlotId[]
): BroadcastSlotQueueState {
  if (triggeredSlots.length === 0) return currentState;

  const orderedIncoming: BroadcastSlotId[] = [...triggeredSlots].sort((a, b) => {
    if (a === b) return 0;
    return a === 'promo_video' ? -1 : 1;
  });

  let { activeSlot, pendingSlots } = currentState;
  const nextPending = [...pendingSlots];

  for (const slot of orderedIncoming) {
    if (!activeSlot) {
      activeSlot = slot;
    } else if (activeSlot !== slot && !nextPending.includes(slot)) {
      nextPending.push(slot);
    }
  }

  return {
    activeSlot,
    pendingSlots: nextPending,
  };
}

/**
 * Advances the broadcast slot queue when the currently active slot completes all its items.
 */
export function advanceBroadcastSlotQueue(
  currentState: BroadcastSlotQueueState
): BroadcastSlotQueueState {
  if (currentState.pendingSlots.length === 0) {
    return { activeSlot: null, pendingSlots: [] };
  }
  const [nextActive, ...restPending] = currentState.pendingSlots;
  return {
    activeSlot: nextActive,
    pendingSlots: restPending,
  };
}

/**
 * Calculates team support percentage split
 */
export function calculateSupportSplit(genCheers: number, blgCheers: number): {
  genPercent: number;
  blgPercent: number;
  total: number;
} {
  const safeGen = Math.max(0, genCheers);
  const safeBlg = Math.max(0, blgCheers);
  const total = safeGen + safeBlg;
  if (total === 0) {
    return { genPercent: 50, blgPercent: 50, total: 0 };
  }
  const genPercent = Math.round((safeGen / total) * 1000) / 10;
  const blgPercent = Math.round((100 - genPercent) * 10) / 10;
  return { genPercent, blgPercent, total };
}

export interface DanmakuInputValidation {
  valid: boolean;
  sanitizedText: string;
  sanitizedAuthor: string;
  error?: string;
}

/**
 * Validates and sanitizes a user-submitted Danmaku message.
 */
export function validateDanmakuInput(rawText: string, rawAuthor: string): DanmakuInputValidation {
  const sanitizedText = rawText.trim().replace(/\s+/g, ' ');
  const sanitizedAuthor = rawAuthor.trim().replace(/\s+/g, ' ') || '峡谷召唤师';

  if (!sanitizedText) {
    return {
      valid: false,
      sanitizedText: '',
      sanitizedAuthor,
      error: '请输入助威弹幕内容后再发送',
    };
  }

  if (sanitizedText.length > 80) {
    return {
      valid: false,
      sanitizedText: sanitizedText.slice(0, 80),
      sanitizedAuthor,
      error: '单条弹幕长度不能超过 80 个字符',
    };
  }

  return {
    valid: true,
    sanitizedText,
    sanitizedAuthor: sanitizedAuthor.slice(0, 20),
  };
}

/**
 * Idempotently merges a new or updated Danmaku message into the client list.
 */
export function mergeDanmakuMessage<T extends { id: string }>(list: T[], incoming: T, maxItems = 120): T[] {
  const existingIdx = list.findIndex((item) => item.id === incoming.id);
  if (existingIdx !== -1) {
    const updated = [...list];
    updated[existingIdx] = incoming;
    return updated;
  }
  const appended = [...list, incoming];
  return appended.length > maxItems ? appended.slice(appended.length - maxItems) : appended;
}
