import type {
	ResourceV2Definition,
	ResourceV2GroupDefinition,
	ResourceV2GlobalActionCostMetadata,
} from '@kingdom-builder/protocol';
import type {
	createResourceV2Definition,
	createResourceV2Group,
	ResourceV2DefinitionFactoryOptions,
	ResourceV2GroupFactoryOptions,
} from './content';

type JsonPrimitive = string | number | boolean | null;
type JsonValue =
	| JsonPrimitive
	| { readonly [key: string]: JsonValue }
	| readonly JsonValue[];

type AssertSerializable<T> = T extends JsonValue ? true : never;

type DefinitionInstance = ReturnType<typeof createResourceV2Definition>;
type GroupInstance = ReturnType<typeof createResourceV2Group>;

type _DefinitionMatchesSchema = DefinitionInstance extends ResourceV2Definition
	? true
	: never;
type _GroupMatchesSchema = GroupInstance extends ResourceV2GroupDefinition
	? true
	: never;

type _DefinitionIsSerializable = AssertSerializable<DefinitionInstance>;
type _GroupIsSerializable = AssertSerializable<GroupInstance>;

type DefinitionOptions = ResourceV2DefinitionFactoryOptions;
type GroupOptions = ResourceV2GroupFactoryOptions;

type TierTrackConfigurator = Extract<
	DefinitionOptions['tierTrack'],
	(...args: unknown[]) => void
>;
type ParentTierTrackConfigurator = Extract<
	GroupOptions['parentTierTrack'],
	(...args: unknown[]) => void
>;

type _DefinitionTierTrackAcceptsBuilder = TierTrackConfigurator extends (
	builder: infer Builder,
) => void
	? Builder extends {
			tierWith: (...args: readonly unknown[]) => Builder;
		}
		? true
		: never
	: true;

type _GroupTierTrackAcceptsBuilder = ParentTierTrackConfigurator extends (
	builder: infer Builder,
) => void
	? Builder extends {
			tierWith: (...args: readonly unknown[]) => Builder;
		}
		? true
		: never
	: true;

type DefinitionOverrideSample = {
	readonly bounds: { readonly lowerBound: 0; readonly upperBound: 10 };
	readonly globalActionCost: ResourceV2GlobalActionCostMetadata;
	readonly tierTrack: TierTrackConfigurator;
	readonly group: { readonly groupId: 'sample'; readonly order: 2 };
};

type GroupOverrideSample = {
	readonly children: readonly ['alpha', 'beta'];
	readonly parentBounds: { readonly lowerBound: 0 };
	readonly parentTierTrack: ParentTierTrackConfigurator;
};

type _DefinitionOptionsAcceptSample =
	DefinitionOverrideSample extends DefinitionOptions ? true : never;
type _GroupOptionsAcceptSample = GroupOverrideSample extends GroupOptions
	? true
	: never;

type _DefinitionJsonValueCompatibility = DefinitionInstance extends JsonValue
	? true
	: never;
type _GroupJsonValueCompatibility = GroupInstance extends JsonValue
	? true
	: never;
