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

	describe('visible tiers (3 for both bar and rows)', () => {
		it('shows exactly 3 tier rows when more than 3 tiers exist', () => {
			const tiers = createHappinessTiers(4); // Steady tier active (middle)
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			// Should render 3 tier effect rows (in the tier rows section)
			const tierRowsSection = container.querySelector('.mt-3.flex.flex-col');
			const tierRows = tierRowsSection?.querySelectorAll('.rounded-md');
			expect(tierRows?.length).toBe(3);
		});

		it('shows 3 emojis on bar (1 below, current, 1 above)', () => {
			const { container } = render(
				<TierThermometer currentValue={0} tiers={createHappinessTiers(4)} />,
			);

			// Get emojis from the emoji row
			const emojiRow = container.querySelector('.relative.h-6');
			const emojis = emojiRow?.querySelectorAll('span');

			// Should show 3 emojis on bar
			expect(emojis?.length).toBe(3);
		});

		it('shows 3 tier rows centered on active (1 below, current, 1 above)', () => {
			const { container } = render(
				<TierThermometer currentValue={0} tiers={createHappinessTiers(4)} />,
			);

			// Get tier names from the tier rows section
			const tierRowsSection = container.querySelector('.mt-3.flex.flex-col');
			const tierNames = tierRowsSection?.querySelectorAll('.font-medium');
			const names = Array.from(tierNames || []).map((elem) => elem.textContent);

			// Should show 3 tiers: Unrest, Steady (active), Content
			expect(names).toContain('Steady');
			expect(names).toContain('Content');
			expect(names).toContain('Unrest');

			// Should NOT show tiers further away
			expect(names).not.toContain('Ecstatic');
			expect(names).not.toContain('Joyful');
			expect(names).not.toContain('Grim');
		});

		it('fills from other direction when at upper boundary', () => {
			const { container } = render(
				<TierThermometer currentValue={10} tiers={createHappinessTiers(0)} />,
			);

			// Get tier names from the tier rows section
			const tierRowsSection = container.querySelector('.mt-3.flex.flex-col');
			const tierNames = tierRowsSection?.querySelectorAll('.font-medium');
			const names = Array.from(tierNames || []).map((elem) => elem.textContent);

			// At top boundary, should show 3 highest tiers
			expect(names).toContain('Ecstatic');
			expect(names).toContain('Elated');
			expect(names).toContain('Joyful');

			// Should NOT show lower tiers
			expect(names).not.toContain('Content');
			expect(names).not.toContain('Steady');
		});

		it('fills from other direction when at lower boundary', () => {
			const { container } = render(
				<TierThermometer currentValue={-10} tiers={createHappinessTiers(8)} />,
			);

			// Get tier names from the tier rows section
			const tierRowsSection = container.querySelector('.mt-3.flex.flex-col');
			const tierNames = tierRowsSection?.querySelectorAll('.font-medium');
			const names = Array.from(tierNames || []).map((elem) => elem.textContent);

			// At bottom boundary, should show 3 lowest tiers
			expect(names).toContain('Despair');
			expect(names).toContain('Misery');
			expect(names).toContain('Grim');

			// Should NOT show higher tiers
			expect(names).not.toContain('Steady');
			expect(names).not.toContain('Unrest');
		});

		it('shows all tiers when fewer than 3 exist', () => {
			const tiers: TierSummary[] = [
				createTierSummary('High', '😄', 5, undefined, false),
				createTierSummary('Medium', '😐', 0, 4, true),
			];
			render(<TierThermometer currentValue={2} tiers={tiers} />);

			// Should show both tiers
			expect(screen.getByText('High')).toBeInTheDocument();
			expect(screen.getByText('Medium')).toBeInTheDocument();
		});
	});

	describe('integer labels', () => {
		it('renders integer labels for each value in range', () => {
			// Create tiers with known range: Joyful(5-7), Elated(8-9), Ecstatic(10+)
			const tiers = createHappinessTiers(1); // Elated active
			const { container } = render(
				<TierThermometer currentValue={9} tiers={tiers} />,
			);

			// Get labels row
			const labelsRow = container.querySelector('.relative.h-4');
			const labels = labelsRow?.querySelectorAll('span');

			// Should have labels for integers in range 5-10 (6 labels)
			expect(labels?.length).toBeGreaterThanOrEqual(3);
		});

		it('highlights the current value label', () => {
			const tiers = createHappinessTiers(4); // Steady active, value 0
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			// Find the current value label (should be bold with text-white)
			const labelsRow = container.querySelector('.relative.h-4');
			const currentLabel = labelsRow?.querySelector('.font-bold.text-white');
			expect(currentLabel).toBeTruthy();
			expect(currentLabel?.textContent).toBe('+0');
		});

		it('formats positive values with + prefix', () => {
			const tiers = createHappinessTiers(3); // Content active (3-4 range)
			const { container } = render(
				<TierThermometer currentValue={3} tiers={tiers} />,
			);

			// Find labels containing +
			const labelsRow = container.querySelector('.relative.h-4');
			const labels = labelsRow?.querySelectorAll('span');
			const labelTexts = Array.from(labels || []).map(
				(elem) => elem.textContent,
			);

			// Should have some positive labels with + prefix
			expect(labelTexts.some((text) => text?.startsWith('+'))).toBe(true);
		});
	});

	describe('tier boundary markers', () => {
		it('renders colored boundary markers between tiers', () => {
			const tiers = createHappinessTiers(1); // Elated active
			const { container } = render(
				<TierThermometer currentValue={9} tiers={tiers} />,
			);

			// Find the gradient bar
			const bar = container.querySelector('.relative.h-2.rounded-full');
			// All markers (boundaries + current) have w-1 class
			const allMarkers = bar?.querySelectorAll('.w-1');
			// Should have 2 boundaries + 1 current value marker = 3 total
			expect(allMarkers?.length).toBe(3);
		});

		it('colors boundaries by direction (orange=regression, teal=progression)', () => {
			const tiers = createHappinessTiers(1); // Elated active
			const { container } = render(
				<TierThermometer currentValue={9} tiers={tiers} />,
			);

			const bar = container.querySelector('.relative.h-2.rounded-full');
			const allMarkers = Array.from(bar?.querySelectorAll('.w-1') || []);

			// Check for orange (regression) and teal (progression) colors
			const hasOrange = allMarkers.some((marker) =>
				(marker as HTMLElement).style.background.includes('251, 146, 60'),
			);
			const hasTeal = allMarkers.some((marker) =>
				(marker as HTMLElement).style.background.includes('45, 212, 191'),
			);

			expect(hasOrange).toBe(true);
			expect(hasTeal).toBe(true);
		});

		it('positions boundaries between adjacent integers', () => {
			// With tiers Joyful(5-7), Elated(8-9), Ecstatic(10+)
			const tiers = createHappinessTiers(1); // Elated active
			const { container } = render(
				<TierThermometer currentValue={9} tiers={tiers} />,
			);

			const bar = container.querySelector('.relative.h-2.rounded-full');
			const allMarkers = bar?.querySelectorAll('.w-1');

			// Each marker should have a left percentage
			allMarkers?.forEach((marker) => {
				const style = (marker as HTMLElement).style.left;
				expect(style).toMatch(/^\d+(\.\d+)?%$/);
			});
		});
	});

	describe('current value marker', () => {
		it('renders current value marker on bar', () => {
			const tiers = createHappinessTiers(4);
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			// Find the marker (white bar with glow)
			const marker = container.querySelector('.absolute.-top-1.w-1.h-4');
			expect(marker).toBeInTheDocument();
		});

		it('positions marker at current value', () => {
			const tiers = createHappinessTiers(4); // Steady active (-2 to 2)
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			const marker = container.querySelector('.absolute.-top-1.w-1.h-4');
			expect(marker).toBeTruthy();

			// Marker should have a left style
			const leftValue = (marker as HTMLElement).style.left;
			expect(leftValue).toMatch(/^\d+(\.\d+)?%$/);
		});
	});

	describe('emoji positioning', () => {
		it('renders emojis for each visible tier', () => {
			const tiers = createHappinessTiers(4); // Steady active
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			// Get emoji row
			const emojiRow = container.querySelector('.relative.h-6');
			const emojis = emojiRow?.querySelectorAll('span');

			// Should have 3 emojis (one per visible tier)
			expect(emojis?.length).toBe(3);
		});

		it('highlights the active tier emoji', () => {
			const tiers = createHappinessTiers(4); // Steady active
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			// Find emoji row and active emoji
			const emojiRow = container.querySelector('.relative.h-6');
			const activeEmoji = emojiRow?.querySelector('.text-xl.opacity-100');
			expect(activeEmoji).toBeTruthy();
			expect(activeEmoji?.textContent).toBe('😐'); // Steady icon
		});

		it('positions emojis centered in tier zones', () => {
			const tiers = createHappinessTiers(1); // Elated active
			const { container } = render(
				<TierThermometer currentValue={9} tiers={tiers} />,
			);

			const emojiRow = container.querySelector('.relative.h-6');
			const emojis = emojiRow?.querySelectorAll('span');

			// Each emoji should have a left percentage
			emojis?.forEach((emoji) => {
				const style = (emoji as HTMLElement).style.left;
				expect(style).toMatch(/^\d+(\.\d+)?%$/);
			});
		});
	});

	describe('tier effect rows', () => {
		it('renders effect rows for each visible tier', () => {
			const tiers = createHappinessTiers(4);
			const { container } = render(
				<TierThermometer currentValue={0} tiers={tiers} />,
			);

			// Should have 3 tier rows in the tier rows section
			const tierRowsSection = container.querySelector('.mt-3.flex.flex-col');
			const rows = tierRowsSection?.querySelectorAll('.rounded-md');
			expect(rows?.length).toBe(3);
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
});
