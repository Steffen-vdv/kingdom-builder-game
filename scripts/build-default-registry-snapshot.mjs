async function loadContentModules() {
	const baseUrl = new URL('../packages/contents/src/', import.meta.url);
	const [
		actionsModule,
		buildingsModule,
		developmentsModule,
		populationsModule,
		populationModule,
		populationRolesModule,
		landModule,
		passiveModule,
		phasesModule,
		resourcesModule,
		statsModule,
		triggersModule,
		overviewModule,
	] = await Promise.all([
		import(new URL('actions.ts', baseUrl)),
		import(new URL('buildings.ts', baseUrl)),
		import(new URL('developments.ts', baseUrl)),
		import(new URL('populations.ts', baseUrl)),
		import(new URL('population.ts', baseUrl)),
		import(new URL('populationRoles.ts', baseUrl)),
		import(new URL('land.ts', baseUrl)),
		import(new URL('passive.ts', baseUrl)),
		import(new URL('phases.ts', baseUrl)),
		import(new URL('resources.ts', baseUrl)),
		import(new URL('stats.ts', baseUrl)),
		import(new URL('triggers.ts', baseUrl)),
		import(new URL('overview.ts', baseUrl)),
	]);
	return {
		createActionRegistry: actionsModule.createActionRegistry,
		createBuildingRegistry: buildingsModule.createBuildingRegistry,
		createDevelopmentRegistry: developmentsModule.createDevelopmentRegistry,
		createPopulationRegistry: populationsModule.createPopulationRegistry,
		POPULATION_INFO: populationModule.POPULATION_INFO,
		POPULATION_ROLES: populationRolesModule.POPULATION_ROLES,
		LAND_INFO: landModule.LAND_INFO,
		SLOT_INFO: landModule.SLOT_INFO,
		PASSIVE_INFO: passiveModule.PASSIVE_INFO,
		PHASES: phasesModule.PHASES,
		RESOURCES: resourcesModule.RESOURCES,
		STATS: statsModule.STATS,
		TRIGGER_INFO: triggersModule.TRIGGER_INFO,
		OVERVIEW_CONTENT: overviewModule.OVERVIEW_CONTENT,
	};
}

function createDescriptor(label, icon, description) {
	const descriptor = {};
	if (label !== undefined) {
		descriptor.label = label;
	}
	if (icon !== undefined) {
		descriptor.icon = icon;
	}
	if (description !== undefined) {
		descriptor.description = description;
	}
	return descriptor;
}

function createRegistryDescriptorMap(registry) {
	return Object.fromEntries(
		Object.entries(registry).map(([id, definition]) => [
			id,
			createDescriptor(
				definition.name,
				definition.icon,
				definition.description,
			),
		]),
	);
}

function createPopulationMetadata(registry, populationRoles) {
	return Object.fromEntries(
		Object.entries(registry).map(([id, definition]) => {
			const roleInfo = populationRoles?.[id];
			return [
				id,
				createDescriptor(
					definition.name ?? roleInfo?.label,
					definition.icon ?? roleInfo?.icon,
					roleInfo?.description,
				),
			];
		}),
	);
}

function createResourceDefinitions(content) {
	return Object.fromEntries(
		Object.entries(content.RESOURCES).map(([key, info]) => {
			const entry = { key };
			if (info.icon !== undefined) {
				entry.icon = info.icon;
			}
			if (info.label !== undefined) {
				entry.label = info.label;
			}
			if (info.description !== undefined) {
				entry.description = info.description;
			}
			if (info.tags && info.tags.length > 0) {
				entry.tags = [...info.tags];
			}
			return [key, entry];
		}),
	);
}

function createResourceMetadata(content) {
	return Object.fromEntries(
		Object.entries(content.RESOURCES).map(([key, info]) => [
			key,
			createDescriptor(info.label, info.icon, info.description),
		]),
	);
}

function createStatMetadata(content) {
	return Object.fromEntries(
		Object.entries(content.STATS).map(([key, info]) => {
			const descriptor = createDescriptor(
				info.label,
				info.icon,
				info.description,
			);
			if (info.displayAsPercent !== undefined) {
				descriptor.displayAsPercent = info.displayAsPercent;
			}
			if (info.addFormat) {
				descriptor.format = { ...info.addFormat };
			}
			return [key, descriptor];
		}),
	);
}

function createPhaseMetadata(content) {
	return Object.fromEntries(
		content.PHASES.map((phase) => {
			const steps = phase.steps?.map((step) => {
				const baseStep = { id: step.id };
				if (step.title !== undefined) {
					baseStep.label = step.title;
				}
				if (step.icon !== undefined) {
					baseStep.icon = step.icon;
				}
				if (step.triggers && step.triggers.length > 0) {
					baseStep.triggers = [...step.triggers];
				}
				return baseStep;
			});
			const phaseMetadata = { id: phase.id };
			if (phase.label !== undefined) {
				phaseMetadata.label = phase.label;
			}
			if (phase.icon !== undefined) {
				phaseMetadata.icon = phase.icon;
			}
			if (phase.action !== undefined) {
				phaseMetadata.action = phase.action;
			}
			if (steps && steps.length > 0) {
				phaseMetadata.steps = steps;
			}
			return [phase.id, phaseMetadata];
		}),
	);
}

function createTriggerMetadata(content) {
	return Object.fromEntries(
		Object.entries(content.TRIGGER_INFO).map(([key, info]) => [
			key,
			{
				label: info.past,
				icon: info.icon,
				future: info.future,
				past: info.past,
			},
		]),
	);
}

function findUpkeepPhase(phases) {
	return phases.find((phase) => phase.id === 'upkeep');
}

function createAssetMetadata(content) {
	const upkeepPhase = findUpkeepPhase(content.PHASES);
	return {
		population: createDescriptor(
			content.POPULATION_INFO.label,
			content.POPULATION_INFO.icon,
			content.POPULATION_INFO.description,
		),
		land: createDescriptor(content.LAND_INFO.label, content.LAND_INFO.icon),
		slot: createDescriptor(content.SLOT_INFO.label, content.SLOT_INFO.icon),
		passive: createDescriptor(
			content.PASSIVE_INFO.label,
			content.PASSIVE_INFO.icon,
		),
		upkeep: createDescriptor(upkeepPhase?.label, upkeepPhase?.icon),
	};
}

function createOverviewContentSnapshot(content) {
	return structuredClone(content.OVERVIEW_CONTENT);
}

function serializeRegistry(registry) {
	return Object.fromEntries(
		registry
			.entries()
			.map(([id, definition]) => [id, structuredClone(definition)]),
	);
}

function createRegistries(content) {
	return {
		actions: serializeRegistry(content.createActionRegistry()),
		buildings: serializeRegistry(content.createBuildingRegistry()),
		developments: serializeRegistry(content.createDevelopmentRegistry()),
		populations: serializeRegistry(content.createPopulationRegistry()),
		resources: createResourceDefinitions(content),
	};
}

function createMetadata(registries, content) {
	const overviewContent = createOverviewContentSnapshot(content);
	return {
		passiveEvaluationModifiers: {},
		resources: createResourceMetadata(content),
		populations: createPopulationMetadata(
			registries.populations,
			content.POPULATION_ROLES,
		),
		buildings: createRegistryDescriptorMap(registries.buildings),
		developments: createRegistryDescriptorMap(registries.developments),
		stats: createStatMetadata(content),
		phases: createPhaseMetadata(content),
		triggers: createTriggerMetadata(content),
		assets: createAssetMetadata(content),
		overviewContent,
		overview: overviewContent,
	};
}

export async function buildDefaultRegistrySnapshot() {
	const content = await loadContentModules();
	const registries = createRegistries(content);
	const metadata = createMetadata(registries, content);
	return {
		registries,
		metadata,
	};
}
