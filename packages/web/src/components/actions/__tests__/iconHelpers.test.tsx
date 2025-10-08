import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { formatIconTitle, renderIconLabel } from '../iconHelpers';

describe('formatIconTitle', () => {
	it('joins icon and label when icon is provided', () => {
		expect(formatIconTitle('🏠', 'Build')).toBe('🏠 Build');
	});

	it('returns label when icon is missing', () => {
		expect(formatIconTitle(undefined, 'Build')).toBe('Build');
	});

	it('ignores whitespace-only icons', () => {
		expect(formatIconTitle('   ', 'Build')).toBe('Build');
	});
});

describe('renderIconLabel', () => {
	function countOccurrences(markup: string, token: string): number {
		return markup.split(token).length - 1;
	}

	it('renders the icon span when an icon exists', () => {
		const markup = renderToStaticMarkup(renderIconLabel('🏠', 'Build'));
		expect(markup).toContain('🏠');
		expect(countOccurrences(markup, '<span')).toBe(3);
	});

	it('omits the icon span when no icon exists', () => {
		const markup = renderToStaticMarkup(renderIconLabel(undefined, 'Build'));
		expect(markup).not.toContain('🏠');
		expect(countOccurrences(markup, '<span')).toBe(2);
	});
});
