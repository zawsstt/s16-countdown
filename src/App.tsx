import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Calendar,
  SlidersHorizontal,
  EyeOff,
  SkipForward,
  BarChart3,
} from 'lucide-react';
import { BroadcastStage } from './components/BroadcastStage';
import { DanmakuPlugin } from './components/DanmakuPlugin';
// 赛前数据面板依赖 recharts（约 400KB），改成按需加载：
// 只有用户点「赛前数据统计」时才下载这个 chunk，首屏不受影响。
const PreMatchStatsPanel = lazy(() =>
  import('./components/PreMatchStatsPanel').then((m) => ({ default: m.PreMatchStatsPanel }))
);
import { PreloadGateScreen } from './components/PreloadGateScreen';
import { HourlyVideoOverlay } from './components/HourlyVideoOverlay';
import { BROADCAST_SLIDES } from './data/finalsData';
import {
  calculateFinalsCountdown,
  getFinalsTargetTimestamp,
  getInitialSlotClockOffsetMs,
  calculatePromoSlotCountdown,
  calculateDataPreviewSlotCountdown,
  enqueueBroadcastSlots,
  advanceBroadcastSlotQueue,
  BroadcastSlotQueueState,
  BroadcastSlotId,
  mergeDanmakuMessage,
  selectLeastCrowdedDanmakuLane,
  DANMAKU_LANE_COUNT,
} from './utils/broadcastLogic';
import {
  BGM_PLAYLIST,
  BGM_TRACK_COUNT,
  getNextTrackIndex,
  getRandomDifferentTrackIndex,
} from './data/musicPlaylist';
import {
  DANMAKU_MAX_ITEMS,
  fetchRecentDanmaku,
  insertDanmaku,
  likeDanmaku,
  subscribeDanmaku,
} from './utils/supabaseDanmaku';
import type { DanmakuMessage } from '../server';

/** 弹幕数据来源：supabase（线上多人共享） / local（本地 ws 服务） */
type DanmakuSource = 'supabase' | 'local';

export default function App() {
  // 游戏式进场前资源预加载门控（支持 ?skipPreload=1 快捷跳过）
  const [isPreloadComplete, setIsPreloadComplete] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('skipPreload') === '1';
    }
    return false;
  });

  // 导播控制台「赛前数据统计」Recharts 面板开关
  const [isPreMatchStatsOpen, setIsPreMatchStatsOpen] = useState<boolean>(false);

  // 每小时整点全屏播放「选人阶段加长版」（?hourly=1 可手动触发，便于调试）
  const [isHourlyVideoOpen, setIsHourlyVideoOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('hourly') === '1';
    }
    return false;
  });

  /** 下一次整点的时间戳 */
  const [nextHourlyAt, setNextHourlyAt] = useState<number>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.getTime();
  });

  // Real-time timestamp for Beijing Time Sunday Nov 15, 2026 03:00 AM Finals countdown
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  // Align periodic slot clock to start at a 3-minute (03:00 = 180s) countdown on page load/refresh
  const [slotClockOffsetMs, setSlotClockOffsetMs] = useState<number>(() =>
    getInitialSlotClockOffsetMs(Date.now(), 180)
  );

  /**
   * 全屏影片播放期间把「宣传片倒计时 / 赛事前瞻倒计时」冻结。
   * 冻结时记住当时的 slot 时间戳，退出后把暂停的时长补进 slotClockOffsetMs，
   * 这样倒计时是从暂停处继续，而不是被跳过。
   */
  const [hourlyFrozenSlotNow, setHourlyFrozenSlotNow] = useState<number | null>(null);
  const hourlyFrozenSlotNowRef = useRef<number | null>(null);

  // Broadcast media slot playback queue (handles single slot triggers & 45min/15min coincidence priority: promo_video -> data_preview)
  const [slotQueue, setSlotQueue] = useState<BroadcastSlotQueueState>({
    activeSlot: null,
    pendingSlots: [],
  });
  const lastTriggeredSecondRef = useRef<number>(-1);

  // Carousel state (12s interval with smooth static crossfade)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isAutoPlayingSlides, setIsAutoPlayingSlides] = useState(true);

  // Director HUD visibility (allows pure OBS clean feed view)
  const [isHudMinimized, setIsHudMinimized] = useState(false);

  // ==========================================================================
  // 背景音乐：顺序循环播放（进入赛事数据前瞻时强制随机换一首）
  // ==========================================================================
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaSourceAttachedRef = useRef<boolean>(false);

  const [trackIndex, setTrackIndex] = useState(0);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.65);
  const [bgmProgressPercent, setBgmProgressPercent] = useState(0);
  const [isBgmBtnPulsing, setIsBgmBtnPulsing] = useState(false);
  const [isVolumeBtnPulsing, setIsVolumeBtnPulsing] = useState(false);
  const [waveformBars, setWaveformBars] = useState<number[]>([0.24, 0.32, 0.28, 0.34, 0.24]);

  const trackIndexRef = useRef(0);
  const wantsPlayRef = useRef(true);
  const isMutedRef = useRef(false);
  const slotQueueRef = useRef<BroadcastSlotId | null>(slotQueue.activeSlot);
  const prevSlotRef = useRef<BroadcastSlotId | null>(slotQueue.activeSlot);

  const currentTrack = BGM_PLAYLIST[trackIndex] || BGM_PLAYLIST[0];

  const triggerBgmPulse = useCallback(() => {
    setIsBgmBtnPulsing(true);
    setTimeout(() => setIsBgmBtnPulsing(false), 450);
  }, []);

  const triggerVolumePulse = useCallback(() => {
    setIsVolumeBtnPulsing(true);
    setTimeout(() => setIsVolumeBtnPulsing(false), 450);
  }, []);

  /** 初始化并连接 Web Audio API AnalyserNode 到 <audio> 元素 */
  const ensureAudioAnalyser = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;

      if (!analyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.72;
        analyserRef.current = analyser;
      }

      if (!mediaSourceAttachedRef.current && analyserRef.current) {
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
        mediaSourceAttachedRef.current = true;
      }

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {
      // Ignore if browser blocks AudioContext creation prior to gesture
    }
  }, []);

  /** 切换到指定曲目并（在允许时）自动播放 */
  const loadTrack = useCallback((index: number, autoPlay: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;
    const safeIndex =
      BGM_TRACK_COUNT > 0
        ? ((index % BGM_TRACK_COUNT) + BGM_TRACK_COUNT) % BGM_TRACK_COUNT
        : 0;
    trackIndexRef.current = safeIndex;
    setTrackIndex(safeIndex);
    setBgmProgressPercent(0);
    audio.src = BGM_PLAYLIST[safeIndex].url;
    try {
      audio.load();
    } catch {
      // ignore
    }
    if (!autoPlay) return;
    audio.play().catch(() => {
      // 自动播放被浏览器拦截时保持暂停态，首次交互后会由 unlockOnGesture 解锁
    });
  }, []);

  // Real-Time WebSocket (presence / 本地降级弹幕)
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [danmakuList, setDanmakuList] = useState<DanmakuMessage[]>([
    {
      id: 'init-1',
      text: 'BLG 冲啊！S16 总决赛为 LPL 捧杯！Knight 卓定天下！',
      author: 'LPL铁粉_阿泽',
      team: 'BLG',
      color: '#00d2ff',
      timestamp: Date.now() - 90000,
      lane: 0,
      likes: 88,
    },
    {
      id: 'init-2',
      text: 'GEN Golden Road! Chovy vs Knight 中路宿命对决太燃了！',
      author: 'LCK_Watcher',
      team: 'GEN',
      color: '#f5b800',
      timestamp: Date.now() - 60000,
      lane: 1,
      likes: 64,
    },
    {
      id: 'init-3',
      text: 'High Jump 这首 BP 战歌一响，世界赛决赛的压迫感直接拉满！',
      author: '峡谷导播员',
      team: 'NEUTRAL',
      color: '#ffffff',
      timestamp: Date.now() - 30000,
      lane: 2,
      likes: 112,
    },
    {
      id: 'init-4',
      text: 'Bin 哥信誉分拉满！上路 Kiin vs Bin 绝对是火星撞地球！',
      author: '陈泽彬粉丝',
      team: 'BLG',
      color: '#ff4d94',
      timestamp: Date.now() - 15000,
      lane: 3,
      likes: 95,
    },
  ]);
  const [showDanmakuOverlay, setShowDanmakuOverlay] = useState(true);
  const [danmakuOpacity, setDanmakuOpacity] = useState(0.95);

  const danmakuSourceRef = useRef<DanmakuSource>('local');
  const reconnectDelayRef = useRef(3000);
  const [danmakuSource, setDanmakuSource] = useState<'probing' | DanmakuSource>('probing');
  const pendingDanmakuRef = useRef<DanmakuMessage[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueDanmaku = useCallback((msg: DanmakuMessage) => {
    pendingDanmakuRef.current.push(msg);
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(() => {
      const batch = pendingDanmakuRef.current;
      pendingDanmakuRef.current = [];
      flushTimerRef.current = null;
      if (!batch.length) return;
      setDanmakuList((prev) => {
        let next = prev;
        for (const item of batch) {
          next = mergeDanmakuMessage(next, item, DANMAKU_MAX_ITEMS);
        }
        return next;
      });
    }, 400);
  }, []);

  // 1-second tick for Beijing Time Sunday 03:00 Finals Countdown + Top-Right Dual Slot Countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      const currentNow = Date.now();
      setNowMs(currentNow);

      // 全屏影片期间时钟冻结，不触发任何宣传片/前瞻
      const currentSlotNow = hourlyFrozenSlotNow ?? currentNow + slotClockOffsetMs;
      const currentSec = Math.floor(currentSlotNow / 1000);
      if (currentSec !== lastTriggeredSecondRef.current) {
        lastTriggeredSecondRef.current = currentSec;
        const promoState = calculatePromoSlotCountdown(currentSlotNow);
        const dataState = calculateDataPreviewSlotCountdown(currentSlotNow);

        const triggered: BroadcastSlotId[] = [];
        if (promoState.shouldTrigger) triggered.push('promo_video');
        if (dataState.shouldTrigger) triggered.push('data_preview');

        if (triggered.length > 0) {
          setSlotQueue((prev) => enqueueBroadcastSlots(prev, triggered));
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [slotClockOffsetMs, hourlyFrozenSlotNow]);

  // Auto-advance broadcast right-window carousel every 12 seconds with smooth 500ms static crossfade
  useEffect(() => {
    if (!isAutoPlayingSlides) return;
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % BROADCAST_SLIDES.length);
    }, 12000);
    return () => clearInterval(timer);
  }, [isAutoPlayingSlides]);

  // 音乐播放器初始化：首曲、播完自动下一首、进度同步、首次交互解锁自动播放
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = isMuted;

    loadTrack(0, true);

    const handleEnded = () => {
      loadTrack(getNextTrackIndex(trackIndexRef.current), wantsPlayRef.current);
    };
    audio.addEventListener('ended', handleEnded);

    const syncPlayState = () => {
      const playing = !audio.paused;
      setIsBgmPlaying(playing);
      if (playing) {
        ensureAudioAnalyser();
      }
    };
    audio.addEventListener('play', syncPlayState);
    audio.addEventListener('pause', syncPlayState);

    const syncProgress = () => {
      if (!audio.duration || !Number.isFinite(audio.duration) || audio.duration <= 0) {
        setBgmProgressPercent(0);
        return;
      }
      const pct = Math.min(100, Math.max(0, (audio.currentTime / audio.duration) * 100));
      setBgmProgressPercent(pct);
    };
    audio.addEventListener('timeupdate', syncProgress);
    audio.addEventListener('loadedmetadata', syncProgress);

    const unlockOnGesture = () => {
      window.removeEventListener('pointerdown', unlockOnGesture);
      setTimeout(() => {
        ensureAudioAnalyser();
        const current = audioRef.current;
        if (
          current &&
          current.paused &&
          wantsPlayRef.current &&
          !isMutedRef.current &&
          slotQueueRef.current !== 'promo_video'
        ) {
          current.play().catch(() => {});
        }
      }, 0);
    };
    window.addEventListener('pointerdown', unlockOnGesture, { once: true });

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', syncPlayState);
      audio.removeEventListener('pause', syncPlayState);
      audio.removeEventListener('timeupdate', syncProgress);
      audio.removeEventListener('loadedmetadata', syncProgress);
      window.removeEventListener('pointerdown', unlockOnGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Web Audio API 实时频谱采样循环（驱动 BGM 按钮内的 5 柱动态声波可视化）
  useEffect(() => {
    const active = isBgmPlaying && !isMuted && slotQueue.activeSlot !== 'promo_video';
    if (!active) {
      setWaveformBars([0.22, 0.3, 0.25, 0.32, 0.22]);
      return;
    }

    ensureAudioAnalyser();
    let rafId = 0;
    const freqData = new Uint8Array(32);
    const bandIndices = [1, 3, 6, 10, 15];

    const updateWaveform = (timestamp: number) => {
      const analyser = analyserRef.current;
      let hasSignal = false;
      const nextBars: number[] = [];

      if (analyser) {
        analyser.getByteFrequencyData(freqData);
        for (let i = 0; i < bandIndices.length; i++) {
          const val = freqData[bandIndices[i]] || 0;
          if (val > 4) hasSignal = true;
          nextBars.push(Math.min(1, Math.max(0.2, val / 235)));
        }
      }

      if (!hasSignal) {
        // 当 AudioContext 处于恢复过渡期时使用平滑谐波包络兜底，确保播放态声波始终灵动跳动
        const t = timestamp * 0.008;
        for (let i = 0; i < 5; i++) {
          const wave =
            0.52 +
            0.32 * Math.sin(t + i * 1.15) +
            0.14 * Math.cos(t * 1.7 - i * 0.8);
          nextBars.push(Math.min(1, Math.max(0.2, wave)));
        }
      }

      setWaveformBars(nextBars);
      rafId = requestAnimationFrame(updateWaveform);
    };

    rafId = requestAnimationFrame(updateWaveform);
    return () => cancelAnimationFrame(rafId);
  }, [isBgmPlaying, isMuted, slotQueue.activeSlot, ensureAudioAnalyser]);

  // 音量 / 静音同步
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    isMutedRef.current = isMuted;
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    slotQueueRef.current = slotQueue.activeSlot;
  }, [slotQueue.activeSlot]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const slot = slotQueue.activeSlot;
    const prev = prevSlotRef.current;
    if (slot === prev) return;
    prevSlotRef.current = slot;

    if (slot === 'promo_video') {
      if (!audio.paused) audio.pause();
      setIsBgmPlaying(false);
      return;
    }

    if (slot === 'data_preview') {
      const nextIndex = getRandomDifferentTrackIndex(trackIndexRef.current);
      if (!isMutedRef.current) {
        wantsPlayRef.current = true;
      }
      loadTrack(nextIndex, wantsPlayRef.current && !isMutedRef.current);
      return;
    }

    if (prev === 'promo_video' || prev === 'data_preview') {
      const nextIndex = getRandomDifferentTrackIndex(trackIndexRef.current);
      if (!isMutedRef.current) {
        wantsPlayRef.current = true;
      }
      loadTrack(nextIndex, wantsPlayRef.current && !isMutedRef.current);
    }
  }, [slotQueue.activeSlot, loadTrack]);

  const toggleBgmPlay = useCallback(() => {
    triggerBgmPulse();
    ensureAudioAnalyser();
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      wantsPlayRef.current = true;
      if (isMutedRef.current) {
        setIsMuted(false);
        isMutedRef.current = false;
        audio.muted = false;
      }
      audio
        .play()
        .then(() => setIsBgmPlaying(true))
        .catch(() => {});
    } else {
      wantsPlayRef.current = false;
      audio.pause();
      setIsBgmPlaying(false);
    }
  }, [triggerBgmPulse, ensureAudioAnalyser]);

  const handleNextTrack = useCallback(() => {
    triggerBgmPulse();
    ensureAudioAnalyser();
    const nextIndex = getNextTrackIndex(trackIndexRef.current);
    wantsPlayRef.current = true;
    loadTrack(nextIndex, !isMutedRef.current);
  }, [triggerBgmPulse, ensureAudioAnalyser, loadTrack]);

  const toggleMute = useCallback(() => {
    triggerVolumePulse();
    ensureAudioAnalyser();
    const nextMuted = !isMutedRef.current;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
      if (
        !nextMuted &&
        audioRef.current.paused &&
        wantsPlayRef.current &&
        slotQueueRef.current !== 'promo_video'
      ) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [triggerVolumePulse, ensureAudioAnalyser]);

  /** 全局快捷键监听：Space 播放/暂停音乐，M 静音/取消静音，H 隐藏/显示底部导播栏 */
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable ||
          (tag === 'INPUT' && (target as HTMLInputElement).type !== 'range')
        ) {
          return;
        }
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        toggleBgmPlay();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setIsHudMinimized((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggleBgmPlay, toggleMute]);

  /** 进场前 PreloadGateScreen 专用：一键切换进场音频播放/静音 */
  const handlePreloadAudioToggle = useCallback(() => {
    triggerVolumePulse();
    triggerBgmPulse();
    ensureAudioAnalyser();
    const nextMuted = !isMutedRef.current;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = nextMuted;
    if (nextMuted) {
      wantsPlayRef.current = false;
      if (!audio.paused) audio.pause();
      setIsBgmPlaying(false);
    } else {
      wantsPlayRef.current = true;
      if (slotQueueRef.current !== 'promo_video') {
        audio
          .play()
          .then(() => setIsBgmPlaying(true))
          .catch(() => {});
      }
    }
  }, [triggerBgmPulse, triggerVolumePulse, ensureAudioAnalyser]);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) audioRef.current.volume = newVol;
    if (newVol > 0 && isMuted) {
      if (audioRef.current) audioRef.current.muted = false;
      setIsMuted(false);
      isMutedRef.current = false;
      triggerVolumePulse();
    }
  };

  // ==========================================================================
  // 弹幕数据源：优先 Supabase（线上多人共享），失败自动降级本地 WebSocket
  // ==========================================================================
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      const rows = await fetchRecentDanmaku();
      if (cancelled) return;
      if (rows) {
        danmakuSourceRef.current = 'supabase';
        setDanmakuSource('supabase');
        if (rows.length > 0) setDanmakuList(rows);
        unsubscribe = subscribeDanmaku({
          onInsert: queueDanmaku,
          onUpdate: queueDanmaku,
          onPresence: (count) => setOnlineCount(count),
          onReady: () => setIsConnected(true),
        });
      } else {
        danmakuSourceRef.current = 'local';
        setDanmakuSource('local');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, [queueDanmaku]);

  useEffect(() => {
    if (danmakuSource !== 'local') return;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;

    const connectWs = () => {
      if (isUnmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isUnmounted) {
          setIsConnected(true);
          reconnectDelayRef.current = 3000;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'init') {
            if (danmakuSourceRef.current === 'local' && Array.isArray(data.danmaku)) {
              setDanmakuList(data.danmaku);
            }
            if (typeof data.onlineCount === 'number') setOnlineCount(data.onlineCount);
          } else if (data.type === 'danmaku:created' && data.message) {
            if (danmakuSourceRef.current === 'local') {
              queueDanmaku(data.message);
            }
          } else if (data.type === 'danmaku:updated' && data.message) {
            if (danmakuSourceRef.current === 'local') {
              queueDanmaku(data.message);
            }
          } else if (data.type === 'presence:updated' && typeof data.onlineCount === 'number') {
            setOnlineCount(data.onlineCount);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!isUnmounted) {
          setIsConnected(false);
          reconnectTimer = setTimeout(connectWs, reconnectDelayRef.current);
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWs();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [queueDanmaku, danmakuSource]);

  // Optimistic + Anti-Overlap Lane Selection + Supabase/Server-synced Danmaku creation
  const handleSendDanmaku = useCallback(
    (payload: {
      text: string;
      author: string;
      team: 'GEN' | 'BLG' | 'NEUTRAL';
      color: string;
    }) => {
      const now = Date.now();
      const id = `dm-${now}-${Math.random().toString(36).slice(2, 7)}`;

      setDanmakuList((prev) => {
        // 使用防重叠轨道算法挑选当前最空闲的弹幕轨道
        const lane = selectLeastCrowdedDanmakuLane(prev, now, DANMAKU_LANE_COUNT);
        const optimisticMsg: DanmakuMessage = {
          id,
          text: payload.text,
          author: payload.author,
          team: payload.team,
          color: payload.color,
          timestamp: now,
          lane,
          likes: 1,
        };

        if (danmakuSourceRef.current === 'supabase') {
          insertDanmaku(optimisticMsg).then((ok) => {
            if (ok) return;
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'danmaku:create',
                  id,
                  text: payload.text,
                  author: payload.author,
                  team: payload.team,
                  color: payload.color,
                  lane,
                })
              );
            }
          });
        } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'danmaku:create',
              id,
              text: payload.text,
              author: payload.author,
              team: payload.team,
              color: payload.color,
              lane,
            })
          );
        } else {
          fetch('/api/danmaku', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              text: payload.text,
              author: payload.author,
              team: payload.team,
              color: payload.color,
              lane,
            }),
          }).catch(() => {});
        }

        return mergeDanmakuMessage(prev, optimisticMsg, DANMAKU_MAX_ITEMS);
      });
    },
    []
  );

  const handleLikeDanmaku = useCallback((id: string) => {
    setDanmakuList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, likes: m.likes + 1 } : m))
    );
    if (danmakuSourceRef.current === 'supabase') {
      likeDanmaku(id);
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'danmaku:like', id }));
    }
  }, []);

  // Slot trigger handlers
  const handleTriggerSlot = useCallback((slotId: BroadcastSlotId) => {
    setSlotQueue((prev) => enqueueBroadcastSlots(prev, [slotId]));
  }, []);

  const handleTriggerCoincidentSlots = useCallback(() => {
    setSlotQueue({
      activeSlot: null,
      pendingSlots: [],
    });
    setTimeout(() => {
      setSlotQueue(
        enqueueBroadcastSlots({ activeSlot: null, pendingSlots: [] }, ['data_preview', 'promo_video'])
      );
    }, 20);
  }, []);

  const handleCompleteActiveSlot = useCallback(() => {
    setSlotQueue((prev) => advanceBroadcastSlotQueue(prev));
  }, []);

  const handleCloseAllSlots = useCallback(() => {
    setSlotQueue({ activeSlot: null, pendingSlots: [] });
  }, []);

  // 到点自动弹出全屏影片；播完/退出后重新计算下一个整点
  useEffect(() => {
    const delay = nextHourlyAt - Date.now();
    if (delay <= 0) {
      const d = new Date();
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() + 1);
      setNextHourlyAt(d.getTime());
      return;
    }
    const timer = setTimeout(() => {
      setIsHourlyVideoOpen(true);
      const d = new Date();
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() + 1);
      setNextHourlyAt(d.getTime());
    }, delay);
    return () => clearTimeout(timer);
  }, [nextHourlyAt]);

  // 全屏影片开始 → 冻结两个倒计时并清空正在播的 slot；结束 → 把暂停时长补回时钟
  useEffect(() => {
    if (isHourlyVideoOpen) {
      const frozen = Date.now() + slotClockOffsetMs;
      hourlyFrozenSlotNowRef.current = frozen;
      setHourlyFrozenSlotNow(frozen);
      // 正在播的宣传片 / 赛事前瞻先收掉，避免被全屏影片盖住还在后台跑
      setSlotQueue({ activeSlot: null, pendingSlots: [] });
      return;
    }
    if (hourlyFrozenSlotNowRef.current !== null) {
      // 让 slotNowMs 精确等于冻结值：offset = 冻结值 - 当前真实时间
      // （不能用「累加暂停时长」，那会让倒计时多跳一个暂停时长）
      setSlotClockOffsetMs(hourlyFrozenSlotNowRef.current - Date.now());
      hourlyFrozenSlotNowRef.current = null;
      setHourlyFrozenSlotNow(null);
    }
    // 只在开关变化时执行；slotClockOffsetMs 用闭包捕获的最新值即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHourlyVideoOpen]);

  // 全屏影片期间让位给影片原声：暂停战歌，关闭后恢复
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isHourlyVideoOpen) {
      wantsPlayRef.current = false;
      if (!audio.paused) audio.pause();
    } else if (slotQueueRef.current !== 'promo_video' && !isMutedRef.current) {
      wantsPlayRef.current = true;
      audio.play().catch(() => {});
    }
  }, [isHourlyVideoOpen]);

  const isBgmActive = isBgmPlaying && slotQueue.activeSlot !== 'promo_video';

  const slotNowMs = hourlyFrozenSlotNow ?? nowMs + slotClockOffsetMs;
  const activeCountdown = calculateFinalsCountdown(nowMs, getFinalsTargetTimestamp());
  const promoCountdown = calculatePromoSlotCountdown(slotNowMs);
  const dataPreviewCountdown = calculateDataPreviewSlotCountdown(slotNowMs);

  return (
    <main
      id="broadcast-monitor"
      className="min-h-screen md:h-screen w-full bg-[#000312] text-slate-100 flex flex-col md:items-center md:justify-center overflow-x-hidden md:overflow-hidden relative"
    >
      {/* 游戏式进场前资源预加载门控界面 */}
      {!isPreloadComplete && (
        <PreloadGateScreen
          onReady={() => setIsPreloadComplete(true)}
          audioEnabled={!isMuted}
          onToggleAudio={handlePreloadAudioToggle}
        />
      )}

      {/* 单一音频元素：战歌顺序循环 */}
      <audio ref={audioRef} preload="auto" />

      {/* 每小时整点全屏播放的选人阶段加长版（左上角保留决赛倒计时，右上角可退出） */}
      <HourlyVideoOverlay
        isOpen={isHourlyVideoOpen}
        onClose={() => setIsHourlyVideoOpen(false)}
        countdownDisplay={activeCountdown.primaryDisplay}
      />

      {/* =====================================================================
          PURE 16:9 BROADCAST WAITING SCREEN (GEN vs BLG · FINALS)
          With smooth fade-in transition upon PreloadGateScreen completion
         ===================================================================== */}
      <div
        data-testid="broadcast-stage-fade-wrapper"
        className={`w-full flex flex-col md:items-center md:justify-center transition-opacity duration-700 ${
          isPreloadComplete ? 'animate-stage-fade-in opacity-100' : 'opacity-0'
        }`}
      >
        <BroadcastStage
          countdown={activeCountdown}
          isHourlyVideoActive={isHourlyVideoOpen}
          promoCountdown={promoCountdown}
          dataPreviewCountdown={dataPreviewCountdown}
          slotQueue={slotQueue}
          onTriggerSlot={handleTriggerSlot}
          onTriggerCoincidentSlots={handleTriggerCoincidentSlots}
          onCompleteActiveSlot={handleCompleteActiveSlot}
          onCloseAllSlots={handleCloseAllSlots}
          slides={BROADCAST_SLIDES}
          activeSlideIndex={activeSlideIndex}
          onSelectSlide={(idx) => setActiveSlideIndex(idx)}
          isAutoPlayingSlides={isAutoPlayingSlides}
          onToggleAutoPlaySlides={() => setIsAutoPlayingSlides((prev) => !prev)}
          danmakuList={danmakuList}
          showDanmakuOverlay={showDanmakuOverlay}
          danmakuOpacity={danmakuOpacity}
        />
      </div>

      {/* =====================================================================
          FLOATING BROADCAST DIRECTOR HUD & REAL-TIME DANMAKU PLUGIN DOCK
         ===================================================================== */}
      {isHudMinimized ? (
        <button
          type="button"
          onClick={() => setIsHudMinimized(false)}
          title="展开导播控制台与弹幕条 (快捷键: H)"
          aria-label="展开导播控制台与弹幕条"
          className="fixed bottom-3 left-3 z-40 inline-flex items-center gap-1.5 rounded-lg bg-[#03081c]/85 hover:bg-[#0051ff] border border-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md shadow-lg transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#00d2ff]" />
          <span>导播台与弹幕 (H)</span>
        </button>
      ) : (
        <section
          aria-label="导播台悬浮控制栏与实时弹幕插件"
          className="w-full md:fixed md:bottom-2.5 md:left-3 md:right-3 z-[48] flex flex-col gap-1.5 px-2.5 py-2 md:p-0 pointer-events-none"
        >
          {/* Recharts 赛前数据统计弹出面板（按需加载，未打开时不下载图表库） */}
          {isPreMatchStatsOpen && (
            <Suspense
              fallback={
                <div className="pointer-events-auto mb-2 flex items-center gap-2 rounded-xl border border-[#0051ff]/40 bg-[#03081c]/95 px-3 py-2 text-[11px] font-bold text-slate-300">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/25 border-t-[#00d2ff]" />
                  赛前数据加载中…
                </div>
              }
            >
              <PreMatchStatsPanel isOpen onClose={() => setIsPreMatchStatsOpen(false)} />
            </Suspense>
          )}

          <div className="flex flex-col xl:flex-row items-stretch xl:items-end justify-between gap-2">
            {/* Left Pill: BGM Loop + Pre-Match Stats Toggle + Beijing Time Sunday 03:00 Finals Info */}
            <div className="pointer-events-auto flex flex-wrap lg:flex-nowrap items-center gap-1.5 rounded-xl border border-[#0051ff]/40 bg-[#03081c]/90 backdrop-blur-md px-2.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
              {/* BGM Play/Pause with Toggle Pulse, Dynamic Waveform Visualizer & Bottom Track Progress Bar */}
              <button
                type="button"
                data-testid="bgm-toggle-btn"
                onClick={toggleBgmPlay}
                title={`${currentTrack.subtitle} · 进度 ${Math.round(bgmProgressPercent)}% (快捷键: Space)`}
                className={`relative overflow-hidden inline-flex items-center gap-1.5 px-2.5 pt-1 pb-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isBgmBtnPulsing ? 'animate-control-pulse' : ''
                } ${
                  isBgmActive
                    ? 'bg-[#00d2ff] text-slate-950 shadow-[0_0_14px_rgba(0,210,255,0.4)]'
                    : 'bg-[#0051ff] hover:bg-[#0066ff] text-white'
                }`}
              >
                {isBgmActive ? (
                  <Pause className="w-3 h-3 shrink-0" />
                ) : (
                  <Play className="w-3 h-3 shrink-0" />
                )}

                {/* Web Audio API Real-Time Frequency Waveform Visualizer */}
                <span
                  data-testid="bgm-waveform-visualizer"
                  aria-hidden="true"
                  className="inline-flex items-end gap-[2px] h-3.5 px-0.5 shrink-0"
                >
                  {waveformBars.map((ratio, idx) => {
                    const heightPx = Math.max(3, Math.round(ratio * 13));
                    return (
                      <span
                        key={idx}
                        style={{ height: `${heightPx}px` }}
                        className={`w-[2.5px] rounded-full transition-[height] duration-75 ${
                          isBgmActive && !isMuted
                            ? 'bg-slate-950'
                            : 'bg-white/45'
                        }`}
                      />
                    );
                  })}
                </span>

                <span>
                  {isBgmActive ? '战歌播放中' : '播放战歌'} · {currentTrack.title}
                  <span className="opacity-70 ml-1">
                    {trackIndex + 1}/{BGM_TRACK_COUNT}
                  </span>
                </span>

                {/* Bottom Track Playback Progress Bar */}
                <span
                  data-testid="bgm-track-progress-bar"
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] bg-black/35 overflow-hidden"
                >
                  <span
                    style={{ width: `${bgmProgressPercent}%` }}
                    className={`block h-full transition-[width] duration-300 ${
                      isBgmActive
                        ? 'bg-slate-950/85'
                        : 'bg-gradient-to-r from-[#00d2ff] to-white'
                    }`}
                  />
                </span>
              </button>

              {/* Next Track */}
              <button
                type="button"
                onClick={handleNextTrack}
                aria-label="下一首战歌"
                title="切到下一首战歌"
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 shrink-0 cursor-pointer transition-transform active:scale-95"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              {/* Mute & Volume with Toggle Pulse */}
              <button
                type="button"
                data-testid="volume-mute-btn"
                onClick={toggleMute}
                title={isMuted ? '取消静音 (快捷键: M)' : '静音背景音乐 (快捷键: M)'}
                aria-label={isMuted ? '取消静音' : '静音背景音乐'}
                className={`p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 shrink-0 cursor-pointer transition-all ${
                  isVolumeBtnPulsing ? 'animate-control-pulse border-[#00d2ff]/70' : ''
                }`}
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-[#00d2ff]" />
                )}
              </button>
              <input
                type="range"
                aria-label="背景音乐音量调节"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 accent-[#00d2ff] cursor-pointer hidden sm:block shrink-0"
              />

              <div className="h-4 w-[1px] bg-white/15 mx-0.5 hidden sm:block" />

              {/* Quick Toggle Button for Pre-Match Statistics Panel (Recharts) */}
              <button
                type="button"
                data-testid="toggle-pre-match-stats-btn"
                onClick={() => setIsPreMatchStatsOpen((prev) => !prev)}
                aria-expanded={isPreMatchStatsOpen}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isPreMatchStatsOpen
                    ? 'bg-[#f5b800] text-slate-950 border-[#f5b800] shadow-[0_0_14px_rgba(245,184,0,0.45)]'
                    : 'bg-[#001861]/90 hover:bg-[#002b99] text-[#00d2ff] hover:text-white border-[#00d2ff]/45'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span>赛前数据统计</span>
              </button>

              {/* Official Beijing Time Sunday 03:00 AM Finals Time Badge */}
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#001861]/90 border border-[#0051ff]/50 text-[11px] font-bold text-white whitespace-nowrap shrink-0">
                <Calendar className="w-3 h-3 text-[#00d2ff] shrink-0" />
                <span>北京时间 11月15日 (周日) 03:00 决赛</span>
              </div>

              {/* Hide HUD button for pure OBS feed */}
              <button
                type="button"
                onClick={() => setIsHudMinimized(true)}
                title="隐藏底部控制台（纯净导播流模式）"
                aria-label="隐藏底部控制台"
                className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 cursor-pointer ml-auto sm:ml-0"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Widget: Real-Time Danmaku Launcher & Interactive Drawer */}
            <DanmakuPlugin
              danmakuList={danmakuList}
              onlineCount={onlineCount}
              isConnected={isConnected}
              showDanmakuOverlay={showDanmakuOverlay}
              onToggleDanmakuOverlay={() => setShowDanmakuOverlay((prev) => !prev)}
              danmakuOpacity={danmakuOpacity}
              onChangeDanmakuOpacity={setDanmakuOpacity}
              onSendDanmaku={handleSendDanmaku}
              onLikeDanmaku={handleLikeDanmaku}
            />
          </div>
        </section>
      )}
    </main>
  );
}
