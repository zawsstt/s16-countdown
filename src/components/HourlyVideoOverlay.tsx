import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { TRANSITION_STINGER_SLOT } from '../data/broadcastSlots';
import { mediaUrl } from '../utils/mediaUrl';

/**
 * ============================================================================
 * 每小时整点全屏播放的「选人阶段加长版」宣传片
 * ============================================================================
 * 需求：
 *   - 每小时整点自动弹出，占据主页全屏播放
 *   - 进场前先播一遍和切页相同的 Summoner Crest 转场动画
 *   - 左上角保留和宣传片页同款的「决赛倒计时 + GEN VS BLG」信息条
 *   - 右上角可随时退出回到主页，播完自动关闭
 *
 * 视频为什么分两段：
 *   原片 165.8MB / 13 分钟，超过 GitHub Pages 的 100MB 单文件上限。
 *   用 `-c copy` 按关键帧无损切成 85.3MB + 80.5MB 两段，画质零损失。
 *
 * 卡顿自愈：
 *   13 分钟 1080p30 的片子对硬件解码器压力大，Chromium 偶尔会把媒体管线挂起
 *   （readyState 掉到 2、缓冲明明还在却不动）。这里用和 BroadcastStage 相同的手法：
 *   缓冲充足却不动时把 currentTime 微调 0.06 秒，强制重建解码管线，约 2.4 秒自愈。
 */

interface HourlySegment {
  url: string;
  poster: string;
}

const HOURLY_SEGMENTS: HourlySegment[] = [
  {
    url: 'assets/aistudio/hourly_champ_select_p1.mp4',
    poster: 'assets/broadcast/poster_hourly_p1.jpg',
  },
  {
    url: 'assets/aistudio/hourly_champ_select_p2.mp4',
    poster: 'assets/broadcast/poster_hourly_p2.jpg',
  },
];

interface HourlyVideoOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  /** 决赛倒计时主显示文本，例如 "69:32:54" */
  countdownDisplay: string;
}

export const HourlyVideoOverlay: React.FC<HourlyVideoOverlayProps> = ({
  isOpen,
  onClose,
  countdownDisplay,
}) => {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const stingerRef = useRef<HTMLVideoElement | null>(null);
  const stallRef = useRef<{ time: number; ticks: number }>({ time: 0, ticks: 0 });
  const [segIndex, setSegIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  /** 转场动画是否播完 */
  const [isStingerDone, setIsStingerDone] = useState(false);

  // 每次打开：回到第一段，重新播转场
  useEffect(() => {
    if (!isOpen) return;
    setSegIndex(0);
    setIsBuffering(true);
    setIsStingerDone(false);
    videoRefs.current.forEach((v) => {
      if (v) {
        try {
          v.pause();
          v.currentTime = 0;
        } catch {
          // ignore
        }
      }
    });
    const st = stingerRef.current;
    if (st) {
      try {
        st.currentTime = 0;
        st.play().catch(() => {});
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  // 转场保险丝：万一 stinger 事件没触发，1.6 秒后强制进入正片
  useEffect(() => {
    if (!isOpen || isStingerDone) return;
    const t = setTimeout(() => setIsStingerDone(true), 1600);
    return () => clearTimeout(t);
  }, [isOpen, isStingerDone]);

  // 转场结束后播放当前段
  useEffect(() => {
    if (!isOpen || !isStingerDone) return;
    const vid = videoRefs.current[segIndex];
    if (!vid) return;
    try {
      vid.currentTime = 0;
    } catch {
      // ignore
    }
    vid.play().catch(() => {
      // 浏览器拦截带声音的自动播放 → 静音后再试一次
      vid.muted = true;
      vid.play().catch(() => {});
    });
  }, [isOpen, isStingerDone, segIndex]);

  // 关闭时暂停所有视频
  useEffect(() => {
    if (isOpen) return;
    videoRefs.current.forEach((v) => {
      if (v && !v.paused) v.pause();
    });
    if (stingerRef.current && !stingerRef.current.paused) stingerRef.current.pause();
  }, [isOpen]);

  // 卡顿自愈：缓冲充足却不动时微调时间点，强制重建解码管线
  useEffect(() => {
    if (!isOpen || !isStingerDone) return;
    const vid = videoRefs.current[segIndex];
    if (!vid) return;

    stallRef.current = { time: vid.currentTime, ticks: 0 };
    const timer = setInterval(() => {
      if (vid.paused) return;
      const st = stallRef.current;
      if (Math.abs(vid.currentTime - st.time) > 0.15) {
        stallRef.current = { time: vid.currentTime, ticks: 0 };
        return;
      }
      st.ticks += 1;

      if (st.ticks === 3) {
        let ahead = 0;
        try {
          for (let i = 0; i < vid.buffered.length; i++) {
            if (vid.buffered.start(i) <= vid.currentTime && vid.currentTime <= vid.buffered.end(i)) {
              ahead = vid.buffered.end(i) - vid.currentTime;
              break;
            }
          }
        } catch {
          // ignore
        }
        if (ahead > 1.5) {
          try {
            vid.currentTime = vid.currentTime + 0.06;
          } catch {
            // ignore
          }
          stallRef.current = { time: vid.currentTime, ticks: 0 };
          return;
        }
      }

      if (st.ticks >= 18) {
        // 约 14 秒毫无进展：重新拉流兜底
        try {
          vid.load();
          vid.play().catch(() => {});
        } catch {
          // ignore
        }
        stallRef.current = { time: 0, ticks: 0 };
      }
    }, 800);

    return () => clearInterval(timer);
  }, [isOpen, isStingerDone, segIndex]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="hourly-video-overlay"
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
    >
      {/* 正片分段：只给当前段和下一段挂 src，避免同时解码抢硬件解码器 */}
      {HOURLY_SEGMENTS.map((seg, idx) => {
        const shouldAttach = idx === segIndex || idx === segIndex + 1;
        return (
          <video
            key={seg.url}
            ref={(el) => {
              videoRefs.current[idx] = el;
            }}
            src={shouldAttach ? seg.url : undefined}
            poster={seg.poster}
            playsInline
            className={`absolute inset-0 w-full h-full object-contain bg-black transition-opacity duration-300 ${
              idx === segIndex && isStingerDone
                ? 'opacity-100 z-10'
                : 'opacity-0 z-0 pointer-events-none'
            }`}
            onEnded={() => {
              if (segIndex + 1 < HOURLY_SEGMENTS.length) {
                setSegIndex(segIndex + 1);
                setIsBuffering(true);
              } else {
                onClose();
              }
            }}
            onCanPlay={() => setIsBuffering(false)}
            onPlaying={() => setIsBuffering(false)}
            onWaiting={() => setIsBuffering(true)}
          />
        );
      })}

      {/* 进场转场：和切页用的是同一支 Summoner Crest 动画 */}
      {!isStingerDone && (
        <video
          ref={stingerRef}
          data-testid="hourly-stinger"
          src={mediaUrl(TRANSITION_STINGER_SLOT.stingerVideoUrl)}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-30"
          onEnded={() => setIsStingerDone(true)}
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime * 1000 >= TRANSITION_STINGER_SLOT.durationMs) {
              setIsStingerDone(true);
            }
          }}
        />
      )}

      {/* 左上角：与宣传片页同款的「WORLDS 26 徽标 + 决赛倒计时 + GEN VS BLG」 */}
      <div
        data-testid="hourly-top-left-countdown"
        className={`pointer-events-none absolute top-[3.6%] left-[2.8%] z-40 flex items-stretch bg-[#05070d] p-[3px] shadow-[0_12px_32px_rgba(0,0,0,0.9)] select-none transition-opacity duration-300 ${
          isStingerDone ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="bg-[#003ce2] flex items-center justify-center px-2.5 py-2 sm:px-3.5 sm:py-2.5 md:px-[1.15vw] md:py-[0.8vw]">
          <img
            src="assets/logos/worlds_26_bottom.png"
            alt="WORLDS 26"
            className="h-8 sm:h-11 md:h-[clamp(2.4rem,3.8vw,4.1rem)] w-auto object-contain brightness-110"
          />
        </div>
        <div className="bg-[#05070d] flex flex-col justify-center items-center px-3 py-1 sm:px-4 sm:py-1.5 md:px-[1.25vw] md:py-[0.45vw] min-w-[7.5rem] sm:min-w-[10rem] md:min-w-[11.5vw]">
          <div className="font-broadcast-num text-[#05d8ff] text-xl sm:text-3xl md:text-[clamp(1.65rem,2.85vw,3.15rem)] leading-[0.95] tracking-wider whitespace-nowrap drop-shadow-[0_0_10px_rgba(5,216,255,0.28)]">
            {countdownDisplay}
          </div>
          <div className="mt-0.5 sm:mt-1 font-black text-white text-xs sm:text-base md:text-[clamp(0.9rem,1.45vw,1.55rem)] tracking-[0.09em] uppercase leading-none whitespace-nowrap">
            GEN VS BLG
          </div>
        </div>
      </div>

      {/* 右上角：退出到主页 */}
      <button
        type="button"
        data-testid="hourly-exit-btn"
        onClick={onClose}
        className={`absolute top-[3.6%] right-[2.8%] z-40 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/85 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition-opacity duration-300 cursor-pointer ${
          isStingerDone ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <X className="w-3.5 h-3.5" />
        退出全屏
      </button>

      {/* 缓冲提示 */}
      {isStingerDone && isBuffering && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60">
          <span className="h-10 w-10 rounded-full border-2 border-white/25 border-t-[#00d2ff] animate-spin" />
          <span className="text-xs sm:text-sm font-bold tracking-[0.2em] text-white/85 uppercase">
            影片加载中…
          </span>
        </div>
      )}
    </div>
  );
};
