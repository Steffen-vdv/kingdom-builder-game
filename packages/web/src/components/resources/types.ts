export interface ResourceEntry {
        readonly id: string;
        readonly label: string;
        readonly icon?: string;
        readonly displayValue: string;
        readonly badges: readonly string[];
        readonly order: number;
        readonly visible: boolean;
}

export interface ResourceGroupEntry {
        readonly parent: ResourceEntry;
        readonly children: readonly ResourceEntry[];
}

export type ResourceRowRole = 'parent' | 'child' | 'solo';
