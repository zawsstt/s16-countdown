import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, Sparkles, Loader2, Play, Film, Image as ImageIcon, Music, Layers } from 'lucide-react';
import { BROADCAST_SLIDES } from '../data/finalsData';
import {
  MATCH_DATA_PREVIEW_SLOT,
  PROMO_VIDEO_SLOT,
  TRANSITION_STINGER_SLOT,
} from '../data/broadcastSlots';
import { BGM_PLAYLIST } from '../data/musicPlaylist';
import { mediaUrl } from '../utils/mediaUrl';
import { WorldsCrestLogo } from './TeamLogos';

interface PreloadGateScreenProps {
  onReady: () => void;
}

interface PreloadTaskItem {
  id: string;
  label: string;
  category: 'stage' | 'carousel' | 'data' | 'video' | 'audio';
  run: () => Promise<void>;
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

export const PreloadGateScreen: React.FC<PreloadGateScreenProps> = ({ onReady }) => {
  const [progress, setProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(1);
  const [currentAssetLabel, setCurrentAssetLabel] = useState('正在初始化 S16 总决赛导播台资源引擎...');
  const [categoryDone, setCategoryDone] = useState<Record<string, boolean>>({
    stage: false,
    carousel: false,
    data: false,
    video: false,
    audio: false,
  });
  const [isExiting, setIsExiting] = useState(false);
  const completedRef = useRef(false);

  const finishPreload = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setProgress(100);
    setIsExiting(true);
    setTimeout(() => {
      onReady();
    }, 280);
  };

  useEffect(() => {
    let cancelled = false;

    // 构建分级预加载任务队列
    const tasks: PreloadTaskItem[] = [];

    // 1. 主舞台核心底板与徽章
    const stageImages = [
      'assets/broadcast/master_stage_base.jpg',
      'assets/broadcast/gen_vs_blg_panel.jpg',
      'assets/broadcast/ribbon_bar.png',
      'assets/logos/finals_stage.png',
      'assets/logos/worlds_26_bottom.png',
      'assets/logos/partner_hyperx.png',
      'assets/logos/partner_riot.png',
      'assets/logos/partner_aws.png',
      'assets/logos/partner_redbull.png',
    ];
    stageImages.forEach((src, i) => {
      tasks.push({
        id: `stage-${i}`,
        label: `主舞台底板与徽章 (${i + 1}/${stageImages.length})`,
        category: 'stage',
        run: () => preloadImageAsset(src, 1800),
      });
    });

    // 2. 赛事前瞻全量 1080p 图例（含更新后的赛事前瞻8：BLG VS LCK IN BO5）
    MATCH_DATA_PREVIEW_SLOT.forEach((item, i) => {
      tasks.push({
        id: `data-${item.id}`,
        label: `预解码赛事前瞻图例：${item.title} (${i + 1}/${MATCH_DATA_PREVIEW_SLOT.length})`,
        category: 'data',
        run: () => preloadImageAsset(item.graphicImageUrl, 2000),
      });
    });

    // 3. 右侧导播小窗轮播图队列（含轮播2与赛事前瞻8）
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
      { url: TRANSITION_STINGER_SLOT.stingerVideoUrl, name: '召唤师徽章 4s-5s 转场动画', bytes: 1572864 },
      { url: 'assets/broadcast/gen_vs_blg_loop.mp4', name: 'GEN vs BLG 左屏动态背景', bytes: 557168 },
      { url: mediaUrl(PROMO_VIDEO_SLOT[0]?.videoUrl || 'assets/broadcast/promo_opening_from_2s.mp4'), name: '全球总决赛宣传片片头', bytes: 1048575 },
      { url: mediaUrl(PROMO_VIDEO_SLOT[1]?.videoUrl || 'assets/aistudio/promo1_p1.mp4'), name: '第一支宣传片首段缓冲流', bytes: 1048575 },
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

    // 并发池执行（6 路并发，既快又不会打满浏览器连接池）
    let finished = 0;
    let cursor = 0;
    const categoryRemaining: Record<string, number> = {
      stage: tasks.filter((t) => t.category === 'stage').length,
      carousel: tasks.filter((t) => t.category === 'carousel').length,
      data: tasks.filter((t) => t.category === 'data').length,
      video: tasks.filter((t) => t.category === 'video').length,
      audio: tasks.filter((t) => t.category === 'audio').length,
    };

    const worker = async () => {
      while (cursor < tasks.length && !cancelled && !completedRef.current) {
        const task = tasks[cursor++];
        if (!task) break;
        setCurrentAssetLabel(task.label);
        await task.run();
        if (cancelled || completedRef.current) break;
        finished += 1;
        categoryRemaining[task.category] = Math.max(0, (categoryRemaining[task.category] || 1) - 1);
        if (categoryRemaining[task.category] === 0) {
          setCategoryDone((prev) => ({ ...prev, [task.category]: true }));
        }
        setCompletedCount(finished);
        setProgress(Math.min(100, Math.round((finished / tasks.length) * 100)));
      }
    };

    const concurrency = 6;
    Promise.all(Array.from({ length: concurrency }, () => worker())).then(() => {
      if (!cancelled) {
        setCurrentAssetLabel('全部导播台核心资源预热完毕，即将切入主舞台...');
        finishPreload();
      }
    });

    // 最长 4.2 秒兜底进场，确保弱网下也不会把观众永久卡在门外
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        finishPreload();
      }
    }, 4200);

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subsystems = [
    { key: 'stage', label: '主舞台底板', icon: Layers },
    { key: 'data', label: '赛事前瞻图例', icon: ImageIcon },
    { key: 'carousel', label: '导播轮播画幅', icon: Sparkles },
    { key: 'video', label: '转场与宣传片流', icon: Film },
    { key: 'audio', label: 'BP 战歌音轨', icon: Music },
  ];

  return (
    <div
      data-testid="preload-gate-screen"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[#000418] text-white px-6 py-8 select-none transition-opacity duration-300 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient Broadcast Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(0,81,255,0.28),transparent_65%)]"
      />

      {/* Top Bar */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#00d2ff] animate-pulse" />
          <span className="font-extrabold tracking-[0.2em] text-white uppercase">
            WORLDS 2026 GRAND FINALS · BROADCAST ENGINE PRELOADER
          </span>
        </div>
        <span className="font-mono text-[#00d2ff]">GEN vs BLG · BO5</span>
      </div>

      {/* Center Hero Lockup */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl my-auto py-6">
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute -inset-6 rounded-full bg-[#00d2ff]/15 blur-2xl" />
          <WorldsCrestLogo className="w-20 h-20 sm:w-24 sm:h-24 text-white drop-shadow-[0_0_25px_rgba(0,210,255,0.6)]" />
        </div>

        <div className="px-3 py-1 rounded-full bg-[#0051ff]/30 border border-[#00d2ff]/40 text-[11px] font-extrabold tracking-[0.25em] text-[#00d2ff] uppercase mb-3">
          THIS IS OUR MOMENT · 赛前导播资源预加载
        </div>

        <h1 className="text-2xl sm:text-4xl font-black tracking-wider text-white uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
          GEN.G <span className="text-[#00d2ff] mx-2">VS</span> BILIBILI GAMING
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-lg">
          正在提前将高清主舞台底板、8 张赛事前瞻数据图例、轮播画幅、转场动画及宣传片首段缓冲至显存与本地缓存，确保导播切换零卡顿
        </p>

        {/* Progress Bar Card */}
        <div className="mt-7 w-full rounded-2xl border border-[#0051ff]/50 bg-[#030926]/90 backdrop-blur-xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
          <div className="flex items-baseline justify-between gap-4 mb-2">
            <div className="flex items-center gap-2 text-left min-w-0">
              <Loader2 className="w-4 h-4 text-[#00d2ff] animate-spin shrink-0" />
              <span
                data-testid="preload-current-asset"
                className="text-xs sm:text-sm font-bold text-slate-200 truncate"
              >
                {currentAssetLabel}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 shrink-0">
              <span
                data-testid="preload-progress-percent"
                className="font-broadcast-num text-2xl sm:text-3xl text-[#00d2ff] leading-none"
              >
                {progress}%
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                ({completedCount}/{totalCount})
              </span>
            </div>
          </div>

          {/* Track */}
          <div className="w-full h-3 rounded-full bg-black/70 overflow-hidden border border-white/20 p-0.5">
            <div
              style={{ width: `${progress}%` }}
              className="h-full rounded-full bg-gradient-to-r from-[#0051ff] via-[#00d2ff] to-white transition-all duration-200 shadow-[0_0_16px_rgba(0,210,255,0.8)]"
            />
          </div>

          {/* 5 Subsystem Badges */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {subsystems.map((sub) => {
              const Icon = sub.icon;
              const isDone = categoryDone[sub.key] || progress >= 100;
              return (
                <div
                  key={sub.key}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 border text-[11px] font-bold transition-colors ${
                    isDone
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                      : 'bg-slate-900/80 border-white/10 text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 text-[#00d2ff] shrink-0" />
                  )}
                  <span className="truncate">{sub.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="relative z-10 w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs text-slate-400">
        <span>提示：预加载完成后将自动进入 S16 冠亚军决赛实时导播画面</span>
        <button
          type="button"
          data-testid="enter-stage-now-btn"
          onClick={finishPreload}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0051ff] hover:bg-[#0066ff] border border-[#00d2ff]/50 px-4 py-2 text-xs font-extrabold text-white shadow-[0_0_20px_rgba(0,81,255,0.5)] transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>立即进入导播台 ({progress}%)</span>
        </button>
      </div>
    </div>
  );
};
