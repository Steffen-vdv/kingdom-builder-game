import type {
	SessionPlayerStateSnapshot as PlayerStateSnapshot,
	SessionResourceSourceLink as StatSourceLink,
	SessionResourceSourceMeta as StatSourceMeta,
} from '@kingdom-builder/protocol';
import type { TranslationContext } from '../../translation/context';
import type { ResolveResult, SourceDescriptor } from './types';
import {
	defaultFormatDetail,
	formatKindLabel,
	getDescriptor,
} from './descriptorRegistry';

function getResolutionCandidates(
	meta: StatSourceMeta,
): (StatSourceLink | undefined)[] {
	const candidates: (StatSourceLink | undefined)[] = [meta.removal];
	if (meta.dependsOn) {
		candidates.push(...meta.dependsOn);
	}
	return candidates;
}

export function formatLinkLabel(
	translationContext: TranslationContext,
	link?: StatSourceLink,
): string | undefined {
	if (!link) {
		return undefined;
	}
	const descriptor = getDescriptor(translationContext, link.type);
	const resolved = descriptor.resolve(link.id);
	const parts: string[] = [];
	if (resolved.icon) {
		parts.push(resolved.icon);
	}
	if (resolved.label) {
		parts.push(resolved.label);
	}
	const label = parts.join(' ').trim();
	return label || undefined;
}

function resolveLinkDescriptor(
	translationContext: TranslationContext,
	link?: StatSourceLink,
	options: {
		omitAssignmentDetail?: boolean;
		omitRemovalDetail?: boolean;
	} = {},
): ResolveResult | undefined {
	if (!link?.type) {
		return undefined;
	}
	const descriptor = getDescriptor(translationContext, link.type);
	const resolved = descriptor.resolve(link.id);
	let label = resolved.label;
	let detail = descriptor.formatDetail?.(link.id, link.detail);
	if (detail === undefined && link?.detail) {
		detail = defaultFormatDetail(link.id, link.detail);
	}
	if (detail) {
		const normalized = detail.trim().toLowerCase();
		if (options.omitAssignmentDetail) {
			if (normalized === 'assigned' || normalized === 'unassigned') {
				detail = undefined;
			}
		}
		if (options.omitRemovalDetail && normalized === 'removed') {
			detail = undefined;
		}
	}
	if (detail) {
		label = label ? `${label} ${detail}`.trim() : detail;
	}
	if (!label && !resolved.icon) {
		return undefined;
	}
	return {
		icon: resolved.icon,
		label: label ?? '',
	} satisfies ResolveResult;
}

function deriveResolutionSuffix(
	translationContext: TranslationContext,
	meta: StatSourceMeta,
): ResolveResult | undefined {
	if (meta.kind !== 'action') {
		return undefined;
	}
	const detail = meta.detail?.trim().toLowerCase();
	if (detail !== 'resolution') {
		return undefined;
	}
	const priority = ['development', 'building', 'population', 'passive', 'land'];
	for (const type of priority) {
		const match = getResolutionCandidates(meta).find((link) => {
			return link?.type === type;
		});
		if (!match) {
			continue;
		}
		const resolved = resolveLinkDescriptor(translationContext, match, {
			omitAssignmentDetail: true,
			omitRemovalDetail: true,
		});
		if (resolved) {
			return resolved;
		}
	}
	if (meta.removal) {
		const fallback = resolveLinkDescriptor(translationContext, meta.removal, {
			omitAssignmentDetail: true,
			omitRemovalDetail: true,
		});
		if (fallback) {
			return fallback;
		}
	}
	return undefined;
}

export function getSourceDescriptor(
	translationContext: TranslationContext,
	meta: StatSourceMeta,
): SourceDescriptor {
	const entry = getDescriptor(translationContext, meta.kind);
	const base = entry.resolve(meta.id);
	const descriptor: SourceDescriptor = {
		icon: base.icon,
		label: base.label,
	} satisfies SourceDescriptor;
	if (meta.kind) {
		descriptor.kind = meta.kind;
	}
	let suffixText = entry.formatDetail?.(meta.id, meta.detail);
	if (suffixText === undefined && meta.detail) {
		suffixText = defaultFormatDetail(meta.id, meta.detail);
	}
	let suffix = suffixText
		? ({ icon: '', label: suffixText } satisfies ResolveResult)
		: undefined;
	const resolutionSuffix = deriveResolutionSuffix(translationContext, meta);
	if (resolutionSuffix) {
		suffix = resolutionSuffix;
	}
	const isAction = meta.kind === 'action';
	const noResolutionOverride = resolutionSuffix === undefined;
	if (suffix != null && noResolutionOverride && isAction) {
		const detail = suffix.label.trim().toLowerCase();
		if (detail === 'resolution') {
			suffix = undefined;
		}
	}
	if (suffix) {
		descriptor.suffix = suffix;
	}
	if (!descriptor.label) {
		const fallbackLabel = formatKindLabel(
			translationContext,
			meta.kind,
			meta.id,
		);
		if (fallbackLabel) {
			descriptor.label = fallbackLabel;
		}
	}
	return descriptor;
}

export function formatSourceTitle(descriptor: SourceDescriptor): string {
	const iconParts: string[] = [];
	const pushIcon = (icon?: string) => {
		if (!icon) {
			return;
		}
		if (!iconParts.includes(icon)) {
			iconParts.push(icon);
		}
	};
	pushIcon(descriptor.icon);
	pushIcon(descriptor.suffix?.icon);
	const iconText = iconParts.join('');
	const baseLabel = descriptor.label?.trim() ?? '';
	const suffixLabel = descriptor.suffix?.label?.trim() ?? '';
	let labelText = baseLabel;
	if (descriptor.kind === 'action') {
		if (baseLabel && suffixLabel) {
			labelText = `${baseLabel}: ${suffixLabel}`;
		} else if (suffixLabel) {
			labelText = suffixLabel;
		}
	} else if (suffixLabel) {
		const normalizedBase = baseLabel.toLowerCase();
		const normalizedSuffix = suffixLabel.toLowerCase();
		if (baseLabel && normalizedBase !== normalizedSuffix) {
			labelText = `${baseLabel} · ${suffixLabel}`;
		} else {
			labelText = suffixLabel || baseLabel;
		}
	}
	const parts: string[] = [];
	if (iconText) {
		parts.push(iconText);
	}
	if (labelText) {
		parts.push(labelText);
	}
	return parts.join(' ').trim();
}

export function formatDependency(
	link: StatSourceLink,
	player: PlayerStateSnapshot,
	context: TranslationContext,
	options: { includeCounts?: boolean } = {},
): string {
	const entry = getDescriptor(context, link.type);
	if (entry.formatDependency) {
		return entry.formatDependency(link, player, context, options);
	}
	const entity = entry.resolve(link.id);
	const fragments: string[] = [];
	if (entity.icon) {
		fragments.push(entity.icon);
	}
	if (entity.label) {
		fragments.push(entity.label);
	}
	let detail = entry.formatDetail?.(link.id, link.detail);
	if (detail === undefined && link.detail) {
		detail = defaultFormatDetail(link.id, link.detail);
	}
	const augmented = entry.augmentDependencyDetail?.(
		detail,
		link,
		player,
		context,
		options,
	);
	if (augmented !== undefined) {
		detail = augmented;
	}
	if (detail) {
		fragments.push(detail);
	}
	return fragments.join(' ').replace(/\s+/g, ' ').trim();
}
