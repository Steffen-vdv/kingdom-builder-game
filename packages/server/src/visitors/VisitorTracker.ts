import type { Database } from '../database/Database.js';

export interface VisitorTrackerOptions {
	/**
	 * Database instance for persisting visitor stats.
	 */
	database: Database;
	/**
	 * Time provider for testing. Defaults to Date.now.
	 */
	timeProvider?: () => number;
}

export interface HourlyVisitorStats {
	hourTimestamp: number;
	year: number;
	month: number;
	day: number;
	hour: number;
	uniqueVisitors: number;
}

export interface VisitorStats24h {
	/**
	 * Total unique visitors in the last 24 completed hours.
	 * Note: This is a sum of hourly unique counts, not a deduplicated total.
	 */
	totalVisitors: number;
	/**
	 * Number of hours included in the total (0-24).
	 */
	hoursIncluded: number;
	/**
	 * Breakdown by hour, most recent first.
	 */
	hourlyBreakdown: HourlyVisitorStats[];
}

interface VisitorStatsRow {
	hour_timestamp: number;
	year: number;
	month: number;
	day: number;
	hour: number;
	unique_visitors: number;
}

/**
 * Tracks unique visitors by IP address within hourly windows.
 *
 * Lifecycle:
 * 1. Call recordVisitor(ip) on each request
 * 2. At X:00:00, call persistCurrentHour() to save stats
 * 3. Call get24hStats() to retrieve aggregate visitor data
 *
 * The tracker maintains an in-memory set of IPs for the current hour.
 * This is persisted to the database when the hour rolls over.
 */
export class VisitorTracker {
	private readonly database: Database;
	private readonly timeProvider: () => number;

	/** IPs seen in the current hour window */
	private currentHourVisitors: Set<string> = new Set();

	/** Start timestamp of the current hour window */
	private currentHourStart: number;

	constructor(options: VisitorTrackerOptions) {
		this.database = options.database;
		this.timeProvider = options.timeProvider ?? (() => Date.now());
		this.currentHourStart = this.getHourStart(this.timeProvider());
	}

	/**
	 * Records a visitor by IP address.
	 * If the hour has rolled over, persists the previous hour's stats first.
	 */
	public recordVisitor(ipAddress: string): void {
		const now = this.timeProvider();
		const hourStart = this.getHourStart(now);

		// Check if we've crossed into a new hour
		if (hourStart !== this.currentHourStart) {
			this.persistAndReset(hourStart);
		}

		this.currentHourVisitors.add(normalizeIp(ipAddress));
	}

	/**
	 * Returns the count of unique visitors in the current (incomplete) hour.
	 */
	public getCurrentHourCount(): number {
		return this.currentHourVisitors.size;
	}

	/**
	 * Persists the current hour's stats and resets for the new hour.
	 * Called automatically by recordVisitor when the hour changes,
	 * but can also be called explicitly by a scheduler.
	 */
	public persistCurrentHour(): void {
		const now = this.timeProvider();
		const hourStart = this.getHourStart(now);
		this.persistAndReset(hourStart);
	}

	/**
	 * Returns visitor stats for the last 24 completed hours.
	 */
	public get24hStats(): VisitorStats24h {
		const now = this.timeProvider();
		const currentHourStart = this.getHourStart(now);
		// Look back 24 hours from the current hour start
		const cutoffTimestamp = currentHourStart - 24 * 60 * 60 * 1000;

		const db = this.database.getConnection();
		const stmt = db.prepare<[number], VisitorStatsRow>(
			`SELECT hour_timestamp, year, month, day, hour, unique_visitors
			 FROM visitor_stats
			 WHERE hour_timestamp >= ?
			 ORDER BY hour_timestamp DESC`,
		);
		const rows = stmt.all(cutoffTimestamp);

		const hourlyBreakdown: HourlyVisitorStats[] = rows.map((row) => ({
			hourTimestamp: row.hour_timestamp,
			year: row.year,
			month: row.month,
			day: row.day,
			hour: row.hour,
			uniqueVisitors: row.unique_visitors,
		}));

		const totalVisitors = hourlyBreakdown.reduce(
			(sum, entry) => sum + entry.uniqueVisitors,
			0,
		);

		return {
			totalVisitors,
			hoursIncluded: hourlyBreakdown.length,
			hourlyBreakdown,
		};
	}

	/**
	 * Returns the timestamp of the start of the hour containing the given time.
	 */
	private getHourStart(timestamp: number): number {
		const date = new Date(timestamp);
		date.setMinutes(0, 0, 0);
		return date.getTime();
	}

	/**
	 * Persists the previous hour's stats and resets for the new hour.
	 */
	private persistAndReset(newHourStart: number): void {
		// Only persist if we have visitors to record
		if (this.currentHourVisitors.size > 0) {
			const previousHourStart = this.currentHourStart;
			const date = new Date(previousHourStart);
			const stats: HourlyVisitorStats = {
				hourTimestamp: previousHourStart,
				year: date.getUTCFullYear(),
				month: date.getUTCMonth() + 1, // 1-indexed
				day: date.getUTCDate(),
				hour: date.getUTCHours(),
				uniqueVisitors: this.currentHourVisitors.size,
			};
			this.insertStats(stats);
		}

		// Reset for new hour
		this.currentHourVisitors = new Set();
		this.currentHourStart = newHourStart;
	}

	/**
	 * Inserts or updates visitor stats for an hour.
	 * Uses INSERT OR REPLACE to handle restarts within the same hour.
	 */
	private insertStats(stats: HourlyVisitorStats): void {
		const db = this.database.getConnection();
		const stmt = db.prepare<[number, number, number, number, number, number]>(
			`INSERT OR REPLACE INTO visitor_stats
			 (hour_timestamp, year, month, day, hour, unique_visitors)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		);
		stmt.run(
			stats.hourTimestamp,
			stats.year,
			stats.month,
			stats.day,
			stats.hour,
			stats.uniqueVisitors,
		);
	}
}

/**
 * Normalizes an IP address for consistent tracking.
 * Handles IPv4-mapped IPv6 addresses (::ffff:192.168.1.1 -> 192.168.1.1).
 */
function normalizeIp(ipAddress: string): string {
	// Handle IPv4-mapped IPv6 addresses
	if (ipAddress.startsWith('::ffff:')) {
		return ipAddress.slice(7);
	}
	return ipAddress.toLowerCase().trim();
}
