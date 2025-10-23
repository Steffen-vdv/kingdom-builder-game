import React from 'react';
import type { ResourceEntry, ResourceRowRole } from './types';

interface ResourceRowProps {
        readonly entry: ResourceEntry;
        readonly role: ResourceRowRole;
}

const ResourceRow: React.FC<ResourceRowProps> = ({ entry, role }) => {
        const icon = entry.icon ?? '❔';
        return (
                <div
                        className="resource-row flex items-center justify-between rounded-xl border border-white/50 bg-white/80 px-4 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-slate-900/70"
                        data-testid="resource-row"
                        data-resource-id={entry.id}
                        data-resource-role={role}
                >
                        <div className="flex min-w-0 items-center gap-2">
                                <span aria-hidden="true" className="text-base">
                                        {icon}
                                </span>
                                <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                                        {entry.label}
                                </span>
                        </div>
                        <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {entry.displayValue}
                                </span>
                                {entry.badges.length > 0 && (
                                        <div className="flex flex-wrap justify-end gap-2">
                                                {entry.badges.map((badge) => (
                                                        <span
                                                                key={badge}
                                                                className="inline-flex items-center rounded-full bg-slate-900/10 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-100/10 dark:text-slate-200"
                                                        >
                                                                {badge}
                                                        </span>
                                                ))}
                                        </div>
                                )}
                        </div>
                </div>
        );
};

export default ResourceRow;
