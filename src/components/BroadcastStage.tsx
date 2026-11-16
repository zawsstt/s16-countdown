import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  SkipForward,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  WorldsCrestLogo,
  Worlds26BottomLogo,
} from './TeamLogos';
import { WorldsZeroFlagStage } from './WorldsZeroFlagStage';
import { BlgMatchHistoryPanel } from './BlgMatchHistoryPanel';
import {
  BlgTournamentDataPanel,
  BLG_TOURNAMENT_DATA_PAGES,
} from './BlgTournamentDataPanel';
import { BroadcastSlide } from '../data/finalsData';
import { mediaUrl } from '../utils/mediaUrl';
import {
  PROMO_VIDEO_SLOT,
  PROMO_GROUP_IDS,
  PROMO_INTER_VIDEO_BLACK_SCREEN_MS,
  DATA_PREVIEW_SLIDE_DURATION_SEC,
  TRANSITION_STINGER_SLOT,
} from '../data/broadcastSlots';
import {
  CountdownFormatted,
  SlotCountdownState,
  BroadcastSlotQueueState,
  BroadcastSlotId,
  computeAntiOverlapDanmakuLayout,
  DANMAKU_MAX_CONCURRENT_DOM,
  DANMAKU_LANE_COUNT,
  DANMAKU_FONT_SIZE_DEFAULT_PX,
  clampDanmakuFontSize,
} from '../utils/broadcastLogic';
import type { DanmakuMessage } from '../../server';

/** 每个飘动周期（14s）往后轮换的弹幕条数 */
const DANMAKU_FLOAT_STEP = 7;

interface BroadcastStageProps {
  countdown: CountdownFormatted;
  promoCountdown: SlotCountdownState;
  dataPreviewCountdown: SlotCountdownState;
  slotQueue: BroadcastSlotQueueState;
  onTriggerSlot: (slotId: BroadcastSlotId) => void;
  onTriggerCoincidentSlots: () => void;
  onCompleteActiveSlot: () => void;
  onCloseAllSlots: () => void;
  slides: BroadcastSlide[];
  activeSlideIndex: number;
  onSelectSlide: (idx: number) => void;
  isAutoPlayingSlides: boolean;
  onToggleAutoPlaySlides: () => void;
  danmakuList: DanmakuMessage[];
  showDanmakuOverlay: boolean;
  danmakuOpacity: number;
  danmakuFontSize?: number;
  isZeroFlagPreview?: boolean;
  onExitZeroFlagPreview?: () => void;
  isHudMinimized?: boolean;
}

export const BroadcastStage: React.FC<BroadcastStageProps> = ({
  promoCountdown,
  dataPreviewCountdown,
  slotQueue,
  onTriggerSlot,
  onCompleteActiveSlot,
  onCloseAllSlots,
  slides,
  activeSlideIndex,
  onSelectSlide,
  isAutoPlayingSlides,
  onToggleAutoPlaySlides,
  danmakuList,
  showDanmakuOverlay,
  danmakuOpacity,
  danmakuFontSize = DANMAKU_FONT_SIZE_DEFAULT_PX,
  isZeroFlagPreview = false,
  onExitZeroFlagPreview,
  isHudMinimized = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pre-warm state: triggered when countdown <= 5 minutes (shouldPrewarm) or immediately after mount
  const [isPromoPrewarmed, setIsPromoPrewarmed] = useState<boolean>(
    () => promoCountdown.shouldPrewarm
  );
  const [isDataPrewarmed, setIsDataPrewarmed] = useState<boolean>(
    () => dataPreviewCountdown.shouldPrewarm
  );

  // Broadcast playback & Unified 4s-5s Summoner Crest Stinger transition states
  const [stingerState, setStingerState] = useState<{
    active: boolean;
    label: string;
    key: number;
  }>({ active: false, label: '', key: 0 });
  const [displayedSlot, setDisplayedSlot] = useState<BroadcastSlotId | null>(
    () => slotQueue.activeSlot
  );
  const [promoItemIndex, setPromoItemIndex] = useState(0);
  const [isInterPromoBlackScreen, setIsInterPromoBlackScreen] = useState(false);
  const [isPromoVideoMuted, setIsPromoVideoMuted] = useState(false);
  const [dataItemIndex, setDataItemIndex] = useState(0);

  // 宣传片是否处于「缓冲中」（用于显示缓冲提示，而不是让画面一片黑）
  const [isPromoBuffering, setIsPromoBuffering] = useState(false);

  const stageContainerRef = useRef<HTMLDivElement>(null);
  // Persistent pre-warmed <video> refs for all items in PROMO_VIDEO_SLOT + Stinger
  const promoVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const stingerVideoRef = useRef<HTMLVideoElement>(null);
  const prevActiveSlotRef = useRef<BroadcastSlotId | null>(slotQueue.activeSlot);
  const blackScreenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 记录哪些视频已经被「点名」开始拉流，避免重复 load() 打断已有缓冲
  const promoKickedRef = useRef<Set<number>>(new Set());
  // 卡顿看门狗：记录上次画面推进的时间点与连续无进展次数
  const promoStallRef = useRef<{ time: number; ticks: number }>({ time: 0, ticks: 0 });

  const currentSlide = slides[activeSlideIndex] || slides[0];
  const activeSlot = slotQueue.activeSlot;

  // Clear any pending inter-promo black screen timer on unmount
  useEffect(() => {
    return () => {
      if (blackScreenTimeoutRef.current) {
        clearTimeout(blackScreenTimeoutRef.current);
      }
    };
  }, []);

  // Activate 5-minute countdown pre-warming (and immediate idle pre-warming on mount)
  useEffect(() => {
    if (promoCountdown.shouldPrewarm && !isPromoPrewarmed) {
      setIsPromoPrewarmed(true);
    }
  }, [promoCountdown.shouldPrewarm, isPromoPrewarmed]);

  useEffect(() => {
    if (dataPreviewCountdown.shouldPrewarm && !isDataPrewarmed) {
      setIsDataPrewarmed(true);
    }
  }, [dataPreviewCountdown.shouldPrewarm, isDataPrewarmed]);

  useEffect(() => {
    const idleTimer = setTimeout(() => {
      setIsPromoPrewarmed(true);
      setIsDataPrewarmed(true);
    }, 150);
    return () => clearTimeout(idleTimer);
  }, []);

  // 让指定下标的宣传片开始（或继续）缓冲。
  // 注意：只有在「一次都还没拉过流」时才调用 load()，否则会打断已经缓冲好的数据。
  const ensurePromoVideoBuffering = useCallback((idx: number) => {
    const vid = promoVideoRefs.current[idx];
    if (!vid) return;
    vid.preload = 'auto';
    if (vid.readyState === 0 && !promoKickedRef.current.has(idx)) {
      promoKickedRef.current.add(idx);
      try {
        vid.load();
      } catch {
        // ignore
      }
    }
  }, []);

  /**
   * 预热策略（修复卡顿的核心）：
   * 旧做法是「三支宣传片同时 preload=auto + 各自 fetch 2MB」，合计 150MB 抢同一条带宽，
   * 且视频 moov 索引在文件末尾，浏览器必须下完整个文件才能开播 —— 必然卡死。
   * 新做法：
   *   1. 只让第一支（片头）真正开始拉流，后面的等前一支播起来再依次加载；
   *   2. 文件本身已 +faststart + 降码率，开播只需开头几百 KB；
   *   3. 不再注入 <link rel=preload as=video>（Chrome 不支持该 as 值，只会刷警告）。
   */
  useEffect(() => {
    if (!isPromoPrewarmed) return;

    ensurePromoVideoBuffering(0);

    // 转场 Stinger 只有 2.2MB 且已 faststart，单独预热即可（每次切页都要用）
    const stingerVid = stingerVideoRef.current;
    if (stingerVid && stingerVid.readyState === 0) {
      stingerVid.preload = 'auto';
      try {
        stingerVid.load();
      } catch {
        // ignore
      }
    }
  }, [isPromoPrewarmed, ensurePromoVideoBuffering]);

  // Unified 4s-5s Worlds 2026 Summoner Crest Transition Stinger across ALL page switches
  // Switches the underlying displayedSlot at 400ms (while screen is covered by the Summoner Crest stinger)
  // so there is zero blue flash or abrupt page jump before/after the transition.
  useEffect(() => {
    const prevSlot = prevActiveSlotRef.current;
    if (prevSlot === activeSlot) return;
    prevActiveSlotRef.current = activeSlot;

    if (blackScreenTimeoutRef.current) {
      clearTimeout(blackScreenTimeoutRef.current);
      blackScreenTimeoutRef.current = null;
    }
    setIsInterPromoBlackScreen(false);

    // Pause any playing promo video immediately when leaving promo_video
    if (activeSlot !== 'promo_video') {
      promoVideoRefs.current.forEach((vid, idx) => {
        if (vid) {
          if (!vid.paused) vid.pause();
          const resetSec = PROMO_VIDEO_SLOT[idx]?.startSec ?? 0;
          try {
            vid.currentTime = resetSec > 0 ? resetSec : 0.001;
          } catch {
            // ignore
          }
        }
      });
    }

    let transitionLabel = 'THIS IS OUR MOMENT';
    if (activeSlot === 'promo_video') {
      setPromoItemIndex(0);
      const firstPromoVid = promoVideoRefs.current[0];
      if (firstPromoVid) {
        try {
          firstPromoVid.currentTime = PROMO_VIDEO_SLOT[0]?.startSec ?? 0;
        } catch {
          // ignore
        }
      }
      transitionLabel = 'WORLDS 2026 FINALS · OFFICIAL PROMO';
    } else if (activeSlot === 'data_preview') {
      setDataItemIndex(0);
      transitionLabel = 'WORLDS 2026 FINALS · MATCH DATA PREVIEW';
    } else if (activeSlot === null && prevSlot !== null) {
      transitionLabel = 'GEN vs BLG · GRAND FINALS';
    }

    // Play the pre-warmed persistent 4s-5s Summoner Crest stinger video immediately from 0.00s
    const stingerVid = stingerVideoRef.current;
    if (stingerVid) {
      try {
        stingerVid.pause();
        stingerVid.currentTime = 0;
        stingerVid.play().catch(() => {});
      } catch {
        // ignore
      }
    }

    setStingerState((prev) => ({
      active: true,
      label: transitionLabel,
      key: prev.key + 1,
    }));

    // Switch the underlying page at 400ms when the Summoner Crest wipe covers the screen
    const switchPageTimer = setTimeout(() => {
      setDisplayedSlot(activeSlot);
    }, 400);

    // End the stinger overlay after the 4s-5s clip completes and re-prime stinger frame 0
    const endStingerTimer = setTimeout(() => {
      setDisplayedSlot(activeSlot);
      setStingerState((prev) => ({ ...prev, active: false }));
      if (stingerVid) {
        try {
          stingerVid.pause();
          stingerVid.currentTime = 0.001;
        } catch {
          // ignore
        }
      }
    }, TRANSITION_STINGER_SLOT.durationMs);

    return () => {
      clearTimeout(switchPageTimer);
      clearTimeout(endStingerTimer);
    };
  }, [activeSlot]);

  // Advances from Opening Video (2s->end) -> (0ms) Promo #1 -> (1.8s pure black screen) Promo #2 -> completes promo_video broadcast
  const advancePromoVideoOrCompleteSlot = useCallback(() => {
    const currentItem = PROMO_VIDEO_SLOT[promoItemIndex];
    const currentVid = promoVideoRefs.current[promoItemIndex];
    if (currentVid && !currentVid.paused) {
      currentVid.pause();
    }

    if (promoItemIndex + 1 < PROMO_VIDEO_SLOT.length) {
      const nextVid = promoVideoRefs.current[promoItemIndex + 1];
      if (nextVid) {
        const nextStart = PROMO_VIDEO_SLOT[promoItemIndex + 1].startSec ?? 0;
        try {
          nextVid.currentTime = nextStart;
        } catch {
          // ignore
        }
      }

      // seamlessNext 为 true：同一支宣传片的相邻片段 / 片头 → 正片，直接续播；
      // 为 false：两支不同宣传片之间，插入 1.8 秒纯黑屏过渡。
      if (currentItem?.seamlessNext) {
        setIsInterPromoBlackScreen(false);
        setPromoItemIndex((idx) => idx + 1);
      } else {
        setIsInterPromoBlackScreen(true);
        if (blackScreenTimeoutRef.current) {
          clearTimeout(blackScreenTimeoutRef.current);
        }
        blackScreenTimeoutRef.current = setTimeout(() => {
          setIsInterPromoBlackScreen(false);
          setPromoItemIndex((idx) => idx + 1);
        }, PROMO_INTER_VIDEO_BLACK_SCREEN_MS);
      }
    } else {
      onCompleteActiveSlot();
    }
  }, [promoItemIndex, onCompleteActiveSlot]);

  /**
   * 宣传片播放控制：缓冲门控 + 卡顿自愈 + 兜底跳过
   * - 不再「无脑 play()」：数据没到就先显示缓冲提示，等 canplay 再起播
   * - 自动播放被浏览器拦截时自动静音重试
   * - 连续 6 秒画面不推进 → 重新拉流重试；连续 20 秒仍无进展 → 直接跳到下一支，绝不卡死整个导播
   */
  useEffect(() => {
    if (
      activeSlot !== 'promo_video' ||
      displayedSlot !== 'promo_video' ||
      isInterPromoBlackScreen ||
      stingerState.active
    ) {
      return;
    }

    const item = PROMO_VIDEO_SLOT[promoItemIndex] || PROMO_VIDEO_SLOT[0];
    const vid = promoVideoRefs.current[promoItemIndex];
    if (!vid || !item) return;

    // Pause any other promo video in the pool
    promoVideoRefs.current.forEach((otherVid, idx) => {
      if (otherVid && idx !== promoItemIndex && !otherVid.paused) {
        otherVid.pause();
      }
    });

    const startSec = item.startSec ?? 0;
    const endSec = item.endSec;
    if (startSec > 0 && vid.currentTime < startSec - 0.25) {
      try {
        vid.currentTime = startSec;
      } catch {
        // ignore
      }
    }

    // 片头音轨已废弃，强制静音；其余视频跟随用户的静音开关
    vid.muted = item.muteAudio ? true : isPromoVideoMuted;

    let cancelled = false;
    let playRequested = false;

    const requestPlay = () => {
      if (cancelled || playRequested) return;
      playRequested = true;
      const result = vid.play();
      if (result && typeof result.then === 'function') {
        result
          .then(() => {
            if (cancelled) return;
            setIsPromoBuffering(false);
            promoStallRef.current = { time: vid.currentTime, ticks: 0 };
            // 当前这支真正开播后，才让下一支开始后台缓冲，避免多支同时抢带宽
            const nextIndex = promoItemIndex + 1;
            if (nextIndex < PROMO_VIDEO_SLOT.length) {
              ensurePromoVideoBuffering(nextIndex);
            }
          })
          .catch(() => {
            if (cancelled) return;
            playRequested = false;
            // 浏览器拦截了带声音的自动播放 → 静音后再试一次
            if (!vid.muted) {
              vid.muted = true;
              setIsPromoVideoMuted(true);
              requestPlay();
            }
          });
      }
    };

    const handleCanPlay = () => {
      if (cancelled) return;
      setIsPromoBuffering(false);
      requestPlay();
    };
    const handleWaiting = () => {
      if (!cancelled) setIsPromoBuffering(true);
    };
    const handlePlaying = () => {
      if (cancelled) return;
      setIsPromoBuffering(false);
      promoStallRef.current = { time: vid.currentTime, ticks: 0 };
    };
    const handleError = () => {
      if (cancelled) return;
      console.warn('[promo] 视频无法播放，自动跳过：', item.videoUrl);
      setIsPromoBuffering(false);
      advancePromoVideoOrCompleteSlot();
    };
    // ── 段间接缝消除（预滚）─────────────────────────────────────────────
    // 直接等 ended 再切，下一段要等 React 重渲染 + play() 才出画面，
    // 最后那一帧会冻结 100~250ms，肉眼可见地顿一下。
    // 做法：当前段还剩不到 0.8 秒时，先把下一段静音"预滚"起来，
    // 这样切过去的瞬间画面已经在跑了，只剩一次透明度翻转。
    let preRolled = false;
    const preRollNextSegment = () => {
      if (preRolled || cancelled) return;
      const nextItem = PROMO_VIDEO_SLOT[promoItemIndex + 1];
      // 只在同一支宣传片的相邻片段之间预滚；跨宣传片有 1.8s 黑屏，不需要
      if (!nextItem || !item.seamlessNext) return;
      const nextVid = promoVideoRefs.current[promoItemIndex + 1];
      if (!nextVid || nextVid.readyState < 3) return;
      preRolled = true;
      try {
        nextVid.currentTime = 0;
        nextVid.muted = true;
        nextVid.play().catch(() => {});
      } catch {
        // ignore
      }
    };

    const onTimeUpdate = () => {
      if (typeof endSec === 'number' && vid.currentTime >= endSec) {
        advancePromoVideoOrCompleteSlot();
      }
    };

    // timeupdate 每 250ms 才触发一次，靠它抓 0.35 秒的窗口会漏，
    // 这里用 100ms 轮询兜住，窗口小可以少丢内容
    const preRollTimer = setInterval(() => {
      if (cancelled || preRolled || vid.paused) return;
      if (isFinite(vid.duration) && vid.duration - vid.currentTime <= 0.35) {
        preRollNextSegment();
      }
    }, 100);

    vid.addEventListener('canplay', handleCanPlay);
    vid.addEventListener('waiting', handleWaiting);
    vid.addEventListener('playing', handlePlaying);
    vid.addEventListener('error', handleError);
    vid.addEventListener('timeupdate', onTimeUpdate);
    vid.addEventListener('ended', advancePromoVideoOrCompleteSlot);

    if (vid.readyState >= 3) {
      requestPlay();
    } else {
      setIsPromoBuffering(true);
      ensurePromoVideoBuffering(promoItemIndex);
    }

    // 卡顿看门狗：每 2 秒检查一次画面是否在推进
    promoStallRef.current = { time: vid.currentTime, ticks: 0 };
    const watchdog = setInterval(() => {
      if (cancelled || vid.paused) return;
      const state = promoStallRef.current;
      if (Math.abs(vid.currentTime - state.time) > 0.15) {
        promoStallRef.current = { time: vid.currentTime, ticks: 0 };
        return;
      }
      state.ticks += 1;

      if (state.ticks === 3) {
        // 6 秒没动：重新拉流并重试播放（文件已 faststart，重启代价很小）
        setIsPromoBuffering(true);
        playRequested = false;
        const resumeAt = vid.currentTime;
        try {
          vid.load();
        } catch {
          // ignore
        }
        if (resumeAt > 0.5) {
          vid.addEventListener(
            'loadedmetadata',
            () => {
              try {
                vid.currentTime = resumeAt;
              } catch {
                // ignore
              }
            },
            { once: true }
          );
        }
        requestPlay();
      } else if (state.ticks >= 10) {
        // 20 秒仍无任何进展：跳过这一支，保证导播流程能继续
        console.warn('[promo] 长时间无进展，跳过：', item.videoUrl);
        advancePromoVideoOrCompleteSlot();
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(watchdog);
      clearInterval(preRollTimer);
      vid.removeEventListener('canplay', handleCanPlay);
      vid.removeEventListener('waiting', handleWaiting);
      vid.removeEventListener('playing', handlePlaying);
      vid.removeEventListener('error', handleError);
      vid.removeEventListener('timeupdate', onTimeUpdate);
      vid.removeEventListener('ended', advancePromoVideoOrCompleteSlot);
    };
  }, [
    activeSlot,
    displayedSlot,
    promoItemIndex,
    isInterPromoBlackScreen,
    stingerState.active,
    isPromoVideoMuted,
    advancePromoVideoOrCompleteSlot,
    ensurePromoVideoBuffering,
  ]);

  // Control BLG Tournament Data Panel sequential auto-rotation across all 4 archive pages (20s per page)
  useEffect(() => {
    if (activeSlot !== 'data_preview' || displayedSlot !== 'data_preview' || stingerState.active) {
      return;
    }

    const timer = setTimeout(() => {
      if (dataItemIndex + 1 < BLG_TOURNAMENT_DATA_PAGES.length) {
        setDataItemIndex((idx) => idx + 1);
      } else {
        onCompleteActiveSlot();
      }
    }, DATA_PREVIEW_SLIDE_DURATION_SEC * 1000);

    return () => clearTimeout(timer);
  }, [activeSlot, displayedSlot, stingerState.active, dataItemIndex, onCompleteActiveSlot]);

  const handleToggleFullscreen = () => {
    const rootEl = document.documentElement;
    if (!document.fullscreenElement) {
      rootEl
        .requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const togglePromoVideoMute = () => {
    const nextMuted = !isPromoVideoMuted;
    setIsPromoVideoMuted(nextMuted);
    promoVideoRefs.current.forEach((vid) => {
      if (vid) vid.muted = nextMuted;
    });
  };

  // 弹幕轮播批次计数：每 14 秒（一个飘动周期）把窗口往前推一批
  const [floatCycle, setFloatCycle] = React.useState(0);

  // 弹幕防重叠与同屏 DOM 上限调度（仅展示 BLG 夺冠纪念弹幕）
  // 滑动窗口轮播：不再固定只取最后 N 条，否则老弹幕永远上不了屏
  const scheduledFloatingDanmaku = React.useMemo(() => {
    const pool = danmakuList.filter((m) => m.team === 'BLG');
    const total = pool.length;
    if (total === 0) return [];

    const size = Math.min(DANMAKU_MAX_CONCURRENT_DOM, total);
    let windowItems = pool;
    if (total > DANMAKU_MAX_CONCURRENT_DOM) {
      const start = (floatCycle * DANMAKU_FLOAT_STEP) % total;
      windowItems = [];
      for (let i = 0; i < size; i += 1) {
        windowItems.push(pool[(start + i) % total]);
      }
    }

    return computeAntiOverlapDanmakuLayout(
      windowItems,
      Date.now(),
      DANMAKU_MAX_CONCURRENT_DOM,
      DANMAKU_LANE_COUNT
    );
  }, [danmakuList, floatCycle]);

  // 每 14 秒推进一步，让下一批弹幕上屏
  React.useEffect(() => {
    const blgCount = danmakuList.filter((m) => m.team === 'BLG').length;
    if (blgCount <= DANMAKU_MAX_CONCURRENT_DOM) return;
    const timer = setInterval(() => setFloatCycle((c) => c + 1), 14000);
    return () => clearInterval(timer);
  }, [danmakuList]);
  const currentPromoItem = PROMO_VIDEO_SLOT[promoItemIndex] || PROMO_VIDEO_SLOT[0];
  // 一支宣传片可能被拆成多段，HUD 上按「第几支」显示而不是「第几段」
  const currentPromoGroupIndex = Math.max(
    0,
    PROMO_GROUP_IDS.indexOf(currentPromoItem?.groupId ?? '')
  );

  /** 跳到下一支宣传片的第一个片段（而不是下一段） */
  const skipToNextPromoGroup = () => {
    const groupId = currentPromoItem?.groupId ?? '';
    let next = promoItemIndex + 1;
    while (next < PROMO_VIDEO_SLOT.length && PROMO_VIDEO_SLOT[next].groupId === groupId) {
      next += 1;
    }
    if (next >= PROMO_VIDEO_SLOT.length) {
      onCompleteActiveSlot();
      return;
    }
    // 走和自动推进一样的 1.8 秒黑屏过渡
    setIsInterPromoBlackScreen(true);
    if (blackScreenTimeoutRef.current) clearTimeout(blackScreenTimeoutRef.current);
    blackScreenTimeoutRef.current = setTimeout(() => {
      setIsInterPromoBlackScreen(false);
      setPromoItemIndex(next);
    }, PROMO_INTER_VIDEO_BLACK_SCREEN_MS);
  };
  const isShowingPromoOverlay = displayedSlot === 'promo_video';
  const isShowingDataOverlay = displayedSlot === 'data_preview';
  const isShowingZeroFlagStage =
    Boolean(isZeroFlagPreview) && !isShowingPromoOverlay && !isShowingDataOverlay;

  return (
    <div
      ref={stageContainerRef}
      data-testid="broadcast-stage"
      className="relative w-full md:aspect-[1918/1078] max-h-none md:max-h-screen overflow-hidden bg-[#070604] select-none shadow-[0_0_100px_rgba(24,18,11,0.95)]"
    >
      {/* =====================================================================
          DESKTOP 1080P MASTER BROADCAST FRAME PLATE (1918x1078)
          Official Worlds 2026 Warm Obsidian & Champagne-Gold Frame with Top-Left [Crest + 26]
         ===================================================================== */}
      <img
        src="assets/broadcast/master_stage_base.jpg?v=goldenroad26_clean"
        alt="Worlds 2026 Official Broadcast Frame"
        className="hidden md:block absolute inset-0 w-full h-full object-fill pointer-events-none"
      />

      {/* =====================================================================
          1. TOP BROADCAST HEADER:
             WORLDS CREST 26 | BLG夺冠黄金之路 | DIRECT BROADCAST SLOT ENTRY BUTTONS
         ===================================================================== */}
      <div className="relative z-20 flex flex-col gap-2 px-3.5 py-2.5 bg-gradient-to-b from-[#241d14] via-[#17120c] to-[#0c0906] border-b border-[#c8aa78]/40 md:bg-none md:border-none md:p-0 md:static">
        <div className="flex items-center justify-between">
          {/* Left: Worlds 2026 Crest + "26" (mobile visible; on desktop baked into master_stage_base.jpg at top-left) */}
          <div
            data-testid="top-left-crest-26"
            className="flex items-center gap-1.5 md:hidden"
          >
            <WorldsCrestLogo className="w-9 h-9 sm:w-11 sm:h-11 shrink-0" />
            <span className="font-broadcast-num text-[#e7e9e8] text-3xl sm:text-4xl leading-none tracking-tight select-none">
              26
            </span>
          </div>

          {/* Middle: Championship Title — BLG夺冠黄金之路 */}
          <div
            data-testid="top-broadcast-champions-title"
            className="flex items-center justify-center md:justify-start gap-2.5 md:absolute md:left-[22.5%] md:top-[4.6%] md:h-[13.0%] md:z-20 pointer-events-none select-none"
          >
            <h1 className="font-black text-xl sm:text-2xl md:text-[clamp(1.75rem,3.85vw,4.55rem)] tracking-[0.08em] leading-none whitespace-nowrap bg-gradient-to-b from-[#ffffff] via-[#f7ebd4] to-[#d8b988] bg-clip-text text-transparent drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)]">
              BLG夺冠黄金之路
            </h1>
          </div>

          {/* Mobile Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? '退出全屏导播画面' : '全屏显示导播画面'}
            className="md:hidden inline-flex items-center justify-center rounded bg-black/45 hover:bg-[#3b2e1e]/80 border border-[#c8aa78]/35 p-1.5 text-[#f5d5a7] hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* =====================================================================
            TOP-RIGHT DUAL BROADCAST QUICK ENTRY BUTTONS (COUNTDOWNS REMOVED):
            1) 宣传片展播
            2) 赛事前瞻
           ===================================================================== */}
        <div
          data-testid="top-right-slot-bars"
          className="grid grid-cols-2 gap-2.5 md:flex md:items-center md:justify-end md:gap-3 md:absolute md:left-[64.0%] md:right-[1.4%] md:top-[5.6%] md:h-[10.8%] md:z-20"
        >
          {/* Button 1: 宣传片展播 */}
          <button
            type="button"
            data-testid="slot-bar-promo"
            onMouseEnter={() => setIsPromoPrewarmed(true)}
            onClick={() => {
              setIsPromoPrewarmed(true);
              onTriggerSlot('promo_video');
            }}
            aria-label="播放宣传片展播"
            className={`group flex-1 flex items-center justify-between gap-2 rounded-lg px-3.5 py-2 md:px-4 md:py-2.5 border text-left transition-all cursor-pointer backdrop-blur-md ${
              activeSlot === 'promo_video'
                ? 'bg-[#3b2e1e]/95 border-[#f5d5a7] shadow-[0_0_18px_rgba(245,213,167,0.4)]'
                : 'bg-[#14100b]/85 hover:bg-[#261e14]/95 border-[#c8aa78]/40 hover:border-[#f5d5a7]/80'
            }`}
          >
            <span className="text-xs sm:text-sm md:text-[clamp(0.85rem,1.1vw,1.15rem)] font-black tracking-wider text-[#f7efe2] whitespace-nowrap drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)]">
              宣传片展播
            </span>
            <Play className="w-4 h-4 text-[#f5d5a7] shrink-0 fill-current" />
          </button>

          {/* Button 2: BLG专项数据 (BLG在本次赛事的专项数据记录面板) */}
          <button
            type="button"
            data-testid="slot-bar-data"
            onMouseEnter={() => setIsDataPrewarmed(true)}
            onClick={() => {
              setIsDataPrewarmed(true);
              onTriggerSlot('data_preview');
            }}
            aria-label="查看BLG在本次赛事的专项数据记录面板"
            className={`group flex-1 flex items-center justify-between gap-2 rounded-lg px-3.5 py-2 md:px-4 md:py-2.5 border text-left transition-all cursor-pointer backdrop-blur-md ${
              activeSlot === 'data_preview'
                ? 'bg-[#3b2e1e]/95 border-[#f5d5a7] shadow-[0_0_18px_rgba(245,213,167,0.4)]'
                : slotQueue.pendingSlots.includes('data_preview')
                ? 'bg-[#2d2317]/90 border-[#f5d5a7]/80'
                : 'bg-[#14100b]/85 hover:bg-[#261e14]/95 border-[#c8aa78]/40 hover:border-[#f5d5a7]/80'
            }`}
          >
            <span className="text-xs sm:text-sm md:text-[clamp(0.85rem,1.1vw,1.15rem)] font-black tracking-wider text-[#f7efe2] whitespace-nowrap drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)]">
              BLG专项数据
            </span>
            <Play className="w-4 h-4 text-[#f5d5a7] shrink-0 fill-current" />
          </button>

          {/* Desktop Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? '退出全屏导播画面' : '全屏显示导播画面'}
            className="hidden md:inline-flex items-center justify-center rounded-lg bg-[#14100b]/80 hover:bg-[#3b2e1e]/90 border border-[#c8aa78]/40 p-2 text-[#f5d5a7] hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. CHAMPAGNE-GOLD RIBBON BAR (Mobile visible; on Desktop baked into master plate)
         ===================================================================== */}
      <div className="md:hidden w-full overflow-hidden border-b border-[#c8aa78]/35">
        <img
          src="assets/broadcast/ribbon_bar.png?v=grandfinal26"
          alt="WORLDS 2026 | THIS IS OUR MOMENT"
          className="w-full h-6 sm:h-7 object-cover"
        />
      </div>

      {/* =====================================================================
          3. LEFT MATCHUP ZONE: INTERACTIVE 4-MATCH HOVER-TO-EXPAND PANEL
             (BLG 2026 Championship Run from R16 vs HLE -> QF vs DK -> SF vs T1 -> GF vs GEN)
             (Exact coordinates on 1918x1078 aligned 100% flush with Right Window:
              left 1.30%, top 26.25%, w 40.35%, h 56.22%)
         ===================================================================== */}
      <div
        data-testid="left-matchup-panel-container"
        className="relative w-full aspect-[774/606] md:aspect-auto md:absolute md:left-[1.30%] md:top-[26.25%] md:w-[40.35%] md:h-[56.22%] z-20 overflow-hidden"
      >
        <BlgMatchHistoryPanel />
      </div>

      {/* =====================================================================
          4. RIGHT ROLLING HD MEDIA WINDOW
          (Exact coordinates on 1918x1078: left 42.23%, top 26.25%, w 56.47%, h 56.22%)
          Aligned with user's screen recording: static scale(1) images with 500ms overlapping opacity crossfade
         ===================================================================== */}
      <div className="group relative w-full aspect-[1083/606] md:aspect-auto md:absolute md:left-[42.23%] md:top-[26.25%] md:w-[56.47%] md:h-[56.22%] z-20 overflow-hidden bg-[#090705] border-y border-[#c8aa78]/40 md:border-none">
        {/* 纯静态帧图轮播（首图包含 2026 BLG 全球总决赛冠军海报） */}
        <div className="relative w-full h-full">
          {slides.map((slide, idx) => {
            const isCurrent = idx === activeSlideIndex;
            return (
              <img
                key={slide.id}
                src={slide.imageUrl}
                alt={slide.title}
                referrerPolicy="no-referrer"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-in-out ${
                  isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              />
            );
          })}
        </div>

        {/* Subtle Hover Camera HUD Controls inside Right Window */}
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 px-3 py-2 bg-gradient-to-t from-black/90 via-black/55 to-transparent opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
          <div className="min-w-0 flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 bg-[#f5d5a7] text-[#14100a]">
              {currentSlide.badgeText}
            </span>
            <span className="text-xs font-semibold text-white truncate">
              {currentSlide.title}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              aria-label="上一张导播画面"
              onClick={() =>
                onSelectSlide((activeSlideIndex - 1 + slides.length) % slides.length)
              }
              className="p-1 rounded bg-white/15 hover:bg-white/30 text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label={isAutoPlayingSlides ? '暂停导播画面轮播' : '开启导播画面轮播'}
              onClick={onToggleAutoPlaySlides}
              className="p-1 rounded bg-white/15 hover:bg-white/30 text-white transition-colors cursor-pointer"
            >
              {isAutoPlayingSlides ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              aria-label="下一张导播画面"
              onClick={() => onSelectSlide((activeSlideIndex + 1) % slides.length)}
              className="p-1 rounded bg-white/15 hover:bg-white/30 text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          5. FULL-SCREEN REAL-TIME DANMAKU OVERLAY
          Flies across the ENTIRE broadcast screen (both right window and left GEN vs BLG stage)
          z-[45]：高于宣传片 / 赛事数据前瞻遮罩(z-40)，低于转场 Stinger(z-50)
          → 进入任何子页面时弹幕都会继承过来，且不会盖住转场动画
         ===================================================================== */}
      {showDanmakuOverlay && !isShowingDataOverlay && (
        <div
          data-testid="danmaku-overlay"
          data-font-size={clampDanmakuFontSize(danmakuFontSize)}
          style={{ opacity: danmakuOpacity }}
          className="pointer-events-none absolute inset-x-0 top-[24%] bottom-[12%] overflow-hidden z-[45]"
        >
          {scheduledFloatingDanmaku.map((scheduled) => {
            const dm = scheduled.item;
            const resolvedFontPx = clampDanmakuFontSize(danmakuFontSize);
            const badgeFontPx = Math.max(9, Math.round(resolvedFontPx * 0.75));
            return (
              <div
                key={dm.id}
                data-testid="danmaku-floating-item"
                data-lane={scheduled.assignedLane}
                data-lane-density={scheduled.laneDensity}
                data-interval-sec={scheduled.intervalSec}
                data-font-size={resolvedFontPx}
                style={{
                  top: `${scheduled.topPercent}%`,
                  animationDelay: `${scheduled.delaySec}s`,
                  animationDuration: `${scheduled.durationSec}s`,
                  color: dm.color || '#ffffff',
                  fontSize: `${resolvedFontPx}px`,
                }}
                className="absolute whitespace-nowrap animate-danmaku flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/58 backdrop-blur-[2px] border border-[#c8aa78]/25 font-bold leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]"
              >
                <span
                  style={{ fontSize: `${badgeFontPx}px` }}
                  className="font-extrabold px-1.5 py-0.2 rounded-full bg-[#f5d5a7] text-[#14100a] leading-tight"
                >
                  BLG
                </span>
                <span>{dm.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          6. BOTTOM-RIGHT FIXED OFFICIAL PARTNER LOGO (RIOT GAMES)
          Symmetrically aligned with [Summoner's Crest] 26 | RIOT GAMES
          (Exact coordinates on 1918x1078: left 74.61%, top 87.34%, w 11.84%, h 5.94%)
         ===================================================================== */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#070604] md:bg-transparent md:p-0 md:block">
        {/* Mobile-only WORLDS 26 lockup */}
        <div className="flex items-center gap-3 md:hidden">
          <Worlds26BottomLogo className="h-9 w-auto" />
          <div className="h-7 w-[1.5px] bg-[#c8aa78]/40" />
        </div>

        {/* Fixed Official Riot Games Lockup (no rotation) */}
        <div
          data-testid="bottom-right-fixed-partner-logo"
          className="relative h-9 sm:h-10 w-36 md:absolute md:left-[74.61%] md:top-[87.34%] md:w-[11.84%] md:h-[5.94%] z-20 flex items-center justify-center overflow-hidden pointer-events-none select-none"
        >
          <img
            src="assets/logos/partner_riot.png?v=clean1"
            alt="Riot Games"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* =====================================================================
          7. PERSISTENT PRE-WARMED PROMO VIDEO LAYER ("宣传片展播" 触发画面)
             - All promo videos stay mounted & pre-buffered in the DOM (preload="auto")
             - Starts instantaneously (0ms buffering) when triggered
             - Top-left corner continuously displays the official Finals Score Bug (1 - 3 · GEN VS BLG)
             - Plays Opening Video (from 2s to end) -> (0ms) Promo #1 -> (1.8s pure black screen) -> Promo #2 -> completes
         ===================================================================== */}
      <div
        data-testid={
          isShowingPromoOverlay ? 'promo-video-slot-overlay' : 'promo-video-prewarm-pool'
        }
        aria-hidden={!isShowingPromoOverlay}
        className={`group/promo absolute inset-0 bg-black ${
          isShowingPromoOverlay
            ? 'opacity-100 z-40 pointer-events-auto visible'
            : 'opacity-0 -z-10 pointer-events-none invisible'
        }`}
      >
        {/* Persistent <video> Pool
            只有第一支用 preload="auto"，其余先只取元数据，播到哪支才拉哪支 */}
        {PROMO_VIDEO_SLOT.map((item, idx) => {
          const isCurrentVideo =
            isShowingPromoOverlay && promoItemIndex === idx && !isInterPromoBlackScreen;
          return (
            <video
              key={item.id}
              ref={(el) => {
                promoVideoRefs.current[idx] = el;
              }}
              src={mediaUrl(item.videoUrl)}
              poster={item.posterUrl}
              preload={idx === 0 ? 'auto' : 'metadata'}
              playsInline
              disablePictureInPicture
              muted={item.muteAudio ? true : undefined}
              className={`absolute inset-0 w-full h-full object-contain bg-black ${
                isCurrentVideo ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            />
          );
        })}

        {/* 缓冲提示：视频还在拉流时给出明确反馈，而不是干等一片黑 */}
        {isShowingPromoOverlay && !isInterPromoBlackScreen && isPromoBuffering && (
          <div
            data-testid="promo-buffering-indicator"
            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/55"
          >
            <span className="h-10 w-10 rounded-full border-2 border-white/25 border-t-[#f5d5a7] animate-spin" />
            <span className="text-xs sm:text-sm font-bold tracking-[0.2em] text-white/85 uppercase">
              宣传片缓冲中…
            </span>
          </div>
        )}

        {/* 1.8-Second Pure Black Screen between Promo #1 and Promo #2 */}
        {isShowingPromoOverlay && isInterPromoBlackScreen && (
          <div
            data-testid="promo-inter-black-screen"
            className="absolute inset-0 z-20 bg-black"
          />
        )}

        {/* =====================================================================
            OFFICIAL TOP-LEFT MATCHUP SCORE BUG (COUNTDOWN REMOVED, SHOWS 1 - 3)
           ===================================================================== */}
        {isShowingPromoOverlay && !isInterPromoBlackScreen && (
          <div
            data-testid="promo-top-left-countdown"
            className="pointer-events-none absolute top-[3.6%] left-[2.8%] z-30 flex items-stretch bg-[#090705] border border-[#c8aa78]/40 p-[3px] shadow-[0_12px_32px_rgba(0,0,0,0.9)] select-none"
          >
            {/* Left Square Panel: Grand Final Bronze-Gold (#2b2216) with White Worlds Crest + 26 */}
            <div className="bg-gradient-to-b from-[#3d3020] to-[#1f1810] flex items-center justify-center px-2.5 py-2 sm:px-3.5 sm:py-2.5 md:px-[1.15vw] md:py-[0.8vw]">
              <img
                src="assets/logos/worlds_26_bottom.png"
                alt="WORLDS 26"
                className="h-8 sm:h-11 md:h-[clamp(2.4rem,3.8vw,4.1rem)] w-auto object-contain brightness-110"
              />
            </div>

            {/* Right Rectangular Panel: Deep Obsidian (#090705) with S16 CHAMPIONS & BLG */}
            <div className="bg-[#090705] flex flex-col justify-center items-center px-3 py-1 sm:px-4 sm:py-1.5 md:px-[1.25vw] md:py-[0.45vw] min-w-[7.5rem] sm:min-w-[10.5rem] md:min-w-[12.5vw]">
              <div
                data-testid="promo-inherited-countdown-value"
                className="font-broadcast-num text-[#f5d5a7] text-lg sm:text-2xl md:text-[clamp(1.35rem,2.2vw,2.45rem)] leading-[0.95] tracking-[0.06em] uppercase whitespace-nowrap drop-shadow-[0_0_10px_rgba(245,213,167,0.32)]"
              >
                S16 CHAMPIONS
              </div>
              <div
                data-testid="promo-inherited-matchup-label"
                className="mt-0.5 sm:mt-1 font-black text-white text-xs sm:text-base md:text-[clamp(0.95rem,1.5vw,1.65rem)] tracking-[0.16em] uppercase leading-none whitespace-nowrap"
              >
                BLG
              </div>
            </div>
          </div>
        )}

        {/* Top-Right Subtle Hover Broadcast Controls inside Promo Video (Unified Championship Gold Theme) */}
        {isShowingPromoOverlay && !isInterPromoBlackScreen && (
          <div className="absolute top-[3.6%] right-[2.8%] z-30 flex flex-wrap items-center justify-end gap-2 px-3 py-2 rounded-xl bg-[#0e0b07]/85 backdrop-blur-md border border-[#c8aa78]/40 opacity-100 md:opacity-0 md:group-hover/promo:opacity-100 transition-opacity duration-200 shadow-[0_8px_28px_rgba(0,0,0,0.85)]">
            <div className="hidden sm:flex items-center gap-2 mr-1">
              <span
                data-testid="promo-group-counter-badge"
                className="px-2 py-0.5 rounded bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] text-[#14100a] text-xs font-extrabold tracking-wider uppercase shadow-[0_0_10px_rgba(245,213,167,0.3)]"
              >
                {currentPromoGroupIndex + 1} / {PROMO_GROUP_IDS.length}
              </span>
              <span
                data-testid="active-promo-title"
                className="text-xs font-extrabold text-[#f7efe2] drop-shadow max-w-[16rem] truncate"
              >
                {currentPromoItem.title}
              </span>
            </div>

            <button
              type="button"
              onClick={togglePromoVideoMute}
              aria-label={isPromoVideoMuted ? '开启宣传片原声' : '静音宣传片原声'}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#18120b]/90 hover:bg-[#2a2015] text-[#f7efe2] border border-[#c8aa78]/35 text-xs font-bold transition-colors cursor-pointer"
            >
              {isPromoVideoMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span>开启原声</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#f5d5a7]" />
                  <span>原声播放中</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="finish-current-slot-btn"
              onClick={skipToNextPromoGroup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] hover:from-[#e2c496] hover:to-[#fbe3bd] text-[#14100a] font-extrabold text-xs shadow-[0_0_14px_rgba(245,213,167,0.35)] transition-all cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>
                {currentPromoGroupIndex + 1 < PROMO_GROUP_IDS.length
                  ? '下一支宣传片'
                  : slotQueue.pendingSlots.includes('data_preview')
                  ? '进入BLG专项数据'
                  : '返回导播主舞台'}
              </span>
            </button>

            <button
              type="button"
              data-testid="close-active-slot-btn"
              onClick={onCloseAllSlots}
              aria-label="返回导播主舞台"
              className="p-1.5 rounded-lg bg-[#18120b]/90 hover:bg-rose-600/80 text-[#f5d5a7] hover:text-white border border-[#c8aa78]/35 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          8. PERSISTENT BLG TOURNAMENT DATA ARCHIVE LAYER ("BLG专项数据" 触发画面)
             - Displays BLG's 2026 Worlds Championship tournament data records across 4 pages
         ===================================================================== */}
      <div
        data-testid={
          isShowingDataOverlay ? 'data-preview-slot-overlay' : 'data-preview-prewarm-pool'
        }
        aria-hidden={!isShowingDataOverlay}
        className={`group/data absolute inset-0 flex flex-col justify-between bg-[#090705] overflow-hidden ${
          isShowingDataOverlay
            ? 'opacity-100 z-40 pointer-events-auto visible'
            : 'opacity-0 -z-10 pointer-events-none invisible'
        }`}
      >
        <BlgTournamentDataPanel
          activePageIndex={dataItemIndex}
          onSelectPage={setDataItemIndex}
          onClose={onCompleteActiveSlot}
        />
      </div>

      {/* =====================================================================
          8.5. FULL-SCREEN BLG CHAMPIONS POSTER STAGE ("夺冠海报")
               - Auto-hides top HUD after 10s of mouse inactivity
               - Immediately hides top HUD if bottom HUD hide button is clicked (isHudMinimized)
         ===================================================================== */}
      {isShowingZeroFlagStage && (
        <WorldsZeroFlagStage
          isPreviewMode={true}
          onExitPreview={onExitZeroFlagPreview}
          isHudMinimized={isHudMinimized}
        />
      )}

      {/* =====================================================================
          9. PERSISTENT PRE-WARMED 4S-5S WORLDS 2026 SUMMONER CREST STINGER TRANSITION OVERLAY
             - Uses ONLY the single 4s-5s Summoner Crest stinger video (/assets/broadcast/worlds_stinger_transition.mp4)
             - Permanently mounted & pre-buffered in the DOM with zero blue glitch flash
         ===================================================================== */}
      <div
        data-testid={
          stingerState.active ? 'transition-stinger-overlay' : 'transition-stinger-prewarm-pool'
        }
        aria-hidden={!stingerState.active}
        className={`pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center bg-black ${
          stingerState.active ? 'opacity-100 z-50 visible' : 'opacity-0 -z-10 invisible'
        }`}
      >
        <video
          ref={stingerVideoRef}
          src={TRANSITION_STINGER_SLOT.stingerVideoUrl}
          preload="auto"
          muted
          playsInline
          className="w-full h-full object-cover bg-black"
        />
      </div>
    </div>
  );
};
