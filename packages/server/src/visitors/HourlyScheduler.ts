export interface HourlySchedulerOptions {
	/**
	 * Callback to execute at the top of each hour.
	 */
	onHour: () => void;
	/**
	 * Time provider for testing. Defaults to Date.now.
	 */
	timeProvider?: () => number;
	/**
	 * Logger function. Defaults to console.log.
	 */
	logger?: (message: string) => void;
}

/**
 * Schedules a callback to run at the top of each hour (X:00:00).
 *
 * Uses drift correction to maintain accuracy over time:
 * - Calculates time until next hour boundary
 * - Reschedules after each execution to correct for drift
 * - Handles system clock changes gracefully
 */
export class HourlyScheduler {
	private readonly onHour: () => void;
	private readonly timeProvider: () => number;
	private readonly logger: (message: string) => void;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;
	private isRunning = false;

	constructor(options: HourlySchedulerOptions) {
		this.onHour = options.onHour;
		this.timeProvider = options.timeProvider ?? (() => Date.now());
		this.logger = options.logger ?? (() => {});
	}

	/**
	 * Starts the scheduler.
	 * The callback will be executed at the top of the next hour and every hour
	 * thereafter.
	 */
	public start(): void {
		if (this.isRunning) {
			return;
		}
		this.isRunning = true;
		this.scheduleNext();
	}

	/**
	 * Stops the scheduler.
	 * Any pending execution will be cancelled.
	 */
	public stop(): void {
		this.isRunning = false;
		if (this.timeoutId !== null) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}

	/**
	 * Returns true if the scheduler is currently running.
	 */
	public isActive(): boolean {
		return this.isRunning;
	}

	/**
	 * Returns the time in milliseconds until the next hour boundary.
	 */
	public getTimeUntilNextHour(): number {
		const now = this.timeProvider();
		return this.calculateDelayUntilNextHour(now);
	}

	private scheduleNext(): void {
		if (!this.isRunning) {
			return;
		}

		const now = this.timeProvider();
		const delay = this.calculateDelayUntilNextHour(now);

		this.logger(`Scheduling next hourly task in ${Math.round(delay / 1000)}s`);

		this.timeoutId = setTimeout(() => {
			this.execute();
		}, delay);
	}

	private execute(): void {
		if (!this.isRunning) {
			return;
		}

		try {
			this.onHour();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger(`Hourly task failed: ${message}`);
		}

		// Reschedule for next hour (drift correction happens here)
		this.scheduleNext();
	}

	/**
	 * Calculates milliseconds until the next hour boundary.
	 * Ensures a minimum delay of 1 second to prevent tight loops.
	 */
	private calculateDelayUntilNextHour(now: number): number {
		const date = new Date(now);
		const nextHour = new Date(date);
		nextHour.setHours(date.getHours() + 1, 0, 0, 0);
		const delay = nextHour.getTime() - now;
		// Minimum 1 second delay to prevent tight loops on clock edge cases
		return Math.max(delay, 1000);
	}
}
