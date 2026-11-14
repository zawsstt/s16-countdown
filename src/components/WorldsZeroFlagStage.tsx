import React, { useEffect, useRef } from 'react';
import { Music, RotateCcw, Sparkles } from 'lucide-react';

interface WorldsZeroFlagStageProps {
  isPreviewMode?: boolean;
  onExitPreview?: () => void;
}

type EmblemKind =
  | 'GEN_IMG'
  | 'BLG_IMG'
  | 'WORLDS_IMG'
  | 'ARROWS'
  | 'YEAR_26'
  | 'T1'
  | 'C9'
  | 'HLE'
  | 'DK'
  | 'G2'
  | 'IG'
  | 'FNC'
  | 'KC'
  | 'LYON'
  | 'AL';

interface RibbonSpec {
  id: string;
  /** Attachment position along the pole (0 = top, 1 = bottom) */
  poleT: number;
  /** Ribbon length as fraction of canvas width */
  lengthRatio: number;
  /** Ribbon width in reference 1920px coordinates */
  widthPx: number;
  /** Base trajectory angle in radians (0 = straight left) */
  baseAngle: number;
  /** Upward/downward S-bend curvature */
  archBend: number;
  /** Tip curl upward on the left */
  tipLift: number;
  /** Wave phase offset */
  phase: number;
  /** Wave speed multiplier */
  speed: number;
  /** Wave amplitude in reference 1080px coordinates */
  ampPx: number;
  /** Primary fabric hex color */
  color: string;
  /** Optional secondary stripe/edge hex color */
  accentColor?: string;
  /** Foreground print/logo color */
  inkColor: string;
  /** Swallowtail V-cut depth (0 = rounded/pointed tip, >0 = swallowtail fork) */
  swallowtail: number;
  /** Stamps placed along the ribbon (pos: 0 = pole, 1 = tip) */
  stamps: Array<{
    pos: number;
    kind: EmblemKind;
    scale?: number;
  }>;
  /** Z-order layer (lower drawn first, higher drawn on top) */
  layer: number;
}

/**
 * 32 Layered Swallowtail Team Streamers modeled directly on the reference Worlds Flag Key Visual,
 * updated with real Worlds 2026 teams (GEN, BLG, T1, HLE, IG, G2, DK, KC, LYON, AL, FNC, C9)
 * and year "26" (replacing "22").
 */
const WORLDS_2026_RIBBONS: RibbonSpec[] = [
  // ── Deep background layer (adds dense volume behind main ribbons) ──
  {
    id: 'bg-dark-1',
    poleT: 0.16,
    lengthRatio: 0.54,
    widthPx: 48,
    baseAngle: 0.12,
    archBend: 95,
    tipLift: -150,
    phase: 0.4,
    speed: 2.3,
    ampPx: 18,
    color: '#18181c',
    inkColor: '#ffffff',
    swallowtail: 0.65,
    stamps: [
      { pos: 0.35, kind: 'WORLDS_IMG', scale: 0.9 },
      { pos: 0.78, kind: 'ARROWS', scale: 0.85 },
    ],
    layer: 1,
  },
  {
    id: 'bg-red-al',
    poleT: 0.2,
    lengthRatio: 0.46,
    widthPx: 44,
    baseAngle: 0.16,
    archBend: 85,
    tipLift: -195,
    phase: 1.4,
    speed: 2.6,
    ampPx: 20,
    color: '#d92626',
    inkColor: '#ffffff',
    swallowtail: 0.5,
    stamps: [
      { pos: 0.48, kind: 'AL', scale: 0.9 },
      { pos: 0.82, kind: 'YEAR_26', scale: 0.85 },
    ],
    layer: 1,
  },
  {
    id: 'bg-blue-kc',
    poleT: 0.25,
    lengthRatio: 0.62,
    widthPx: 44,
    baseAngle: 0.18,
    archBend: 120,
    tipLift: -240,
    phase: 2.1,
    speed: 2.4,
    ampPx: 22,
    color: '#1d8cd8',
    inkColor: '#ffffff',
    swallowtail: 0.55,
    stamps: [
      { pos: 0.36, kind: 'KC', scale: 0.95 },
      { pos: 0.72, kind: 'WORLDS_IMG', scale: 0.85 },
    ],
    layer: 1,
  },
  {
    id: 'bg-sand-lyon',
    poleT: 0.32,
    lengthRatio: 0.68,
    widthPx: 48,
    baseAngle: 0.22,
    archBend: 145,
    tipLift: -250,
    phase: 3.0,
    speed: 2.2,
    ampPx: 21,
    color: '#cbb28c',
    inkColor: '#18181b',
    swallowtail: 0.6,
    stamps: [
      { pos: 0.42, kind: 'LYON', scale: 0.95 },
      { pos: 0.82, kind: 'YEAR_26', scale: 0.95 },
    ],
    layer: 1,
  },
  {
    id: 'bg-lower-crimson',
    poleT: 0.56,
    lengthRatio: 0.74,
    widthPx: 48,
    baseAngle: 0.28,
    archBend: 150,
    tipLift: -85,
    phase: 0.9,
    speed: 2.1,
    ampPx: 19,
    color: '#cf1b2e',
    inkColor: '#ffffff',
    swallowtail: 0.7,
    stamps: [
      { pos: 0.52, kind: 'T1', scale: 0.95 },
      { pos: 0.88, kind: 'YEAR_26', scale: 0.9 },
    ],
    layer: 1,
  },
  {
    id: 'bg-lower-dark-cascade',
    poleT: 0.64,
    lengthRatio: 0.58,
    widthPx: 50,
    baseAngle: 0.44,
    archBend: 130,
    tipLift: -20,
    phase: 2.5,
    speed: 2.0,
    ampPx: 16,
    color: '#19191d',
    inkColor: '#ffffff',
    swallowtail: 0.65,
    stamps: [
      { pos: 0.45, kind: 'WORLDS_IMG', scale: 0.95 },
      { pos: 0.8, kind: 'ARROWS', scale: 0.9 },
    ],
    layer: 1,
  },

  // ── Mid-ground main sweeping ribbons (matches the dense S-curve body) ──
  {
    id: 'mid-white-ig-upper',
    poleT: 0.14,
    lengthRatio: 0.48,
    widthPx: 50,
    baseAngle: 0.08,
    archBend: 65,
    tipLift: -90,
    phase: 1.1,
    speed: 2.5,
    ampPx: 17,
    color: '#ece8df',
    inkColor: '#141416',
    swallowtail: 0.55,
    stamps: [
      { pos: 0.34, kind: 'ARROWS', scale: 0.95 },
      { pos: 0.72, kind: 'IG', scale: 0.95 },
    ],
    layer: 2,
  },
  {
    id: 'mid-c9-red',
    poleT: 0.22,
    lengthRatio: 0.59,
    widthPx: 52,
    baseAngle: 0.15,
    archBend: 130,
    tipLift: -215,
    phase: 1.8,
    speed: 2.4,
    ampPx: 21,
    color: '#d62027',
    accentColor: '#ffffff',
    inkColor: '#ffffff',
    swallowtail: 0.6,
    stamps: [
      { pos: 0.36, kind: 'WORLDS_IMG', scale: 0.95 },
      { pos: 0.78, kind: 'C9', scale: 1.0 },
    ],
    layer: 2,
  },
  {
    id: 'mid-hle-orange',
    poleT: 0.28,
    lengthRatio: 0.64,
    widthPx: 48,
    baseAngle: 0.19,
    archBend: 155,
    tipLift: -210,
    phase: 2.6,
    speed: 2.35,
    ampPx: 20,
    color: '#f96302',
    inkColor: '#ffffff',
    swallowtail: 0.6,
    stamps: [
      { pos: 0.44, kind: 'HLE', scale: 1.0 },
      { pos: 0.82, kind: 'WORLDS_IMG', scale: 0.9 },
    ],
    layer: 2,
  },
  {
    id: 'mid-gold-olive',
    poleT: 0.26,
    lengthRatio: 0.58,
    widthPx: 46,
    baseAngle: 0.21,
    archBend: 145,
    tipLift: -175,
    phase: 0.7,
    speed: 2.25,
    ampPx: 18,
    color: '#bca14a',
    inkColor: '#ffffff',
    swallowtail: 0.55,
    stamps: [
      { pos: 0.48, kind: 'GEN_IMG', scale: 0.95 },
      { pos: 0.84, kind: 'YEAR_26', scale: 0.9 },
    ],
    layer: 2,
  },
  {
    id: 'mid-black-worlds-center',
    poleT: 0.24,
    lengthRatio: 0.72,
    widthPx: 54,
    baseAngle: 0.17,
    archBend: 140,
    tipLift: -230,
    phase: 3.4,
    speed: 2.3,
    ampPx: 22,
    color: '#151518',
    inkColor: '#ffffff',
    swallowtail: 0.7,
    stamps: [
      { pos: 0.34, kind: 'WORLDS_IMG', scale: 1.05 },
      { pos: 0.66, kind: 'G2', scale: 0.95 },
      { pos: 0.9, kind: 'ARROWS', scale: 0.9 },
    ],
    layer: 2,
  },
  {
    id: 'mid-lower-silver-ig',
    poleT: 0.44,
    lengthRatio: 0.69,
    widthPx: 50,
    baseAngle: 0.27,
    archBend: 165,
    tipLift: -120,
    phase: 1.5,
    speed: 2.2,
    ampPx: 19,
    color: '#d4d4d8',
    inkColor: '#18181b',
    swallowtail: 0.6,
    stamps: [
      { pos: 0.42, kind: 'IG', scale: 1.0 },
      { pos: 0.76, kind: 'WORLDS_IMG', scale: 0.95 },
    ],
    layer: 2,
  },
  {
    id: 'mid-lower-teal-fnc',
    poleT: 0.52,
    lengthRatio: 0.56,
    widthPx: 48,
    baseAngle: 0.36,
    archBend: 150,
    tipLift: -55,
    phase: 2.9,
    speed: 2.15,
    ampPx: 17,
    color: '#1b8a84',
    inkColor: '#ffffff',
    swallowtail: 0.65,
    stamps: [
      { pos: 0.52, kind: 'FNC', scale: 1.0 },
      { pos: 0.82, kind: 'YEAR_26', scale: 0.9 },
    ],
    layer: 2,
  },
  {
    id: 'mid-lower-gold-cascade',
    poleT: 0.58,
    lengthRatio: 0.52,
    widthPx: 50,
    baseAngle: 0.46,
    archBend: 120,
    tipLift: -15,
    phase: 0.3,
    speed: 2.05,
    ampPx: 16,
    color: '#b89b67',
    inkColor: '#ffffff',
    swallowtail: 0.6,
    stamps: [
      { pos: 0.28, kind: 'ARROWS', scale: 1.0 },
      { pos: 0.68, kind: 'YEAR_26', scale: 1.0 },
    ],
    layer: 2,
  },

  // ── Foreground Hero Ribbons (sharp, prominent 2026 teams + "26" numerals) ──
  // 1) Top Gold GEN.G Pennant (matches top yellow pennant on pole)
  {
    id: 'fg-top-gen-gold',
    poleT: 0.075,
    lengthRatio: 0.22,
    widthPx: 52,
    baseAngle: -0.02,
    archBend: 18,
    tipLift: -14,
    phase: 0.2,
    speed: 2.8,
    ampPx: 12,
    color: '#e6c34a',
    inkColor: '#141416',
    swallowtail: 0.75,
    stamps: [{ pos: 0.48, kind: 'GEN_IMG', scale: 1.05 }],
    layer: 3,
  },
  // 2) Top Sky-Blue BLG Pennant (matches top blue pennant right below yellow on pole)
  {
    id: 'fg-top-blg-blue',
    poleT: 0.11,
    lengthRatio: 0.2,
    widthPx: 54,
    baseAngle: 0.03,
    archBend: 22,
    tipLift: -28,
    phase: 0.9,
    speed: 2.7,
    ampPx: 11,
    color: '#38bdf8',
    accentColor: '#0051ff',
    inkColor: '#ffffff',
    swallowtail: 0.7,
    stamps: [{ pos: 0.5, kind: 'BLG_IMG', scale: 1.05 }],
    layer: 3,
  },
  // 3) Upper Cyan BLG Long Streamer
  {
    id: 'fg-upper-blg-cyan',
    poleT: 0.19,
    lengthRatio: 0.28,
    widthPx: 42,
    baseAngle: 0.09,
    archBend: 28,
    tipLift: -18,
    phase: 1.6,
    speed: 2.6,
    ampPx: 12,
    color: '#22c5ff',
    inkColor: '#ffffff',
    swallowtail: 0.55,
    stamps: [{ pos: 0.52, kind: 'BLG_IMG', scale: 0.95 }],
    layer: 3,
  },
  // 4) Prominent Sand "26" Center Ribbon (replaces the central sand "22" ribbon in reference)
  {
    id: 'fg-center-sand-26',
    poleT: 0.23,
    lengthRatio: 0.52,
    widthPx: 56,
    baseAngle: 0.19,
    archBend: 95,
    tipLift: -80,
    phase: 2.2,
    speed: 2.35,
    ampPx: 16,
    color: '#d5bc96',
    inkColor: '#ffffff',
    swallowtail: 0.65,
    stamps: [
      { pos: 0.44, kind: 'YEAR_26', scale: 1.2 },
      { pos: 0.82, kind: 'GEN_IMG', scale: 0.95 },
    ],
    layer: 3,
  },
  // 5) Prominent Red Shield / T1 Center Ribbon right under Sand "26"
  {
    id: 'fg-center-red-t1',
    poleT: 0.27,
    lengthRatio: 0.56,
    widthPx: 54,
    baseAngle: 0.23,
    archBend: 115,
    tipLift: -95,
    phase: 2.7,
    speed: 2.4,
    ampPx: 17,
    color: '#e1251b',
    inkColor: '#ffffff',
    swallowtail: 0.6,
    stamps: [
      { pos: 0.56, kind: 'T1', scale: 1.05 },
      { pos: 0.85, kind: 'WORLDS_IMG', scale: 0.95 },
    ],
    layer: 3,
  },
  // 6) Black T1 & Arrows Diagonal Ribbon (matches the black T1 + 4-arrow ribbon in center)
  {
    id: 'fg-center-black-t1-arrows',
    poleT: 0.31,
    lengthRatio: 0.6,
    widthPx: 54,
    baseAngle: 0.29,
    archBend: 135,
    tipLift: -75,
    phase: 3.2,
    speed: 2.3,
    ampPx: 18,
    color: '#141417',
    inkColor: '#ffffff',
    swallowtail: 0.65,
    stamps: [
      { pos: 0.34, kind: 'ARROWS', scale: 1.05 },
      { pos: 0.48, kind: 'T1', scale: 1.05 },
      { pos: 0.78, kind: 'WORLDS_IMG', scale: 0.95 },
    ],
    layer: 3,
  },
  // 7) White/Silver Cascading Worlds Crest Ribbon
  {
    id: 'fg-cascade-white-worlds',
    poleT: 0.36,
    lengthRatio: 0.56,
    widthPx: 52,
    baseAngle: 0.38,
    archBend: 130,
    tipLift: -35,
    phase: 0.6,
    speed: 2.2,
    ampPx: 17,
    color: '#e4e4e7',
    inkColor: '#18181b',
    swallowtail: 0.6,
    stamps: [
      { pos: 0.46, kind: 'WORLDS_IMG', scale: 1.05 },
      { pos: 0.76, kind: 'BLG_IMG', scale: 0.95 },
    ],
    layer: 3,
  },
  // 8) Black Cascading Worlds Crest Ribbon next to White Ribbon
  {
    id: 'fg-cascade-black-worlds',
    poleT: 0.39,
    lengthRatio: 0.54,
    widthPx: 50,
    baseAngle: 0.42,
    archBend: 125,
    tipLift: -25,
    phase: 1.3,
    speed: 2.25,
    ampPx: 16,
    color: '#18181c',
    inkColor: '#ffffff',
    swallowtail: 0.65,
    stamps: [
      { pos: 0.36, kind: 'WORLDS_IMG', scale: 1.0 },
      { pos: 0.52, kind: 'WORLDS_IMG', scale: 1.0 },
      { pos: 0.82, kind: 'GEN_IMG', scale: 0.95 },
    ],
    layer: 3,
  },
  // 9) Right-side Pole Cluster: Mint DK Ribbon
  {
    id: 'fg-pole-mint-dk',
    poleT: 0.25,
    lengthRatio: 0.22,
    widthPx: 44,
    baseAngle: 0.06,
    archBend: -18,
    tipLift: 12,
    phase: 2.0,
    speed: 2.6,
    ampPx: 10,
    color: '#5eead4',
    inkColor: '#0f172a',
    swallowtail: 0.55,
    stamps: [{ pos: 0.52, kind: 'DK', scale: 0.95 }],
    layer: 4,
  },
  // 10) Right-side Pole Cluster: Orange HLE Short Pennant
  {
    id: 'fg-pole-orange-hle',
    poleT: 0.35,
    lengthRatio: 0.2,
    widthPx: 48,
    baseAngle: -0.18,
    archBend: -22,
    tipLift: 18,
    phase: 2.8,
    speed: 2.7,
    ampPx: 11,
    color: '#ff6b00',
    inkColor: '#ffffff',
    swallowtail: 0.7,
    stamps: [{ pos: 0.46, kind: 'HLE', scale: 0.95 }],
    layer: 4,
  },
  // 11) Right-side Pole Cluster: Dark Charcoal "26" Pennant (replaces right-side "22" pennant)
  {
    id: 'fg-pole-charcoal-26-upper',
    poleT: 0.43,
    lengthRatio: 0.22,
    widthPx: 54,
    baseAngle: 0.14,
    archBend: -20,
    tipLift: 15,
    phase: 0.5,
    speed: 2.5,
    ampPx: 10,
    color: '#27272a',
    inkColor: '#ffffff',
    swallowtail: 0.7,
    stamps: [
      { pos: 0.42, kind: 'YEAR_26', scale: 1.15 },
      { pos: 0.76, kind: 'ARROWS', scale: 0.85 },
    ],
    layer: 4,
  },
  // 12) Right-side Pole Cluster: Lower Black "26" Pennant (replaces second right-side "22" pennant)
  {
    id: 'fg-pole-black-26-lower',
    poleT: 0.53,
    lengthRatio: 0.24,
    widthPx: 52,
    baseAngle: 0.28,
    archBend: -15,
    tipLift: 20,
    phase: 1.7,
    speed: 2.45,
    ampPx: 11,
    color: '#18181b',
    inkColor: '#ffffff',
    swallowtail: 0.65,
    stamps: [
      { pos: 0.48, kind: 'YEAR_26', scale: 1.15 },
      { pos: 0.8, kind: 'ARROWS', scale: 0.9 },
    ],
    layer: 4,
  },
  // 13) Right-side Pole Cluster: Ice Mint Worlds Crest Pennant at bottom-right of pole
  {
    id: 'fg-pole-ice-mint',
    poleT: 0.49,
    lengthRatio: 0.16,
    widthPx: 48,
    baseAngle: -0.25,
    archBend: -16,
    tipLift: 12,
    phase: 2.4,
    speed: 2.65,
    ampPx: 9,
    color: '#a7f3d0',
    inkColor: '#0f172a',
    swallowtail: 0.65,
    stamps: [{ pos: 0.48, kind: 'WORLDS_IMG', scale: 0.95 }],
    layer: 4,
  },
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function shadeHex(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r * factor)}, ${clamp(g * factor)}, ${clamp(b * factor)})`;
}

/**
 * Draw crisp vector or raster emblem onto a ribbon segment in local tangent space
 */
function drawRibbonEmblem(
  ctx: CanvasRenderingContext2D,
  kind: EmblemKind,
  inkColor: string,
  size: number,
  images: {
    worlds: HTMLImageElement | null;
    gen: HTMLImageElement | null;
    blg: HTMLImageElement | null;
  }
) {
  ctx.save();
  ctx.fillStyle = inkColor;
  ctx.strokeStyle = inkColor;

  if (kind === 'YEAR_26') {
    ctx.font = `900 ${Math.round(size * 1.15)}px "Barlow Condensed", "Anton", Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('26', 0, 1);
    ctx.restore();
    return;
  }

  if (kind === 'ARROWS') {
    // LoL Esports iconic 4-corner outward arrows square emblem
    const s = size * 0.44;
    ctx.lineWidth = Math.max(2, size * 0.11);
    ctx.lineCap = 'square';
    const corners = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx * s * 0.3, cy * s);
      ctx.lineTo(cx * s, cy * s);
      ctx.lineTo(cx * s, cy * s * 0.3);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (kind === 'WORLDS_IMG' && images.worlds && images.worlds.complete) {
    const d = size * 1.1;
    ctx.drawImage(images.worlds, -d / 2, -d / 2, d, d);
    ctx.restore();
    return;
  }

  if (kind === 'GEN_IMG' && images.gen && images.gen.complete) {
    const d = size * 1.15;
    ctx.drawImage(images.gen, -d / 2, -d / 2, d, d);
    ctx.restore();
    return;
  }

  if (kind === 'BLG_IMG' && images.blg && images.blg.complete) {
    const w = size * 1.35;
    const h = size * 0.92;
    ctx.drawImage(images.blg, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }

  if (kind === 'T1') {
    // Iconic T1 stylized wing-T mark
    ctx.font = `900 italic ${Math.round(size * 0.95)}px "Anton", Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T1', 0, 1);
    ctx.lineWidth = Math.max(1.8, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(-size * 0.58, -size * 0.26);
    ctx.lineTo(-size * 0.18, -size * 0.26);
    ctx.moveTo(-size * 0.5, -size * 0.05);
    ctx.lineTo(-size * 0.22, -size * 0.05);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (kind === 'C9') {
    ctx.font = `800 ${Math.round(size * 0.52)}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CLOUD9', 0, 0);
    ctx.restore();
    return;
  }

  // Team badge monogram for HLE, DK, G2, IG, FNC, KC, LYON, AL
  ctx.font = `900 ${Math.round(size * 0.72)}px "Barlow Condensed", "Anton", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kind, 0, 1);
  ctx.restore();
}

export const WorldsZeroFlagStage: React.FC<WorldsZeroFlagStageProps> = ({
  isPreviewMode = false,
  onExitPreview,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load real broadcast team/event logos for stamping onto the waving cloth ribbons
    const worldsImg = new Image();
    worldsImg.src = 'assets/logos/worlds_crest.png';
    const genImg = new Image();
    genImg.src = 'assets/logos/gen_logo.png';
    const blgImg = new Image();
    blgImg.src = 'assets/logos/blg_logo.png';

    let rafId = 0;
    const sortedRibbons = [...WORLDS_2026_RIBBONS].sort((a, b) => a.layer - b.layer);

    // Pole top & bottom in normalized 1920x1080 coordinates (tilted -14deg on the right)
    const poleTopX = 1508;
    const poleTopY = -30;
    const poleBotX = 1812;
    const poleBotY = 1110;

    const renderFrame = (nowMs: number) => {
      const t = nowMs * 0.001;
      const W = 1920;
      const H = 1080;

      ctx.clearRect(0, 0, W, H);

      // 1. Render each waving swallowtail ribbon from back layer to front layer
      const SEGMENTS = 26;

      for (const r of sortedRibbons) {
        const anchorX = poleTopX + (poleBotX - poleTopX) * r.poleT;
        const anchorY = poleTopY + (poleBotY - poleTopY) * r.poleT;
        const totalLen = W * r.lengthRatio;

        const ptsX: number[] = [];
        const ptsY: number[] = [];
        const halfWidths: number[] = [];

        for (let i = 0; i <= SEGMENTS; i++) {
          const u = i / SEGMENTS; // 0 at pole -> 1 at left tip
          const dist = u * totalLen;

          // Base leftwards S-curve trajectory matching the reference cluster
          const dirX = -Math.cos(r.baseAngle);
          const dirY = Math.sin(r.baseAngle);

          // Smooth arch droop in the middle + upward curl toward the left tips
          const archOffset =
            Math.sin(u * Math.PI) * r.archBend + Math.pow(u, 2.2) * r.tipLift;

          // Traveling wind wave (amplitude grows from 0 at the pole to full at the free tip)
          const env = Math.pow(u, 0.85);
          const wave1 = Math.sin(u * 5.8 - t * r.speed + r.phase);
          const wave2 = 0.38 * Math.cos(u * 10.5 - t * (r.speed * 1.35) + r.phase * 1.7);
          const windDisp = env * r.ampPx * (wave1 + wave2);

          const px = anchorX + dirX * dist - dirY * (archOffset * 0.25);
          const py = anchorY + dirY * dist + archOffset + windDisp;

          ptsX.push(px);
          ptsY.push(py);

          // Slight natural taper near the pole knot and near the tip
          const knotPinch = 0.72 + 0.28 * Math.min(1, u * 4.5);
          const tipTaper = 1 - 0.18 * Math.pow(u, 2.5);
          halfWidths.push((r.widthPx * 0.5) * knotPinch * tipTaper);
        }

        // Compute normals at each spine vertex
        const normX: number[] = [];
        const normY: number[] = [];
        const tangAngle: number[] = [];

        for (let i = 0; i <= SEGMENTS; i++) {
          const i0 = Math.max(0, i - 1);
          const i1 = Math.min(SEGMENTS, i + 1);
          const dx = ptsX[i1] - ptsX[i0];
          const dy = ptsY[i1] - ptsY[i0];
          const len = Math.hypot(dx, dy) || 1;
          // Normal pointing "up" relative to leftward ribbon
          normX.push(dy / len);
          normY.push(-dx / len);
          tangAngle.push(Math.atan2(dy, dx));
        }

        // Cast shadow under the ribbon for 3D depth separation between overlapping streamers
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i <= SEGMENTS; i++) {
          const x = ptsX[i] + normX[i] * halfWidths[i] + 4;
          const y = ptsY[i] + normY[i] * halfWidths[i] + 10;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        for (let i = SEGMENTS; i >= 0; i--) {
          const x = ptsX[i] - normX[i] * halfWidths[i] + 4;
          const y = ptsY[i] - normY[i] * halfWidths[i] + 10;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.fill();
        ctx.restore();

        // Draw segmented cloth quads with 3D fold shading
        const forkStartIdx = r.swallowtail > 0 ? SEGMENTS - 2 : SEGMENTS;

        for (let i = 0; i < forkStartIdx; i++) {
          const x0 = ptsX[i];
          const y0 = ptsY[i];
          const x1 = ptsX[i + 1];
          const y1 = ptsY[i + 1];

          const hw0 = halfWidths[i];
          const hw1 = halfWidths[i + 1];

          // Curvature/slope shading factor simulates studio key light hitting cloth folds
          const dy = y1 - y0;
          const dx = x1 - x0;
          const slope = dy / (Math.abs(dx) + 1);
          const waveHighlight = Math.sin((i / SEGMENTS) * 6.0 - t * r.speed + r.phase) * 0.14;
          const lightFactor = Math.max(0.58, Math.min(1.22, 0.96 - slope * 0.24 + waveHighlight));

          ctx.beginPath();
          ctx.moveTo(x0 + normX[i] * hw0, y0 + normY[i] * hw0);
          ctx.lineTo(x1 + normX[i + 1] * hw1, y1 + normY[i + 1] * hw1);
          ctx.lineTo(x1 - normX[i + 1] * hw1, y1 - normY[i + 1] * hw1);
          ctx.lineTo(x0 - normX[i] * hw0, y0 - normY[i] * hw0);
          ctx.closePath();

          ctx.fillStyle = shadeHex(r.color, lightFactor);
          ctx.fill();

          // Optional accent edge stripe
          if (r.accentColor) {
            ctx.beginPath();
            ctx.moveTo(x0 - normX[i] * (hw0 * 0.45), y0 - normY[i] * (hw0 * 0.45));
            ctx.lineTo(x1 - normX[i + 1] * (hw1 * 0.45), y1 - normY[i + 1] * (hw1 * 0.45));
            ctx.lineTo(x1 - normX[i + 1] * hw1, y1 - normY[i + 1] * hw1);
            ctx.lineTo(x0 - normX[i] * hw0, y0 - normY[i] * hw0);
            ctx.closePath();
            ctx.fillStyle = shadeHex(r.accentColor, lightFactor);
            ctx.fill();
          }
        }

        // Draw Swallowtail V-notch tip at the end of the ribbon
        if (r.swallowtail > 0) {
          const idxBase = forkStartIdx;
          const idxTip = SEGMENTS;
          const bx = ptsX[idxBase];
          const by = ptsY[idxBase];
          const tx = ptsX[idxTip];
          const ty = ptsY[idxTip];
          const bhw = halfWidths[idxBase];
          const thw = halfWidths[idxTip] * 1.08;

          // Notch center point pulled inward toward idxBase
          const notchRatio = 0.35;
          const nx = bx + (tx - bx) * notchRatio;
          const ny = by + (ty - by) * notchRatio;

          ctx.beginPath();
          ctx.moveTo(bx + normX[idxBase] * bhw, by + normY[idxBase] * bhw);
          ctx.lineTo(tx + normX[idxTip] * thw, ty + normY[idxTip] * thw);
          ctx.lineTo(nx, ny);
          ctx.lineTo(tx - normX[idxTip] * thw, ty - normY[idxTip] * thw);
          ctx.lineTo(bx - normX[idxBase] * bhw, by - normY[idxBase] * bhw);
          ctx.closePath();
          ctx.fillStyle = shadeHex(r.color, 0.94);
          ctx.fill();
        }

        // Stamp team logos, Worlds 26 crest, and "26" numerals onto the ribbon
        for (const stamp of r.stamps) {
          const segFloat = Math.min(SEGMENTS - 3, Math.max(2, stamp.pos * SEGMENTS));
          const segIdx = Math.floor(segFloat);
          const frac = segFloat - segIdx;
          const sx = ptsX[segIdx] + (ptsX[segIdx + 1] - ptsX[segIdx]) * frac;
          const sy = ptsY[segIdx] + (ptsY[segIdx + 1] - ptsY[segIdx]) * frac;

          // Keep text/logos upright while following the ribbon tangent
          let angle = tangAngle[segIdx];
          if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
            angle += Math.PI;
          }

          const size = halfWidths[segIdx] * 1.38 * (stamp.scale ?? 1);
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(angle);
          drawRibbonEmblem(ctx, stamp.kind, r.inkColor, size, {
            worlds: worldsImg,
            gen: genImg,
            blg: blgImg,
          });
          ctx.restore();
        }
      }

      // 2. Render the tilted metallic flagpole on the right side (over the ribbon knots)
      ctx.save();
      const poleDx = poleBotX - poleTopX;
      const poleDy = poleBotY - poleTopY;
      const poleLen = Math.hypot(poleDx, poleDy);
      const poleNx = -poleDy / poleLen;
      const poleNy = poleDx / poleLen;
      const poleRadius = 13;

      const grad = ctx.createLinearGradient(
        poleTopX - poleNx * poleRadius,
        poleTopY - poleNy * poleRadius,
        poleTopX + poleNx * poleRadius,
        poleTopY + poleNy * poleRadius
      );
      grad.addColorStop(0, '#52525b');
      grad.addColorStop(0.28, '#27272a');
      grad.addColorStop(0.7, '#09090b');
      grad.addColorStop(1, '#18181b');

      ctx.beginPath();
      ctx.moveTo(poleTopX - poleNx * poleRadius, poleTopY - poleNy * poleRadius);
      ctx.lineTo(poleTopX + poleNx * poleRadius, poleTopY + poleNy * poleRadius);
      ctx.lineTo(poleBotX + poleNx * poleRadius, poleBotY + poleNy * poleRadius);
      ctx.lineTo(poleBotX - poleNx * poleRadius, poleBotY - poleNy * poleRadius);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = -6;
      ctx.fill();
      ctx.restore();

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      data-testid="worlds-zero-flag-stage"
      className="group/zeroflag absolute inset-0 z-[42] bg-[#141416] overflow-hidden select-none flex flex-col justify-between"
    >
      {/* =====================================================================
          1. GIANT FULL-BLEED BACKGROUND "WORLDS" TYPOGRAPHY (MATCHING REFERENCE)
         ===================================================================== */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-1.5%] top-[-4%] flex items-start justify-between leading-none z-0"
      >
        <span
          style={{
            fontFamily: "'Anton', 'Barlow Condensed', Impact, sans-serif",
            fontSize: 'clamp(7.5rem, 29.5vw, 35rem)',
            letterSpacing: '-0.025em',
            lineHeight: 0.86,
          }}
          className="w-full text-center font-black text-[#f4f4f6] uppercase tracking-tighter select-none"
        >
          WORLDS
        </span>
      </div>

      {/* =====================================================================
          2. 60FPS DYNAMIC WAVING 2026 TEAM PENNANTS & FLAGPOLE CANVAS
         ===================================================================== */}
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        data-testid="worlds-zero-flag-canvas"
        className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
      />

      {/* =====================================================================
          3. SUBTLE TOP-LEFT LIVE MATCH STATUS & BGM LOCK INDICATOR (VISIBLE ON HOVER)
         ===================================================================== */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-5 pt-4 opacity-95 md:opacity-0 md:group-hover/zeroflag:opacity-100 transition-opacity duration-200">
        <div className="inline-flex items-center gap-2 rounded-full bg-black/75 border border-white/15 px-3.5 py-1.5 backdrop-blur-md text-xs font-extrabold text-white shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-[#00d2ff]" />
          <span>WORLDS 2026 GRAND FINALS · 倒计时归零开赛主视觉 (GEN vs BLG)</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0051ff] text-[10px] text-white">
            <Music className="w-3 h-3" />
            <span>BGM 已锁定：Know My Name</span>
          </span>
        </div>

        {isPreviewMode && onExitPreview && (
          <button
            type="button"
            data-testid="exit-zero-flag-preview-btn"
            onClick={onExitPreview}
            className="inline-flex items-center gap-1.5 rounded-xl bg-black/80 hover:bg-[#0051ff] text-white border border-white/25 px-3.5 py-1.5 text-xs font-extrabold backdrop-blur-md shadow-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>返回实时倒计时画面</span>
          </button>
        )}
      </div>

      {/* =====================================================================
          4. BOTTOM OFFICIAL FOOTER BAR: WORLDS 2026 | ONE & ONLY | LOL ESPORTS
         ===================================================================== */}
      <div className="relative z-20 w-full px-[4.6%] pb-[2.6%] pt-6 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex items-center justify-between text-[11px] sm:text-xs md:text-sm font-mono font-bold tracking-[0.16em] text-[#e4e4e7] uppercase pointer-events-none">
        <span data-testid="zero-flag-year-label">WORLDS 2026</span>
        <span data-testid="zero-flag-slogan">THIS IS OUR MOMENT</span>
        <span>LOL ESPORTS</span>
      </div>
    </div>
  );
};
