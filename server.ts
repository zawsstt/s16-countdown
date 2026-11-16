import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DanmakuMessage {
  id: string;
  text: string;
  author: string;
  team: 'GEN' | 'BLG' | 'NEUTRAL';
  color: string;
  timestamp: number;
  lane: number;
  likes: number;
}

export interface CheerState {
  GEN: number;
  BLG: number;
}

const initialDanmaku: DanmakuMessage[] = [
  {
    id: 'seed-1',
    text: '恭喜 BLG 夺得 2026 英雄联盟全球总决赛冠军！为信念干杯！',
    author: 'LPL铁粉_阿泽',
    team: 'BLG',
    color: '#f5d5a7',
    timestamp: Date.now() - 180000,
    lane: 0,
    likes: 188,
  },
  {
    id: 'seed-2',
    text: '一穿四 LCK 夺冠！HLE、DK、T1、GEN 全斩于马下，历史第一含金量！',
    author: 'Bilibili干杯',
    team: 'BLG',
    color: '#00d2ff',
    timestamp: Date.now() - 150000,
    lane: 1,
    likes: 164,
  },
  {
    id: 'seed-3',
    text: '黄金左手 Knight 卓定乾坤！中路游龙捧起 2026 全球总决赛召唤师奖杯！',
    author: '左手十年老粉',
    team: 'BLG',
    color: '#f5d5a7',
    timestamp: Date.now() - 120000,
    lane: 2,
    likes: 212,
  },
  {
    id: 'seed-4',
    text: 'Bin 哥世一上信誉分拉满！Bin / Xun / ON 三人组三进世界赛四强终圆梦！',
    author: '陈泽彬唯一指定粉丝',
    team: 'BLG',
    color: '#ff4d94',
    timestamp: Date.now() - 95000,
    lane: 3,
    likes: 195,
  },
  {
    id: 'seed-5',
    text: 'Bin / Xun / Knight / Viper / ON 首发五虎全勤统治峡谷！BO5 对阵 LCK 12胜5负！',
    author: 'BLG冠军应援团',
    team: 'BLG',
    color: '#00d2ff',
    timestamp: Date.now() - 70000,
    lane: 4,
    likes: 157,
  },
  {
    id: 'seed-6',
    text: '风起今朝，我们是冠军！BLG 黄金之路永载英雄联盟史册！',
    author: 'S16夺冠见证者',
    team: 'BLG',
    color: '#f5d5a7',
    timestamp: Date.now() - 35000,
    lane: 0,
    likes: 246,
  },
];

let danmakuHistory: DanmakuMessage[] = [...initialDanmaku];
const cheerState: CheerState = {
  GEN: 0,
  BLG: 28650,
};

async function startServer() {
  const app = express();
  app.use(express.json());

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const broadcast = (payload: unknown) => {
    const messageStr = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  };

  const getActiveViewers = () => Math.max(1, wss.clients.size);

  wss.on('connection', (ws) => {
    // Send initial authoritative state to newly connected client
    ws.send(
      JSON.stringify({
        type: 'init',
        danmaku: danmakuHistory.slice(-80),
        cheers: cheerState,
        onlineCount: getActiveViewers(),
      })
    );

    broadcast({
      type: 'presence:updated',
      onlineCount: getActiveViewers(),
    });

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === 'danmaku:create') {
          const text = String(data.text || '').trim().slice(0, 120);
          if (!text) return;
          const id = String(data.id || `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
          if (danmakuHistory.some((m) => m.id === id)) return;

          const team: 'GEN' | 'BLG' | 'NEUTRAL' = 'BLG';
          const newMsg: DanmakuMessage = {
            id,
            text,
            author: String(data.author || 'BLG召唤师').trim().slice(0, 24) || 'BLG召唤师',
            team,
            color: String(data.color || '#f5d5a7'),
            timestamp: Date.now(),
            lane: typeof data.lane === 'number' ? Math.abs(data.lane) % 5 : Math.floor(Math.random() * 5),
            likes: 1,
          };

          danmakuHistory.push(newMsg);
          if (danmakuHistory.length > 150) {
            danmakuHistory = danmakuHistory.slice(-150);
          }

          cheerState.BLG += 1;

          broadcast({
            type: 'danmaku:created',
            message: newMsg,
            cheers: cheerState,
          });
        } else if (data.type === 'danmaku:like') {
          const target = danmakuHistory.find((m) => m.id === data.id);
          if (target) {
            target.likes += 1;
            broadcast({
              type: 'danmaku:updated',
              message: target,
            });
          }
        } else if (data.type === 'cheer:increment') {
          const team = data.team === 'GEN' ? 'GEN' : data.team === 'BLG' ? 'BLG' : null;
          const amount = typeof data.amount === 'number' ? Math.min(Math.max(1, data.amount), 10) : 1;
          if (team) {
            cheerState[team] += amount;
            broadcast({
              type: 'cheer:updated',
              cheers: cheerState,
            });
          }
        }
      } catch (err) {
        console.error('Failed to process WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      broadcast({
        type: 'presence:updated',
        onlineCount: getActiveViewers(),
      });
    });
  });

  // REST fallback endpoints
  app.get('/api/state', (_req, res) => {
    res.json({
      danmaku: danmakuHistory.slice(-80),
      cheers: cheerState,
      onlineCount: getActiveViewers(),
    });
  });

  app.post('/api/danmaku', (req, res) => {
    const text = String(req.body?.text || '').trim().slice(0, 120);
    if (!text) {
      res.status(400).json({ error: '弹幕内容不能为空' });
      return;
    }
    const id = String(req.body?.id || `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    const existing = danmakuHistory.find((m) => m.id === id);
    if (existing) {
      res.json({ message: existing, cheers: cheerState });
      return;
    }

    const team: 'GEN' | 'BLG' | 'NEUTRAL' =
      req.body?.team === 'GEN' || req.body?.team === 'BLG' ? req.body.team : 'NEUTRAL';
    const newMsg: DanmakuMessage = {
      id,
      text,
      author: String(req.body?.author || '召唤师').trim().slice(0, 24) || '召唤师',
      team,
      color: String(req.body?.color || (team === 'GEN' ? '#f5b800' : team === 'BLG' ? '#00d2ff' : '#ffffff')),
      timestamp: Date.now(),
      lane: typeof req.body?.lane === 'number' ? Math.abs(req.body.lane) % 5 : Math.floor(Math.random() * 5),
      likes: 1,
    };

    danmakuHistory.push(newMsg);
    if (danmakuHistory.length > 150) {
      danmakuHistory = danmakuHistory.slice(-150);
    }

    if (team === 'GEN') cheerState.GEN += 1;
    if (team === 'BLG') cheerState.BLG += 1;

    broadcast({
      type: 'danmaku:created',
      message: newMsg,
      cheers: cheerState,
    });

    res.json({ message: newMsg, cheers: cheerState });
  });

  app.post('/api/cheer', (req, res) => {
    const team = req.body?.team === 'GEN' ? 'GEN' : req.body?.team === 'BLG' ? 'BLG' : null;
    if (!team) {
      res.status(400).json({ error: '无效战队' });
      return;
    }
    cheerState[team] += 1;
    broadcast({
      type: 'cheer:updated',
      cheers: cheerState,
    });
    res.json({ cheers: cheerState });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Worlds 2026 Grand Finals Broadcast Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
