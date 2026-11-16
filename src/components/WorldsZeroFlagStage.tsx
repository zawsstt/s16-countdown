import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Particles, { ParticlesProvider, type ParticlesPluginRegistrar } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';
import confetti from 'canvas-confetti';
import { Music, RotateCcw, Sparkles, Trophy } from 'lucide-react';

/** 夺冠海报页顶部按钮自动隐藏静止阈值：10秒（10000ms） */
export const CHAMPIONS_STAGE_HUD_IDLE_HIDE_MS = 10000;

interface WorldsZeroFlagStageProps {
  isPreviewMode?: boolean;
  onExitPreview?: () => void;
  /** 当底部控制台被用户点击「隐藏」时，顶部按钮无视鼠标状态直接同步隐藏 */
  isHudMinimized?: boolean;
}

interface GoldRibbonParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  length: number;
  angle: number;
  vAngle: number;
  tilt: number;
  vTilt: number;
  swayPhase: number;
  swaySpeed: number;
  colorPrimary: string;
  colorHighlight: string;
  colorShadow: string;
}

const GOLD_PALETTE = [
  { primary: '#FFD700', highlight: '#FFF9D2', shadow: '#B8860B' },
  { primary: '#F5D5A7', highlight: '#FFFFFF', shadow: '#9A7B4F' },
  { primary: '#E6B800', highlight: '#FFF3B0', shadow: '#8A6D0B' },
  { primary: '#D4AF37', highlight: '#FBF0C4', shadow: '#7D6216' },
  { primary: '#FFDF73', highlight: '#FFFFFF', shadow: '#C59B27' },
];

/** Stable module-level registrar for @tsparticles/react ParticlesProvider */
const initTsParticlesSlim: ParticlesPluginRegistrar = async (engine) => {
  await loadSlim(engine);
};

export const WorldsZeroFlagStage: React.FC<WorldsZeroFlagStageProps> = ({
  isPreviewMode = false,
  onExitPreview,
  isHudMinimized = false,
}) => {
  const [isMouseActive, setIsMouseActive] = useState(true);
  const ribbonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiInstanceRef = useRef<confetti.CreateTypes | null>(null);
  const burstActionRef = useRef<(() => void) | null>(null);

  // 进入夺冠海报画面后：鼠标静止满 10 秒自动隐藏顶部控制栏；移动鼠标则恢复显示并重置 10 秒计时
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setIsMouseActive(false);
    }, CHAMPIONS_STAGE_HUD_IDLE_HIDE_MS);

    const handleUserActivity = () => {
      setIsMouseActive(true);
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsMouseActive(false);
      }, CHAMPIONS_STAGE_HUD_IDLE_HIDE_MS);
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('pointermove', handleUserActivity, { passive: true });
    window.addEventListener('pointerdown', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity);

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('pointermove', handleUserActivity);
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, []);

  // 如果用户点击了隐藏键（isHudMinimized 为 true），则不论鼠标是否静止都直接隐藏顶部按钮
  const shouldShowTopHud = !isHudMinimized && isMouseActive;

  // Trigger celebratory multi-cannon golden confetti burst via canvas-confetti + 3D ribbon surge
  const triggerCelebratoryGoldBurst = useCallback(() => {
    if (burstActionRef.current) {
      burstActionRef.current();
    }

    const myConfetti = confettiInstanceRef.current;
    if (!myConfetti) return;

    const goldColors = ['#FFD700', '#F5D5A7', '#FFF8DC', '#D4AF37', '#F59E0B', '#FFFFFF'];

    // Left stage cannon
    myConfetti({
      particleCount: 55,
      angle: 62,
      spread: 60,
      origin: { x: 0.04, y: 0.78 },
      colors: goldColors,
      shapes: ['square', 'circle'],
      scalar: 1.15,
      gravity: 0.75,
      drift: 0.4,
      ticks: 260,
    });

    // Right stage cannon
    myConfetti({
      particleCount: 55,
      angle: 118,
      spread: 60,
      origin: { x: 0.96, y: 0.78 },
      colors: goldColors,
      shapes: ['square', 'circle'],
      scalar: 1.15,
      gravity: 0.75,
      drift: -0.4,
      ticks: 260,
    });

    // Center Summoner's Cup celebratory burst
    setTimeout(() => {
      myConfetti({
        particleCount: 70,
        angle: 90,
        spread: 105,
        origin: { x: 0.5, y: 0.42 },
        colors: goldColors,
        shapes: ['square'],
        scalar: 1.25,
        gravity: 0.65,
        ticks: 280,
      });
    }, 180);
  }, []);

  // Setup scoped canvas-confetti instance and fire celebratory golden cannons immediately upon entering 0s screen
  useEffect(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;

    const myConfetti = confetti.create(canvas, {
      resize: true,
      useWorker: false,
    });
    confettiInstanceRef.current = myConfetti;

    // Immediate opening championship golden cannon salvo
    triggerCelebratoryGoldBurst();

    // Second celebratory salvo 900ms later for authentic Worlds trophy-lift atmosphere
    const salvoTimer = setTimeout(() => {
      triggerCelebratoryGoldBurst();
    }, 900);

    return () => {
      clearTimeout(salvoTimer);
      try {
        myConfetti.reset();
      } catch {
        // ignore
      }
    };
  }, [triggerCelebratoryGoldBurst]);

  // 60FPS 3D Metallic Golden Streamer Ribbons (庆祝性金色彩带飘落动画)
  useEffect(() => {
    const canvas = ribbonCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1920;
    const H = 1080;
    const RIBBON_COUNT = 78;

    const createRibbon = (spawnAtTop: boolean, isBurst = false): GoldRibbonParticle => {
      const palette = GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)];
      if (isBurst) {
        const fromLeft = Math.random() < 0.5;
        return {
          x: fromLeft ? W * (0.05 + Math.random() * 0.25) : W * (0.7 + Math.random() * 0.25),
          y: H * (0.55 + Math.random() * 0.35),
          vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 9),
          vy: -(9 + Math.random() * 11),
          width: 9 + Math.random() * 9,
          length: 26 + Math.random() * 34,
          angle: Math.random() * Math.PI * 2,
          vAngle: (Math.random() - 0.5) * 0.12,
          tilt: Math.random() * Math.PI * 2,
          vTilt: 0.08 + Math.random() * 0.14,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 0.03 + Math.random() * 0.04,
          colorPrimary: palette.primary,
          colorHighlight: palette.highlight,
          colorShadow: palette.shadow,
        };
      }
      return {
        x: Math.random() * W,
        y: spawnAtTop ? -Math.random() * H * 0.45 - 20 : Math.random() * H,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 2.1 + Math.random() * 2.8,
        width: 8 + Math.random() * 9,
        length: 24 + Math.random() * 32,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.06,
        tilt: Math.random() * Math.PI * 2,
        vTilt: 0.06 + Math.random() * 0.1,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.025 + Math.random() * 0.035,
        colorPrimary: palette.primary,
        colorHighlight: palette.highlight,
        colorShadow: palette.shadow,
      };
    };

    const ribbons: GoldRibbonParticle[] = Array.from({ length: RIBBON_COUNT }, (_, idx) =>
      createRibbon(idx > 28, idx < 24)
    );

    burstActionRef.current = () => {
      for (let i = 0; i < 26; i++) {
        ribbons[i] = createRibbon(false, true);
      }
    };

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < ribbons.length; i++) {
        const r = ribbons[i];
        r.swayPhase += r.swaySpeed;
        r.x += r.vx + Math.sin(r.swayPhase) * 1.65;
        r.y += r.vy;

        // Air drag & gravity recovery after cannon burst
        r.vx *= 0.985;
        if (r.vy < 2.4) {
          r.vy += 0.34;
        }

        r.angle += r.vAngle;
        r.tilt += r.vTilt;

        if (r.y > H + 60 || r.x < -100 || r.x > W + 100) {
          ribbons[i] = createRibbon(true, false);
          continue;
        }

        // Draw 3D twisting metallic golden ribbon strip
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.angle);

        const flipScale = Math.cos(r.tilt);
        const shimmer = Math.sin(r.tilt);
        const halfL = r.length * 0.5;
        const halfW = Math.max(1.8, Math.abs(flipScale) * r.width * 0.5);
        const curveBend = Math.sin(r.swayPhase * 1.4) * 6;

        const grad = ctx.createLinearGradient(-halfL, 0, halfL, 0);
        if (shimmer > 0.25) {
          grad.addColorStop(0, r.colorPrimary);
          grad.addColorStop(0.5, r.colorHighlight);
          grad.addColorStop(1, r.colorPrimary);
        } else if (shimmer < -0.25) {
          grad.addColorStop(0, r.colorShadow);
          grad.addColorStop(0.5, r.colorPrimary);
          grad.addColorStop(1, r.colorShadow);
        } else {
          grad.addColorStop(0, r.colorPrimary);
          grad.addColorStop(0.5, r.colorHighlight);
          grad.addColorStop(1, r.colorShadow);
        }

        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(255, 215, 0, 0.35)';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.moveTo(-halfL, -halfW);
        ctx.quadraticCurveTo(0, -halfW + curveBend, halfL, -halfW);
        ctx.lineTo(halfL, halfW);
        ctx.quadraticCurveTo(0, halfW + curveBend, -halfL, halfW);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // @tsparticles/react configuration for shimmering golden stardust & confetti flakes
  const tsParticlesOptions: ISourceOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      fpsLimit: 60,
      detectRetina: true,
      particles: {
        number: {
          value: 65,
          density: {
            enable: true,
          },
        },
        color: {
          value: ['#FFD700', '#F5D5A7', '#FFF8DC', '#D4AF37', '#FFDF73', '#FFFFFF'],
        },
        shape: {
          type: ['square', 'circle'],
        },
        opacity: {
          value: { min: 0.45, max: 0.95 },
          animation: {
            enable: true,
            speed: 1.2,
            sync: false,
          },
        },
        size: {
          value: { min: 3, max: 7 },
        },
        move: {
          enable: true,
          direction: 'bottom',
          speed: { min: 1.8, max: 4.5 },
          outModes: {
            default: 'out',
          },
          drift: { min: -1.2, max: 1.2 },
        },
      },
    }),
    []
  );

  return (
    <div
      data-testid="worlds-zero-flag-stage"
      className="group/zeroflag absolute inset-0 z-[42] bg-[#060504] overflow-hidden select-none flex flex-col justify-between animate-fadeIn"
    >
      {/* =====================================================================
          1. FULL-SCREEN BLG 2026 WORLDS CHAMPIONS POSTER (0秒决赛全屏夺冠海报)
         ===================================================================== */}
      <img
        src="assets/broadcast/blg_champions_2026_hd.jpg"
        alt="恭喜 BLG 获得 2026 英雄联盟全球总决赛冠军"
        data-testid="champions-poster-fullscreen-img"
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none"
      />

      {/* Subtle Golden Vignette & Trophy Spotlight Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(circle_at_50%_30%,rgba(255,215,0,0.14),transparent_62%)]"
      />

      {/* =====================================================================
          2. @tsparticles/react GOLDEN CONFETTI & STARDUST PARTICLE LAYER
         ===================================================================== */}
      <div
        data-testid="tsparticles-gold-confetti-layer"
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      >
        <ParticlesProvider init={initTsParticlesSlim}>
          <Particles
            id="worlds-2026-champions-gold-particles"
            options={tsParticlesOptions}
            className="w-full h-full"
          />
        </ParticlesProvider>
      </div>

      {/* =====================================================================
          3. 60FPS 3D METALLIC GOLDEN STREAMER RIBBON CANVAS (庆祝性金色彩带动画)
         ===================================================================== */}
      <canvas
        ref={ribbonCanvasRef}
        width={1920}
        height={1080}
        data-testid="worlds-zero-flag-canvas"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover z-[15]"
      />

      {/* =====================================================================
          4. SCOPED CANVAS-CONFETTI GOLDEN CANNON SALVO LAYER
         ===================================================================== */}
      <canvas
        ref={confettiCanvasRef}
        data-testid="champions-confetti-cannon-canvas"
        className="pointer-events-none absolute inset-0 w-full h-full z-[18]"
      />

      {/* =====================================================================
          5. TOP HUD: CHAMPIONS STATUS + BGM LOCKED TO KNOW MY NAME + RE-BURST
             - Automatically hides after 10s of mouse inactivity
             - Immediately hides when bottom HUD is minimized (isHudMinimized === true)
         ===================================================================== */}
      <div
        data-testid="champions-stage-top-hud"
        data-visible={shouldShowTopHud ? 'true' : 'false'}
        aria-hidden={!shouldShowTopHud}
        className={`relative z-20 flex flex-wrap items-center justify-between gap-2 px-4 md:pl-72 md:pr-52 pt-3 transition-opacity duration-300 ${
          shouldShowTopHud
            ? 'opacity-95 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-[#120e09]/85 border border-[#f5d5a7]/45 px-3.5 py-1.5 backdrop-blur-md text-xs font-extrabold text-[#f5d5a7] shadow-[0_8px_28px_rgba(0,0,0,0.85)]">
          <Trophy className="w-3.5 h-3.5 text-[#ffd700]" />
          <span>WORLDS 2026 CHAMPIONS · BLG 全屏夺冠海报</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] text-[10px] font-black text-[#14100a]">
            <Music className="w-3 h-3" />
            <span>固定战歌：Know My Name</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="trigger-gold-confetti-btn"
            onClick={triggerCelebratoryGoldBurst}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] hover:from-[#e5c798] hover:to-[#ffe4bc] text-[#14100a] border border-[#fff3d1]/60 px-3 py-1.5 text-xs font-black shadow-[0_0_18px_rgba(245,213,167,0.45)] transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>再放金色彩带</span>
          </button>

          {isPreviewMode && onExitPreview && (
            <button
              type="button"
              data-testid="exit-zero-flag-preview-btn"
              onClick={onExitPreview}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#120e09]/90 hover:bg-[#3b2e1e] text-[#f5d5a7] hover:text-white border border-[#c8aa78]/45 px-3.5 py-1.5 text-xs font-extrabold backdrop-blur-md shadow-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>返回导播主舞台</span>
            </button>
          )}
        </div>
      </div>

      {/* Hidden compatibility node for existing test queries */}
      <span data-testid="zero-flag-year-label" className="sr-only">
        WORLDS 2026
      </span>
    </div>
  );
};
