import React, { useState, useMemo } from 'react';
import {
  Send,
  ThumbsUp,
  Eye,
  EyeOff,
  Users,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import type { DanmakuMessage } from '../../server';
import {
  validateDanmakuInput,
  computeVirtualizedDanmakuWindow,
  computeAntiOverlapDanmakuLayout,
  DANMAKU_MAX_CONCURRENT_DOM,
  DANMAKU_LANE_COUNT,
} from '../utils/broadcastLogic';
import { QUICK_DANMAKU_PRESETS } from '../data/finalsData';

interface DanmakuPluginProps {
  danmakuList: DanmakuMessage[];
  onlineCount: number;
  isConnected: boolean;
  showDanmakuOverlay: boolean;
  onToggleDanmakuOverlay: () => void;
  danmakuOpacity: number;
  onChangeDanmakuOpacity: (val: number) => void;
  onSendDanmaku: (payload: {
    text: string;
    author: string;
    team: 'GEN' | 'BLG' | 'NEUTRAL';
    color: string;
  }) => void;
  onLikeDanmaku: (id: string) => void;
}

const COLOR_OPTIONS = [
  { label: 'BLG 电光蓝', value: '#00d2ff' },
  { label: 'GEN 冠军金', value: '#f5b800' },
  { label: 'B站应援粉', value: '#ff4d94' },
  { label: '纯粹亮白', value: '#ffffff' },
  { label: '峡谷翠绿', value: '#34d399' },
];

/** 虚拟化列表单行固定高度（px）与可视容器高度（px） */
const VIRTUAL_ROW_HEIGHT_PX = 46;
const VIRTUAL_VIEWPORT_HEIGHT_PX = 184;

export const DanmakuPlugin: React.FC<DanmakuPluginProps> = ({
  danmakuList,
  onlineCount,
  isConnected,
  showDanmakuOverlay,
  onToggleDanmakuOverlay,
  danmakuOpacity,
  onChangeDanmakuOpacity,
  onSendDanmaku,
  onLikeDanmaku,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [author, setAuthor] = useState('峡谷召唤师');
  const [text, setText] = useState('');
  const [team, setTeam] = useState<'GEN' | 'BLG' | 'NEUTRAL'>('BLG');
  const [color, setColor] = useState('#00d2ff');
  const [teamFilter, setTeamFilter] = useState<'ALL' | 'GEN' | 'BLG'>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleTeamChange = (newTeam: 'GEN' | 'BLG' | 'NEUTRAL') => {
    setTeam(newTeam);
    if (newTeam === 'GEN') setColor('#f5b800');
    else if (newTeam === 'BLG') setColor('#00d2ff');
    else setColor('#ffffff');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateDanmakuInput(text, author);
    if (!validation.valid) {
      setErrorMsg(validation.error || '请输入有效弹幕');
      return;
    }
    setErrorMsg(null);
    onSendDanmaku({
      text: validation.sanitizedText,
      author: validation.sanitizedAuthor,
      team,
      color,
    });
    setText('');
  };

  // 按阵营过滤并倒序排列（最新在最上面）
  const reversedFilteredList = useMemo(() => {
    return danmakuList
      .filter((item) => {
        if (teamFilter === 'ALL') return true;
        return item.team === teamFilter;
      })
      .slice()
      .reverse();
  }, [danmakuList, teamFilter]);

  // 虚拟化窗口计算：高峰期即使有上百条历史弹幕，DOM 中也仅挂载可视区 + 缓冲行（约 10~12 个节点）
  const virtualWindow = useMemo(
    () =>
      computeVirtualizedDanmakuWindow(
        reversedFilteredList.length,
        scrollTop,
        VIRTUAL_VIEWPORT_HEIGHT_PX,
        VIRTUAL_ROW_HEIGHT_PX,
        3
      ),
    [reversedFilteredList.length, scrollTop]
  );

  const visibleRows = useMemo(
    () =>
      reversedFilteredList.slice(virtualWindow.startIndex, virtualWindow.endIndex),
    [reversedFilteredList, virtualWindow.startIndex, virtualWindow.endIndex]
  );

  // 实时计算大屏同轨道防重叠与 DOM 节流指标，便于导播实时监控
  const antiOverlapMetrics = useMemo(() => {
    const scheduled = computeAntiOverlapDanmakuLayout(
      danmakuList,
      Date.now(),
      DANMAKU_MAX_CONCURRENT_DOM,
      DANMAKU_LANE_COUNT
    );
    const maxDensity = scheduled.reduce((acc, s) => Math.max(acc, s.laneDensity), 0);
    const avgInterval =
      scheduled.length > 0
        ? (
            scheduled.reduce((acc, s) => acc + s.intervalSec, 0) / scheduled.length
          ).toFixed(1)
        : '2.4';
    return {
      activeDomCount: scheduled.length,
      maxDensity,
      avgInterval,
    };
  }, [danmakuList]);

  return (
    <div
      id="danmaku-hub"
      aria-label="实时弹幕助威互动插件"
      className="relative z-40 w-full md:w-auto pointer-events-auto"
    >
      {/* =====================================================================
          POPOVER DRAWER: EXPANDED REAL-TIME DANMAKU FEED & VIRTUALIZED LIST
         ===================================================================== */}
      {isDrawerOpen && (
        <div className="mb-2 md:mb-0 md:absolute md:bottom-12 md:right-0 z-50 w-full md:w-[460px] rounded-xl border border-[#0051ff]/50 bg-[#03081c]/95 backdrop-blur-xl p-3.5 shadow-[0_16px_60px_rgba(0,0,0,0.9)] animate-fadeIn">
          {/* Drawer Header: Live Connection + Opacity Control */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="font-bold text-white">S16 实时弹幕互动厅</span>
              <span className="text-slate-400">·</span>
              <Users className="w-3.5 h-3.5 text-[#00d2ff]" />
              <span className="font-mono text-slate-300 tabular-nums">{onlineCount}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <label htmlFor="danmaku-opacity-range" className="text-[11px] text-slate-400">
                透明度
              </label>
              <input
                id="danmaku-opacity-range"
                type="range"
                min={0.3}
                max={1}
                step={0.05}
                value={danmakuOpacity}
                onChange={(e) => onChangeDanmakuOpacity(parseFloat(e.target.value))}
                className="w-16 accent-[#00d2ff] cursor-pointer"
              />
            </div>
          </div>

          {/* Anti-Overlap & Virtualization Engine Status Bar */}
          <div
            data-testid="danmaku-engine-status"
            className="mt-2 mb-2.5 flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-[#010722] border border-[#00d2ff]/25 px-2.5 py-1.5 text-[11px] text-slate-300"
          >
            <div className="inline-flex items-center gap-1 text-[#00d2ff] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>
                防重叠间隔: <strong className="font-mono text-white">{antiOverlapMetrics.avgInterval}s</strong> (峰值密度 {antiOverlapMetrics.maxDensity}/轨)
              </span>
            </div>
            <div className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
              <Cpu className="w-3.5 h-3.5 shrink-0" />
              <span>
                虚拟化 DOM: <strong className="font-mono text-white">{antiOverlapMetrics.activeDomCount}/{DANMAKU_MAX_CONCURRENT_DOM}</strong>
              </span>
            </div>
          </div>

          {/* Author & Color Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <label htmlFor="danmaku-author" className="text-slate-400 shrink-0">
                昵称:
              </label>
              <input
                id="danmaku-author"
                type="text"
                maxLength={20}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-28 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:border-[#00d2ff] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => setColor(c.value)}
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-transform cursor-pointer ${
                    color === c.value ? 'border-white scale-110' : 'border-transparent opacity-75'
                  }`}
                >
                  <span
                    style={{ backgroundColor: c.value }}
                    className="w-3.5 h-3.5 rounded-full"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between gap-1 mb-2">
            <div className="flex items-center gap-1">
              {(['ALL', 'BLG', 'GEN'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setTeamFilter(tab);
                    setScrollTop(0);
                  }}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded transition-colors cursor-pointer ${
                    teamFilter === tab
                      ? 'bg-[#0051ff] text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'ALL'
                    ? `全部 (${danmakuList.length})`
                    : tab === 'BLG'
                    ? 'BLG 阵营'
                    : 'GEN 阵营'}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              渲染节点: {visibleRows.length}/{reversedFilteredList.length}
            </span>
          </div>

          {/* Virtualized Scrollable Live Danmaku List */}
          <div
            data-testid="danmaku-feed-list"
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            style={{ height: `${VIRTUAL_VIEWPORT_HEIGHT_PX}px` }}
            className="overflow-y-auto rounded-lg border border-white/10 bg-[#010412] p-2"
          >
            <div
              style={{
                paddingTop: `${virtualWindow.topSpacerPx}px`,
                paddingBottom: `${virtualWindow.bottomSpacerPx}px`,
              }}
              className="space-y-1.5"
            >
              {visibleRows.map((item) => (
                <div
                  key={item.id}
                  data-testid="danmaku-virtual-row"
                  style={{ minHeight: `${VIRTUAL_ROW_HEIGHT_PX - 6}px` }}
                  className="flex items-center justify-between gap-2 rounded bg-slate-900/70 px-2.5 py-1.5 border border-white/5 text-xs"
                >
                  <div className="min-w-0 flex-1 truncate">
                    <span
                      className={`font-bold mr-1.5 ${
                        item.team === 'GEN'
                          ? 'text-[#f5b800]'
                          : item.team === 'BLG'
                          ? 'text-[#00d2ff]'
                          : 'text-slate-400'
                      }`}
                    >
                      [{item.team === 'NEUTRAL' ? '观赛' : item.team}] {item.author}:
                    </span>
                    <span style={{ color: item.color }} className="font-medium">
                      {item.text}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLikeDanmaku(item.id)}
                    aria-label={`点赞弹幕 ${item.text}`}
                    className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 text-[11px] text-slate-300 shrink-0 cursor-pointer"
                  >
                    <ThumbsUp className="w-2.5 h-2.5 text-[#00d2ff]" />
                    <span className="font-mono tabular-nums">{item.likes}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick One-Click Presets */}
          <div className="mt-2.5 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1.5">
              <Sparkles className="w-3 h-3 text-[#00d2ff]" />
              <span>一键快捷助威弹幕：</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {QUICK_DANMAKU_PRESETS.slice(0, 4).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    onSendDanmaku({
                      text: preset.text,
                      author: author.trim() || '峡谷召唤师',
                      team: preset.team,
                      color:
                        preset.team === 'GEN'
                          ? '#f5b800'
                          : preset.team === 'BLG'
                          ? '#00d2ff'
                          : '#ffffff',
                    })
                  }
                  className="text-left text-[11px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white truncate max-w-full cursor-pointer"
                >
                  {preset.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ALWAYS-READY COMPACT BROADCAST DANMAKU LAUNCHER BAR
         ===================================================================== */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 rounded-xl border border-[#0051ff]/50 bg-[#03081c]/90 backdrop-blur-md px-2.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
      >
        {/* Camp Selector Pill (BLG / GEN / 中立) */}
        <div className="flex items-center rounded-lg bg-slate-950/90 p-0.5 border border-white/10 shrink-0">
          {(['BLG', 'GEN', 'NEUTRAL'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTeamChange(t)}
              className={`px-2 py-1 text-[11px] font-extrabold rounded-md transition-colors cursor-pointer ${
                team === t
                  ? t === 'BLG'
                    ? 'bg-[#00d2ff] text-slate-950'
                    : t === 'GEN'
                    ? 'bg-[#f5b800] text-slate-950'
                    : 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'NEUTRAL' ? '中立' : t}
            </button>
          ))}
        </div>

        {/* Danmaku Input */}
        <label htmlFor="danmaku-input" className="sr-only">
          助威弹幕内容
        </label>
        <input
          id="danmaku-input"
          type="text"
          maxLength={80}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="发送实时弹幕飞越导播画面..."
          className="min-w-[160px] sm:w-56 flex-1 rounded-lg border border-white/15 bg-slate-950/80 px-2.5 py-1 text-xs text-white placeholder:text-slate-400 focus:border-[#00d2ff] focus:outline-none"
        />

        {/* Send Button */}
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-lg bg-[#0051ff] hover:bg-[#0066ff] px-3 py-1 text-xs font-bold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>发射弹幕</span>
        </button>

        {/* Toggle Overlay Visibility */}
        <button
          type="button"
          onClick={onToggleDanmakuOverlay}
          aria-label={showDanmakuOverlay ? '隐藏大屏弹幕' : '显示大屏弹幕'}
          title={showDanmakuOverlay ? '大屏弹幕已开启' : '大屏弹幕已隐藏'}
          className={`p-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
            showDanmakuOverlay
              ? 'bg-[#00d2ff]/20 border-[#00d2ff]/50 text-[#00d2ff]'
              : 'bg-slate-900 border-white/10 text-slate-400'
          }`}
        >
          {showDanmakuOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        {/* Expand / Collapse Full Danmaku Interactive Drawer */}
        <button
          type="button"
          data-testid="toggle-danmaku-drawer-btn"
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#00d2ff]" />
          <span>弹幕厅 ({danmakuList.length})</span>
          {isDrawerOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      </form>

      {errorMsg && (
        <p
          role="alert"
          className="mt-1 rounded bg-rose-950/90 border border-rose-500/40 px-2.5 py-1 text-[11px] text-rose-200"
        >
          {errorMsg}
        </p>
      )}
    </div>
  );
};
