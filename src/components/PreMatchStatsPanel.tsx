import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Swords, X, Trophy } from 'lucide-react';

export interface WinRateTrendPoint {
  stage: string;
  GEN: number;
  BLG: number;
  genRecord: string;
  blgRecord: string;
  note: string;
}

export interface HeadToHeadRecordItem {
  match: string;
  event: string;
  BLGWins: number;
  OpponentWins: number;
  opponent: string;
  scoreText: string;
  winner: 'BLG' | 'GEN' | 'LCK';
}

/**
 * 经官方图例（AWS 全球战力榜 ____2 & 赛事前瞻 ____8）校验的两队胜率走势数据：
 * - AWS 全球战力榜基准（淘汰赛前）：BLG 52胜13负 (80.0%, 1578分) · GEN 37胜9负 (80.4%, 1578分)
 * - 2026 S16 八强赛后：BLG 3:0 零封 DK (累计 53-13, 80.3%) · GEN 击败 LYON 晋级 (累计 38-9, 80.9%)
 * - 2026 S16 四强赛后：BLG 3:1 击败 T1 (累计 54-13, 80.6%) · GEN 击败 IG 晋级决赛 (累计 39-9, 81.3%)
 */
export const TEAM_WIN_RATE_TREND_DATA: WinRateTrendPoint[] = [
  {
    stage: '26 先锋赛',
    BLG: 75.0,
    GEN: 78.6,
    blgRecord: '小组赛 3:2 BFX',
    genRecord: 'LCK 赛区头名',
    note: '2026 全球先锋赛阶段',
  },
  {
    stage: '26 MSI',
    BLG: 77.8,
    GEN: 79.2,
    blgRecord: '胜 T1/HLE · 决赛 2:3 HLE',
    genRecord: '季中赛阶段稳居前列',
    note: '2026 季中冠军赛阶段',
  },
  {
    stage: 'AWS 战力榜',
    BLG: 80.0,
    GEN: 80.4,
    blgRecord: '52胜 13负 (1578分 #1)',
    genRecord: '37胜 9负 (1578分 #1)',
    note: 'AWS 全球战力排行榜同分并列榜首',
  },
  {
    stage: 'S16 八强后',
    BLG: 80.3,
    GEN: 80.9,
    blgRecord: '53胜 13负 (八强 3:0 DK)',
    genRecord: '38胜 9负 (八强胜 LYON)',
    note: '2026 全球总决赛八强赛阶段',
  },
  {
    stage: 'S16 四强后',
    BLG: 80.6,
    GEN: 81.3,
    blgRecord: '54胜 13负 (四强 3:1 T1)',
    genRecord: '39胜 9负 (四强胜 IG)',
    note: '2026 全球总决赛四强赛后会师决赛',
  },
];

/**
 * 经《赛事前瞻8：26 BLG VS LCK IN BO5》逐行校验：
 * BLG 与 GEN 历次国际赛 BO5 直接交锋记录（共 4 场 BO5，大场 2:2 战平，小局 8:8 战平）
 */
export const GEN_VS_BLG_BO5_RECORDS: HeadToHeadRecordItem[] = [
  {
    match: '23 MSI 淘汰赛',
    event: '2023 季中冠军赛 淘汰赛 (BLG 3:0 GEN)',
    BLGWins: 3,
    OpponentWins: 0,
    opponent: 'GEN',
    scoreText: '3 : 0',
    winner: 'BLG',
  },
  {
    match: '23 S13 八强赛',
    event: '2023 全球总决赛 八强赛 (BLG 3:2 GEN)',
    BLGWins: 3,
    OpponentWins: 2,
    opponent: 'GEN',
    scoreText: '3 : 2',
    winner: 'BLG',
  },
  {
    match: '24 MSI 胜决',
    event: '2024 季中冠军赛 胜者组决赛 (BLG 1:3 GEN)',
    BLGWins: 1,
    OpponentWins: 3,
    opponent: 'GEN',
    scoreText: '1 : 3',
    winner: 'GEN',
  },
  {
    match: '24 MSI 决赛',
    event: '2024 季中冠军赛 决赛 (BLG 1:3 GEN)',
    BLGWins: 1,
    OpponentWins: 3,
    opponent: 'GEN',
    scoreText: '1 : 3',
    winner: 'GEN',
  },
];

/**
 * 经《赛事前瞻8：26 BLG VS LCK IN BO5》逐行校验：
 * 2026 赛季内 BLG 对阵 LCK 赛区战队全部 6 场 BO5 记录（5胜 1负，小局 17胜 9负）
 */
export const BLG_2026_LCK_BO5_RECORDS: HeadToHeadRecordItem[] = [
  {
    match: '26 先锋赛 vs BFX',
    event: '2026 全球先锋赛 小组赛 (BLG 3:2 BFX)',
    BLGWins: 3,
    OpponentWins: 2,
    opponent: 'BFX',
    scoreText: '3 : 2',
    winner: 'BLG',
  },
  {
    match: '26 MSI vs T1',
    event: '2026 季中冠军赛 淘汰赛 (BLG 3:2 T1)',
    BLGWins: 3,
    OpponentWins: 2,
    opponent: 'T1',
    scoreText: '3 : 2',
    winner: 'BLG',
  },
  {
    match: '26 MSI 胜决 HLE',
    event: '2026 季中冠军赛 胜者组决赛 (BLG 3:1 HLE)',
    BLGWins: 3,
    OpponentWins: 1,
    opponent: 'HLE',
    scoreText: '3 : 1',
    winner: 'BLG',
  },
  {
    match: '26 MSI 决赛 HLE',
    event: '2026 季中冠军赛 决赛 (BLG 2:3 HLE)',
    BLGWins: 2,
    OpponentWins: 3,
    opponent: 'HLE',
    scoreText: '2 : 3',
    winner: 'LCK',
  },
  {
    match: '26 S16 八强 DK',
    event: '2026 全球总决赛 八强赛 (BLG 3:0 DK)',
    BLGWins: 3,
    OpponentWins: 0,
    opponent: 'DK',
    scoreText: '3 : 0',
    winner: 'BLG',
  },
  {
    match: '26 S16 四强 T1',
    event: '2026 全球总决赛 四强赛 (BLG 3:1 T1)',
    BLGWins: 3,
    OpponentWins: 1,
    opponent: 'T1',
    scoreText: '3 : 1',
    winner: 'BLG',
  },
];

// 兼容导出
export const HEAD_TO_HEAD_RECORDS = GEN_VS_BLG_BO5_RECORDS;

interface PreMatchStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PreMatchStatsPanel: React.FC<PreMatchStatsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'both' | 'trend' | 'h2h'>('both');
  const [h2hScope, setH2hScope] = useState<'gen_only' | 'lck_2026'>('gen_only');

  if (!isOpen) return null;

  const activeH2hData =
    h2hScope === 'gen_only' ? GEN_VS_BLG_BO5_RECORDS : BLG_2026_LCK_BO5_RECORDS;

  return (
    <aside
      data-testid="pre-match-stats-panel"
      aria-label="赛前数据统计面板"
      className="pointer-events-auto w-full md:w-[780px] lg:w-[900px] max-w-[96vw] mb-2 md:mb-0 md:absolute md:bottom-12 md:left-0 z-50 rounded-2xl border border-[#00d2ff]/45 bg-[#03081c]/95 backdrop-blur-xl p-4 shadow-[0_20px_70px_rgba(0,0,0,0.92)] text-slate-100 animate-fadeIn"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#0051ff]/30 border border-[#00d2ff]/50 text-[#00d2ff]">
            <BarChart3 className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-wide text-white uppercase">
                赛前数据统计 · PRE-MATCH TELEMETRY
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#0051ff] text-[10px] font-extrabold text-white">
                AWS 战力榜同分 1578 #1
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              GEN.G (LCK #1 · Chovy 分均补刀 9.63 #1 / Canyon 20次MVP #1) vs BLG (LPL #2 · 对LCK BO5 11胜5负)
            </p>
          </div>
        </div>

        {/* View Mode Switcher + Close Button */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg bg-slate-950/90 p-0.5 border border-white/10 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab('both')}
              className={`px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                activeTab === 'both'
                  ? 'bg-[#0051ff] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              双图同览
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trend')}
              className={`px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                activeTab === 'trend'
                  ? 'bg-[#0051ff] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              胜率趋势
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('h2h')}
              className={`px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                activeTab === 'h2h'
                  ? 'bg-[#0051ff] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              近期交手
            </button>
          </div>

          <button
            type="button"
            data-testid="close-pre-match-stats-btn"
            onClick={onClose}
            aria-label="关闭赛前数据统计面板"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-600/80 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Verified KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
        <div className="rounded-xl bg-[#01061c] border border-[#00d2ff]/30 px-3 py-2">
          <div className="text-[10px] font-bold text-[#00d2ff] uppercase">
            BLG 战力榜战绩 (LPL #2)
          </div>
          <div className="text-base font-black text-white font-mono">
            52胜 13负 (80.0%)
          </div>
          <div className="text-[10px] text-slate-400">
            AWS 1578分 #1 · 八强 3:0 DK / 四强 3:1 T1
          </div>
        </div>
        <div className="rounded-xl bg-[#01061c] border border-[#f5b800]/30 px-3 py-2">
          <div className="text-[10px] font-bold text-[#f5b800] uppercase">
            GEN 战力榜战绩 (LCK #1)
          </div>
          <div className="text-base font-black text-white font-mono">
            37胜 9负 (80.4%)
          </div>
          <div className="text-[10px] text-slate-400">
            AWS 1578分 #1 · 八强胜 LYON / 四强胜 IG
          </div>
        </div>
        <div className="rounded-xl bg-[#01061c] border border-white/15 px-3 py-2">
          <div className="text-[10px] font-bold text-cyan-300 uppercase">
            BLG 对阵 LCK BO5 (23–26)
          </div>
          <div className="text-base font-black text-[#5ce1ff] font-mono">
            11胜 5负 (68.8%)
          </div>
          <div className="text-[10px] text-slate-400">
            2026 年内对 LCK BO5 5胜 1负 (83.3%)
          </div>
        </div>
        <div className="rounded-xl bg-[#01061c] border border-white/15 px-3 py-2">
          <div className="text-[10px] font-bold text-amber-300 uppercase">
            BLG vs GEN 历史 BO5
          </div>
          <div className="text-base font-black text-white font-mono">
            2 : 2 战平 (小局 8:8)
          </div>
          <div className="text-[10px] text-slate-400">
            23年 BLG 连胜 2 场 · 24年 MSI GEN 连胜 2 场
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div
        className={`grid gap-3 ${
          activeTab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {/* Chart 1: Win-Rate Trend (AreaChart) */}
        {(activeTab === 'both' || activeTab === 'trend') && (
          <div
            data-testid="stats-winrate-chart-card"
            className="rounded-xl border border-white/10 bg-[#010518] p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                <TrendingUp className="w-3.5 h-3.5 text-[#00d2ff]" />
                <span>两支队伍 2026 赛季胜率趋势对比 (%)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                先锋赛 → MSI → AWS 榜 → S16 四强后
              </span>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={TEAM_WIN_RATE_TREND_DATA}
                  margin={{ top: 10, right: 14, left: -18, bottom: 2 }}
                >
                  <defs>
                    <linearGradient id="blgCyanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#00d2ff" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="genGoldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f5b800" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f5b800" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="stage"
                    interval={0}
                    tick={{ fill: '#cbd5e1', fontSize: 10 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                  />
                  <YAxis
                    domain={[70, 86]}
                    ticks={[70, 74, 78, 82, 86]}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#030924',
                      borderColor: 'rgba(0, 210, 255, 0.45)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                    formatter={(value, name, props) => {
                      const payload = props?.payload as WinRateTrendPoint | undefined;
                      if (name === 'BLG') {
                        return [
                          `${value ?? 0}% (${payload?.blgRecord ?? ''})`,
                          'BLG (LPL #2)',
                        ];
                      }
                      return [
                        `${value ?? 0}% (${payload?.genRecord ?? ''})`,
                        'GEN (LCK #1)',
                      ];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                    formatter={(val) =>
                      val === 'BLG'
                        ? 'BLG (LPL #2 · 52-13 → 54-13)'
                        : 'GEN (LCK #1 · 37-9 → 39-9)'
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="BLG"
                    stroke="#00d2ff"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#blgCyanGrad)"
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="GEN"
                    stroke="#f5b800"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#genGoldGrad)"
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart 2: Head-to-Head & BO5 Records (BarChart) */}
        {(activeTab === 'both' || activeTab === 'h2h') && (
          <div
            data-testid="stats-h2h-chart-card"
            className="rounded-xl border border-white/10 bg-[#010518] p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                <Swords className="w-3.5 h-3.5 text-[#f5b800]" />
                <span>
                  {h2hScope === 'gen_only'
                    ? 'BLG vs GEN 历次 BO5 交手记录 (2:2 战平)'
                    : '2026 赛季 BLG vs LCK 战队 BO5 记录 (5胜1负)'}
                </span>
              </div>

              <div className="flex items-center rounded-md bg-slate-950 p-0.5 border border-white/10 text-[10px]">
                <button
                  type="button"
                  data-testid="h2h-scope-gen-btn"
                  onClick={() => setH2hScope('gen_only')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                    h2hScope === 'gen_only'
                      ? 'bg-[#f5b800] text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  vs GEN (4场)
                </button>
                <button
                  type="button"
                  data-testid="h2h-scope-lck-btn"
                  onClick={() => setH2hScope('lck_2026')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                    h2hScope === 'lck_2026'
                      ? 'bg-[#00d2ff] text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  26年 vs LCK (6场)
                </button>
              </div>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeH2hData}
                  margin={{ top: 10, right: 12, left: -22, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="match"
                    interval={0}
                    tick={{ fill: '#cbd5e1', fontSize: 10 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                  />
                  <YAxis
                    domain={[0, 3]}
                    ticks={[0, 1, 2, 3]}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#030924',
                      borderColor: 'rgba(245, 184, 0, 0.45)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                    formatter={(value, name, props) => {
                      const payload = props?.payload as HeadToHeadRecordItem | undefined;
                      if (name === 'BLGWins') {
                        return [`${value ?? 0} 局 (比分 ${payload?.scoreText ?? ''})`, 'BLG 获胜小局'];
                      }
                      return [
                        `${value ?? 0} 局 (对手 ${payload?.opponent ?? 'GEN'})`,
                        h2hScope === 'gen_only' ? 'GEN 获胜小局' : `${payload?.opponent ?? 'LCK'} 获胜小局`,
                      ];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                    formatter={(val) =>
                      val === 'BLGWins'
                        ? 'BLG 获胜小局'
                        : h2hScope === 'gen_only'
                        ? 'GEN 获胜小局'
                        : 'LCK 对手 (BFX / T1 / HLE / DK) 获胜小局'
                    }
                  />
                  <Bar
                    dataKey="BLGWins"
                    fill="#00d2ff"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="OpponentWins"
                    fill="#f5b800"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Verified Knockout Road & Milestone Strip */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
        <div className="inline-flex items-center gap-1.5 text-slate-300 font-semibold">
          <Trophy className="w-3.5 h-3.5 text-[#f5b800]" />
          <span>2026 全球总决赛淘汰赛晋级之路：</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 py-0.5 rounded bg-[#f5b800]/15 border border-[#f5b800]/40 text-amber-300 font-extrabold">
            GEN：八强胜 LYON · 四强胜 IG
          </span>
          <span className="px-2 py-0.5 rounded bg-[#00d2ff]/15 border border-[#00d2ff]/40 text-[#5ce1ff] font-extrabold">
            BLG：八强 3:0 DK · 四强 3:1 T1
          </span>
          <span className="px-2.5 py-0.5 rounded bg-white text-slate-950 font-black tracking-wide">
            冠亚军决赛：GEN VS BLG (待交手)
          </span>
        </div>
      </div>
    </aside>
  );
};
