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

test('calculatePromoSlotCountdown triggers every 30 minutes and sets shouldPrewarm when <= 5 minutes remain', () => {
  // At 16:20:00, 10 minutes (600s) remain -> shouldPrewarm is false
  const t1 = new Date('2026-11-10T16:20:00+08:00').getTime();
  const res1 = calculatePromoSlotCountdown(t1);
  assert.equal(res1.display, '10:00');
  assert.equal(res1.remainingSeconds, 600);
  assert.equal(res1.shouldPrewarm, false);
  assert.equal(res1.shouldTrigger, false);

  // At 16:25:00, exactly 5 minutes (300s) remain -> shouldPrewarm becomes true!
  const tPrewarm = new Date('2026-11-10T16:25:00+08:00').getTime();
  const resPrewarm = calculatePromoSlotCountdown(tPrewarm);
  assert.equal(resPrewarm.display, '05:00');
  assert.equal(resPrewarm.remainingSeconds, 300);
  assert.equal(resPrewarm.shouldPrewarm, true);
  assert.equal(resPrewarm.shouldTrigger, false);

  // Exactly at 16:30:00, shouldTrigger is true
  const t2 = new Date('2026-11-10T16:30:00+08:00').getTime();
  const res2 = calculatePromoSlotCountdown(t2);
  assert.equal(res2.display, '00:00');
  assert.equal(res2.shouldPrewarm, true);
  assert.equal(res2.shouldTrigger, true);
  assert.equal(res2.progressPercent, 100);
});

test('calculateDataPreviewSlotCountdown triggers every 15 minutes (:00, :15, :30, :45)', () => {
  // At 16:10:00, 5 minutes (300s) remain until 16:15:00
  const t1 = new Date('2026-11-10T16:10:00+08:00').getTime();
  const res1 = calculateDataPreviewSlotCountdown(t1);
  assert.equal(res1.display, '05:00');
  assert.equal(res1.remainingSeconds, 300);
  assert.equal(res1.cycleSeconds, 900);
  assert.equal(res1.shouldPrewarm, true);
  assert.equal(res1.shouldTrigger, false);

  // At 16:15:00, data_preview triggers while promo_video does not
  const t2 = new Date('2026-11-10T16:15:00+08:00').getTime();
  const res2 = calculateDataPreviewSlotCountdown(t2);
  const promoAt15 = calculatePromoSlotCountdown(t2);
  assert.equal(res2.display, '00:00');
  assert.equal(res2.shouldTrigger, true);
  assert.equal(promoAt15.shouldTrigger, false);

  // At 16:30:00, BOTH promo_video and data_preview trigger simultaneously
  const t3 = new Date('2026-11-10T16:30:00+08:00').getTime();
  const res3 = calculateDataPreviewSlotCountdown(t3);
  const promoAt30 = calculatePromoSlotCountdown(t3);
  assert.equal(res3.shouldTrigger, true);
  assert.equal(promoAt30.shouldTrigger, true);
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
