import type { ResourceV2GroupDefinition } from '@kingdom-builder/protocol';
import type { ResourceV2GroupBuilder } from '../config/builders/resourceV2';

const groupBuilders: ReadonlyArray<ResourceV2GroupBuilder> = [];

export const RESOURCE_V2_GROUPS: ReadonlyArray<ResourceV2GroupDefinition> = groupBuilders.map((builder) => builder.build());
