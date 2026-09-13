import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCsv,
  formatAdminDate,
  formatNumber,
  matchesDateRange,
  rewardAvailability,
  validateSchedule,
} from '../src/lib/admin-models.ts';

test('CSV escapes separators, quotes, newlines and spreadsheet formulas', () => {
  assert.equal(
    buildCsv([['Loja; nome', '"valor"', 'a\nb', '=1+1', ' +cmd', null]]),
    '\uFEFF"Loja; nome";"""valor""";"a\nb";"\'=1+1";"\' +cmd";""',
  );
});
test('date filters use inclusive Angola calendar boundaries', () => {
  assert.equal(
    matchesDateRange('2026-09-12T23:00:00Z', '2026-09-13', '2026-09-13'),
    true,
  );
  assert.equal(
    matchesDateRange('2026-09-13T23:00:00Z', '2026-09-13', '2026-09-13'),
    false,
  );
  assert.equal(matchesDateRange(undefined, '2026-09-13', ''), false);
  assert.equal(matchesDateRange(undefined, '', ''), true);
});
test('scheduled campaigns require a future date in UTC+1', () => {
  const now = Date.parse('2026-09-13T10:00:00Z');
  assert.equal(validateSchedule('2026-09-13', '11:00', now), false);
  assert.equal(validateSchedule('2026-09-13', '11:01', now), true);
  assert.equal(validateSchedule('', '', now), false);
});
test('missing values never become invented stock or dates', () => {
  assert.equal(rewardAvailability(undefined), 'unknown');
  assert.equal(rewardAvailability(-1), 'unknown');
  assert.equal(rewardAvailability(NaN), 'unknown');
  assert.equal(rewardAvailability(0), 'empty');
  assert.equal(rewardAvailability(2), 'available');
  assert.equal(formatAdminDate('bad date'), 'Não disponível');
  assert.equal(formatNumber(undefined), 'Não disponível');
});
