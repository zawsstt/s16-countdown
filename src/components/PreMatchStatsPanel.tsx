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
  note: string;
}

export interface HeadToHeadRecordItem {
  match: string;
  event: string;
  BLGWins: number;
  OpponentWins: number;
  opponent: string;
  scoreText: string;
  winner: 'BLG' | 'GEN' | 'UPCOMING';
}

/**
 * GEN vs BLG 2026 赛季至 S16 全球总决赛各阶段胜率趋势数据（%）
 */
export const TEAM_WIN_RATE_TREND_DATA: WinRateTrendPoint[] = [
  { stage: '春季赛', GEN: 81.2, BLG: 83.3, note: '赛区春季赛阶段' },
  { stage: '2026 MSI', GEN: 76.5, BLG: 79.4, note: '季中冠军赛阶段' },
  { stage: '夏季赛', GEN: 84.6, BLG: 85.7, note: '赛区夏季赛阶段' },
  { stage: 'S16 瑞士轮', GEN: 85.7, BLG: 80.0, note: '全球总决赛瑞士轮' },
  { stage: 'S16 八强', GEN: 86.4, BLG: 92.5, note: 'BLG 3:0 零封 DK' },
  { stage: 'S16 四强', GEN: 83.8, BLG: 88.9, note: 'BLG 3:1 击败 T1' },
  { stage: '赛前综合', GEN: 80.4, BLG: 80.0, note: 'AWS 战力榜 1578 同分榜首' },
];

/**
 * BLG vs GEN 历次国际赛 BO5 交手记录及 2026 S16 淘汰赛对阵 LCK 战绩
 */
export const HEAD_TO_HEAD_RECORDS: HeadToHeadRecordItem[] = [
  {
    match: '23 MSI 淘汰赛',
    event: '2023 季中冠军赛 淘汰赛',
    BLGWins: 3,
    OpponentWins: 0,
    opponent: 'GEN',
    scoreText: '3 : 0',
    winner: 'BLG',
  },
  {
    match: '23 S13 八强',
    event: '2023 全球总决赛 八强赛',
    BLGWins: 3,
    OpponentWins: 2,
    opponent: 'GEN',
    scoreText: '3 : 2',
    winner: 'BLG',
  },
  {
    match: '24 MSI 胜决',
    event: '2024 季中冠军赛 胜者组决赛',
    BLGWins: 1,
    OpponentWins: 3,
    opponent: 'GEN',
    scoreText: '1 : 3',
    winner: 'GEN',
  },
  {
    match: '24 MSI 决赛',
    event: '2024 季中冠军赛 决赛',
    BLGWins: 1,
    OpponentWins: 3,
    opponent: 'GEN',
    scoreText: '1 : 3',
    winner: 'GEN',
  },
  {
    match: '26 S16 八强',
    event: '2026 全球总决赛 八强赛 (vs DK)',
    BLGWins: 3,
    OpponentWins: 0,
    opponent: 'DK',
    scoreText: '3 : 0',
    winner: 'BLG',
  },
  {
    match: '26 S16 四强',
    event: '2026 全球总决赛 四强赛 (vs T1)',
    BLGWins: 3,
    OpponentWins: 1,
    opponent: 'T1',
    scoreText: '3 : 1',
    winner: 'BLG',
  },
];

interface PreMatchStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PreMatchStatsPanel: React.FC<PreMatchStatsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'both' | 'trend' | 'h2h'>('both');

  if (!isOpen) return null;

  return (
    <aside
      data-testid="pre-match-stats-panel"
      aria-label="赛前数据统计面板"
      className="pointer-events-auto w-full md:w-[760px] lg:w-[860px] max-w-[96vw] mb-2 md:mb-0 md:absolute md:bottom-12 md:left-0 z-50 rounded-2xl border border-[#00d2ff]/45 bg-[#03081c]/95 backdrop-blur-xl p-4 shadow-[0_20px_70px_rgba(0,0,0,0.92)] text-slate-100 animate-fadeIn"
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
                AWS 战力同分 1578
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              GEN.G (LCK #1 · 37-9) vs BILIBILI GAMING (LPL #2 · 52-13) · 胜率趋势与近期 BO5 交手记录
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

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
        <div className="rounded-xl bg-[#01061c] border border-[#00d2ff]/30 px-3 py-2">
          <div className="text-[10px] font-bold text-[#00d2ff] uppercase">BLG 2026 总战绩</div>
          <div className="text-base font-black text-white font-mono">52胜 13负 (80.0%)</div>
          <div className="text-[10px] text-slate-400">八强 3:0 DK · 四强 3:1 T1</div>
        </div>
        <div className="rounded-xl bg-[#01061c] border border-[#f5b800]/30 px-3 py-2">
          <div className="text-[10px] font-bold text-[#f5b800] uppercase">GEN 2026 总战绩</div>
          <div className="text-base font-black text-white font-mono">37胜 9负 (80.4%)</div>
          <div className="text-[10px] text-slate-400">LCK #1 头号种子晋级决赛</div>
        </div>
        <div className="rounded-xl bg-[#01061c] border border-white/15 px-3 py-2">
          <div className="text-[10px] font-bold text-cyan-300 uppercase">BLG 对阵 LCK BO5</div>
          <div className="text-base font-black text-[#5ce1ff] font-mono">11胜 5负 (68.8%)</div>
          <div className="text-[10px] text-slate-400">2023–2026 国际赛 BO5 交锋</div>
        </div>
        <div className="rounded-xl bg-[#01061c] border border-white/15 px-3 py-2">
          <div className="text-[10px] font-bold text-amber-300 uppercase">GEN vs BLG 历史 BO5</div>
          <div className="text-base font-black text-white font-mono">2 : 2 战平</div>
          <div className="text-[10px] text-slate-400">S16 决赛迎来第 5 次 BO5 决战</div>
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
                <span>两支队伍 2026 胜率趋势对比 (%)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">2026 赛季 — S16 决赛前</span>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={TEAM_WIN_RATE_TREND_DATA}
                  margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
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
                    tick={{ fill: '#cbd5e1', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                  />
                  <YAxis
                    domain={[65, 100]}
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
                    formatter={(value, name) => [
                      `${value ?? 0}%`,
                      name === 'BLG' ? 'BLG 胜率' : 'GEN 胜率',
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                    formatter={(val) => (val === 'BLG' ? 'BLG (LPL #2)' : 'GEN (LCK #1)')}
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

        {/* Chart 2: Recent Head-to-Head & BO5 Records (BarChart) */}
        {(activeTab === 'both' || activeTab === 'h2h') && (
          <div
            data-testid="stats-h2h-chart-card"
            className="rounded-xl border border-white/10 bg-[#010518] p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                <Swords className="w-3.5 h-3.5 text-[#f5b800]" />
                <span>近期国际赛 BO5 交手记录与淘汰赛小局比分</span>
              </div>
              <span className="text-[10px] text-[#5ce1ff] font-bold">
                决赛 VS GEN 待交手
              </span>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={HEAD_TO_HEAD_RECORDS}
                  margin={{ top: 8, right: 12, left: -22, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="match"
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
                    formatter={(value, name) => [
                      `${value ?? 0} 局`,
                      name === 'BLGWins' ? 'BLG 胜场' : '对手 (GEN/LCK) 胜场',
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                    formatter={(val) =>
                      val === 'BLGWins' ? 'BLG 获胜小局' : 'GEN / LCK 对手获胜小局'
                    }
                  />
                  <Bar
                    dataKey="BLGWins"
                    fill="#00d2ff"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="OpponentWins"
                    fill="#f5b800"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Head-to-Head Timeline Pills */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
        <div className="inline-flex items-center gap-1.5 text-slate-300 font-semibold">
          <Trophy className="w-3.5 h-3.5 text-[#f5b800]" />
          <span>2026 世界赛晋级之路：</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 py-0.5 rounded bg-[#00d2ff]/15 border border-[#00d2ff]/40 text-[#5ce1ff] font-extrabold">
            八强赛 BLG 3:0 DK
          </span>
          <span className="px-2 py-0.5 rounded bg-[#00d2ff]/15 border border-[#00d2ff]/40 text-[#5ce1ff] font-extrabold">
            四强赛 BLG 3:1 T1
          </span>
          <span className="px-2.5 py-0.5 rounded bg-white text-slate-950 font-black tracking-wide">
            总决赛 BLG VS GEN (待交手)
          </span>
        </div>
      </div>
    </aside>
  );
};
