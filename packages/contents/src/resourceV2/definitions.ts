import type { ResourceV2Definition } from '@kingdom-builder/protocol';
import type { ResourceV2DefinitionBuilder } from '../config/builders/resourceV2';

const definitionBuilders: ReadonlyArray<ResourceV2DefinitionBuilder> = [];

export const RESOURCE_V2_DEFINITIONS: ReadonlyArray<ResourceV2Definition> = definitionBuilders.map((builder) => builder.build());
