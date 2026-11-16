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
  Type,
  Minus,
  Plus,
} from 'lucide-react';
import type { DanmakuMessage } from '../../server';
import {
  validateDanmakuInput,
  computeVirtualizedDanmakuWindow,
  computeAntiOverlapDanmakuLayout,
  DANMAKU_MAX_CONCURRENT_DOM,
  DANMAKU_LANE_COUNT,
  DANMAKU_FONT_SIZE_MIN_PX,
  DANMAKU_FONT_SIZE_MAX_PX,
  DANMAKU_FONT_SIZE_PRESETS,
  clampDanmakuFontSize,
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
  danmakuFontSize: number;
  onChangeDanmakuFontSize: (sizePx: number) => void;
  onSendDanmaku: (payload: {
    text: string;
    author: string;
    team: 'GEN' | 'BLG' | 'NEUTRAL';
    color: string;
  }) => void;
  onLikeDanmaku: (id: string) => void;
}

const COLOR_OPTIONS = [
  { label: 'S16 冠军金', value: '#f5d5a7' },
  { label: 'BLG 电光蓝', value: '#00d2ff' },
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
  danmakuFontSize,
  onChangeDanmakuFontSize,
  onSendDanmaku,
  onLikeDanmaku,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [author, setAuthor] = useState('BLG夺冠见证者');
  const [text, setText] = useState('');
  const [color, setColor] = useState('#f5d5a7');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

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
      team: 'BLG',
      color,
    });
    setText('');
  };

  // 纪念站模式：仅保留 BLG 助威弹幕并倒序排列（最新在最上面）
  const reversedFilteredList = useMemo(() => {
    return danmakuList
      .filter((item) => item.team === 'BLG')
      .slice()
      .reverse();
  }, [danmakuList]);

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
      reversedFilteredList,
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
  }, [reversedFilteredList]);

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
        <div className="mb-2 md:mb-0 md:absolute md:bottom-12 md:right-0 z-50 w-full md:w-[460px] rounded-xl border border-[#c8aa78]/45 bg-[#120e09]/95 backdrop-blur-xl p-3.5 shadow-[0_16px_60px_rgba(0,0,0,0.92)] animate-fadeIn">
          {/* Drawer Header: Live Connection + Opacity Control */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#c8aa78]/20">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="font-bold text-[#f5d5a7]">BLG S16 夺冠纪念弹幕厅</span>
              <span className="text-slate-400">·</span>
              <Users className="w-3.5 h-3.5 text-[#f5d5a7]" />
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
                className="w-16 accent-[#d4b483] cursor-pointer"
              />
            </div>
          </div>

          {/* Danmaku Font Size Customizer Row (Slider + 4 Presets) */}
          <div
            data-testid="danmaku-font-size-panel"
            className="mt-2.5 pb-2.5 border-b border-[#c8aa78]/20 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="inline-flex items-center gap-1.5 text-[#f5d5a7] font-bold">
                <Type className="w-3.5 h-3.5 shrink-0" />
                <label htmlFor="danmaku-font-size-range">弹幕字体大小</label>
                <span
                  data-testid="danmaku-font-size-value"
                  className="px-1.5 py-0.5 rounded bg-[#261e14] border border-[#c8aa78]/35 font-mono text-[11px] text-white"
                >
                  {danmakuFontSize}px
                </span>
              </div>

              <div className="flex items-center gap-1">
                {DANMAKU_FONT_SIZE_PRESETS.map((preset) => {
                  const isActive = danmakuFontSize === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      data-testid={`danmaku-fontsize-preset-${preset.value}`}
                      onClick={() => onChangeDanmakuFontSize(preset.value)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] text-[#14100a]'
                          : 'bg-[#1c160f] hover:bg-[#2b2217] text-slate-300 border border-[#c8aa78]/25'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">
                {DANMAKU_FONT_SIZE_MIN_PX}px
              </span>
              <input
                id="danmaku-font-size-range"
                data-testid="danmaku-font-size-slider"
                type="range"
                aria-label="弹幕字体大小滑块"
                min={DANMAKU_FONT_SIZE_MIN_PX}
                max={DANMAKU_FONT_SIZE_MAX_PX}
                step={1}
                value={danmakuFontSize}
                onChange={(e) =>
                  onChangeDanmakuFontSize(clampDanmakuFontSize(Number(e.target.value)))
                }
                className="flex-1 accent-[#d4b483] cursor-pointer"
              />
              <span className="text-[10px] font-mono text-slate-400">
                {DANMAKU_FONT_SIZE_MAX_PX}px
              </span>
            </div>
          </div>

          {/* Anti-Overlap & Virtualization Engine Status Bar */}
          <div
            data-testid="danmaku-engine-status"
            className="mt-2 mb-2.5 flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-[#090705] border border-[#c8aa78]/30 px-2.5 py-1.5 text-[11px] text-slate-300"
          >
            <div className="inline-flex items-center gap-1 text-[#f5d5a7] font-semibold">
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
                className="w-28 rounded border border-[#c8aa78]/35 bg-[#090705] px-2 py-1 text-xs text-white focus:border-[#f5d5a7] focus:outline-none"
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

          {/* Header Bar for BLG Memorial Messages */}
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="px-2.5 py-0.5 text-[11px] font-extrabold rounded bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] text-[#14100a]">
              BLG 夺冠祝贺弹幕 ({reversedFilteredList.length})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              渲染节点: {visibleRows.length}/{reversedFilteredList.length}
            </span>
          </div>

          {/* Virtualized Scrollable Live Danmaku List */}
          <div
            data-testid="danmaku-feed-list"
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            style={{ height: `${VIRTUAL_VIEWPORT_HEIGHT_PX}px` }}
            className="overflow-y-auto rounded-lg border border-[#c8aa78]/20 bg-[#090705] p-2"
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
                  className="flex items-center justify-between gap-2 rounded bg-[#17120c]/85 px-2.5 py-1.5 border border-[#c8aa78]/15 text-xs"
                >
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-bold mr-1.5 text-[#f5d5a7]">
                      [BLG] {item.author}:
                    </span>
                    <span style={{ color: item.color }} className="font-medium">
                      {item.text}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLikeDanmaku(item.id)}
                    aria-label={`点赞弹幕 ${item.text}`}
                    className="inline-flex items-center gap-1 rounded bg-[#261e14] hover:bg-[#382c1e] px-1.5 py-0.5 text-[11px] text-slate-300 shrink-0 cursor-pointer"
                  >
                    <ThumbsUp className="w-2.5 h-2.5 text-[#f5d5a7]" />
                    <span className="font-mono tabular-nums">{item.likes}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick One-Click Presets */}
          <div className="mt-2.5 pt-2 border-t border-[#c8aa78]/20">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1.5">
              <Sparkles className="w-3 h-3 text-[#f5d5a7]" />
              <span>一键发送 BLG 夺冠祝贺弹幕：</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {QUICK_DANMAKU_PRESETS.slice(0, 4).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    onSendDanmaku({
                      text: preset.text,
                      author: author.trim() || 'BLG夺冠见证者',
                      team: 'BLG',
                      color: '#f5d5a7',
                    })
                  }
                  className="text-left text-[11px] px-2 py-0.5 rounded bg-[#1c160f] hover:bg-[#2b2217] border border-[#c8aa78]/20 text-slate-300 hover:text-white truncate max-w-full cursor-pointer"
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
        className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 rounded-xl border border-[#c8aa78]/45 bg-[#120e09]/92 backdrop-blur-md px-2.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.85)]"
      >
        {/* Fixed BLG Champions Badge (GEN & Neutral options removed) */}
        <div className="flex items-center rounded-lg bg-[#090705] p-0.5 border border-[#c8aa78]/35 shrink-0">
          <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-md bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] text-[#14100a] select-none">
            BLG
          </span>
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
          placeholder="发送 BLG 夺冠纪念弹幕飞越画面..."
          className="min-w-[160px] sm:w-56 flex-1 rounded-lg border border-[#c8aa78]/30 bg-[#090705]/90 px-2.5 py-1 text-xs text-white placeholder:text-slate-400 focus:border-[#f5d5a7] focus:outline-none"
        />

        {/* Send Button */}
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#c8aa78] to-[#f5d5a7] hover:from-[#d4b483] hover:to-[#ffdfb3] px-3 py-1 text-xs font-extrabold text-[#14100a] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>发射弹幕</span>
        </button>

        {/* Quick Font-Size Stepper Control in Bottom Launcher Bar (A- / px / A+) */}
        <div
          data-testid="danmaku-quick-fontsize-control"
          className="inline-flex items-center rounded-lg bg-[#1c160f] border border-[#c8aa78]/30 p-0.5 shrink-0"
          title="自由调节大屏弹幕字体大小 (12px - 24px)"
        >
          <button
            type="button"
            data-testid="danmaku-fontsize-decrease-btn"
            aria-label="减小弹幕字体大小"
            disabled={danmakuFontSize <= DANMAKU_FONT_SIZE_MIN_PX}
            onClick={() =>
              onChangeDanmakuFontSize(clampDanmakuFontSize(danmakuFontSize - 1))
            }
            className="p-1 rounded hover:bg-[#2b2217] text-[#f5d5a7] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span
            data-testid="danmaku-quick-fontsize-label"
            className="px-1.5 text-[11px] font-mono font-bold text-[#f5d5a7] select-none"
          >
            {danmakuFontSize}px
          </span>
          <button
            type="button"
            data-testid="danmaku-fontsize-increase-btn"
            aria-label="增大弹幕字体大小"
            disabled={danmakuFontSize >= DANMAKU_FONT_SIZE_MAX_PX}
            onClick={() =>
              onChangeDanmakuFontSize(clampDanmakuFontSize(danmakuFontSize + 1))
            }
            className="p-1 rounded hover:bg-[#2b2217] text-[#f5d5a7] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Toggle Overlay Visibility */}
        <button
          type="button"
          onClick={onToggleDanmakuOverlay}
          aria-label={showDanmakuOverlay ? '隐藏大屏弹幕' : '显示大屏弹幕'}
          title={showDanmakuOverlay ? '大屏弹幕已开启' : '大屏弹幕已隐藏'}
          className={`p-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
            showDanmakuOverlay
              ? 'bg-[#f5d5a7]/15 border-[#f5d5a7]/50 text-[#f5d5a7]'
              : 'bg-[#1c160f] border-[#c8aa78]/20 text-slate-400'
          }`}
        >
          {showDanmakuOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        {/* Expand / Collapse Full Danmaku Interactive Drawer */}
        <button
          type="button"
          data-testid="toggle-danmaku-drawer-btn"
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-lg bg-[#1c160f] hover:bg-[#2b2217] border border-[#c8aa78]/35 px-2.5 py-1 text-xs font-semibold text-[#f5d5a7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#f5d5a7]" />
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
