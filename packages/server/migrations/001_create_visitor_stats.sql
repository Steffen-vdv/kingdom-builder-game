-- Tracks unique visitor counts per hour.
-- Each row represents a completed hour window (e.g., 15:00-16:00).
-- The hour_timestamp is the START of the hour window (stored as Unix epoch).

CREATE TABLE visitor_stats (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	-- Unix timestamp of the hour start (e.g., 1702137600 for 2023-12-09 15:00:00 UTC)
	hour_timestamp INTEGER NOT NULL,
	-- Year component for easier querying (e.g., 2023)
	year INTEGER NOT NULL,
	-- Month component (1-12)
	month INTEGER NOT NULL,
	-- Day of month (1-31)
	day INTEGER NOT NULL,
	-- Hour of day (0-23)
	hour INTEGER NOT NULL,
	-- Count of unique visitors (by IP) during this hour
	unique_visitors INTEGER NOT NULL,
	-- When this record was created
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for efficient 24-hour lookups (most common query)
CREATE INDEX idx_visitor_stats_hour_timestamp ON visitor_stats(hour_timestamp);

-- Unique constraint to prevent duplicate entries for the same hour
CREATE UNIQUE INDEX idx_visitor_stats_unique_hour ON visitor_stats(
	year, month, day, hour
);
