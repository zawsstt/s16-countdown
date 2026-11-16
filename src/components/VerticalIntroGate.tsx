import React, { useCallback, useEffect, useRef, useState } from 'react';
import { mediaUrl } from '../utils/mediaUrl';

interface VerticalIntroGateProps {
  /** 视频播完（或加载失败兜底）后回调，进入主页 */
  onDone: () => void;
}

const INTRO_SRC = 'assets/aistudio/blg_names_vertical.mp4';
/** 加载失败/超时兜底：最多卡这么久就放行，避免观众永远进不去 */
const FAILSAFE_MAX_WAIT_MS = 15000;

/**
 * 首次加载进入主页前的强制竖屏弹窗：
 * - 全屏黑底 + 居中竖屏视频（1080×1920）
 * - 默认原声播放；若浏览器拦截有声自动播放，降级为静音播放并提示点一下开启声音
 * - 播完自动进入主页，不提供跳过按钮
 * - 加载失败或超时兜底放行，避免卡死
 */
export const VerticalIntroGate: React.FC<VerticalIntroGateProps> = ({ onDone }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  // 兜底：加载失败或长时间无进展就放行
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!doneRef.current && (videoRef.current?.readyState ?? 0) < 2) finish();
    }, FAILSAFE_MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [finish]);

  const handleLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    // 先按原声播放
    v.muted = false;
    setIsMuted(false);
    void v.play().catch(() => {
      // 浏览器拦截有声自动播放 → 降级静音，让画面先动起来
      v.muted = true;
      setIsMuted(true);
      void v.play().catch(() => {});
    });
  };

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !isMuted;
    v.muted = next;
    setIsMuted(next);
    if (!next) void v.play().catch(() => {});
  };

  return (
    <div
      data-testid="vertical-intro-gate"
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
    >
      <video
        ref={videoRef}
        data-testid="vertical-intro-video"
        src={mediaUrl(INTRO_SRC)}
        className="h-full w-auto max-w-full object-contain"
        playsInline
        autoPlay
        preload="auto"
        onLoadedMetadata={handleLoaded}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (v && v.duration > 0) setProgress(Math.min(1, v.currentTime / v.duration));
        }}
        onEnded={finish}
      />

      <div className="pointer-events-none absolute top-0 inset-x-0 px-6 pt-6 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-black/70 border border-[#c8aa78]/40 px-4 py-1.5 backdrop-blur-md">
          <span className="text-[11px] font-black tracking-[0.22em] text-[#f5d5a7]">
            YOU KNOW THEIR NAMES
          </span>
          <span className="text-[10px] font-bold text-white/60">BLG · WORLDS 2026</span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 inset-x-0">
        <div className="h-[3px] w-full bg-white/15">
          <div
            className="h-full bg-gradient-to-r from-[#c8aa78] to-[#ffe4bc] transition-[width] duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={toggleSound}
        data-testid="vertical-intro-sound-btn"
        className="absolute bottom-8 right-6 inline-flex items-center gap-1.5 rounded-full bg-black/75 hover:bg-black border border-white/25 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md transition-colors cursor-pointer"
      >
        {isMuted ? '开启声音' : '静音'}
      </button>
    </div>
  );
};
