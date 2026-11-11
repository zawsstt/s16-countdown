export type BroadcastSlotId = 'promo_video' | 'data_preview';

/**
 * 提前预热加载阈值（秒）：倒计时剩余 5 分钟（300 秒）以内时开始提前预热加载媒体资源
 */
export const SLOT_PREWARM_LEAD_SECONDS = 300;

/**
 * 大屏弹幕轨道总数与同屏最大 DOM 渲染上限（7 条轨道 × 每轨最多 2 条同屏 = 14 个并发 DOM 节点）
 */
export const DANMAKU_LANE_COUNT = 7;
export const DANMAKU_MAX_CONCURRENT_DOM = 14;

export interface CountdownFormatted {
  mode: 'finals_date';
  primaryDisplay: string; // e.g. "102:00:00"
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

// ============================================================================
// 弹幕防重叠策略（Anti-Overlap）与同屏/列表虚拟化（Virtualization & DOM Cap）
// ============================================================================

export interface DanmakuLikeItem {
  id: string;
  text: string;
  author: string;
  team: 'GEN' | 'BLG' | 'NEUTRAL';
  color: string;
  timestamp: number;
  lane: number;
  likes: number;
}

export interface ScheduledFloatingDanmaku<T extends DanmakuLikeItem = DanmakuLikeItem> {
  item: T;
  /** 经过防重叠重分配后的实际轨道编号 (0..laneCount-1) */
  assignedLane: number;
  /** 轨道垂直百分比位置 */
  topPercent: number;
  /** 同轨道当前密度（该轨道上的活跃弹幕数） */
  laneDensity: number;
  /** 动态拉开后的动画延迟（秒），确保同轨道前后弹幕绝不追尾重叠 */
  delaySec: number;
  /** 滚动持续时间（秒），根据文本长度与同轨道密度微调 */
  durationSec: number;
  /** 同轨道动态间隔（秒） */
  intervalSec: number;
}

/**
 * 发送新弹幕时，检测当前各轨道活跃弹幕密度，优先挑选最空闲的轨道
 */
export function selectLeastCrowdedDanmakuLane<T extends Pick<DanmakuLikeItem, 'lane' | 'timestamp' | 'text'>>(
  messages: T[],
  nowMs: number,
  laneCount = DANMAKU_LANE_COUNT
): number {
  const safeLaneCount = Math.max(1, laneCount);
  const laneScores = new Array<number>(safeLaneCount).fill(0);

  // 统计最近 18 秒内各轨道的弹幕密度与字数权重
  const recentWindowMs = 18000;
  for (const msg of messages) {
    const ageMs = Math.max(0, nowMs - msg.timestamp);
    if (ageMs <= recentWindowMs) {
      const laneIdx = ((msg.lane ?? 0) % safeLaneCount + safeLaneCount) % safeLaneCount;
      const recencyWeight = 1 + (recentWindowMs - ageMs) / recentWindowMs;
      const lengthWeight = Math.min(2.2, Math.max(0.6, msg.text.length / 18));
      laneScores[laneIdx] += recencyWeight * lengthWeight;
    }
  }

  let bestLane = 0;
  let minScore = laneScores[0];
  for (let i = 1; i < safeLaneCount; i++) {
    if (laneScores[i] < minScore) {
      minScore = laneScores[i];
      bestLane = i;
    }
  }
  return bestLane;
}

/**
 * 弹幕防重叠调度器 + 同屏 DOM 数量上限控制：
 * 1. 限制同屏最多渲染 `maxConcurrentDom`（默认 24）个 DOM 节点，减轻弹幕高峰期 CPU/GPU 合成负担；
 * 2. 检测每条轨道上的弹幕密度（laneDensity），若原轨道过于拥挤则智能分流到相邻空闲轨道；
 * 3. 根据同轨道当前密度与前一条弹幕的文本长度，动态增大同轨道弹幕之间的滚动间隔（intervalSec），
 *    从而保证同一轨道上的弹幕前后保持充足安全距离，绝不发生文字重叠。
 */
export function computeAntiOverlapDanmakuLayout<T extends DanmakuLikeItem>(
  messages: T[],
  nowMs: number,
  maxConcurrentDom = DANMAKU_MAX_CONCURRENT_DOM,
  laneCount = DANMAKU_LANE_COUNT
): ScheduledFloatingDanmaku<T>[] {
  const safeLaneCount = Math.max(1, laneCount);
  const safeCap = Math.max(1, maxConcurrentDom);

  // 仅截取最新的 maxConcurrentDom 条弹幕上屏渲染，严格控制同屏 DOM 数量
  const visibleSlice = messages.slice(-safeCap);
  if (visibleSlice.length === 0) return [];

  // 第一步：轮转 + 密度感知分配轨道，确保每条轨道均匀承载，绝不扎堆
  const laneCounts = new Array<number>(safeLaneCount).fill(0);
  const preliminaryLanes: number[] = [];

  for (let i = 0; i < visibleSlice.length; i++) {
    const rawLane = ((visibleSlice[i].lane ?? i) % safeLaneCount + safeLaneCount) % safeLaneCount;
    let chosenLane = rawLane;

    // 若原轨道已经有弹幕，优先分配到当前最空闲的轨道
    let minLane = 0;
    for (let l = 1; l < safeLaneCount; l++) {
      if (laneCounts[l] < laneCounts[minLane]) {
        minLane = l;
      }
    }
    if (laneCounts[rawLane] > laneCounts[minLane]) {
      chosenLane = minLane;
    }

    laneCounts[chosenLane] += 1;
    preliminaryLanes.push(chosenLane);
  }

  // 第二步：同轨道严格等距相位隔开（同轨第 0 条与第 1 条至少相差半个屏幕周期 ~8.5s），彻底杜绝同轨追尾或重叠
  const laneOrderIndex = new Array<number>(safeLaneCount).fill(0);

  return visibleSlice.map((msg, idx) => {
    const assignedLane = preliminaryLanes[idx];
    const laneDensity = laneCounts[assignedLane];
    const orderInLane = laneOrderIndex[assignedLane];
    laneOrderIndex[assignedLane] += 1;

    // 同一轨道内的所有弹幕共享完全相同的滚动时长（durationSec），这样后发弹幕永远追不上前发弹幕
    const durationSec = Number((17.0 + (assignedLane % 3) * 1.2).toFixed(2));

    // 根据同轨道弹幕密度与文本长度动态计算安全滚动间隔（最少半屏 8.2s 间隔）
    const charBoostSec = Math.min(2.5, Math.max(0.5, msg.text.length * 0.06));
    const baseGapSec = durationSec / Math.max(2, laneDensity);
    const intervalSec = Number(Math.max(4.2, baseGapSec + charBoostSec * 0.4).toFixed(2));

    const isFresh = Math.max(0, nowMs - msg.timestamp) < 4000;
    let delaySec: number;
    if (isFresh && idx === visibleSlice.length - 1) {
      delaySec = 0;
    } else {
      // 不同轨道错开 1.65s 进场，同轨道第 k 条严格拉开 orderInLane * baseGapSec 秒
      const lanePhaseSec = assignedLane * 1.65 + orderInLane * baseGapSec;
      delaySec = Number((-(lanePhaseSec % (durationSec - 1.2))).toFixed(2));
    }

    const topPercent = Number((5.0 + assignedLane * (85 / safeLaneCount)).toFixed(2));

    return {
      item: msg,
      assignedLane,
      topPercent,
      laneDensity,
      delaySec,
      durationSec,
      intervalSec,
    };
  });
}

export interface VirtualizedListWindow {
  startIndex: number;
  endIndex: number;
  topSpacerPx: number;
  bottomSpacerPx: number;
  visibleCount: number;
}

/**
 * 弹幕抽屉列表虚拟化窗口计算器（仅渲染视口可见行 + 上下缓冲区，降低高峰期 DOM 数量）
 */
export function computeVirtualizedDanmakuWindow(
  totalItems: number,
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  overscan = 4
): VirtualizedListWindow {
  const safeTotal = Math.max(0, totalItems);
  const safeRowHeight = Math.max(20, rowHeight);
  const safeViewport = Math.max(safeRowHeight, viewportHeight);
  const safeScrollTop = Math.max(0, scrollTop);

  if (safeTotal === 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      topSpacerPx: 0,
      bottomSpacerPx: 0,
      visibleCount: 0,
    };
  }

  const rawStart = Math.floor(safeScrollTop / safeRowHeight);
  const visibleRows = Math.ceil(safeViewport / safeRowHeight);

  const startIndex = Math.max(0, rawStart - overscan);
  const endIndex = Math.min(safeTotal, rawStart + visibleRows + overscan);
  const topSpacerPx = startIndex * safeRowHeight;
  const bottomSpacerPx = Math.max(0, (safeTotal - endIndex) * safeRowHeight);

  return {
    startIndex,
    endIndex,
    topSpacerPx,
    bottomSpacerPx,
    visibleCount: endIndex - startIndex,
  };
}
