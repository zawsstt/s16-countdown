import React, { useEffect, useState, useRef } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { BROADCAST_SLIDES } from '../data/finalsData';
import {
  PROMO_VIDEO_SLOT,
  TRANSITION_STINGER_SLOT,
} from '../data/broadcastSlots';
import { BGM_PLAYLIST } from '../data/musicPlaylist';
import { mediaUrl } from '../utils/mediaUrl';
import { SummonersCupLoaderSvg } from './SummonersCupLoaderSvg';

interface PreloadGateScreenProps {
  /** 预加载完成：回传首屏竖屏开场片的本地 blob 地址（失败时为 undefined，退回网络地址） */
  onReady: (introVideoUrl?: string) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
}

interface PreloadTaskItem {
  id: string;
  label: string;
  category: 'stage' | 'carousel' | 'data' | 'video' | 'audio';
  run: () => Promise<void>;
}

/** BLG 2026 全球总决赛夺冠海报主视觉路径（原画 1920x1080 高清版） */
const BLG_CHAMPIONS_POSTER_URL = 'assets/broadcast/blg_champions_2026_hd.jpg';

/** 首屏强制竖屏开场片（必须在进场前整段下载完，否则国内弱网会在视频页干等） */
const INTRO_VIDEO_ASSET = 'assets/aistudio/blg_names_vertical.mp4';

/** 下载停滞多久判定为「卡住」，直接放弃改用网络直连兜底 */
const INTRO_VIDEO_STALL_MS = 25000;

/**
 * 带真实进度的整段下载：用 ReadableStream 数字节，
 * 这样奖杯注金进度可以完全跟着下载进度走，而不是靠猜时间。
 */
async function downloadMediaWithProgress(
  url: string,
  onProgress: (ratio: number) => void,
  signal: AbortSignal
): Promise<Blob> {
  const res = await fetch(url, { cache: 'force-cache', signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length') || 0);

  if (!res.body) {
    const blob = await res.blob();
    onProgress(1);
    return blob;
  }

  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value as unknown as BlobPart);
      received += value.length;
      onProgress(total > 0 ? Math.min(1, received / total) : 0);
    }
  }
  onProgress(1);
  return new Blob(chunks, { type: 'video/mp4' });
}

/**
 * 预加载并解码单张图片（带超时保护，绝不阻塞死锁）
 */
function preloadImageAsset(url: string, timeoutMs = 2200): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const timer = setTimeout(done, timeoutMs);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img
          .decode()
          .catch(() => {})
          .finally(() => {
            clearTimeout(timer);
            done();
          });
      } else {
        clearTimeout(timer);
        done();
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      done();
    };
    img.src = url;
  });
}

/**
 * 预热视频/音频首段字节流（Range: bytes=0-1048575）进入浏览器 HTTP 缓存，
 * 配合 +faststart 头部索引，实现进场后秒级起播无卡顿
 */
function prewarmMediaHeadBytes(url: string, byteLimit = 1048575, timeoutMs = 2400): Promise<void> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      resolve();
    }, timeoutMs);

    fetch(url, {
      method: 'GET',
      headers: { Range: `bytes=0-${byteLimit}` },
      signal: controller.signal,
      cache: 'force-cache',
    })
      .then((res) => res.arrayBuffer().catch(() => {}))
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        resolve();
      });
  });
}

/**
 * 仪式感慢加载曲线：刻意放慢召唤师奖杯从纯灰底色 -> 冠军金色的注金过程，
 * 让底座、杯身、双耳与冠冕的过渡层次清晰可见
 */
function computeCeremonialCupProgress(normalizedTime: number): number {
  const t = Math.max(0, Math.min(1, normalizedTime));
  // 分段节奏：底座注金(0~25%) -> 杯腰攀升(25~65%) -> 双耳与宝石点亮(65~90%) -> 冠冕满溢(90~100%)
  const smooth = t * t * (3 - 2 * t);
  const blended = 0.65 * t + 0.35 * smooth;
  return Math.min(100, Math.round(blended * 100));
}

export const PreloadGateScreen: React.FC<PreloadGateScreenProps> = ({
  onReady,
  audioEnabled,
  onToggleAudio,
}) => {
  const [progress, setProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(1);
  const [currentAssetLabel, setCurrentAssetLabel] = useState(
    '正在为召唤师奖杯注入冠军金辉...'
  );
  const [isExiting, setIsExiting] = useState(false);
  const [isAudioBtnPulsing, setIsAudioBtnPulsing] = useState(false);
  const [isIntroVideoReady, setIsIntroVideoReady] = useState(false);
  const [introVideoPercent, setIntroVideoPercent] = useState(0);
  const completedRef = useRef(false);
  const realProgressRef = useRef(0);
  const realAssetsDoneRef = useRef(false);
  /** 开场片整段下载进度 0~1，直接驱动奖杯注金 */
  const introVideoProgressRef = useRef(0);
  /** 开场片是否可以进入播放（下载完成 / 下载失败兜底） */
  const introVideoReadyRef = useRef(false);
  /** 下载完成后的本地 blob 地址，交给竖屏页秒开 */
  const introVideoUrlRef = useRef<string | undefined>(undefined);

  const handleAudioToggleClick = () => {
    setIsAudioBtnPulsing(true);
    onToggleAudio();
    setTimeout(() => setIsAudioBtnPulsing(false), 450);
  };

  const finishPreload = (immediate = false) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setProgress(100);
    // 慢加载完成后额外驻留约 950ms，让观众充分欣赏召唤师奖杯被冠军金色完全点亮的瞬间；手动点击“立即进入”则快速响应
    const holdGoldMs = immediate ? 120 : 950;
    const fadeOutMs = immediate ? 260 : 480;
    setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onReady(introVideoUrlRef.current);
      }, fadeOutMs);
    }, holdGoldMs);
  };

  useEffect(() => {
    let cancelled = false;
    const params =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const holdPreload = params.get('holdPreload') === '1';
    const fixedProgressParam = params.get('preloadProgress');
    const fixedProgress =
      fixedProgressParam !== null ? Math.min(100, Math.max(0, Number(fixedProgressParam))) : null;

    const tasks: PreloadTaskItem[] = [];

    // 0. 首屏竖屏开场片：整段下载（不是预热头部），下载完才允许进场播视频。
    //    国内弱网下这一段往往是最慢的，所以直接拿它的真实进度驱动奖杯。
    const introAbort = new AbortController();
    let introLastProgressAt = Date.now();
    let introLastRatio = 0;
    tasks.push({
      id: 'intro-video',
      label: '预加载开场影片：YOU KNOW THEIR NAMES · BLG',
      category: 'video',
      run: () =>
        downloadMediaWithProgress(
          mediaUrl(INTRO_VIDEO_ASSET),
          (ratio) => {
            if (ratio > introLastRatio) {
              introLastRatio = ratio;
              introLastProgressAt = Date.now();
            }
            introVideoProgressRef.current = ratio;
            setIntroVideoPercent(Math.round(ratio * 100));
          },
          introAbort.signal
        )
          .then((blob) => {
            introVideoUrlRef.current = URL.createObjectURL(blob);
            introVideoProgressRef.current = 1;
            introVideoReadyRef.current = true;
            setIsIntroVideoReady(true);
            setIntroVideoPercent(100);
          })
          .catch(() => {
            // 下载失败/中断：退化成直接播放网络地址，绝不把观众锁死在加载页
            introVideoProgressRef.current = 1;
            introVideoReadyRef.current = true;
            setIsIntroVideoReady(true);
            setIntroVideoPercent(100);
          }),
    });

    // 1. 主舞台核心底板与夺冠海报
    const stageImages = [
      BLG_CHAMPIONS_POSTER_URL,
      'assets/broadcast/master_stage_base.jpg',
      'assets/broadcast/ribbon_bar.png',
      'assets/logos/worlds_26_bottom.png',
      'assets/logos/partner_riot.png',
    ];
    stageImages.forEach((src, i) => {
      tasks.push({
        id: `stage-${i}`,
        label: `主舞台底板与冠军视觉 (${i + 1}/${stageImages.length})`,
        category: 'stage',
        run: () => preloadImageAsset(src, 1800),
      });
    });

    // 2. 右侧导播小窗 BLG 夺冠轮播图队列
    BROADCAST_SLIDES.forEach((slide, i) => {
      tasks.push({
        id: `slide-${slide.id}`,
        label: `预加载轮播画面：${slide.title} (${i + 1}/${BROADCAST_SLIDES.length})`,
        category: 'carousel',
        run: () => preloadImageAsset(slide.imageUrl, 1800),
      });
    });

    // 4. 转场 Stinger、左屏动态循环视频、宣传片海报及首段视频 moov 头部预热
    const videoPosters = Array.from(
      new Set(PROMO_VIDEO_SLOT.map((p) => p.posterUrl).filter(Boolean) as string[])
    );
    videoPosters.forEach((posterUrl, i) => {
      tasks.push({
        id: `poster-${i}`,
        label: `预加载宣传片首帧海报 (${i + 1}/${videoPosters.length})`,
        category: 'video',
        run: () => preloadImageAsset(posterUrl, 1500),
      });
    });

    const criticalVideos = [
      {
        url: TRANSITION_STINGER_SLOT.stingerVideoUrl,
        name: '召唤师徽章 4s-5s 转场动画',
        bytes: 1572864,
      },
      {
        url: mediaUrl(
          PROMO_VIDEO_SLOT[0]?.videoUrl || 'assets/aistudio/promo1_p1.mp4'
        ),
        name: '第一支宣传片首段缓冲流',
        bytes: 1048575,
      },
    ];
    criticalVideos.forEach((vid, i) => {
      tasks.push({
        id: `vid-${i}`,
        label: `预热视频流：${vid.name}`,
        category: 'video',
        run: () => prewarmMediaHeadBytes(vid.url, vid.bytes, 2000),
      });
    });

    // 5. 赛前战歌首曲音频流预热
    if (BGM_PLAYLIST.length > 0) {
      tasks.push({
        id: 'bgm-0',
        label: `预热赛前战歌音频：${BGM_PLAYLIST[0].title}`,
        category: 'audio',
        run: () => prewarmMediaHeadBytes(mediaUrl(BGM_PLAYLIST[0].url), 524287, 1600),
      });
    }

    setTotalCount(tasks.length);

    let finished = 0;
    let cursor = 0;

    const worker = async () => {
      while (cursor < tasks.length && !cancelled && !completedRef.current) {
        const task = tasks[cursor++];
        if (!task) break;
        setCurrentAssetLabel(task.label);
        await task.run();
        if (cancelled || completedRef.current) break;
        finished += 1;
        setCompletedCount(finished);
        realProgressRef.current = Math.min(100, Math.round((finished / tasks.length) * 100));
      }
    };

    const concurrency = 6;
    Promise.all(Array.from({ length: concurrency }, () => worker())).then(() => {
      if (!cancelled) {
        realProgressRef.current = 100;
        realAssetsDoneRef.current = true;
        setCurrentAssetLabel('召唤师奖杯充能完毕 · 恭喜 BLG 获得 2026 英雄联盟全球总决赛冠军！');
      }
    });

    // 主动设置仪式感慢加载（约 6.8 秒从 0% 缓慢攀升至 100%），确保观众能细腻欣赏到纯灰底色召唤师奖杯逐步注满冠军金色的巧思
    const startTime = performance.now();
    const minFillDurationMs = 6800;
    let rafId = 0;

    const tickProgress = (now: number) => {
      if (cancelled || completedRef.current) return;
      if (fixedProgress !== null && !Number.isNaN(fixedProgress)) {
        setProgress(Math.round(fixedProgress));
        return;
      }
      const elapsed = now - startTime;
      const ceremonialProgress = computeCeremonialCupProgress(elapsed / minFillDurationMs);

      // 开场片下载卡住（长时间没有新字节）就放弃整段下载，退回网络直连
      if (!introVideoReadyRef.current && now - introLastProgressAt > INTRO_VIDEO_STALL_MS) {
        introAbort.abort();
      }

      // 奖杯注金 = min(仪式感曲线, 开场片真实下载进度)
      // 视频没下完，奖杯就永远差最后那一截 —— 绝不会在视频没就绪时把人放进去
      const videoPct = Math.round(introVideoProgressRef.current * 100);
      const nextVisual = Math.min(ceremonialProgress, videoPct);
      setProgress(nextVisual);

      if (
        realAssetsDoneRef.current &&
        introVideoReadyRef.current &&
        nextVisual >= 100
      ) {
        if (!holdPreload) {
          finishPreload(false);
        }
        return;
      }
      rafId = requestAnimationFrame(tickProgress);
    };

    rafId = requestAnimationFrame(tickProgress);

    return () => {
      cancelled = true;
      introAbort.abort();
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-testid="preload-gate-screen"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#020826] text-white overflow-hidden select-none transition-opacity duration-300 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 1. 超宽屏环境氛围背光层（确保在任何比例屏幕下无黑边） */}
      <img
        src={BLG_CHAMPIONS_POSTER_URL}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover blur-2xl scale-105 opacity-65"
      />

      {/* 2. 主视觉：BLG 2026 全球总决赛夺冠海报（完整展示全员、奖杯、恭喜BLG夺冠字样与底部选手名条） */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          data-testid="preload-champions-poster"
          src={BLG_CHAMPIONS_POSTER_URL}
          alt="恭喜BLG获得2026英雄联盟全球总决赛冠军"
          className="w-full h-full object-contain md:object-cover object-center pointer-events-none select-none"
        />

        {/* 底部柔和暗角衬底，自然承接正中下方的召唤师奖杯与底部选手名条 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 sm:h-28 bg-gradient-to-t from-[#01061e]/90 via-[#020a30]/40 to-transparent"
        />

        {/* 3. 右下角空白区轻量快捷控制组（位于 FLANDRE 上方空白渐变处，不遮挡任何文字与人物） */}
        <div className="absolute bottom-11 right-3 sm:bottom-12 sm:right-6 z-20 flex items-center gap-2">
          <button
            type="button"
            data-testid="preload-audio-toggle-btn"
            onClick={handleAudioToggleClick}
            aria-pressed={audioEnabled}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-extrabold backdrop-blur-md transition-all cursor-pointer ${
              isAudioBtnPulsing ? 'animate-control-pulse' : ''
            } ${
              audioEnabled
                ? 'bg-[#030b2e]/75 hover:bg-[#002b99]/90 border-[#00d2ff]/55 text-[#00d2ff] shadow-[0_0_14px_rgba(0,210,255,0.25)]'
                : 'bg-slate-950/75 hover:bg-slate-900 border-rose-500/45 text-rose-300'
            }`}
          >
            {audioEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#00d2ff] shrink-0" />
                <span>进场声音：已开启</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>进场静音：已关闭</span>
              </>
            )}
          </button>

          <button
            type="button"
            data-testid="enter-stage-now-btn"
            disabled={!isIntroVideoReady}
            onClick={() => finishPreload(true)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-extrabold backdrop-blur-md transition-all ${
              isIntroVideoReady
                ? 'bg-[#030b2e]/75 hover:bg-[#0051ff] border-amber-300/50 text-amber-200 hover:text-white shadow-[0_0_16px_rgba(245,184,0,0.25)] cursor-pointer'
                : 'bg-[#030b2e]/50 border-white/20 text-white/45 cursor-not-allowed'
            }`}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isIntroVideoReady ? '立即进入' : '开场影片加载中…'}</span>
          </button>
        </div>

        {/* 4. 海报正中下方：官方召唤师奖杯 SVG（纯灰底色 -> 冠军金色动态填充加载） */}
        <div
          data-testid="preload-summoners-cup-dock"
          className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none"
        >
          <div
            className={`relative flex items-center justify-center transition-transform duration-500 ${
              progress >= 100 ? 'scale-105' : 'scale-100'
            }`}
          >
            <div
              aria-hidden="true"
              style={{ opacity: 0.2 + (progress / 100) * 0.78 }}
              className="
                absolute -inset-3 rounded-full
                bg-[radial-gradient(circle,rgba(250,204,21,0.65)_0%,rgba(245,158,11,0.25)_58%,transparent_76%)]
                blur-md transition-opacity duration-200
              "
            />
            <SummonersCupLoaderSvg
              progress={progress}
              className="w-13 h-15 sm:w-15 sm:h-[4.35rem] md:w-[4.25rem] md:h-[4.9rem] drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]"
            />
          </div>

          {/* 冠军金色进度数字（无边框纯净排版） */}
          <span
            data-testid="preload-progress-percent"
            className={`mt-0.5 font-broadcast-num text-xs sm:text-sm leading-none tracking-widest transition-colors ${
              progress >= 100
                ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(250,204,21,1)]'
                : 'text-amber-200/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]'
            }`}
          >
            {progress}%
          </span>

          <span data-testid="preload-current-asset" className="sr-only">
            {currentAssetLabel} ({completedCount}/{totalCount})
          </span>

          {/* 开场片下载提示：让观众知道卡住的是视频而不是页面卡死 */}
          {!isIntroVideoReady && (
            <span
              data-testid="preload-intro-hint"
              className="mt-1 text-[10px] font-bold tracking-[0.12em] text-[#f5d5a7]/70 whitespace-nowrap"
            >
              正在加载开场影片 {introVideoPercent}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
