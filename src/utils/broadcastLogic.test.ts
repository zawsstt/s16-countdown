import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFinalsCountdown,
  getFinalsTargetTimestamp,
  getInitialSlotClockOffsetMs,
  calculatePromoSlotCountdown,
  calculateDataPreviewSlotCountdown,
  enqueueBroadcastSlots,
  advanceBroadcastSlotQueue,
  calculateSupportSplit,
  validateDanmakuInput,
  mergeDanmakuMessage,
  selectLeastCrowdedDanmakuLane,
  computeAntiOverlapDanmakuLayout,
  computeVirtualizedDanmakuWindow,
  DANMAKU_MAX_CONCURRENT_DOM,
} from './broadcastLogic';

test('calculateFinalsCountdown merges days into 24-hour total hours to Sunday Nov 15 03:00 AM Finals', () => {
  const now = new Date('2026-11-10T16:00:00+08:00').getTime();
  const target = getFinalsTargetTimestamp(); // 2026-11-15T03:00:00+08:00
  const res = calculateFinalsCountdown(now, target);
  assert.equal(res.days, 4);
  assert.equal(res.hours, 11);
  assert.equal(res.minutes, 0);
  assert.equal(res.seconds, 0);
  assert.equal(res.primaryDisplay, '107:00:00');
});

test('getInitialSlotClockOffsetMs aligns both promo and data preview countdowns to 03:00 (180s)', () => {
  const realNow = new Date('2026-11-10T16:12:43+08:00').getTime();
  const offset = getInitialSlotClockOffsetMs(realNow, 180);
  const promo = calculatePromoSlotCountdown(realNow + offset);
  const data = calculateDataPreviewSlotCountdown(realNow + offset);
  assert.equal(promo.display, '03:00');
  assert.equal(promo.remainingSeconds, 180);
  assert.equal(promo.shouldPrewarm, true);
  assert.equal(data.display, '03:00');
  assert.equal(data.remainingSeconds, 180);
  assert.equal(data.shouldPrewarm, true);
});

test('calculatePromoSlotCountdown triggers every 45 minutes and sets shouldPrewarm when <= 5 minutes remain', () => {
  const gridPoint = 2700 * 1000 * 1000;
  // 10 minutes (600s) before gridPoint -> shouldPrewarm is false
  const res1 = calculatePromoSlotCountdown(gridPoint - 600 * 1000);
  assert.equal(res1.display, '10:00');
  assert.equal(res1.remainingSeconds, 600);
  assert.equal(res1.shouldPrewarm, false);
  assert.equal(res1.shouldTrigger, false);

  // 5 minutes (300s) before gridPoint -> shouldPrewarm is true
  const resPrewarm = calculatePromoSlotCountdown(gridPoint - 300 * 1000);
  assert.equal(resPrewarm.display, '05:00');
  assert.equal(resPrewarm.remainingSeconds, 300);
  assert.equal(resPrewarm.shouldPrewarm, true);
  assert.equal(resPrewarm.shouldTrigger, false);

  // At gridPoint -> shouldTrigger is true
  const res2 = calculatePromoSlotCountdown(gridPoint);
  assert.equal(res2.display, '00:00');
  assert.equal(res2.shouldPrewarm, true);
  assert.equal(res2.shouldTrigger, true);
  assert.equal(res2.progressPercent, 100);
});

test('calculateDataPreviewSlotCountdown triggers every 15 minutes (:00, :15, :30, :45)', () => {
  const gridPoint = 2700 * 1000 * 1000;
  const t1 = gridPoint - 300 * 1000;
  const res1 = calculateDataPreviewSlotCountdown(t1);
  assert.equal(res1.display, '05:00');
  assert.equal(res1.remainingSeconds, 300);
  assert.equal(res1.cycleSeconds, 900);
  assert.equal(res1.shouldPrewarm, true);
  assert.equal(res1.shouldTrigger, false);

  // At +15m from gridPoint, data_preview triggers while promo_video does not
  const t2 = gridPoint + 900 * 1000;
  const res2 = calculateDataPreviewSlotCountdown(t2);
  const promoAt15 = calculatePromoSlotCountdown(t2);
  assert.equal(res2.display, '00:00');
  assert.equal(res2.shouldTrigger, true);
  assert.equal(promoAt15.shouldTrigger, false);

  // At gridPoint, BOTH promo_video and data_preview trigger simultaneously
  const res3 = calculateDataPreviewSlotCountdown(gridPoint);
  const promoAtGrid = calculatePromoSlotCountdown(gridPoint);
  assert.equal(res3.shouldTrigger, true);
  assert.equal(promoAtGrid.shouldTrigger, true);
});

test('enqueueBroadcastSlots and advanceBroadcastSlotQueue prioritize promo_video before data_preview on coincidence', () => {
  const initial = { activeSlot: null, pendingSlots: [] };

  const afterCoincidence = enqueueBroadcastSlots(initial, ['data_preview', 'promo_video']);
  assert.equal(afterCoincidence.activeSlot, 'promo_video');
  assert.deepEqual(afterCoincidence.pendingSlots, ['data_preview']);

  const afterPromoFinished = advanceBroadcastSlotQueue(afterCoincidence);
  assert.equal(afterPromoFinished.activeSlot, 'data_preview');
  assert.deepEqual(afterPromoFinished.pendingSlots, []);

  const afterDataFinished = advanceBroadcastSlotQueue(afterPromoFinished);
  assert.equal(afterDataFinished.activeSlot, null);
  assert.deepEqual(afterDataFinished.pendingSlots, []);
});

test('calculateSupportSplit computes accurate GEN vs BLG percentages', () => {
  const split = calculateSupportSplit(400, 600);
  assert.equal(split.genPercent, 40);
  assert.equal(split.blgPercent, 60);
  assert.equal(split.total, 1000);
});

test('validateDanmakuInput rejects empty input and trims valid input', () => {
  const empty = validateDanmakuInput('   ', 'User');
  assert.equal(empty.valid, false);
  assert.ok(empty.error);

  const valid = validateDanmakuInput('  BLG 总决赛冲冲冲！  ', '  阿泽  ');
  assert.equal(valid.valid, true);
  assert.equal(valid.sanitizedText, 'BLG 总决赛冲冲冲！');
  assert.equal(valid.sanitizedAuthor, '阿泽');
});

test('mergeDanmakuMessage is idempotent and prevents duplicate message IDs', () => {
  const initial = [{ id: '1', text: 'Hello', likes: 1 }];
  const afterDuplicate = mergeDanmakuMessage(initial, { id: '1', text: 'Hello', likes: 2 });
  assert.equal(afterDuplicate.length, 1);
  assert.equal(afterDuplicate[0].likes, 2);

  const afterNew = mergeDanmakuMessage(afterDuplicate, { id: '2', text: 'BLG WIN', likes: 1 });
  assert.equal(afterNew.length, 2);
});

test('selectLeastCrowdedDanmakuLane picks an empty lane when lane 0 is crowded', () => {
  const now = Date.now();
  const messages = [
    { lane: 0, timestamp: now - 1000, text: 'BLG 冲冲冲！' },
    { lane: 0, timestamp: now - 2000, text: 'Knight 卓定天下！' },
  ];
  const chosen = selectLeastCrowdedDanmakuLane(messages, now, 7);
  assert.notEqual(chosen, 0);
  assert.equal(chosen, 1);
});

test('computeAntiOverlapDanmakuLayout caps concurrent DOM nodes and dynamically increases interval on dense lanes', () => {
  const now = Date.now();
  const manyMessages = Array.from({ length: 50 }, (_, idx) => ({
    id: `dm-${idx}`,
    text: `第 ${idx} 条高密度助威弹幕测试防重叠间隔动态扩展`,
    author: '召唤师',
    team: (idx % 2 === 0 ? 'BLG' : 'GEN') as 'BLG' | 'GEN',
    color: '#00d2ff',
    timestamp: now - (50 - idx) * 500,
    lane: 0, // 全部故意塞进 0 号轨道，测试防重叠分流与动态间隔
    likes: 1,
  }));

  const scheduled = computeAntiOverlapDanmakuLayout(manyMessages, now, DANMAKU_MAX_CONCURRENT_DOM, 7);
  // 1. 严格限制同屏 DOM 数量 <= 24
  assert.equal(scheduled.length, DANMAKU_MAX_CONCURRENT_DOM);

  // 2. 验证原本全部挤在轨道 0 的弹幕已被均衡分流到多条轨道
  const uniqueLanes = new Set(scheduled.map((s) => s.assignedLane));
  assert.ok(uniqueLanes.size >= 4);

  // 3. 验证同轨道多条弹幕的延迟（delaySec）绝不相同，避免同轨道重叠
  const lane0Items = scheduled.filter((s) => s.assignedLane === 0);
  if (lane0Items.length >= 2) {
    assert.notEqual(lane0Items[0].delaySec, lane0Items[1].delaySec);
    assert.ok(lane0Items[0].intervalSec >= 3.0);
  }
});

test('computeVirtualizedDanmakuWindow renders only visible viewport slice plus overscan', () => {
  const win = computeVirtualizedDanmakuWindow(120, 480, 176, 48, 3);
  assert.ok(win.visibleCount <= 12);
  assert.ok(win.startIndex > 0);
  assert.ok(win.endIndex < 120);
  assert.equal(win.topSpacerPx, win.startIndex * 48);
  assert.equal(win.bottomSpacerPx, (120 - win.endIndex) * 48);
});
