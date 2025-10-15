import type { TranslationAssets } from '../../translation/context/types';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

const fallbackTriggerLabel = (id: string | undefined): string => {
        if (!id) {
                return 'Trigger';
        }
        return id;
};

export function resolveTriggerDescriptor(
        id: string | undefined,
        assets: TranslationAssets | undefined,
): ResolveResult {
        if (id && assets?.triggers?.[id]) {
                const info = assets.triggers[id]!;
                return {
                        icon: info.icon ?? '',
                        label: info.past ?? info.future ?? info.label ?? fallbackTriggerLabel(id),
                } satisfies ResolveResult;
        }
        return { icon: '', label: fallbackTriggerLabel(id) } satisfies ResolveResult;
}

export function createTriggerDescriptorEntry(
        assets: TranslationAssets | undefined,
        defaultFormatDetail: NonNullable<DescriptorRegistryEntry['formatDetail']>,
): DescriptorRegistryEntry {
        return {
                resolve: (id?: string) => resolveTriggerDescriptor(id, assets),
                formatDetail: defaultFormatDetail,
        } satisfies DescriptorRegistryEntry;
}

export function formatTriggerLabel(
        id: string,
        assets: TranslationAssets | undefined,
): string | undefined {
        if (!id) {
                return undefined;
        }
        const info = assets?.triggers?.[id];
        if (!info) {
                return id;
        }
        const parts: string[] = [];
        if (info.icon) {
                parts.push(info.icon);
        }
        const label = info.past ?? info.future ?? info.label ?? id;
        if (label) {
                parts.push(label);
        }
        return parts.join(' ').trim();
}
