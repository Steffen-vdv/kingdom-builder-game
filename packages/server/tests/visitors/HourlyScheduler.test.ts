import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HourlyScheduler } from '../../src/visitors/HourlyScheduler';

describe('HourlyScheduler', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('getTimeUntilNextHour', () => {
		it('calculates time until next hour boundary', () => {
			// Set time to 14:30:00
			const currentTime = new Date('2024-01-15T14:30:00Z').getTime();
			const scheduler = new HourlyScheduler({
				onHour: () => {},
				timeProvider: () => currentTime,
			});

			// 30 minutes until 15:00
			expect(scheduler.getTimeUntilNextHour()).toBe(30 * 60 * 1000);
		});

		it('returns minimum 1 second at hour boundary', () => {
			// Exactly at 15:00:00
			const currentTime = new Date('2024-01-15T15:00:00Z').getTime();
			const scheduler = new HourlyScheduler({
				onHour: () => {},
				timeProvider: () => currentTime,
			});

			// Should be 1 hour (minus potential timing edge case)
			const delay = scheduler.getTimeUntilNextHour();
			expect(delay).toBeGreaterThanOrEqual(1000);
		});
	});

	describe('start/stop', () => {
		it('executes callback at hour boundary', () => {
			const callback = vi.fn();
			let currentTime = new Date('2024-01-15T14:59:00Z').getTime();

			const scheduler = new HourlyScheduler({
				onHour: callback,
				timeProvider: () => currentTime,
			});

			scheduler.start();
			expect(scheduler.isActive()).toBe(true);

			// Advance 1 minute to 15:00:00
			currentTime += 60 * 1000;
			vi.advanceTimersByTime(60 * 1000);

			expect(callback).toHaveBeenCalledTimes(1);

			scheduler.stop();
			expect(scheduler.isActive()).toBe(false);
		});

		it('continues scheduling after callback execution', () => {
			const callback = vi.fn();
			let currentTime = new Date('2024-01-15T14:59:00Z').getTime();

			const scheduler = new HourlyScheduler({
				onHour: callback,
				timeProvider: () => currentTime,
			});

			scheduler.start();

			// Advance to 15:00
			currentTime += 60 * 1000;
			vi.advanceTimersByTime(60 * 1000);
			expect(callback).toHaveBeenCalledTimes(1);

			// Advance to 16:00
			currentTime += 60 * 60 * 1000;
			vi.advanceTimersByTime(60 * 60 * 1000);
			expect(callback).toHaveBeenCalledTimes(2);

			scheduler.stop();
		});

		it('does not execute after stop', () => {
			const callback = vi.fn();
			let currentTime = new Date('2024-01-15T14:59:00Z').getTime();

			const scheduler = new HourlyScheduler({
				onHour: callback,
				timeProvider: () => currentTime,
			});

			scheduler.start();
			scheduler.stop();

			// Advance past hour boundary
			currentTime += 60 * 1000;
			vi.advanceTimersByTime(60 * 1000);

			expect(callback).not.toHaveBeenCalled();
		});

		it('start is idempotent', () => {
			const callback = vi.fn();

			const scheduler = new HourlyScheduler({
				onHour: callback,
			});

			scheduler.start();
			scheduler.start(); // Should not create duplicate timers

			expect(scheduler.isActive()).toBe(true);

			scheduler.stop();
		});

		it('handles callback errors gracefully', () => {
			const callback = vi.fn().mockImplementation(() => {
				throw new Error('Test error');
			});
			const logMessages: string[] = [];
			let currentTime = new Date('2024-01-15T14:59:00Z').getTime();

			const scheduler = new HourlyScheduler({
				onHour: callback,
				timeProvider: () => currentTime,
				logger: (msg) => logMessages.push(msg),
			});

			scheduler.start();

			// Should not throw
			currentTime += 60 * 1000;
			vi.advanceTimersByTime(60 * 1000);

			expect(callback).toHaveBeenCalled();
			expect(logMessages.some((msg) => msg.includes('failed'))).toBe(true);

			// Scheduler should still be running
			expect(scheduler.isActive()).toBe(true);

			scheduler.stop();
		});
	});
});
