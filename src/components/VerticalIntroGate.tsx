import React, { useCallback, useEffect, useRef, useState } from 'react';
import { mediaUrl } from '../utils/mediaUrl';

interface VerticalIntroGateProps {
  /** 视频播完（或加载失败兜底）后回调，进入主页 */
  onDone: () => void;
  /**
   * 预加载好的本地 blob 地址（由加载页整段下载完成后传入）。
   * 传入时视频已在内存里，进页面即可原声秒播；未传则退回网络地址。
   */
  src?: string;
}

const INTRO_SRC = 'assets/aistudio/blg_names_vertical.mp4';
/** 未预加载（直连网络）时的兜底：长时间播不起来就放行，避免观众永远进不去 */
const FAILSAFE_MAX_WAIT_MS = 20000;

type IntroPhase = 'loading' | 'ready' | 'playing' | 'needsGesture';

/**
 * 首次加载进入主页前的强制竖屏弹窗（YOU KNOW THEIR NAMES · BLG）
 * - 全屏黑底 + 居中竖屏视频（1080×1920）
 * - 正常情况：加载页已把整段视频下完，这里拿到 blob 地址 → 立即可播
 * - **默认原声播放**，不做静音兜底：若浏览器拦截「有声自动播放」，
 *   停在首帧提示「点击播放 · 原声」，点一下即以原声播放
 * - 播完自动进入主页，不提供跳过按钮
 */
export const VerticalIntroGate: React.FC<VerticalIntroGateProps> = ({ onDone, src }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const doneRef = useRef(false);
  const startedRef = useRef(false);
  const [phase, setPhase] = useState<IntroPhase>(src ? 'ready' : 'loading');
  const [progress, setProgress] = useState(0);

  const videoSrc = src || mediaUrl(INTRO_SRC);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  /** 以原声尝试播放；被浏览器拦截则停在首帧等用户点一下 */
  const playWithSound = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    try {
      await v.play();
      startedRef.current = true;
      setPhase('playing');
    } catch {
      setPhase('needsGesture');
    }
  }, []);

  // 只有走网络直连（没有预加载）时才需要兜底放行
  useEffect(() => {
    if (src) return;
    const timer = setTimeout(() => {
      if (!doneRef.current && !startedRef.current) finish();
    }, FAILSAFE_MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [src, finish]);

  // 卡顿自愈：解码器被抢/末帧卡住时，先轻推一下进度，再卡就放行进主页
  const lastTickRef = useRef({ t: -1, at: Date.now(), nudged: false });
  useEffect(() => {
    const timer = setInterval(() => {
      const v = videoRef.current;
      if (!v || doneRef.current || v.paused) return;
      const now = Date.now();
      if (Math.abs(v.currentTime - lastTickRef.current.t) > 0.05) {
        lastTickRef.current = { t: v.currentTime, at: now, nudged: false };
        return;
      }
      if (now - lastTickRef.current.at < 6000) return;
      if (!lastTickRef.current.nudged) {
        // 第一次卡住：轻推 0.05s 强制刷新解码
        lastTickRef.current = { t: v.currentTime, at: now, nudged: true };
        try {
          v.currentTime = v.currentTime + 0.05;
        } catch {
          /* ignore */
        }
        void v.play().catch(() => {});
        return;
      }
      // 推完还卡：直接放行，绝不把观众锁在开场片里
      finish();
    }, 2000);
    return () => clearInterval(timer);
  }, [finish]);

  return (
    <div
      data-testid="vertical-intro-gate"
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
    >
      <video
        ref={videoRef}
        data-testid="vertical-intro-video"
        src={videoSrc}
        className="h-full w-auto max-w-full object-contain"
        playsInline
        autoPlay
        preload="auto"
        controls={false}
        disablePictureInPicture
        onCanPlay={() => {
          if (!startedRef.current) void playWithSound();
        }}
        onPlaying={() => {
          startedRef.current = true;
          setPhase('playing');
        }}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v || v.duration <= 0) return;
          setProgress(Math.min(1, v.currentTime / v.duration));
          // ended 事件偶尔不触发（末帧卡在解码器里），提前 0.3s 兜底收尾
          if (!doneRef.current && v.duration - v.currentTime < 0.3) finish();
        }}
        onEnded={finish}
        onError={finish}
      />

      {/* 顶部片名条 */}
      <div className="pointer-events-none absolute top-0 inset-x-0 px-6 pt-6 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-black/70 border border-[#c8aa78]/40 px-4 py-1.5 backdrop-blur-md">
          <span className="text-[11px] font-black tracking-[0.22em] text-[#f5d5a7]">
            YOU KNOW THEIR NAMES
          </span>
          <span className="text-[10px] font-bold text-white/60">BLG · WORLDS 2026</span>
        </div>
      </div>

      {/* 底部播放进度 */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0">
        <div className="h-[3px] w-full bg-white/15">
          <div
            className="h-full bg-gradient-to-r from-[#c8aa78] to-[#ffe4bc] transition-[width] duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {/* 浏览器拦截有声自动播放：停在首帧，点一下原声播放 */}
      {phase === 'needsGesture' && (
        <button
          type="button"
          onClick={() => void playWithSound()}
          data-testid="vertical-intro-play-btn"
          className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/55 backdrop-blur-[2px] cursor-pointer"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#f5d5a7]/80 bg-black/60 shadow-[0_0_40px_rgba(200,170,120,0.35)]">
            <svg viewBox="0 0 24 24" className="ml-1 h-9 w-9 fill-[#f5d5a7]" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="text-sm font-black tracking-[0.2em] text-[#f5d5a7]">
            点击播放 · 原声
          </span>
          <span className="text-[11px] font-bold text-white/55">决赛前导片即将开始</span>
        </button>
      )}

      {phase === 'loading' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
          <span className="text-[11px] font-bold tracking-[0.2em] text-white/45">
            正在加载前导片…
          </span>
        </div>
      )}
    </div>
  );
};
