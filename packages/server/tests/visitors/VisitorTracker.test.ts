import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from '../../src/database/Database';
import { VisitorTracker } from '../../src/visitors/VisitorTracker';

describe('VisitorTracker', () => {
	let testDir: string;
	let db: Database;
	let currentTime: number;

	beforeEach(() => {
		testDir = join(tmpdir(), `kb-visitor-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });

		db = new Database({ path: join(testDir, 'test.db') });
		db.open();

		// Run migrations to create visitor_stats table
		db.exec(`
			CREATE TABLE visitor_stats (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				hour_timestamp INTEGER NOT NULL,
				year INTEGER NOT NULL,
				month INTEGER NOT NULL,
				day INTEGER NOT NULL,
				hour INTEGER NOT NULL,
				unique_visitors INTEGER NOT NULL,
				created_at TEXT NOT NULL DEFAULT (datetime('now'))
			);
			CREATE UNIQUE INDEX idx_visitor_stats_unique_hour
				ON visitor_stats(year, month, day, hour);
		`);

		// Start at a known time: 2024-01-15 14:30:00 UTC
		currentTime = new Date('2024-01-15T14:30:00Z').getTime();
	});

	afterEach(() => {
		db.close();
		rmSync(testDir, { recursive: true, force: true });
	});

	const createTracker = () =>
		new VisitorTracker({
			database: db,
			timeProvider: () => currentTime,
		});

	describe('recordVisitor', () => {
		it('tracks unique visitors by IP', () => {
			const tracker = createTracker();

			tracker.recordVisitor('192.168.1.1');
			tracker.recordVisitor('192.168.1.2');
			tracker.recordVisitor('192.168.1.1'); // Duplicate

			expect(tracker.getCurrentHourCount()).toBe(2);
		});

		it('normalizes IPv4-mapped IPv6 addresses', () => {
			const tracker = createTracker();

			tracker.recordVisitor('::ffff:192.168.1.1');
			tracker.recordVisitor('192.168.1.1'); // Same IP

			expect(tracker.getCurrentHourCount()).toBe(1);
		});

		it('persists stats when hour changes', () => {
			const tracker = createTracker();

			// Record visitors at 14:30
			tracker.recordVisitor('192.168.1.1');
			tracker.recordVisitor('192.168.1.2');

			// Move to 15:30 (next hour)
			currentTime = new Date('2024-01-15T15:30:00Z').getTime();

			// Recording triggers persist
			tracker.recordVisitor('192.168.1.3');

			// Check that hour 14:00-15:00 was persisted
			const row = db
				.prepare<
					[],
					{ unique_visitors: number; hour: number }
				>('SELECT unique_visitors, hour FROM visitor_stats WHERE hour = 14')
				.get();

			expect(row?.unique_visitors).toBe(2);
			expect(row?.hour).toBe(14);

			// Current hour should have 1 visitor
			expect(tracker.getCurrentHourCount()).toBe(1);
		});
	});

	describe('persistCurrentHour', () => {
		it('saves current visitors to database', () => {
			const tracker = createTracker();

			tracker.recordVisitor('10.0.0.1');
			tracker.recordVisitor('10.0.0.2');
			tracker.recordVisitor('10.0.0.3');

			// Move to next hour and persist
			currentTime = new Date('2024-01-15T15:00:00Z').getTime();
			tracker.persistCurrentHour();

			const row = db
				.prepare<
					[],
					{ unique_visitors: number }
				>('SELECT unique_visitors FROM visitor_stats WHERE hour = 14')
				.get();

			expect(row?.unique_visitors).toBe(3);
		});

		it('does not persist empty hours', () => {
			const tracker = createTracker();

			// Move to next hour without any visitors
			currentTime = new Date('2024-01-15T15:00:00Z').getTime();
			tracker.persistCurrentHour();

			const count = db
				.prepare<
					[],
					{ cnt: number }
				>('SELECT COUNT(*) as cnt FROM visitor_stats')
				.get();

			expect(count?.cnt).toBe(0);
		});
	});

	describe('get24hStats', () => {
		it('returns zero when no data', () => {
			const tracker = createTracker();
			const stats = tracker.get24hStats();

			expect(stats.totalVisitors).toBe(0);
			expect(stats.hoursIncluded).toBe(0);
			expect(stats.hourlyBreakdown).toEqual([]);
		});

		it('aggregates last 24 hours', () => {
			// Insert test data for several hours
			const insert = db.prepare<
				[number, number, number, number, number, number]
			>(
				`INSERT INTO visitor_stats
				 (hour_timestamp, year, month, day, hour, unique_visitors)
				 VALUES (?, ?, ?, ?, ?, ?)`,
			);

			// Hours 10, 11, 12, 13, 14 with varying counts
			const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
			for (let hourIdx = 0; hourIdx < 5; hourIdx++) {
				const hourTime = baseTime + hourIdx * 60 * 60 * 1000;
				const date = new Date(hourTime);
				insert.run(
					hourTime,
					date.getUTCFullYear(),
					date.getUTCMonth() + 1,
					date.getUTCDate(),
					date.getUTCHours(),
					(hourIdx + 1) * 10, // 10, 20, 30, 40, 50 visitors
				);
			}

			const tracker = createTracker();
			const stats = tracker.get24hStats();

			expect(stats.totalVisitors).toBe(150); // 10+20+30+40+50
			expect(stats.hoursIncluded).toBe(5);
			expect(stats.hourlyBreakdown).toHaveLength(5);
			// Most recent first
			expect(stats.hourlyBreakdown[0].hour).toBe(14);
			expect(stats.hourlyBreakdown[0].uniqueVisitors).toBe(50);
		});

		it('excludes data older than 24 hours', () => {
			const insert = db.prepare<
				[number, number, number, number, number, number]
			>(
				`INSERT INTO visitor_stats
				 (hour_timestamp, year, month, day, hour, unique_visitors)
				 VALUES (?, ?, ?, ?, ?, ?)`,
			);

			// Insert data from 25 hours ago
			const oldTime = currentTime - 25 * 60 * 60 * 1000;
			const oldDate = new Date(oldTime);
			insert.run(
				oldTime,
				oldDate.getUTCFullYear(),
				oldDate.getUTCMonth() + 1,
				oldDate.getUTCDate(),
				oldDate.getUTCHours(),
				100,
			);

			// Insert recent data
			const recentTime = currentTime - 2 * 60 * 60 * 1000;
			const recentDate = new Date(recentTime);
			insert.run(
				recentTime,
				recentDate.getUTCFullYear(),
				recentDate.getUTCMonth() + 1,
				recentDate.getUTCDate(),
				recentDate.getUTCHours(),
				50,
			);

			const tracker = createTracker();
			const stats = tracker.get24hStats();

			expect(stats.totalVisitors).toBe(50);
			expect(stats.hoursIncluded).toBe(1);
		});
	});
});
