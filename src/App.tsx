import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Calendar,
  SlidersHorizontal,
  EyeOff,
  SkipForward,
} from 'lucide-react';
import { BroadcastStage } from './components/BroadcastStage';
import { DanmakuPlugin } from './components/DanmakuPlugin';
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
  // Real-time timestamp for Beijing Time Sunday Nov 15, 2026 03:00 AM Finals countdown
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  // Align periodic slot clock to start at a 3-minute (03:00 = 180s) countdown on page load/refresh
  const [slotClockOffsetMs] = useState<number>(() =>
    getInitialSlotClockOffsetMs(Date.now(), 180)
  );

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
  // 背景音乐：8 首战歌顺序循环播放（进入赛事数据前瞻时强制随机换一首）
  // ==========================================================================
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.65);

  // 当前曲目下标（用 ref 保存，供 ended / 切页回调读取最新值）
  const trackIndexRef = useRef(0);
  // 用户是否希望有声音（暂停/静音/宣传片期间为 false）
  const wantsPlayRef = useRef(true);
  // 当前播报 slot（供音乐解锁回调读取最新值）
  const slotQueueRef = useRef<BroadcastSlotId | null>(slotQueue.activeSlot);
  // 上一帧的 slot（用于判断「刚进入」某个页面）
  const prevSlotRef = useRef<BroadcastSlotId | null>(slotQueue.activeSlot);

  const currentTrack = BGM_PLAYLIST[trackIndex] || BGM_PLAYLIST[0];

  /** 切换到指定曲目并（在允许时）自动播放 */
  const loadTrack = useCallback((index: number, autoPlay: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;
    const safeIndex = BGM_TRACK_COUNT > 0 ? ((index % BGM_TRACK_COUNT) + BGM_TRACK_COUNT) % BGM_TRACK_COUNT : 0;
    trackIndexRef.current = safeIndex;
    setTrackIndex(safeIndex);
    audio.src = BGM_PLAYLIST[safeIndex].url;
    try {
      audio.load();
    } catch {
      // ignore
    }
    if (!autoPlay) return;
    // 状态交给 audio 的 play/pause 事件同步，这里只负责发起播放
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

  // 弹幕数据来源 + 高频消息合批（避免 Realtime 突发导致重渲染卡顿）
  const danmakuSourceRef = useRef<DanmakuSource>('local');
  // WebSocket 重连退避时长（毫秒）
  const reconnectDelayRef = useRef(3000);
  // 用于驱动副作用的状态：probing = 正在探测 Supabase；supabase = 已接管；local = 退回本地 ws
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

      const currentSlotNow = currentNow + slotClockOffsetMs;
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
  }, [slotClockOffsetMs]);

  // Auto-advance broadcast right-window carousel every 12 seconds with smooth 500ms static crossfade
  useEffect(() => {
    if (!isAutoPlayingSlides) return;
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % BROADCAST_SLIDES.length);
    }, 12000);
    return () => clearInterval(timer);
  }, [isAutoPlayingSlides]);

  // 音乐播放器初始化：首曲、播完自动下一首、首次交互解锁自动播放
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = isMuted;

    loadTrack(0, true);

    const handleEnded = () => {
      // 顺序循环到下一首
      loadTrack(getNextTrackIndex(trackIndexRef.current), wantsPlayRef.current);
    };
    audio.addEventListener('ended', handleEnded);

    // 播放状态以 audio 元素的实际事件为准，
    // 避免 play() 的异步回调抢在 pause() 之后把状态改回「播放中」
    const syncPlayState = () => setIsBgmPlaying(!audio.paused);
    audio.addEventListener('play', syncPlayState);
    audio.addEventListener('pause', syncPlayState);

    const unlockOnGesture = () => {
      // 延后一拍：让本次点击的 onClick（例如触发宣传片）先执行完，
      // 否则宣传片刚触发就被这里重新拉起 BGM，出现一瞬的串音
      window.removeEventListener('pointerdown', unlockOnGesture);
      setTimeout(() => {
        const current = audioRef.current;
        if (
          current &&
          current.paused &&
          wantsPlayRef.current &&
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
      window.removeEventListener('pointerdown', unlockOnGesture);
    };
    // 仅初始化一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 音量 / 静音同步
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  // 切页联动：
  //  promo_video → 暂停音乐（保留宣传片原声）
  //  data_preview → 必须换成一首「随机的、和当前不同」的曲目，从头播放
  //  回到主页 → 接着放当前这首
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
      // 强制随机换一首（与当前不同的曲目），并从头播放
      const nextIndex = getRandomDifferentTrackIndex(trackIndexRef.current);
      wantsPlayRef.current = true;
      loadTrack(nextIndex, true);
      return;
    }

    // 回到主页：同样换一首新的（与刚才那首不同），
    // 避免「进去换了、出来没换」的突兀感，也让每次页面往返都有新的听感
    if (prev === 'promo_video' || prev === 'data_preview') {
      const nextIndex = getRandomDifferentTrackIndex(trackIndexRef.current);
      wantsPlayRef.current = true;
      loadTrack(nextIndex, true);
    }
  }, [slotQueue.activeSlot, loadTrack]);

  const toggleBgmPlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      wantsPlayRef.current = true;
      audio
        .play()
        .then(() => setIsBgmPlaying(true))
        .catch(() => {});
    } else {
      wantsPlayRef.current = false;
      audio.pause();
      setIsBgmPlaying(false);
    }
  };

  const handleNextTrack = () => {
    const nextIndex = getNextTrackIndex(trackIndexRef.current);
    wantsPlayRef.current = true;
    loadTrack(nextIndex, true);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) audioRef.current.muted = nextMuted;
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) audioRef.current.volume = newVol;
    if (newVol > 0 && isMuted) {
      if (audioRef.current) audioRef.current.muted = false;
      setIsMuted(false);
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

  /**
   * 本地 WebSocket 通道（仅在 Supabase 不可用时启用）。
   * 部署到 Cloudflare Pages 这类纯静态托管时没有 /ws 服务端，Supabase 能连上就不会走这里，
   * 因此也不会出现「每 3 秒重连一次」的无谓请求。
   */
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
            // Supabase 已接管弹幕时，忽略本地服务的历史弹幕（只保留在线人数）
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
          // 退避重连：3s → 6s → 12s → 24s → 30s 封顶。
          // 纯静态托管（无 /ws 服务端）下不会一直每 3 秒空转。
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

  // Optimistic + Supabase/Server-synced Danmaku creation
  const handleSendDanmaku = useCallback(
    (payload: {
      text: string;
      author: string;
      team: 'GEN' | 'BLG' | 'NEUTRAL';
      color: string;
    }) => {
      const id = `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const lane = Math.floor(Math.random() * 7);
      const optimisticMsg: DanmakuMessage = {
        id,
        text: payload.text,
        author: payload.author,
        team: payload.team,
        color: payload.color,
        timestamp: Date.now(),
        lane,
        likes: 1,
      };

      setDanmakuList((prev) => mergeDanmakuMessage(prev, optimisticMsg, DANMAKU_MAX_ITEMS));

      if (danmakuSourceRef.current === 'supabase') {
        insertDanmaku(optimisticMsg).then((ok) => {
          if (ok) return;
          // 写库失败则退回本地服务，保证这条弹幕不会丢
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
        return;
      }

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
    // Simulates :00 or :30 coincidence where both 30m Promo Video and 15m Data Preview trigger together
    setSlotQueue({
      activeSlot: null,
      pendingSlots: [],
    });
    setTimeout(() => {
      setSlotQueue(enqueueBroadcastSlots({ activeSlot: null, pendingSlots: [] }, ['data_preview', 'promo_video']));
    }, 20);
  }, []);

  const handleCompleteActiveSlot = useCallback(() => {
    setSlotQueue((prev) => advanceBroadcastSlotQueue(prev));
  }, []);

  const handleCloseAllSlots = useCallback(() => {
    setSlotQueue({ activeSlot: null, pendingSlots: [] });
  }, []);

  // 宣传片期间音乐必然是停的，HUD 显示直接跟当前页面绑定，
  // 避免 play()/pause() 的异步回调把状态改错（实测偶发显示成"播放中"）
  const isBgmActive = isBgmPlaying && slotQueue.activeSlot !== 'promo_video';

  // Compute active countdowns (with 3-minute initial countdown offset for periodic slots)
  const slotNowMs = nowMs + slotClockOffsetMs;
  const activeCountdown = calculateFinalsCountdown(nowMs, getFinalsTargetTimestamp());
  const promoCountdown = calculatePromoSlotCountdown(slotNowMs);
  const dataPreviewCountdown = calculateDataPreviewSlotCountdown(slotNowMs);

  return (
    <main
      id="broadcast-monitor"
      className="min-h-screen md:h-screen w-full bg-[#000312] text-slate-100 flex flex-col md:items-center md:justify-center overflow-x-hidden md:overflow-hidden relative"
    >
      {/* 单一音频元素：8 首战歌顺序循环 */}
      <audio ref={audioRef} preload="auto" />

      {/* =====================================================================
          PURE 16:9 BROADCAST WAITING SCREEN (GEN vs BLG · FINALS)
         ===================================================================== */}
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
      />

      {/* =====================================================================
          FLOATING BROADCAST DIRECTOR HUD & REAL-TIME DANMAKU PLUGIN DOCK
          Docked cleanly at the bottom edge on Desktop, or below screen on Mobile
         ===================================================================== */}
      {isHudMinimized ? (
        <button
          type="button"
          onClick={() => setIsHudMinimized(false)}
          aria-label="展开导播控制台与弹幕条"
          className="fixed bottom-3 left-3 z-40 inline-flex items-center gap-1.5 rounded-lg bg-[#03081c]/85 hover:bg-[#0051ff] border border-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md shadow-lg transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#00d2ff]" />
          <span>导播台与弹幕</span>
        </button>
      ) : (
        <section
          aria-label="导播台悬浮控制栏与实时弹幕插件"
          className="w-full md:fixed md:bottom-2.5 md:left-3 md:right-3 z-40 flex flex-col xl:flex-row items-stretch xl:items-end justify-between gap-2 px-2.5 py-2 md:p-0 pointer-events-none"
        >
          {/* Left Pill: BGM Loop + Beijing Time Sunday 03:00 Finals Info + Coincident Slot Queue Test */}
          <div className="pointer-events-auto flex flex-wrap lg:flex-nowrap items-center gap-1.5 rounded-xl border border-[#0051ff]/40 bg-[#03081c]/90 backdrop-blur-md px-2.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
            {/* BGM Play/Pause */}
            <button
              type="button"
              onClick={toggleBgmPlay}
              title={currentTrack.subtitle}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isBgmActive
                  ? 'bg-[#00d2ff] text-slate-950 shadow-[0_0_14px_rgba(0,210,255,0.4)]'
                  : 'bg-[#0051ff] hover:bg-[#0066ff] text-white'
              }`}
            >
              {isBgmActive ? (
                <>
                  <Pause className="w-3 h-3 shrink-0" />
                  <span>
                    战歌播放中 · {currentTrack.title}
                    <span className="opacity-70 ml-1">
                      {trackIndex + 1}/{BGM_TRACK_COUNT}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 shrink-0" />
                  <span>
                    播放战歌 · {currentTrack.title}
                    <span className="opacity-70 ml-1">
                      {trackIndex + 1}/{BGM_TRACK_COUNT}
                    </span>
                  </span>
                </>
              )}
            </button>

            {/* Next Track */}
            <button
              type="button"
              onClick={handleNextTrack}
              aria-label="下一首战歌"
              title="切到下一首战歌"
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 shrink-0 cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Mute & Volume */}
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? '取消静音' : '静音背景音乐'}
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 shrink-0 cursor-pointer"
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
        </section>
      )}
    </main>
  );
}
