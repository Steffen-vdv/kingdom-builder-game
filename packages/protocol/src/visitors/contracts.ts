import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stats for a single hour window.
 */
export interface HourlyVisitorStats {
	/** Unix timestamp of the hour start */
	hourTimestamp: number;
	/** Year (e.g., 2024) */
	year: number;
	/** Month (1-12) */
	month: number;
	/** Day of month (1-31) */
	day: number;
	/** Hour of day (0-23) */
	hour: number;
	/** Number of unique visitors in this hour */
	uniqueVisitors: number;
}

/**
 * Response from the visitor stats endpoint.
 */
export interface VisitorStatsResponse {
	/**
	 * Total unique visitors in the last 24 completed hours.
	 * Note: This is a sum of hourly unique counts, not deduplicated.
	 */
	totalVisitors: number;
	/**
	 * Number of completed hours included in the total (0-24).
	 */
	hoursIncluded: number;
	/**
	 * Optional: Breakdown by hour, most recent first.
	 * Only included if requested with ?breakdown=true.
	 */
	hourlyBreakdown?: HourlyVisitorStats[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const hourlyVisitorStatsSchema = z.object({
	hourTimestamp: z.number(),
	year: z.number(),
	month: z.number().min(1).max(12),
	day: z.number().min(1).max(31),
	hour: z.number().min(0).max(23),
	uniqueVisitors: z.number().min(0),
});

export const visitorStatsResponseSchema = z.object({
	totalVisitors: z.number().min(0),
	hoursIncluded: z.number().min(0).max(24),
	hourlyBreakdown: z.array(hourlyVisitorStatsSchema).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Type verification
// ─────────────────────────────────────────────────────────────────────────────

type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
		? true
		: false;
type Expect<T extends true> = T;

type _HourlyStatsMatches = Expect<
	Equal<z.infer<typeof hourlyVisitorStatsSchema>, HourlyVisitorStats>
>;
type _ResponseMatches = Expect<
	Equal<z.infer<typeof visitorStatsResponseSchema>, VisitorStatsResponse>
>;
