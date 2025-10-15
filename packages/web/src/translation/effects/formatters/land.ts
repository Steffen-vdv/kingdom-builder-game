import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('land', 'add', {
        summarize: (effect, context) => {
                const count = Number(effect.params?.['count'] ?? 1);
                const icon = context.assets.land?.icon ?? '';
                return `${icon}${signed(count)}${count}`;
        },
        describe: (effect, context) => {
                const count = Number(effect.params?.['count'] ?? 1);
                const land = context.assets.land;
                const icon = land?.icon ?? '';
                const label = land?.label ?? 'Land';
                return `${icon} ${signed(count)}${count} ${label}`.trim();
        },
});

registerEffectFormatter('land', 'till', {
        summarize: (_effect, context) => {
                const slot = context.assets.slot;
                const icon = slot?.icon ?? '';
                return `${icon}+1`;
        },
        describe: (_effect, context) => {
                const land = context.assets.land;
                const slot = context.assets.slot;
                const landLabel = land?.label ?? 'Land';
                const slotLabel = slot?.label ?? 'Development Slot';
                const landIcon = land?.icon ?? '';
                const slotIcon = slot?.icon ?? '';
                const landPart = `${landIcon} ${landLabel}`.trim();
                const slotPart = `${slotIcon} ${slotLabel}`.trim();
                return `Till ${landPart} to unlock ${slotPart}`;
        },
});
