import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  SlidersHorizontal,
  EyeOff,
  SkipForward,
  Trophy,
} from 'lucide-react';
import { BroadcastStage } from './components/BroadcastStage';
import { DanmakuPlugin } from './components/DanmakuPlugin';
import { PreloadGateScreen } from './components/PreloadGateScreen';
import { VerticalIntroGate } from './components/VerticalIntroGate';
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
  DANMAKU_FONT_SIZE_DEFAULT_PX,
  clampDanmakuFontSize,
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

/** 0 秒倒计时 / 夺冠海报页锁定的专属战歌：MR. nobody */
const ZERO_FLAG_TRACK_INDEX = Math.max(
  0,
  BGM_PLAYLIST.findIndex((t) => t.id === 'mr-nobody')
);

export default function App() {
  // 游戏式进场前资源预加载门控（支持 ?skipPreload=1 快捷跳过）
  const [isPreloadComplete, setIsPreloadComplete] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('skipPreload') === '1';
    }
    return false;
  });

  /** 首屏强制竖屏弹窗（YOU KNOW THEIR NAMES · BLG）是否已播完，播完才进入主页 */
  const [isVerticalIntroDone, setIsVerticalIntroDone] = useState<boolean>(false);
  /** 加载页整段下载完的开场片 blob 地址，交给竖屏页秒开 */
  const [introVideoSrc, setIntroVideoSrc] = useState<string | undefined>(undefined);

  // 导播控制台「夺冠海报」切换控制（默认 'hide' 展示 BLG夺冠黄金之路主导播台，可手动切换 'show'）
  const [zeroStageOverride, setZeroStageOverride] = useState<'auto' | 'show' | 'hide'>('hide');

  // Real-time timestamp for Finals clock reference
  const [nowMs] = useState<number>(() => Date.now());
  // Align periodic slot clock to start at a 3-minute (03:00 = 180s) countdown on page load/refresh
  const [slotClockOffsetMs] = useState<number>(() =>
    getInitialSlotClockOffsetMs(Date.now(), 180)
  );

  // Broadcast media slot playback queue (handles single slot triggers & promo_video -> data_preview priority)
  const [slotQueue, setSlotQueue] = useState<BroadcastSlotQueueState>({
    activeSlot: null,
    pendingSlots: [],
  });

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
  const isZeroFlagModeRef = useRef<boolean>(false);
  const prevTrackBeforeZeroRef = useRef<number | null>(null);
  /** 竖屏开场片是否正在挡在主页前面（此期间背景音乐必须让位给片中原声） */
  const introGateActiveRef = useRef(false);

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
      text: '恭喜 BLG 3:1 击败 GEN 勇夺 2026 英雄联盟全球总决赛冠军！为信念干杯！',
      author: 'LPL铁粉_阿泽',
      team: 'BLG',
      color: '#f5d5a7',
      timestamp: Date.now() - 90000,
      lane: 0,
      likes: 188,
    },
    {
      id: 'init-2',
      text: '从十六强 HLE、八强 DK、四强 T1 到决赛 GEN，BLG 一穿四 LCK 铸就黄金之路！',
      author: '峡谷金雨见证人',
      team: 'BLG',
      color: '#00d2ff',
      timestamp: Date.now() - 60000,
      lane: 1,
      likes: 164,
    },
    {
      id: 'init-3',
      text: 'Knight 卓定天下！黄金左手与兄弟们捧起 2026 全球总决赛召唤师奖杯！',
      author: '黄金左手护卫队',
      team: 'BLG',
      color: '#ff4d94',
      timestamp: Date.now() - 30000,
      lane: 2,
      likes: 152,
    },
    {
      id: 'init-4',
      text: 'Bin / Xun / Knight / Viper / ON 首发五虎全勤出击，2026 全球总决赛登峰造极！',
      author: '陈泽彬粉丝',
      team: 'BLG',
      color: '#f5b800',
      timestamp: Date.now() - 15000,
      lane: 3,
      likes: 135,
    },
  ]);
  const [showDanmakuOverlay, setShowDanmakuOverlay] = useState(true);
  const [danmakuOpacity, setDanmakuOpacity] = useState(0.95);
  const [danmakuFontSize, setDanmakuFontSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('blg_s16_danmaku_font_size');
      if (saved) {
        return clampDanmakuFontSize(Number(saved));
      }
    }
    return DANMAKU_FONT_SIZE_DEFAULT_PX;
  });

  const handleChangeDanmakuFontSize = useCallback((sizePx: number) => {
    const clamped = clampDanmakuFontSize(sizePx);
    setDanmakuFontSize(clamped);
    try {
      window.localStorage.setItem('blg_s16_danmaku_font_size', String(clamped));
    } catch {
      // ignore storage errors
    }
  }, []);

  const danmakuSourceRef = useRef<DanmakuSource>('local');
  const reconnectDelayRef = useRef(3000);
  const [danmakuSource, setDanmakuSource] = useState<'probing' | DanmakuSource>('probing');
  const pendingDanmakuRef = useRef<DanmakuMessage[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueDanmaku = useCallback((msg: DanmakuMessage) => {
    if (msg.team !== 'BLG') return;
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

  // 所有倒计时已取消（不再按倒计时自动打断画面，宣传片与赛事前瞻仅通过右上角按钮手动点播）

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
      if (isZeroFlagModeRef.current) {
        loadTrack(ZERO_FLAG_TRACK_INDEX, wantsPlayRef.current);
        return;
      }
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
          !introGateActiveRef.current &&
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

  /**
   * 竖屏开场片（首次进入）挡在主页前面时，背景音乐必须让位：
   * 否则观众会同时听到战歌和片中原声，完全听不清前导片在说什么。
   * 片尾结束后再恢复战歌。
   */
  useEffect(() => {
    const active = isPreloadComplete && !isVerticalIntroDone;
    introGateActiveRef.current = active;
    const audio = audioRef.current;
    if (!audio) return;
    if (active) {
      audio.pause();
      return;
    }
    if (isPreloadComplete && wantsPlayRef.current && !isMutedRef.current && audio.paused) {
      void audio.play().catch(() => {});
    }
  }, [isPreloadComplete, isVerticalIntroDone]);

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
      const nextIndex = isZeroFlagModeRef.current
        ? ZERO_FLAG_TRACK_INDEX
        : getRandomDifferentTrackIndex(trackIndexRef.current);
      if (!isMutedRef.current) {
        wantsPlayRef.current = true;
      }
      loadTrack(nextIndex, wantsPlayRef.current && !isMutedRef.current);
      return;
    }

    if (prev === 'promo_video' || prev === 'data_preview') {
      const nextIndex = isZeroFlagModeRef.current
        ? ZERO_FLAG_TRACK_INDEX
        : getRandomDifferentTrackIndex(trackIndexRef.current);
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
    if (isZeroFlagModeRef.current) {
      wantsPlayRef.current = true;
      loadTrack(ZERO_FLAG_TRACK_INDEX, !isMutedRef.current);
      return;
    }
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
        if (rows.length > 0) {
          setDanmakuList((prev) => {
            let next = rows;
            for (const seed of prev) {
              next = mergeDanmakuMessage(next, seed, DANMAKU_MAX_ITEMS);
            }
            return next;
          });
        }
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
              const blgOnly = (data.danmaku as DanmakuMessage[]).filter(
                (m) => m.team === 'BLG'
              );
              if (blgOnly.length > 0) {
                setDanmakuList(blgOnly);
              }
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

  const isBgmActive = isBgmPlaying && slotQueue.activeSlot !== 'promo_video';

  const slotNowMs = nowMs + slotClockOffsetMs;
  const activeCountdown = calculateFinalsCountdown(nowMs, getFinalsTargetTimestamp());
  const promoCountdown = calculatePromoSlotCountdown(slotNowMs);
  const dataPreviewCountdown = calculateDataPreviewSlotCountdown(slotNowMs);
  const isZeroFlagMode =
    zeroStageOverride === 'show'
      ? true
      : zeroStageOverride === 'hide'
      ? false
      : activeCountdown.isZero;

  // 当倒计时变成 0 秒（或开启 0 秒开赛画面预览）时，自动关闭子插播页并将背景音乐锁定为 MR. nobody
  useEffect(() => {
    const wasZero = isZeroFlagModeRef.current;
    isZeroFlagModeRef.current = isZeroFlagMode;

    if (isZeroFlagMode && !wasZero) {
      prevTrackBeforeZeroRef.current = trackIndexRef.current;
      setSlotQueue({ activeSlot: null, pendingSlots: [] });
      ensureAudioAnalyser();
      wantsPlayRef.current = true;
      if (
        trackIndexRef.current !== ZERO_FLAG_TRACK_INDEX ||
        audioRef.current?.paused
      ) {
        loadTrack(ZERO_FLAG_TRACK_INDEX, !isMutedRef.current);
      }
    } else if (!isZeroFlagMode && wasZero && prevTrackBeforeZeroRef.current !== null) {
      const restoreIdx = prevTrackBeforeZeroRef.current;
      prevTrackBeforeZeroRef.current = null;
      if (restoreIdx !== ZERO_FLAG_TRACK_INDEX) {
        loadTrack(restoreIdx, wantsPlayRef.current && !isMutedRef.current);
      }
    }
  }, [isZeroFlagMode, loadTrack, ensureAudioAnalyser]);

  return (
    <main
      id="broadcast-monitor"
      className="min-h-screen md:h-screen w-full bg-[#060504] text-slate-100 flex flex-col md:items-center md:justify-center overflow-x-hidden md:overflow-hidden relative"
    >
      {/* 游戏式进场前资源预加载门控界面 */}
      {isPreloadComplete && !isVerticalIntroDone && (
        <VerticalIntroGate
          src={introVideoSrc}
          onDone={() => setIsVerticalIntroDone(true)}
        />
      )}

      {!isPreloadComplete && (
        <PreloadGateScreen
          onReady={(introUrl) => {
            setIntroVideoSrc(introUrl);
            setIsPreloadComplete(true);
          }}
          audioEnabled={!isMuted}
          onToggleAudio={handlePreloadAudioToggle}
        />
      )}

      {/* 单一音频元素：战歌顺序循环 */}
      <audio ref={audioRef} preload="auto" />

      {/* =====================================================================
          PURE 16:9 BROADCAST WAITING SCREEN (GEN vs BLG · GRAND FINAL)
          With smooth fade-in transition upon PreloadGateScreen completion
         ===================================================================== */}
      <div
        data-testid="broadcast-stage-fade-wrapper"
        className={`w-full flex flex-col md:items-center md:justify-center transition-opacity duration-700 ${
          isPreloadComplete ? 'animate-stage-fade-in opacity-100' : 'opacity-0'
        }`}
      >
        {/* 竖屏开场片播完才挂载导播台：
            否则十几个 <video> 会和开场片抢硬件解码器，导致开场片卡住不动 */}
        {isVerticalIntroDone && (
        <BroadcastStage
          countdown={activeCountdown}
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
          danmakuFontSize={danmakuFontSize}
          isZeroFlagPreview={isZeroFlagMode}
          onExitZeroFlagPreview={() => setZeroStageOverride('hide')}
          isHudMinimized={isHudMinimized}
        />
        )}
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
          className="fixed bottom-3 left-3 z-40 inline-flex items-center gap-1.5 rounded-lg bg-[#120e09]/90 hover:bg-[#3b2e1e] border border-[#c8aa78]/40 px-3 py-1.5 text-xs font-bold text-[#f5d5a7] backdrop-blur-md shadow-lg transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#f5d5a7]" />
          <span>导播台与弹幕 (H)</span>
        </button>
      ) : (
        <section
          aria-label="导播台悬浮控制栏与实时弹幕插件"
          className="w-full md:fixed md:bottom-2.5 md:left-3 md:right-3 z-[48] flex flex-col gap-1.5 px-2.5 py-2 md:p-0 pointer-events-none"
        >
          <div className="flex flex-col xl:flex-row items-stretch xl:items-end justify-between gap-2">
            {/* Left Pill: BGM Loop + BLG Champions Poster Toggle */}
            <div className="pointer-events-auto flex flex-wrap lg:flex-nowrap items-center gap-1.5 rounded-xl border border-[#c8aa78]/40 bg-[#120e09]/92 backdrop-blur-md px-2.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.85)]">
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
                    ? 'bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] text-[#14100a] shadow-[0_0_14px_rgba(245,213,167,0.35)]'
                    : 'bg-[#2a2015] hover:bg-[#3b2e1e] text-[#f5d5a7] border border-[#c8aa78]/35'
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
                            ? 'bg-[#14100a]'
                            : 'bg-[#f5d5a7]/50'
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
                        ? 'bg-[#14100a]/85'
                        : 'bg-gradient-to-r from-[#d4b483] to-[#f5d5a7]'
                    }`}
                  />
                </span>
              </button>

              {/* Next Track (disabled when locked to MR. nobody in Champions Poster mode) */}
              <button
                type="button"
                onClick={handleNextTrack}
                disabled={isZeroFlagMode}
                aria-label={isZeroFlagMode ? '夺冠海报模式已固定播放战歌 MR. nobody' : '下一首战歌'}
                title={isZeroFlagMode ? '夺冠海报画面已固定播放背景音乐 MR. nobody' : '切到下一首战歌'}
                className={`p-1 rounded-lg bg-[#1c160f] text-[#f5d5a7] border border-[#c8aa78]/25 shrink-0 transition-transform ${
                  isZeroFlagMode
                    ? 'opacity-45 cursor-not-allowed'
                    : 'hover:bg-[#2b2217] cursor-pointer active:scale-95'
                }`}
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
                className={`p-1 rounded-lg bg-[#1c160f] hover:bg-[#2b2217] text-slate-200 border border-[#c8aa78]/25 shrink-0 cursor-pointer transition-all ${
                  isVolumeBtnPulsing ? 'animate-control-pulse border-[#f5d5a7]/80' : ''
                }`}
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-[#f5d5a7]" />
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
                className="w-14 accent-[#d4b483] cursor-pointer hidden sm:block shrink-0"
              />

              <div className="h-4 w-[1px] bg-[#c8aa78]/25 mx-0.5 hidden sm:block" />

              {/* Quick Toggle Button for Full-Screen BLG Champions Poster + Golden Confetti */}
              <button
                type="button"
                data-testid="toggle-zero-flag-preview-btn"
                onClick={() => {
                  const enteringChampionsStage = !isZeroFlagMode;
                  setZeroStageOverride(enteringChampionsStage ? 'show' : 'hide');
                  if (enteringChampionsStage) {
                    ensureAudioAnalyser();
                    wantsPlayRef.current = true;
                    if (isMutedRef.current) {
                      setIsMuted(false);
                      isMutedRef.current = false;
                      if (audioRef.current) audioRef.current.muted = false;
                    }
                    loadTrack(ZERO_FLAG_TRACK_INDEX, true);
                  }
                }}
                aria-pressed={isZeroFlagMode}
                title="切换全屏 BLG 夺冠海报与庆祝金色彩带动画（固定播放战歌 MR. nobody）"
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isZeroFlagMode
                    ? 'bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] text-[#14100a] border-[#f5d5a7] shadow-[0_0_14px_rgba(245,213,167,0.55)]'
                    : 'bg-[#1c160f]/95 hover:bg-[#2b2217] text-[#f5d5a7] hover:text-white border-[#c8aa78]/45'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 shrink-0" />
                <span>{isZeroFlagMode ? '退出夺冠海报' : '夺冠海报'}</span>
              </button>

              {/* Hide HUD button for pure OBS feed */}
              <button
                type="button"
                onClick={() => setIsHudMinimized(true)}
                title="隐藏底部控制台（纯净导播流模式）"
                aria-label="隐藏底部控制台"
                className="p-1 rounded-md bg-[#1c160f] hover:bg-[#2b2217] text-[#c8aa78] hover:text-white border border-[#c8aa78]/25 cursor-pointer ml-auto sm:ml-0"
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
              danmakuFontSize={danmakuFontSize}
              onChangeDanmakuFontSize={handleChangeDanmakuFontSize}
              onSendDanmaku={handleSendDanmaku}
              onLikeDanmaku={handleLikeDanmaku}
            />
          </div>
        </section>
      )}
    </main>
  );
}
