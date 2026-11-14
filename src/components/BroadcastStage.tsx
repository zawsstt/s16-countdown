import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { BroadcastSlide } from '../data/finalsData';
import { mediaUrl } from '../utils/mediaUrl';
import {
  PROMO_VIDEO_SLOT,
  PROMO_GROUP_IDS,
  PROMO_INTER_VIDEO_BLACK_SCREEN_MS,
  DATA_PREVIEW_SLIDE_DURATION_SEC,
  MATCH_DATA_PREVIEW_SLOT,
  TRANSITION_STINGER_SLOT,
} from '../data/broadcastSlots';
import {
  CountdownFormatted,
  SlotCountdownState,
  BroadcastSlotQueueState,
  BroadcastSlotId,
} from '../utils/broadcastLogic';
import type { DanmakuMessage } from '../../server';
import { WorldsZeroFlagStage } from './WorldsZeroFlagStage';

/**
 * 调试用：?promoStart=N 指定进入宣传片时从第 N 支开始（1 起算）。
 * 用于单独验收某一支宣传片，不影响正常播放。
 */
function resolveInitialPromoIndex(): number {
  if (typeof window === 'undefined') return 0;
  const raw = new URLSearchParams(window.location.search).get('promoStart');
  if (!raw) return 0;
  // 按「支」（组）计数，而不是按分段：promo1 有 4 段，但只算 1 支
  const n = Math.max(1, Math.min(PROMO_GROUP_IDS.length, Number(raw) || 1));
  const targetGroupId = PROMO_GROUP_IDS[n - 1];
  const idx = PROMO_VIDEO_SLOT.findIndex((item) => item.groupId === targetGroupId);
  return idx >= 0 ? idx : 0;
}

interface BroadcastStageProps {
  countdown: CountdownFormatted;
  /** 每小时整点全屏影片是否正在播放：为 true 时释放本页所有视频，避免抢硬件解码器 */
  isHourlyVideoActive?: boolean;
  /** 0 秒开赛旗帜画面预览模式 */
  isZeroFlagPreview?: boolean;
  onExitZeroFlagPreview?: () => void;
  /** 距决赛开赛还有多少分钟（用于临近开赛时收起宣传片/前瞻入口） */
  minutesToFinals?: number;
  /** 调试用：强制视为已归零（锁定态），用于验证锁定效果 */
  forceZero?: boolean;
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
}

/**
 * 100% Real Partner Badges extracted directly from the Worlds 2026 1080p feed
 */
const REAL_PARTNER_BADGES = [
  { id: 'hyperx', name: 'HyperX Official Peripherals', src: 'assets/logos/partner_hyperx.png' },
  { id: 'riot', name: 'Riot Games', src: 'assets/logos/partner_riot.png' },
  { id: 'aws', name: 'AWS Cloud Partner', src: 'assets/logos/partner_aws.png' },
  { id: 'redbull', name: 'Red Bull 給你一對翅膀', src: 'assets/logos/partner_redbull.png' },
  { id: 'worlds26', name: 'Worlds 2026', src: 'assets/logos/partner_worlds26.png' },
  { id: 'carry', name: 'Carry Partner', src: 'assets/logos/partner_carry.png' },
];

export const BroadcastStage: React.FC<BroadcastStageProps> = ({
  countdown,
  isHourlyVideoActive = false,
  isZeroFlagPreview = false,
  onExitZeroFlagPreview,
  minutesToFinals = 9999,
  forceZero = false,
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
}) => {
  const [partnerIndex, setPartnerIndex] = useState(0);
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
  const [promoItemIndex, setPromoItemIndex] = useState(resolveInitialPromoIndex);
  const [isInterPromoBlackScreen, setIsInterPromoBlackScreen] = useState(false);
  /** 大屏同时飘动的弹幕条数上限（受硬件与可读性限制） */
  const DANMAKU_FLOAT_WINDOW = 16;
  /** 每个飘动周期（14s）往后轮换的条数 */
  const DANMAKU_FLOAT_STEP = 8;
  /** 轮播批次计数：驱动 floatingDanmaku 滑动窗口 */
  const [floatCycle, setFloatCycle] = useState(0);

  const [isPromoVideoMuted, setIsPromoVideoMuted] = useState(false);
  const [dataItemIndex, setDataItemIndex] = useState(0);

  // 宣传片是否处于「缓冲中」（用于显示缓冲提示，而不是让画面一片黑）
  const [isPromoBuffering, setIsPromoBuffering] = useState(false);

  const stageContainerRef = useRef<HTMLDivElement>(null);
  // Persistent pre-warmed <video> refs for all items in PROMO_VIDEO_SLOT + Stinger
  const promoVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const stingerVideoRef = useRef<HTMLVideoElement>(null);
  const bgLoopVideoRef = useRef<HTMLVideoElement>(null);
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

  // Pre-decode all 7 Match Data Preview 1080p PNGs when isDataPrewarmed is true
  useEffect(() => {
    if (!isDataPrewarmed) return;
    MATCH_DATA_PREVIEW_SLOT.forEach((item) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = item.graphicImageUrl;
    });
  }, [isDataPrewarmed]);

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
      const startIdx = resolveInitialPromoIndex();
      setPromoItemIndex(startIdx);
      const firstPromoVid = promoVideoRefs.current[startIdx];
      if (firstPromoVid) {
        try {
          firstPromoVid.currentTime = PROMO_VIDEO_SLOT[startIdx]?.startSec ?? 0;
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
      isHourlyVideoActive ||
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

    // 卡顿看门狗：每 800ms 检查一次画面是否在推进
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
        // 2.4 秒画面不动。先判断是「网络不够」还是「解码器挂起」：
        // 若当前位置之后还有 1.5 秒以上缓冲，说明数据早就到了，是 D3D11 硬件解码器
        // 偶发挂起（Chromium 会反复把媒体管线打到 kSuspended）。
        // 此时微调 currentTime 会强制重建解码管线，几十毫秒就能恢复，比 load() 轻得多，
        // 画面只跳过 0.06 秒，肉眼几乎察觉不到。
        let bufferedAhead = 0;
        try {
          for (let i = 0; i < vid.buffered.length; i++) {
            if (vid.buffered.start(i) <= vid.currentTime && vid.currentTime <= vid.buffered.end(i)) {
              bufferedAhead = vid.buffered.end(i) - vid.currentTime;
              break;
            }
          }
        } catch {
          // ignore
        }
        if (bufferedAhead > 1.5) {
          try {
            vid.currentTime = vid.currentTime + 0.06;
          } catch {
            // ignore
          }
          promoStallRef.current = { time: vid.currentTime, ticks: 0 };
          return;
        }
      }

      if (state.ticks === 8) {
        // 6.4 秒没动：重新拉流并重试播放（文件已 faststart，重启代价很小）
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
      } else if (state.ticks >= 20) {
        // 16 秒仍无任何进展：跳过这一支，保证导播流程能继续
        console.warn('[promo] 长时间无进展，跳过：', item.videoUrl);
        advancePromoVideoOrCompleteSlot();
      }
    }, 800);

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
    isHourlyVideoActive,
    advancePromoVideoOrCompleteSlot,
    ensurePromoVideoBuffering,
  ]);

  // Control Match Data Preview sequential auto-rotation across all 7 graphics (20s per graphic)
  useEffect(() => {
    if (activeSlot !== 'data_preview' || displayedSlot !== 'data_preview' || stingerState.active) {
      return;
    }

    const timer = setTimeout(() => {
      if (dataItemIndex + 1 < MATCH_DATA_PREVIEW_SLOT.length) {
        setDataItemIndex((idx) => idx + 1);
      } else {
        onCompleteActiveSlot();
      }
    }, DATA_PREVIEW_SLIDE_DURATION_SEC * 1000);

    return () => clearTimeout(timer);
  }, [activeSlot, displayedSlot, stingerState.active, dataItemIndex, onCompleteActiveSlot]);

  // Rotate bottom-right real partner badge every 6 seconds like the reference broadcast feed
  useEffect(() => {
    const timer = setInterval(() => {
      setPartnerIndex((prev) => (prev + 1) % REAL_PARTNER_BADGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

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

  // Latest 16 danmaku messages for full-screen floating overlay
  /**
   * 大屏飘动弹幕：不再固定只取最新 16 条（那样老弹幕永远上不了屏，用户会以为被吞了），
   * 改成滑动窗口轮播——每 14 秒（正好一个飘动周期）往前推 8 条，循环覆盖全部弹幕。
   * 新弹幕仍会立刻进入窗口尾部，保证实时性。
   */
  // 每 14 秒推进一步，让下一批弹幕上屏
  useEffect(() => {
    if (!showDanmakuOverlay || danmakuList.length <= DANMAKU_FLOAT_WINDOW) return;
    const timer = setInterval(() => setFloatCycle((c) => c + 1), 14000);
    return () => clearInterval(timer);
  }, [showDanmakuOverlay, danmakuList.length]);

  const floatingDanmaku = useMemo(() => {
    const total = danmakuList.length;
    if (total === 0) return [];
    const size = Math.min(DANMAKU_FLOAT_WINDOW, total);
    if (total <= DANMAKU_FLOAT_WINDOW) return danmakuList;
    const start = (floatCycle * DANMAKU_FLOAT_STEP) % total;
    const out = [];
    for (let i = 0; i < size; i++) out.push(danmakuList[(start + i) % total]);
    return out;
  }, [danmakuList, floatCycle]);
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
  const currentDataItem = MATCH_DATA_PREVIEW_SLOT[dataItemIndex] || MATCH_DATA_PREVIEW_SLOT[0];
  /**
   * 全屏长片接管画面时，把本页所有 <video> 真正停掉。
   *
   * 只把 JSX 里的 src 置成 undefined 是不够的：React 移除属性后浏览器不会自动
   * 停止已经缓冲的播放，宣传片的原声会从后台继续漏出来（实测能听到）。
   * 这里显式 pause + removeAttribute + load()，立刻释放解码器并静音。
   */
  useEffect(() => {
    if (!isHourlyVideoActive) return;
    const root = stageContainerRef.current;
    if (!root) return;
    root.querySelectorAll('video').forEach((v) => {
      try {
        if (!v.paused) v.pause();
        v.muted = true;
      } catch {
        // ignore
      }
    });
  }, [isHourlyVideoActive]);

  const isShowingPromoOverlay = displayedSlot === 'promo_video';
  const isShowingDataOverlay = displayedSlot === 'data_preview';
  /** 0 秒开赛：倒计时归零或预览时，画面让位给旗帜（宣传片/前瞻优先让位） */
  const effectiveIsZero = countdown.isZero || forceZero;
  const isShowingZeroFlagStage =
    (effectiveIsZero || isZeroFlagPreview) && !isShowingPromoOverlay && !isShowingDataOverlay;
  /** 真正归零时强制锁屏：拦截一切点击（弹幕输入在组件外，不受影响） */
  const isHardLocked = effectiveIsZero && isShowingZeroFlagStage;
  /** 距开赛 20 分钟内：宣传片 / 赛事前瞻入口整体隐藏，避免误触 */
  const isSlotEntryHidden = minutesToFinals <= 20;

  /**
   * 全屏遮罩（宣传片 / 赛事前瞻）盖住主页时，把左侧那块背景循环视频暂停掉。
   *
   * 它虽然被遮住看不见，但 autoPlay+loop 仍在后台持续解码。Chromium 的硬件解码器
   * （D3D11VideoDecoder）数量有限，它和宣传片抢同一个解码器时，宣传片的媒体管线会被
   * 反复挂起（kSuspended），表现为画面卡在某几秒、readyState 从 4 掉到 2、缓冲明明
   * 还有却不再推进。暂停后宣传片即可正常播放。
   */
  useEffect(() => {
    const v = bgLoopVideoRef.current;
    if (!v) return;
    const covered = displayedSlot === 'promo_video' || displayedSlot === 'data_preview';
    if (covered) {
      if (!v.paused) v.pause();
    } else {
      v.play().catch(() => {});
    }
  }, [displayedSlot]);

  return (
    <div
      ref={stageContainerRef}
      data-testid="broadcast-stage"
      className="relative w-full md:aspect-[1918/1078] max-h-none md:max-h-screen overflow-hidden bg-[#00051e] select-none shadow-[0_0_100px_rgba(0,15,85,0.95)]"
    >
      {/* =====================================================================
          DESKTOP 1080P MASTER BROADCAST FRAME PLATE (1918x1078)
          Contains the pure bright #FFFFFF FINALS header constructed from original broadcast glyphs
         ===================================================================== */}
      <img
        src="assets/broadcast/master_stage_base.jpg"
        alt="Worlds 2026 Official FINALS Broadcast Frame"
        className="hidden md:block absolute inset-0 w-full h-full object-fill pointer-events-none"
      />

      {/* =====================================================================
          1. TOP BROADCAST HEADER:
             WORLDS CREST + LIVE BEIJING TIME FINALS COUNTDOWN (24-HOUR TOTAL HOURS) | FINALS | TWO COUNTDOWN PROGRESS BARS
         ===================================================================== */}
      <div className="relative z-20 flex flex-col gap-2 px-3.5 py-2.5 bg-gradient-to-b from-[#001861] via-[#001045] to-[#000a2e] border-b border-[#0051ff]/40 md:bg-none md:border-none md:p-0 md:static">
        <div className="flex items-center justify-between">
          {/* Left: Worlds 2026 Crest (mobile) + Live Ticking Finals Countdown (HHH:MM:SS) */}
          <div className="flex items-center gap-2.5 md:absolute md:left-[10.8%] md:top-[4.4%] md:w-[28.8%] md:h-[14.2%] md:z-20">
            <WorldsCrestLogo className="w-9 h-9 sm:w-11 sm:h-11 md:hidden shrink-0" />
            <div
              data-testid="countdown-display"
              className="font-broadcast-num text-white leading-none tracking-wider whitespace-nowrap drop-shadow-[0_6px_8px_rgba(0,4,24,0.95)] text-xl sm:text-3xl md:text-[clamp(1.65rem,4.3vw,4.6rem)]"
            >
              {countdown.primaryDisplay}
            </div>
          </div>

          {/* Desktop Vertical Header Divider Line between Countdown and FINALS */}
          <div
            aria-hidden="true"
            className="hidden md:block md:absolute md:left-[40.0%] md:top-[5.0%] md:h-[12.2%] md:w-[2px] md:bg-white/95 md:z-20"
          />

          {/* Middle-Right: FINALS Title (Pure Bright #FFFFFF Original Broadcast Glyph Style) */}
          <div className="flex items-center gap-2 md:absolute md:left-[41.9%] md:top-[4.4%] md:h-[14.2%] md:z-20">
            <img
              src="assets/logos/finals_stage.png"
              alt="FINALS"
              className="h-7 sm:h-9 w-auto object-contain md:opacity-0 pointer-events-none"
            />
            <span className="sr-only">FINALS</span>
          </div>

          {/* Mobile Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? '退出全屏导播画面' : '全屏显示导播画面'}
            className="md:hidden inline-flex items-center justify-center rounded bg-black/35 hover:bg-[#0051ff]/60 border border-white/20 p-1.5 text-white/85 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* =====================================================================
            TOP-RIGHT DUAL BROADCAST COUNTDOWN PROGRESS BARS (PURE BROADCAST STYLE):
            1) 宣传片倒计时
            2) 赛事前瞻倒计时
           ===================================================================== */}
        <div
          data-testid="top-right-slot-bars"
          style={
            isSlotEntryHidden || isShowingZeroFlagStage ? { display: 'none' } : undefined
          }
          className="grid grid-cols-2 gap-2.5 md:flex md:items-center md:gap-3 md:absolute md:left-[61.2%] md:right-[1.4%] md:top-[4.8%] md:h-[12.4%] md:z-20"
        >
          {/* Progress Bar 1: 宣传片倒计时 */}
          <button
            type="button"
            data-testid="slot-bar-promo"
            disabled={isShowingZeroFlagStage}
            onMouseEnter={() => setIsPromoPrewarmed(true)}
            onClick={() => {
              setIsPromoPrewarmed(true);
              onTriggerSlot('promo_video');
            }}
            aria-label={`宣传片倒计时 ${promoCountdown.display}`}
            className={`group flex-1 flex flex-col justify-center gap-1.5 rounded-lg px-3 py-2 md:px-3.5 md:py-2.5 border text-left transition-all cursor-pointer backdrop-blur-md ${
              activeSlot === 'promo_video'
                ? 'bg-[#0038b8]/95 border-[#00e5ff] shadow-[0_0_18px_rgba(0,229,255,0.45)]'
                : 'bg-[#000d38]/80 hover:bg-[#001d6e]/90 border-white/30 hover:border-white/70'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2 w-full">
              <span className="text-xs sm:text-sm md:text-[clamp(0.8rem,1.05vw,1.1rem)] font-black tracking-wider text-white whitespace-nowrap drop-shadow-[0_3px_6px_rgba(0,4,24,0.95)]">
                {promoCountdown.label}
              </span>
              <span
                data-testid="promo-slot-timer"
                className="font-broadcast-num text-base sm:text-lg md:text-[clamp(1.2rem,1.8vw,1.9rem)] text-white leading-none tracking-wider drop-shadow-[0_4px_6px_rgba(0,4,24,0.95)] shrink-0"
              >
                {promoCountdown.display}
              </span>
            </div>

            {/* Clean Broadcast Progress Bar */}
            <div className="w-full h-2 md:h-2.5 rounded-full bg-black/65 overflow-hidden border border-white/25">
              <div
                style={{
                  width: `${
                    activeSlot === 'promo_video' ? 100 : promoCountdown.progressPercent
                  }%`,
                }}
                className="h-full bg-gradient-to-r from-[#0051ff] via-[#00e5ff] to-white transition-all duration-500"
              />
            </div>
          </button>

          {/* Progress Bar 2: 赛事前瞻倒计时 */}
          <button
            type="button"
            data-testid="slot-bar-data"
            disabled={isShowingZeroFlagStage}
            onMouseEnter={() => setIsDataPrewarmed(true)}
            onClick={() => {
              setIsDataPrewarmed(true);
              onTriggerSlot('data_preview');
            }}
            aria-label={`赛事前瞻倒计时 ${dataPreviewCountdown.display}`}
            className={`group flex-1 flex flex-col justify-center gap-1.5 rounded-lg px-3 py-2 md:px-3.5 md:py-2.5 border text-left transition-all cursor-pointer backdrop-blur-md ${
              activeSlot === 'data_preview'
                ? 'bg-[#0038b8]/95 border-[#00e5ff] shadow-[0_0_18px_rgba(0,229,255,0.45)]'
                : slotQueue.pendingSlots.includes('data_preview')
                ? 'bg-[#002885]/90 border-[#00e5ff]/80'
                : 'bg-[#000d38]/80 hover:bg-[#001d6e]/90 border-white/30 hover:border-white/70'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2 w-full">
              <span className="text-xs sm:text-sm md:text-[clamp(0.8rem,1.05vw,1.1rem)] font-black tracking-wider text-white whitespace-nowrap drop-shadow-[0_3px_6px_rgba(0,4,24,0.95)]">
                {dataPreviewCountdown.label}
              </span>
              <span
                data-testid="data-slot-timer"
                className="font-broadcast-num text-base sm:text-lg md:text-[clamp(1.2rem,1.8vw,1.9rem)] text-white leading-none tracking-wider drop-shadow-[0_4px_6px_rgba(0,4,24,0.95)] shrink-0"
              >
                {dataPreviewCountdown.display}
              </span>
            </div>

            {/* Clean Broadcast Progress Bar */}
            <div className="w-full h-2 md:h-2.5 rounded-full bg-black/65 overflow-hidden border border-white/25">
              <div
                style={{
                  width: `${
                    activeSlot === 'data_preview' ||
                    slotQueue.pendingSlots.includes('data_preview')
                      ? 100
                      : dataPreviewCountdown.progressPercent
                  }%`,
                }}
                className="h-full bg-gradient-to-r from-[#0051ff] via-[#00e5ff] to-white transition-all duration-500"
              />
            </div>
          </button>

          {/* Desktop Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? '退出全屏导播画面' : '全屏显示导播画面'}
            className="hidden md:inline-flex items-center justify-center rounded-lg bg-black/40 hover:bg-[#0051ff]/70 border border-white/25 p-2 text-white/85 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. CYAN RIBBON BAR (Mobile visible; on Desktop baked into master plate)
         ===================================================================== */}
      <div className="md:hidden w-full overflow-hidden border-b border-[#00d2ff]/30">
        <img
          src="assets/broadcast/ribbon_bar.png"
          alt="WORLDS 2026 | THIS IS OUR MOMENT"
          className="w-full h-6 sm:h-7 object-cover"
        />
      </div>

      {/* =====================================================================
          3. LEFT MATCHUP ZONE: REAL ANIMATED GEN vs BLG LOOP PLATE (FIXED 0 - 0)
          (Exact coordinates on 1918x1078: left 0%, top 24.68%, w 42.23%, h 60.11%)
         ===================================================================== */}
      <div className="relative w-full aspect-[810/648] md:aspect-auto md:absolute md:left-0 md:top-[24.68%] md:w-[42.23%] md:h-[60.11%] z-10 overflow-hidden">
        {/* Phase-locked real 1080p looping broadcast matchup video (GEN vs BLG, 0 - 0) */}
        <video
          ref={bgLoopVideoRef}
          /* 全屏遮罩期间直接卸掉 src：暂停只是停止渲染，解码器仍被占着，
             会和宣传片抢硬件解码资源（表现为宣传片卡在某几秒不动）。
             卸掉后浏览器会真正释放解码器，回到主页再重新拉流（文件仅 1MB 级）。 */
          src={
            isShowingPromoOverlay || isShowingDataOverlay || isHourlyVideoActive
              ? undefined
              : 'assets/broadcast/gen_vs_blg_loop.mp4'
          }
          poster="assets/broadcast/gen_vs_blg_panel.jpg"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-fill pointer-events-none"
        />

        {/* Fixed 0 - 0 Series Score (native in video plate, exposed for accessibility) */}
        <span data-testid="series-score" className="sr-only">
          0 - 0
        </span>
      </div>

      {/* =====================================================================
          4. RIGHT ROLLING HD MEDIA WINDOW
          (Exact coordinates on 1918x1078: left 42.23%, top 26.25%, w 56.47%, h 56.22%)
          Aligned with user's screen recording: static scale(1) images with 500ms overlapping opacity crossfade
         ===================================================================== */}
      <div className="group relative w-full aspect-[1083/606] md:aspect-auto md:absolute md:left-[42.23%] md:top-[26.25%] md:w-[56.47%] md:h-[56.22%] z-20 overflow-hidden bg-[#01061c] border-y border-[#0051ff]/40 md:border-none">
        {/* 纯静态帧图轮播（已按要求取消动态原片播放） */}
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
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 px-3 py-2 bg-gradient-to-t from-black/85 via-black/45 to-transparent opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
          <div className="min-w-0 flex items-center gap-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                currentSlide.category === 'GEN'
                  ? 'bg-[#f5b800] text-slate-950'
                  : currentSlide.category === 'BLG'
                  ? 'bg-[#00d2ff] text-slate-950'
                  : 'bg-[#0051ff] text-white'
              }`}
            >
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
      {showDanmakuOverlay && (
        <div
          data-testid="danmaku-overlay"
          style={{ opacity: danmakuOpacity }}
          className="pointer-events-none absolute inset-x-0 top-[24%] bottom-[12%] overflow-hidden z-[48]"
        >
          {floatingDanmaku.map((dm, idx) => {
            const laneTop = 6 + ((dm.lane ?? idx) % 7) * 12.5;
            const isFresh = Date.now() - dm.timestamp < 6000;
            const delaySec = isFresh ? 0 : -((idx * 2.3) % 13.5);
            return (
              <div
                key={dm.id}
                style={{
                  top: `${laneTop}%`,
                  animationDelay: `${delaySec}s`,
                  color: dm.color || '#ffffff',
                }}
                className="absolute whitespace-nowrap animate-danmaku flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 backdrop-blur-[2px] border border-white/15 text-xs sm:text-sm md:text-base font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]"
              >
                {dm.team !== 'NEUTRAL' && (
                  <span
                    className={`text-[10px] sm:text-xs font-extrabold px-1.5 py-0.2 rounded-full ${
                      dm.team === 'GEN'
                        ? 'bg-[#f5b800] text-slate-950'
                        : 'bg-[#00d2ff] text-slate-950'
                    }`}
                  >
                    {dm.team}
                  </span>
                )}
                <span>{dm.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          5.5 ZERO-SECOND FLAG STAGE（倒计时归零 / 预览时接管主画面）
         ===================================================================== */}
      {isShowingZeroFlagStage && (
        <div className="absolute inset-0 z-[46]">
          <WorldsZeroFlagStage
            isPreviewMode={Boolean(isZeroFlagPreview && !effectiveIsZero)}
            onExitPreview={onExitZeroFlagPreview}
          />
        </div>
      )}

      {/* 硬锁遮罩：真实归零后拦截所有点击，只保留弹幕（弹幕组件在 BroadcastStage 之外） */}
      {isHardLocked && (
        <div
          data-testid="zero-flag-hard-lock"
          className="absolute inset-0 z-[70] cursor-not-allowed"
          onClickCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
      )}

      {/* =====================================================================
          6. BOTTOM-RIGHT REAL ROTATING PARTNER LOGO
          (Exact coordinates on 1918x1078: left 72.73%, top 85.90%, w 14.70%, h 8.16%)
         ===================================================================== */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#00041c] md:bg-transparent md:p-0 md:block">
        {/* Mobile-only WORLDS 26 lockup */}
        <div className="flex items-center gap-3 md:hidden">
          <Worlds26BottomLogo className="h-9 w-auto" />
          <div className="h-7 w-[1.5px] bg-white/40" />
        </div>

        {/* Real Rotating Partner Badge Image with smooth 500ms crossfade */}
        <div className="relative h-10 sm:h-11 w-40 md:absolute md:left-[72.73%] md:top-[85.90%] md:w-[14.70%] md:h-[8.16%] z-20 flex items-center justify-center overflow-hidden">
          {REAL_PARTNER_BADGES.map((partner, idx) => {
            const isCurrent = idx === partnerIndex;
            return (
              <img
                key={partner.id}
                src={partner.src}
                alt={partner.name}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ease-in-out ${
                  isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          7. PERSISTENT PRE-WARMED PROMO VIDEO LAYER ("宣传片倒计时" 触发画面)
             - All promo videos stay mounted & pre-buffered in the DOM (preload="auto")
             - Starts instantaneously (0ms buffering) when triggered
             - Top-left corner continuously displays the inherited main Finals Countdown + GEN VS BLG
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
          /* 只给「当前这支」和「下一支」挂 src，其余元素不加载。
             十几个 <video> 同时拉流会占满 Chromium 的硬件解码器（D3D11VideoDecoder），
             当前视频的媒体管线被反复挂起（kSuspended），表现为画面卡在某几秒、
             readyState 从 4 掉到 2、缓冲明明还在却不再推进。
             只保留 2 个加载窗口后，解码器够用，播放稳定。
             未加载的元素仍显示 poster 首帧，切过去时再拉流。 */
          const shouldAttachSrc =
            !isHourlyVideoActive &&
            (idx === promoItemIndex || idx === promoItemIndex + 1);
          return (
            <video
              key={item.id}
              ref={(el) => {
                promoVideoRefs.current[idx] = el;
              }}
              src={shouldAttachSrc ? mediaUrl(item.videoUrl) : undefined}
              poster={item.posterUrl}
              preload={idx === 0 ? 'auto' : 'metadata'}
              playsInline
              disablePictureInPicture
              /* 只有「当前正在播的这一支」允许出声，其余全部静音，
                 避免多个媒体元素同时争抢音频输出通道 */
              muted={item.muteAudio || !isCurrentVideo ? true : isPromoVideoMuted}
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
            <span className="h-10 w-10 rounded-full border-2 border-white/25 border-t-[#00d2ff] animate-spin" />
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
            OFFICIAL TOP-LEFT INHERITED FINALS COUNTDOWN BUG (宣传片播放时倒计时显示.png)
            - Left royal-blue square (#003ce2): White Worlds Summoner Crest + 26
            - Right deep-black box (#05070d): Live cyan Finals Countdown on top + GEN VS BLG below
           ===================================================================== */}
        {isShowingPromoOverlay && !isInterPromoBlackScreen && (
          <div
            data-testid="promo-top-left-countdown"
            className="pointer-events-none absolute top-[3.6%] left-[2.8%] z-30 flex items-stretch bg-[#05070d] p-[3px] shadow-[0_12px_32px_rgba(0,0,0,0.9)] select-none"
          >
            {/* Left Square Panel: Royal Blue (#003ce2) with White Worlds Crest + 26 */}
            <div className="bg-[#003ce2] flex items-center justify-center px-2.5 py-2 sm:px-3.5 sm:py-2.5 md:px-[1.15vw] md:py-[0.8vw]">
              <img
                src="assets/logos/worlds_26_bottom.png"
                alt="WORLDS 26"
                className="h-8 sm:h-11 md:h-[clamp(2.4rem,3.8vw,4.1rem)] w-auto object-contain brightness-110"
              />
            </div>

            {/* Right Rectangular Panel: Deep Black (#05070d) with Cyan Live Countdown & GEN VS BLG */}
            <div className="bg-[#05070d] flex flex-col justify-center items-center px-3 py-1 sm:px-4 sm:py-1.5 md:px-[1.25vw] md:py-[0.45vw] min-w-[7.5rem] sm:min-w-[10rem] md:min-w-[11.5vw]">
              <div
                data-testid="promo-inherited-countdown-value"
                className="font-broadcast-num text-[#05d8ff] text-xl sm:text-3xl md:text-[clamp(1.65rem,2.85vw,3.15rem)] leading-[0.95] tracking-wider whitespace-nowrap drop-shadow-[0_0_10px_rgba(5,216,255,0.28)]"
              >
                {countdown.primaryDisplay}
              </div>
              <div
                data-testid="promo-inherited-matchup-label"
                className="mt-0.5 sm:mt-1 font-black text-white text-xs sm:text-base md:text-[clamp(0.9rem,1.45vw,1.55rem)] tracking-[0.09em] uppercase leading-none whitespace-nowrap"
              >
                GEN VS BLG
              </div>
            </div>
          </div>
        )}

        {/* Top-Right Subtle Hover Broadcast Controls inside Promo Video */}
        {isShowingPromoOverlay && !isInterPromoBlackScreen && (
          <div className="absolute top-[3.6%] right-[2.8%] z-30 flex flex-wrap items-center justify-end gap-2 px-3 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 opacity-100 md:opacity-0 md:group-hover/promo:opacity-100 transition-opacity duration-200">
            <div className="hidden sm:flex items-center gap-2 mr-1">
              <span className="px-2 py-0.5 rounded bg-[#0051ff] text-white text-xs font-extrabold tracking-wider uppercase">
                {currentPromoGroupIndex + 1} / {PROMO_GROUP_IDS.length}
              </span>
              <span
                data-testid="active-promo-title"
                className="text-xs font-extrabold text-white drop-shadow max-w-[16rem] truncate"
              >
                {currentPromoItem.title}
              </span>
            </div>

            {currentPromoItem.muteAudio ? (
              <span
                data-testid="promo-intro-audio-removed"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/65 text-white/60 border border-white/15 text-xs font-bold cursor-default"
              >
                <VolumeX className="w-3.5 h-3.5 text-white/45" />
                <span>片头已静音</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={togglePromoVideoMute}
                aria-label={isPromoVideoMuted ? '开启宣传片原声' : '静音宣传片原声'}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/65 hover:bg-white/15 text-white border border-white/20 text-xs font-bold transition-colors cursor-pointer"
              >
                {isPromoVideoMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span>开启原声</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#00e5ff]" />
                    <span>原声播放中</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              data-testid="finish-current-slot-btn"
              onClick={skipToNextPromoGroup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d2ff] hover:bg-[#38bdf8] text-slate-950 font-extrabold text-xs shadow-lg transition-colors cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>
                {currentPromoGroupIndex + 1 < PROMO_GROUP_IDS.length
                  ? '下一支宣传片'
                  : slotQueue.pendingSlots.includes('data_preview')
                  ? '进入赛事前瞻'
                  : '返回赛前导播画面'}
              </span>
            </button>

            <button
              type="button"
              data-testid="close-active-slot-btn"
              onClick={onCloseAllSlots}
              aria-label="返回赛前导播画面"
              className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-600/80 text-white border border-white/20 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          8. PERSISTENT MATCH DATA PREVIEW LAYER ("赛事前瞻倒计时" 触发画面)
             - Displays all 7 official 1920x1080 broadcast data graphics (____1 ~ ____7) full-screen
             - Smooth 700ms overlapping crossfade matching the carousel window (no extra page animation)
             - Each graphic displays for 20 seconds (DATA_PREVIEW_SLIDE_DURATION_SEC = 20)
         ===================================================================== */}
      <div
        data-testid={
          isShowingDataOverlay ? 'data-preview-slot-overlay' : 'data-preview-prewarm-pool'
        }
        aria-hidden={!isShowingDataOverlay}
        className={`group/data absolute inset-0 flex flex-col justify-between bg-[#00051e] overflow-hidden ${
          isShowingDataOverlay
            ? 'opacity-100 z-40 pointer-events-auto visible'
            : 'opacity-0 -z-10 pointer-events-none invisible'
        }`}
      >
        {/* Full-Screen 16:9 Official Broadcast Data Preview Graphics (____1 ~ ____7) with Smooth 700ms Crossfade */}
        <div className="absolute inset-0 w-full h-full">
          {MATCH_DATA_PREVIEW_SLOT.map((item, idx) => {
            const isCurrent = idx === dataItemIndex;
            return (
              <img
                key={item.id}
                src={item.graphicImageUrl}
                alt={item.title}
                className={`absolute inset-0 w-full h-full object-contain md:object-cover transition-opacity duration-700 ease-in-out ${
                  isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              />
            );
          })}
        </div>

        {/* Subtle Hover Control Bar at Top */}
        {isShowingDataOverlay && (
          <div className="relative z-30 flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gradient-to-b from-black/85 via-black/45 to-transparent opacity-100 md:opacity-0 md:group-hover/data:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded bg-[#f5b800] text-slate-950 text-xs font-black tracking-wider uppercase">
                {dataItemIndex + 1} / {MATCH_DATA_PREVIEW_SLOT.length}
              </span>
              <span
                data-testid="active-data-title"
                className="text-sm font-extrabold text-white drop-shadow"
              >
                {currentDataItem.title}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="data-preview-prev-btn"
                aria-label="上一张赛事数据图例"
                onClick={() =>
                  setDataItemIndex(
                    (idx) =>
                      (idx - 1 + MATCH_DATA_PREVIEW_SLOT.length) %
                      MATCH_DATA_PREVIEW_SLOT.length
                  )
                }
                className="p-1.5 rounded-lg bg-black/65 hover:bg-white/20 text-white border border-white/20 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                data-testid="data-preview-next-btn"
                aria-label="下一张赛事数据图例"
                onClick={() =>
                  setDataItemIndex((idx) => (idx + 1) % MATCH_DATA_PREVIEW_SLOT.length)
                }
                className="p-1.5 rounded-lg bg-black/65 hover:bg-white/20 text-white border border-white/20 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                data-testid="finish-data-slot-btn"
                onClick={onCompleteActiveSlot}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d2ff] hover:bg-[#38bdf8] text-slate-950 font-extrabold text-xs shadow-lg transition-colors cursor-pointer ml-1"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>返回赛前导播画面</span>
              </button>
            </div>
          </div>
        )}
      </div>

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
          /* 全屏影片播放期间释放转场视频，把解码器让给它 */
          src={isHourlyVideoActive ? undefined : TRANSITION_STINGER_SLOT.stingerVideoUrl}
          preload="auto"
          muted
          playsInline
          className="w-full h-full object-cover bg-black"
        />
      </div>
    </div>
  );
};
