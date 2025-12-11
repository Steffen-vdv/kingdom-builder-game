/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import TierThermometer from '../../../src/components/player/TierThermometer';
import type { TierSummary } from '../../../src/components/player/buildTierEntries';

/**
 * Create a mock tier summary for testing
 */
function createTierSummary(
	name: string,
	icon: string,
	rangeMin: number | undefined,
	rangeMax: number | undefined,
	active: boolean,
	effects: string[] = ['Test effect'],
): TierSummary {
	const rangeLabel =
		rangeMax === undefined
			? `${rangeMin}+`
			: rangeMin === rangeMax
				? `${rangeMin}`
				: `${rangeMin} - ${rangeMax}`;
	return {
		entry: {
			title: `${icon} ${name} (${rangeLabel})`,
			items: effects,
		},
		active,
		icon,
		name,
		rangeLabel,
		rangeMin,
		rangeMax,
	};
}

/**
 * Create happiness-like tiers for testing (9 tiers from -10 to 10+)
 */
function createHappinessTiers(activeIndex: number): TierSummary[] {
	const tiers: TierSummary[] = [
		// Highest first (as passed to component)
		createTierSummary('Ecstatic', '🤩', 10, undefined, activeIndex === 0, [
			'Gain 50% more resources',
			'Decrease cost by 20%',
			'+20% Growth',
		]),
		createTierSummary('Elated', '😄', 8, 9, activeIndex === 1, [
			'Gain 50% more resources',
			'Decrease cost by 20%',
		]),
		createTierSummary('Joyful', '😊', 5, 7, activeIndex === 2, [
			'Gain 25% more resources',
			'Decrease cost by 20%',
		]),
		createTierSummary('Content', '🙂', 3, 4, activeIndex === 3, [
			'Gain 25% more resources',
		]),
		createTierSummary('Steady', '😐', -2, 2, activeIndex === 4, ['No effect']),
		createTierSummary('Unrest', '🙁', -4, -3, activeIndex === 5, [
			'Gain 25% less resources',
		]),
		createTierSummary('Grim', '😟', -7, -5, activeIndex === 6, [
			'Gain 25% less resources',
			'Skip Growth phase',
		]),
		createTierSummary('Misery', '😠', -9, -8, activeIndex === 7, [
			'Gain 50% less resources',
			'Skip Growth phase',
		]),
		createTierSummary(
			'Despair',
			'😡',
			Number.MIN_SAFE_INTEGER,
			-10,
			activeIndex === 8,
			['Gain 50% less resources', 'Skip Growth phase', 'Skip War Recovery'],
		),
	];
	return tiers;
}

describe('TierThermometer', () => {
	describe('rendering', () => {
		it('renders nothing when tiers array is empty', () => {
			const { container } = render(
				<TierThermometer currentValue={0} tiers={[]} />,
			);
			expect(container.firstChild).toBeNull();
		});

		it('renders thermometer with tier data', () => {
			const tiers = createHappinessTiers(4); // Steady tier active
			render(<TierThermometer currentValue={0} tiers={tiers} />);

			// Should have tier-thermometer container
			const thermometer = document.querySelector('.tier-thermometer');
			expect(thermometer).toBeInTheDocument();
		});
	});

	describe('visible tiers (5 max, centered on active)', () => {
		it('shows exactly 5 tier rows when more than 5 tiers exist', () => {
			const tiers = createHappinessTiers(4); // Steady tier active (middle)
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			// Should render 5 tier effect rows (in the tier rows section)
			const tierRowsSection = container.querySelector('.mt-3.flex.flex-col');
			const tierRows = tierRowsSection?.querySelectorAll('.rounded-md');
			expect(tierRows?.length).toBe(5);
		});

		it('centers visible tiers on active tier (2 below, current, 2 above)', () => {
			const { container } = render(
				<TierThermometer currentValue={0} tiers={createHappinessTiers(4)} />,
			);

			// Get tier names from the tier rows section
			const tierRowsSection = container.querySelector('.mt-3.flex.flex-col');
			const tierNames = tierRowsSection?.querySelectorAll('.font-medium');
			const names = Array.from(tierNames || []).map((elem) => elem.textContent);

			// Should show: Grim, Unrest, Steady (active), Content, Joyful
			expect(names).toContain('Steady');
			expect(names).toContain('Content');
			expect(names).toContain('Joyful');

			// Should NOT show Ecstatic (too far above)
			expect(names).not.toContain('Ecstatic');
		});

		it('fills from other direction when at upper boundary', () => {
			const { container } = render(
				<TierThermometer currentValue={10} tiers={createHappinessTiers(0)} />,
			);

			// Get tier names from the tier rows section
			const tierRowsSection = container.querySelector('.mt-3.flex.flex-col');
			const tierNames = tierRowsSection?.querySelectorAll('.font-medium');
			const names = Array.from(tierNames || []).map((elem) => elem.textContent);

			// At top boundary, should show 5 highest tiers
			expect(names).toContain('Ecstatic');
			expect(names).toContain('Elated');
			expect(names).toContain('Joyful');
			expect(names).toContain('Content');
			expect(names).toContain('Steady');

			// Should NOT show lower tiers
			expect(names).not.toContain('Despair');
			expect(names).not.toContain('Misery');
		});

		it('fills from other direction when at lower boundary', () => {
			const { container } = render(
				<TierThermometer currentValue={-10} tiers={createHappinessTiers(8)} />,
			);

			// Get tier names from the tier rows section
			const tierRowsSection = container.querySelector('.mt-3.flex.flex-col');
			const tierNames = tierRowsSection?.querySelectorAll('.font-medium');
			const names = Array.from(tierNames || []).map((elem) => elem.textContent);

			// At bottom boundary, should show 5 lowest tiers
			expect(names).toContain('Despair');
			expect(names).toContain('Misery');
			expect(names).toContain('Grim');
			expect(names).toContain('Unrest');
			expect(names).toContain('Steady');

			// Should NOT show higher tiers
			expect(names).not.toContain('Ecstatic');
			expect(names).not.toContain('Elated');
		});

		it('shows all tiers when fewer than 5 exist', () => {
			const tiers: TierSummary[] = [
				createTierSummary('High', '😄', 5, undefined, false),
				createTierSummary('Medium', '😐', 0, 4, true),
				createTierSummary('Low', '😟', Number.MIN_SAFE_INTEGER, -1, false),
			];
			render(<TierThermometer currentValue={2} tiers={tiers} />);

			// Should show all 3 tiers
			expect(screen.getByText('High')).toBeInTheDocument();
			expect(screen.getByText('Medium')).toBeInTheDocument();
			expect(screen.getByText('Low')).toBeInTheDocument();
		});
	});

	describe('thermometer bar bounds', () => {
		it('bases thermometer range on visible tiers only', () => {
			const tiers = createHappinessTiers(4); // Steady active
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			// Only 5 tier icons should be visible on the bar
			const tierIcons = container.querySelectorAll('.relative.h-5 > span');
			expect(tierIcons.length).toBe(5);
		});

		it('shows threshold labels for visible tier boundaries', () => {
			const tiers = createHappinessTiers(4); // Steady active, centered
			render(<TierThermometer currentValue={0} tiers={tiers} />);

			// The visible tiers are roughly Unrest(-4 to -3), Steady(-2 to 2),
			// Content(3-4), Joyful(5-7), Elated(8-9)
			// So thresholds should include values like +3, +5, +8, -2 (but not -10)
			const thresholdLabels = document.querySelectorAll('.relative.h-3 > span');
			expect(thresholdLabels.length).toBeGreaterThan(0);

			// Check that at least some visible threshold labels exist
			const labelTexts = Array.from(thresholdLabels).map(
				(elem) => elem.textContent,
			);
			// Should have some positive thresholds from visible tiers
			const hasVisibleThresholds = labelTexts.some(
				(text) => text && (text.includes('+') || text.includes('-')),
			);
			expect(hasVisibleThresholds).toBe(true);
		});
	});

	describe('tier icons positioning', () => {
		it('positions icons for only visible tiers', () => {
			const tiers = createHappinessTiers(4); // Steady active
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			// Get all tier icons
			const icons = container.querySelectorAll('.relative.h-5 > span');
			expect(icons.length).toBe(5);

			// Each icon should have a left style for positioning
			icons.forEach((icon) => {
				const style = (icon as HTMLElement).style.left;
				expect(style).toMatch(/^\d+(\.\d+)?%$/);
			});
		});

		it('highlights the active tier icon', () => {
			const tiers = createHappinessTiers(4); // Steady active
			render(<TierThermometer currentValue={0} tiers={tiers} />);

			// Find the active tier icon (Steady = 😐)
			const icons = document.querySelectorAll('.relative.h-5 > span');
			const activeIcon = Array.from(icons).find((icon) =>
				icon.classList.contains('scale-110'),
			);
			expect(activeIcon).toBeTruthy();
			expect(activeIcon?.textContent).toBe('😐'); // Steady icon
		});

		it('positions unbounded upper tier at rangeMin (right edge)', () => {
			// Test with Ecstatic tier visible (10+)
			const tiers = createHappinessTiers(0); // Ecstatic active
			const { container } = render(
				<TierThermometer currentValue={10} tiers={tiers} />,
			);

			// Find the Ecstatic icon (🤩)
			const icons = container.querySelectorAll('.relative.h-5 > span');
			const ecstaticIcon = Array.from(icons).find(
				(icon) => icon.textContent === '🤩',
			);
			expect(ecstaticIcon).toBeTruthy();

			// Should be positioned at or near 97% (right edge, clamped)
			const leftValue = parseFloat(
				(ecstaticIcon as HTMLElement).style.left || '0',
			);
			expect(leftValue).toBeGreaterThanOrEqual(90);
		});
	});

	describe('tier effect rows', () => {
		it('renders effect rows for each visible tier', () => {
			const tiers = createHappinessTiers(4);
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			// Should have 5 tier rows in the tier rows section
			const tierRowsSection = container.querySelector('.mt-3.flex.flex-col');
			const rows = tierRowsSection?.querySelectorAll('.rounded-md');
			expect(rows?.length).toBe(5);
		});

		it('highlights the active tier row', () => {
			const tiers = createHappinessTiers(4); // Steady active
			render(<TierThermometer currentValue={0} tiers={tiers} />);

			// Find the active tier row (should have bg-white/10)
			const rows = document.querySelectorAll('.tier-thermometer .rounded-md');
			const activeRow = Array.from(rows).find((row) =>
				row.classList.contains('bg-white/10'),
			);
			expect(activeRow).toBeTruthy();

			// The active row should contain "Steady"
			expect(activeRow?.textContent).toContain('Steady');
		});

		it('displays multiple effects as bullet points', () => {
			const tiers = createHappinessTiers(0); // Ecstatic has 3 effects
			render(<TierThermometer currentValue={10} tiers={tiers} />);

			// Ecstatic should be visible and have bullet list
			const lists = document.querySelectorAll('ul.list-disc');
			expect(lists.length).toBeGreaterThan(0);

			// Check that Ecstatic's effects are rendered as list items
			const listItems = document.querySelectorAll('ul.list-disc li');
			expect(listItems.length).toBeGreaterThan(0);
		});

		it('displays single effect as plain text (no bullets)', () => {
			const tiers = createHappinessTiers(4); // Steady has 1 effect
			render(<TierThermometer currentValue={0} tiers={tiers} />);

			// Steady should be visible and have "No effect" as plain text
			const steadyRow = Array.from(
				document.querySelectorAll('.tier-thermometer .rounded-md'),
			).find((row) => row.textContent?.includes('Steady'));
			expect(steadyRow).toBeTruthy();
			expect(steadyRow?.textContent).toContain('No effect');

			// The "No effect" text should NOT be in a list
			const steadyList = steadyRow?.querySelector('ul.list-disc');
			expect(steadyList).toBeNull();
		});

		it('displays tier name and range label', () => {
			const tiers = createHappinessTiers(4);
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			// Check that tier names are displayed in the tier rows section
			const tierRowsSection = container.querySelector('.mt-3.flex.flex-col');
			const tierNames = tierRowsSection?.querySelectorAll('.font-medium');
			const names = Array.from(tierNames || []).map((elem) => elem.textContent);
			expect(names).toContain('Steady');

			// Check that range labels are displayed
			const rangeLabels = tierRowsSection?.querySelectorAll(
				'.text-white\\/40.tabular-nums',
			);
			const labels = Array.from(rangeLabels || []).map(
				(elem) => elem.textContent,
			);
			expect(labels).toContain('-2 - 2');
		});
	});

	describe('current value marker', () => {
		it('positions marker based on current value', () => {
			const tiers = createHappinessTiers(4);
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			// Find the marker (white bar with glow)
			const marker = container.querySelector(
				'.absolute.-top-1.-bottom-1.w-1\\.5',
			);
			expect(marker).toBeInTheDocument();
		});

		it('clamps marker position within visible range', () => {
			// Test with a value at the edge
			const tiers = createHappinessTiers(0);
			const { container } = render(
				<TierThermometer currentValue={10} tiers={tiers} />,
			);

			const marker = container.querySelector('[style*="box-shadow: 0 0 6px"]');
			expect(marker).toBeTruthy();

			// Marker should be clamped between 3% and 97%
			const leftValue = parseFloat((marker as HTMLElement).style.left || '50');
			expect(leftValue).toBeGreaterThanOrEqual(3);
			expect(leftValue).toBeLessThanOrEqual(97);
		});
	});
});
