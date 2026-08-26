import { describe, it, expect } from 'vitest';
import {
  describeSync,
  formatAge,
  cooldownRemaining,
  LIVE_WITHIN_MS,
  LAGGING_WITHIN_MS,
} from './sync-status';

const NOW = Date.parse('2026-08-04T12:00:00Z');
const ago = (ms: number) => ({
  lastLedger: 3_741_196,
  updatedAt: new Date(NOW - ms).toISOString(),
});

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

describe('formatAge', () => {
  it('picks a single coarse unit', () => {
    expect(formatAge(4_000)).toBe('4s');
    expect(formatAge(12 * MINUTE)).toBe('12m');
    expect(formatAge(3 * HOUR)).toBe('3h');
    expect(formatAge(50 * HOUR)).toBe('2d');
  });

  it('rounds down rather than up, so an age is never overstated', () => {
    expect(formatAge(59_999)).toBe('59s');
    expect(formatAge(119 * MINUTE)).toBe('1h');
  });

  it('clamps a negative duration to zero', () => {
    expect(formatAge(-5_000)).toBe('0s');
  });
});

describe('describeSync', () => {
  it('is live within the fresh window', () => {
    const status = describeSync(ago(2 * MINUTE), NOW);
    expect(status.level).toBe('live');
    expect(status.age).toBe('2m');
  });

  it('is lagging past the fresh window', () => {
    expect(describeSync(ago(47 * MINUTE), NOW).level).toBe('lagging');
  });

  it('is stale past the lagging window', () => {
    const status = describeSync(ago(5 * HOUR), NOW);
    expect(status.level).toBe('stale');
    expect(status.detail).toContain('out of date');
  });

  it('treats the thresholds as inclusive', () => {
    expect(describeSync(ago(LIVE_WITHIN_MS), NOW).level).toBe('live');
    expect(describeSync(ago(LIVE_WITHIN_MS + 1), NOW).level).toBe('lagging');
    expect(describeSync(ago(LAGGING_WITHIN_MS), NOW).level).toBe('lagging');
    expect(describeSync(ago(LAGGING_WITHIN_MS + 1), NOW).level).toBe('stale');
  });

  it('reports unknown before the indexer has ever run', () => {
    const status = describeSync(null, NOW);
    expect(status.level).toBe('unknown');
    expect(status.age).toBe('');
  });

  it('reports unknown rather than NaN for an unparseable timestamp', () => {
    const status = describeSync({ lastLedger: 1, updatedAt: 'not a date' }, NOW);
    expect(status.level).toBe('unknown');
    expect(status.detail).not.toContain('NaN');
  });

  it('does not show a negative age when the server clock runs ahead', () => {
    const status = describeSync(ago(-30 * 1000), NOW);
    expect(status.level).toBe('live');
    expect(status.age).toBe('0s');
  });

  it('never claims live for data the indexer has not touched in hours', () => {
    // The regression this guards: the pill used to read"Live"off the browser
    // poll, so it stayed green no matter how far behind the indexer was.
    for (const hours of [2, 4, 12, 48]) {
      expect(describeSync(ago(hours * HOUR), NOW).level).not.toBe('live');
    }
  });
});

describe('cooldownRemaining', () => {
  const COOLDOWN = 60_000;
  const at = (ms: number) => new Date(NOW - ms).toISOString();

  it('blocks with the remaining time while inside the window', () => {
    expect(cooldownRemaining(at(20_000), COOLDOWN, NOW)).toBe(40_000);
  });

  it('allows once the window has passed', () => {
    expect(cooldownRemaining(at(COOLDOWN), COOLDOWN, NOW)).toBe(0);
    expect(cooldownRemaining(at(COOLDOWN + 1), COOLDOWN, NOW)).toBe(0);
  });

  it('allows when the indexer has never run', () => {
    // Refusing here would leave a cold database with no way to trigger a sync.
    expect(cooldownRemaining(null, COOLDOWN, NOW)).toBe(0);
    expect(cooldownRemaining(undefined, COOLDOWN, NOW)).toBe(0);
  });

  it('allows rather than locking out on an unreadable timestamp', () => {
    expect(cooldownRemaining('not a date', COOLDOWN, NOW)).toBe(0);
  });

  it('allows when the stored time is in the future', () => {
    // Clock skew, not a fresh sync. Blocking would last as long as the skew.
    expect(cooldownRemaining(at(-5 * 60_000), COOLDOWN, NOW)).toBe(0);
  });

  it('never returns more than the cooldown itself', () => {
    expect(cooldownRemaining(at(1), COOLDOWN, NOW)).toBeLessThanOrEqual(COOLDOWN);
  });
});
