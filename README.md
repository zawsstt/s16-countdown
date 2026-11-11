# WORLDS 2026 总决赛倒计时导播台

GEN vs BLG 冠亚军决赛的实时导播倒计时页面：整点自动播报宣传片、赛事前瞻轮播、实时弹幕、赛前数据面板、选手画廊。

## 本地运行

```bash
npm install          # 若报 peer 依赖冲突，加 --legacy-peer-deps
npm run dev          # 启动开发服务器，默认 http://localhost:3000
```

生产构建：

```bash
npm run build        # 产物在 dist/
NODE_ENV=production npm run dev
```

> 首屏会先过一个「资源预加载」画面（约 2–3 秒），把所有图片、转场视频、音轨预解码完再进场，
> 避免进场后第一支宣传片还在转圈。想跳过调试可加 `?skipPreload=1`。

## 目录结构

```
src/
  App.tsx                     页面主框架、倒计时与弹幕状态
  components/
    BroadcastStage.tsx        1080p 导播台画面（宣传片 / 数据前瞻 / 转场 Stinger）
    DanmakuPlugin.tsx         弹幕层（防重叠轨道 + DOM 虚拟化）
    PreMatchStatsPanel.tsx    赛前数据面板（Recharts，按需加载）
    PreloadGateScreen.tsx     进场前资源预加载门控
    HourlyVideoOverlay.tsx    每小时整点全屏影片（含转场、决赛倒计时、退出按钮）
    TeamLogos.tsx             战队与赛事 Logo（矢量）
  data/
    broadcastSlots.ts         宣传片与数据前瞻的排期、资源路径
    finalsData.ts             选手画廊与轮播图数据
  utils/
    broadcastLogic.ts         倒计时、排期队列、转场与弹幕布局算法
server.ts                     Express + WebSocket（弹幕实时广播）
public/assets/                所有图片、视频、音频素材
```

## 视频加载说明（重要）

宣传片卡顿的根因不是带宽，而是**封装格式**：原始 MP4 的 `moov` 索引写在文件末尾，
浏览器必须先下完整个文件（57–75MB）才能读到索引、才开始播放 —— 所以无论怎么「预热」都会卡住。

已做如下处理，改动后**不要再用普通工具重新导出这些 MP4**，否则 `moov` 会回到文件末尾：

1. 全部宣传片重新封装为 `+faststart`（`moov` 前置），开播只需开头几百 KB。
2. **不重新编码**，码率保持原始的 2.2~3.0 Mbps，画质与原片完全一致。
3. 前端改为分级加载：只预热当前这一支，播起来后才让下一支开始缓冲，不再一起抢带宽。
4. 增加缓冲门控与卡顿自愈：连续 6.4 秒画面不推进就重新拉流，16 秒仍无进展则自动跳过，不会卡死整个导播流程。

### 另一个坑：硬件解码器被抢光（画面卡在某几秒不动）

现象：宣传片播到某个位置突然停住，`readyState` 从 4 掉到 2，但 `buffered` 明明还有十几秒、
`error` 为 null、`paused` 仍是 false。手动拖一下进度条立刻恢复。

根因不是网络也不是文件：页面里十几个 `<video>` 同时挂载，Chromium 的硬件解码器
（`D3D11VideoDecoder`）数量有限，当前视频的媒体管线会被反复挂起（CDP 里能看到
`kPipelineStateChange: kSuspended`）。用 `--disable-accelerated-video-decode` 启动可以 100% 复现不出来。

已做四层处理，改动这块代码时不要破坏：

| 措施 | 位置 |
| --- | --- |
| 只给「当前 + 下一支」挂 `src`，其余元素不加载 | `BroadcastStage.tsx` 的 `shouldAttachSrc` |
| 全屏遮罩期间卸掉背景循环视频的 `src`（暂停不够，仍占解码器） | `bgLoopVideoRef` 的 effect |
| 只有当前播放的支允许出声，其余全部 `muted` | `<video muted={...}>` |
| 看门狗 800ms 一次；缓冲充足却不动时 `currentTime += 0.06` 微调重建解码管线（2.4 秒内自愈） | `watchdog` |

替换宣传片的正确做法（只重封装 + 切分，不降画质）：

```bash
# 1) 先加 faststart（无损）
ffmpeg -i 新视频.mp4 -c copy -movflags +faststart 输出.mp4

# 2) 放进 r2-upload/assets/aistudio/，按脚本里的 JOBS 改名
# 3) 按场景切点切分并校验体积
python scripts/split-promos.py

# 4) 更新 src/data/broadcastSlots.ts 里的 PROMO_GROUPS（parts / whole / posters）
```

### 片头静音

`public/assets/broadcast/promo_opening_from_2s.mp4` 的原始音轨录制失误（严重削波失真，峰值顶到 0dB），
已在转码时**整轨移除**，并在 `broadcastSlots.ts` 里用 `muteAudio: true` 兜底。该文件已无音频流，
任何浏览器都不会出声。后续两支正片宣传片的原声不受影响。

## 排期规则

| 内容 | 触发时间 | 时长 |
| --- | --- | --- |
| 宣传片（开幕式预告 → 片头 → 正片1 → 正片2 → 正片3 八强之争，支间 1.8s 黑屏） | 每 **45 分钟** | 约 12 分 30 秒 |
| 赛事前瞻（8 张 1080p 图例） | 每 **15 分钟** | 每张 20 秒 |
| 选人阶段加长版（全屏，带转场） | 每 **小时整点** | 约 13 分钟 |

## 部署（GitHub Pages）

站点是纯静态 SPA，`npm run build` 产出 `dist/`，由 GitHub Actions 自动发布到
**https://zawsstt.github.io/s16-countdown/**。

首次启用：仓库 **Settings → Pages → Source** 选 **GitHub Actions**，之后每次 push 到 `main` 自动部署。

### 为什么用 GitHub Pages

| 维度 | GitHub Pages | Cloudflare（已弃用） |
| --- | --- | --- |
| 单文件上限 | **100 MB** | 25 MiB |
| 宣传片 | **整片播放，零接缝** | 必须分段，段间有过渡 |
| 站点总量 | 1 GB | 无实际上限 |
| 带宽 | 100 GB/月（软限） | 请求数 10 万/天 |
| 配置 | 一个 workflow 文件 | 需要在后台建项目 |

### 视频是怎么组织的

仓库里存的是**按场景切点切好的 11 个片段**（`promo1_p1..p4` / `promo2_p1..p3` / `promo3_p1..p4`），
合计 210MB。之所以不直接存整片，是为了避免仓库里再放一份 210MB（历史里已有片段，再存整片会让仓库接近 1GB）。

构建时工作流用 ffmpeg 把片段 **无损拼回整片**（`-c copy`，实测时长与原片分毫不差）：

```
concat promo1_full.mp4 promo1_p1.mp4 promo1_p2.mp4 promo1_p3.mp4 promo1_p4.mp4
```

然后以 `VITE_SINGLE_PROMO_FILE=true` 构建，页面自动切换成整片播放——**完全没有接缝**。
拼完会删掉片段，产物体积不会翻倍。

### 本地开发

```bash
npm install          # 若报 peer 依赖冲突，加 --legacy-peer-deps（.npmrc 已自动处理）
npm run dev          # http://localhost:3000
```

本地开发用片段模式（片段在仓库里，开箱即用）；整片只存在于构建产物里。

### 想让域名更好看 / 国内更稳

`zawsstt.github.io` 在国内经常被 DNS 污染。绑一个自己的域名可以彻底解决——
域名在任意国外注册商买（不需要备案），在仓库 Settings → Pages → Custom domain 里填上即可。

## 技术栈

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · Express + ws
