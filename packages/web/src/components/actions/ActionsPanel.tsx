import React, { useMemo } from 'react';
import { getActionCosts, getActionRequirements } from '@kingdom-builder/engine';
import {
  RESOURCES,
  POPULATION_ROLES,
  PopulationRole,
  SLOT_ICON as slotIcon,
  SLOT_LABEL as slotLabel,
  LAND_ICON as landIcon,
  LAND_LABEL as landLabel,
} from '@kingdom-builder/contents';
import {
  describeContent,
  summarizeContent,
  splitSummary,
  type Summary,
} from '../../translation';
import ActionCard from './ActionCard';
import { useGameEngine } from '../../state/GameContext';
import { isActionPhaseActive } from '../../utils/isActionPhaseActive';
import { getRequirementIcons } from '../../utils/getRequirementIcons';

interface Action {
  id: string;
  name: string;
  system?: boolean;
  order?: number;
  category?: string;
}
interface Development {
  id: string;
  name: string;
  system?: boolean;
  order?: number;
}
interface Building {
  id: string;
  name: string;
}

function GenericActions({
  actions,
  summaries,
  isActionPhase,
}: {
  actions: Action[];
  summaries: Map<string, Summary>;
  isActionPhase: boolean;
}) {
  const {
    ctx,
    handlePerform,
    handleHoverCard,
    clearHoverCard,
    actionCostResource,
  } = useGameEngine();
  const formatRequirement = (req: string) => req;
  return (
    <>
      {actions.map((action) => {
        const costsBag = getActionCosts(action.id, ctx);
        const costs: Record<string, number> = {};
        for (const [k, v] of Object.entries(costsBag)) costs[k] = v ?? 0;
        const requirements = getActionRequirements(action.id, ctx).map(
          formatRequirement,
        );
        const requirementIcons = getRequirementIcons(action.id, ctx);
        const canPay = Object.entries(costs).every(
          ([k, v]) => (ctx.activePlayer.resources[k] || 0) >= (v ?? 0),
        );
        const meetsReq = requirements.length === 0;
        const summary = summaries.get(action.id);
        const implemented = (summary?.length ?? 0) > 0; // TODO: implement action effects
        const enabled = canPay && meetsReq && isActionPhase && implemented;
        const title = !implemented
          ? 'Not implemented yet'
          : !meetsReq
            ? requirements.join(', ')
            : !canPay
              ? 'Cannot pay costs'
              : undefined;
        return (
          <ActionCard
            key={action.id}
            title={
              <>
                {ctx.actions.get(action.id)?.icon || ''} {action.name}
              </>
            }
            costs={costs}
            playerResources={ctx.activePlayer.resources}
            actionCostResource={actionCostResource}
            requirements={requirements}
            requirementIcons={requirementIcons}
            summary={summary}
            implemented={implemented}
            enabled={enabled}
            tooltip={title}
            onClick={() => void handlePerform(action)}
            onMouseEnter={() => {
              const full = describeContent('action', action.id, ctx);
              const { effects, description } = splitSummary(full);
              handleHoverCard({
                title: `${ctx.actions.get(action.id)?.icon || ''} ${action.name}`,
                effects,
                requirements,
                costs,
                ...(description && { description }),
                ...(!implemented && {
                  description: 'Not implemented yet',
                  descriptionClass: 'italic text-red-600',
                }),
                bgClass: 'bg-gray-100 dark:bg-gray-700',
              });
            }}
            onMouseLeave={clearHoverCard}
          />
        );
      })}
    </>
  );
}

function RaisePopOptions({
  action,
  isActionPhase,
}: {
  action: Action;
  isActionPhase: boolean;
}) {
  const {
    ctx,
    handlePerform,
    handleHoverCard,
    clearHoverCard,
    actionCostResource,
  } = useGameEngine();
  const formatRequirement = (req: string) => req;
  const requirementIcons = getRequirementIcons(action.id, ctx);
  return (
    <>
      {[
        PopulationRole.Council,
        PopulationRole.Commander,
        PopulationRole.Fortifier,
      ].map((role) => {
        const costsBag = getActionCosts(action.id, ctx);
        const costs: Record<string, number> = {};
        for (const [k, v] of Object.entries(costsBag)) costs[k] = v ?? 0;
        const requirements = getActionRequirements(action.id, ctx).map(
          formatRequirement,
        );
        const canPay = Object.entries(costs).every(
          ([k, v]) => (ctx.activePlayer.resources[k] || 0) >= (v ?? 0),
        );
        const meetsReq = requirements.length === 0;
        const enabled = canPay && meetsReq && isActionPhase;
        const title = !meetsReq
          ? requirements.join(', ')
          : !canPay
            ? 'Cannot pay costs'
            : undefined;
        const summary = describeContent('action', action.id, ctx, { role });
        const shortSummary = summarizeContent('action', action.id, ctx, {
          role,
        });
        return (
          <ActionCard
            key={role}
            title={
              <>
                {ctx.actions.get(action.id).icon || ''}
                {POPULATION_ROLES[role]?.icon} Hire{' '}
                {POPULATION_ROLES[role]?.label}
              </>
            }
            costs={costs}
            playerResources={ctx.activePlayer.resources}
            actionCostResource={actionCostResource}
            requirements={requirements}
            requirementIcons={requirementIcons}
            summary={shortSummary}
            enabled={enabled}
            tooltip={title}
            onClick={() => void handlePerform(action, { role })}
            onMouseEnter={() => {
              const { effects, description } = splitSummary(summary);
              handleHoverCard({
                title: `${ctx.actions.get(action.id).icon || ''}${
                  POPULATION_ROLES[role]?.icon
                } Hire ${POPULATION_ROLES[role]?.label || ''}`,
                effects,
                requirements,
                costs,
                ...(description && { description }),
                bgClass: 'bg-gray-100 dark:bg-gray-700',
              });
            }}
            onMouseLeave={clearHoverCard}
          />
        );
      })}
    </>
  );
}

function BasicOptions({
  actions,
  raisePopAction,
  summaries,
  isActionPhase,
}: {
  actions: Action[];
  raisePopAction: Action | undefined;
  summaries: Map<string, Summary>;
  isActionPhase: boolean;
}) {
  return (
    <div>
      <h3 className="font-medium">
        Basic{' '}
        <span className="italic text-sm font-normal">
          (Effects take place immediately, unless stated otherwise)
        </span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1">
        <GenericActions
          actions={actions}
          summaries={summaries}
          isActionPhase={isActionPhase}
        />
        {raisePopAction && (
          <RaisePopOptions
            action={raisePopAction}
            isActionPhase={isActionPhase}
          />
        )}
      </div>
    </div>
  );
}

function DevelopOptions({
  action,
  isActionPhase,
  developments,
  summaries,
  hasDevelopLand,
}: {
  action: Action;
  isActionPhase: boolean;
  developments: Development[];
  summaries: Map<string, Summary>;
  hasDevelopLand: boolean;
}) {
  const {
    ctx,
    handlePerform,
    handleHoverCard,
    clearHoverCard,
    actionCostResource,
  } = useGameEngine();
  return (
    <div>
      <h3 className="font-medium">
        {ctx.actions.get('develop').icon || ''}{' '}
        {ctx.actions.get('develop').name}{' '}
        <span className="italic text-sm font-normal">
          (Effects take place on build and last until development is removed)
        </span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1">
        {developments.map((d) => {
          const landIdForCost = ctx.activePlayer.lands[0]?.id as string;
          const costsBag = getActionCosts('develop', ctx, {
            id: d.id,
            landId: landIdForCost,
          });
          const costs: Record<string, number> = {};
          for (const [k, v] of Object.entries(costsBag)) costs[k] = v ?? 0;
          const requirements = hasDevelopLand
            ? []
            : [
                `Requires ${landIcon} ${landLabel} with free ${slotIcon} ${slotLabel}`,
              ];
          const canPay =
            hasDevelopLand &&
            Object.entries(costs).every(
              ([k, v]) => (ctx.activePlayer.resources[k] || 0) >= (v ?? 0),
            );
          const summary = summaries.get(d.id);
          const implemented = (summary?.length ?? 0) > 0; // TODO: implement development effects
          const enabled = canPay && isActionPhase && implemented;
          const title = !implemented
            ? 'Not implemented yet'
            : !hasDevelopLand
              ? `No ${landIcon} ${landLabel} with free ${slotIcon} ${slotLabel}`
              : !canPay
                ? 'Cannot pay costs'
                : undefined;
          return (
            <ActionCard
              key={d.id}
              title={
                <>
                  {ctx.developments.get(d.id)?.icon} {d.name}
                </>
              }
              costs={costs}
              playerResources={ctx.activePlayer.resources}
              actionCostResource={actionCostResource}
              requirements={requirements}
              requirementIcons={[slotIcon]}
              summary={summary}
              implemented={implemented}
              enabled={enabled}
              tooltip={title}
              onClick={() => {
                const landId = ctx.activePlayer.lands.find(
                  (l) => l.slotsFree > 0,
                )?.id;
                void handlePerform(action, { id: d.id, landId });
              }}
              onMouseEnter={() => {
                const full = describeContent('development', d.id, ctx);
                const { effects, description } = splitSummary(full);
                handleHoverCard({
                  title: `${ctx.actions.get('develop').icon || ''} ${
                    ctx.actions.get('develop').name
                  } - ${ctx.developments.get(d.id)?.icon} ${d.name}`,
                  effects,
                  requirements,
                  costs,
                  ...(description && { description }),
                  ...(!implemented && {
                    description: 'Not implemented yet',
                    descriptionClass: 'italic text-red-600',
                  }),
                  bgClass: 'bg-gray-100 dark:bg-gray-700',
                });
              }}
              onMouseLeave={clearHoverCard}
            />
          );
        })}
      </div>
    </div>
  );
}

function BuildOptions({
  action,
  isActionPhase,
  buildings,
  summaries,
  descriptions,
}: {
  action: Action;
  isActionPhase: boolean;
  buildings: Building[];
  summaries: Map<string, Summary>;
  descriptions: Map<string, Summary>;
}) {
  const {
    ctx,
    handlePerform,
    handleHoverCard,
    clearHoverCard,
    actionCostResource,
  } = useGameEngine();
  return (
    <div>
      <h3 className="font-medium">
        {ctx.actions.get('build').icon || ''} {ctx.actions.get('build').name}{' '}
        <span className="italic text-sm font-normal">
          (Effects take place on build and last until building is removed)
        </span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1">
        {buildings.map((b) => {
          const costsBag = getActionCosts('build', ctx, { id: b.id });
          const costs: Record<string, number> = {};
          for (const [k, v] of Object.entries(costsBag)) costs[k] = v ?? 0;
          const requirements: string[] = [];
          const canPay = Object.entries(costs).every(
            ([k, v]) => (ctx.activePlayer.resources[k] || 0) >= (v ?? 0),
          );
          const summary = summaries.get(b.id);
          const implemented = (summary?.length ?? 0) > 0; // TODO: implement building effects
          const enabled = canPay && isActionPhase && implemented;
          const title = !implemented
            ? 'Not implemented yet'
            : !canPay
              ? 'Cannot pay costs'
              : undefined;
          return (
            <ActionCard
              key={b.id}
              title={
                <>
                  {ctx.buildings.get(b.id)?.icon ||
                    ctx.actions.get('build').icon ||
                    ''}{' '}
                  {b.name}
                </>
              }
              costs={costs}
              playerResources={ctx.activePlayer.resources}
              actionCostResource={actionCostResource}
              requirements={requirements}
              requirementIcons={[
                POPULATION_ROLES[PopulationRole.Citizen]?.icon ?? '',
              ]}
              summary={summary}
              implemented={implemented}
              enabled={enabled}
              tooltip={title}
              onClick={() => void handlePerform(action, { id: b.id })}
              onMouseEnter={() => {
                const full = descriptions.get(b.id) ?? [];
                const { effects, description } = splitSummary(full);
                handleHoverCard({
                  title: `${ctx.actions.get('build').icon || ''} ${
                    ctx.actions.get('build').name
                  } - ${ctx.buildings.get(b.id)?.icon || ''} ${b.name}`,
                  effects,
                  requirements,
                  costs,
                  ...(description && { description }),
                  ...(!implemented && {
                    description: 'Not implemented yet',
                    descriptionClass: 'italic text-red-600',
                  }),
                  bgClass: 'bg-gray-100 dark:bg-gray-700',
                });
              }}
              onMouseLeave={clearHoverCard}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function ActionsPanel() {
  const { ctx, tabsEnabled, actionCostResource } = useGameEngine();

  const actionPhaseId = useMemo(
    () => ctx.phases.find((p) => p.action)?.id,
    [ctx],
  );
  const isActionPhase = isActionPhaseActive(
    ctx.game.currentPhase,
    actionPhaseId,
    tabsEnabled,
  );

  const actions = useMemo<Action[]>(
    () =>
      Array.from(
        (ctx.actions as unknown as { map: Map<string, Action> }).map.values(),
      )
        .filter((a) => !a.system || ctx.activePlayer.actions.has(a.id))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [ctx, ctx.activePlayer.actions.size],
  );
  const developmentOptions = useMemo<Development[]>(
    () =>
      Array.from(
        (
          ctx.developments as unknown as { map: Map<string, Development> }
        ).map.values(),
      )
        .filter((d) => !d.system)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [ctx],
  );
  const buildingOptions = useMemo<Building[]>(
    () =>
      Array.from(
        (
          ctx.buildings as unknown as { map: Map<string, Building> }
        ).map.values(),
      ),
    [ctx],
  );

  const actionSummaries = useMemo(() => {
    const map = new Map<string, Summary>();
    actions.forEach((a) =>
      map.set(a.id, summarizeContent('action', a.id, ctx)),
    );
    return map;
  }, [actions, ctx]);
  const developmentSummaries = useMemo(() => {
    const map = new Map<string, Summary>();
    developmentOptions.forEach((d) =>
      map.set(d.id, summarizeContent('development', d.id, ctx)),
    );
    return map;
  }, [developmentOptions, ctx]);
  const buildingSummaries = useMemo(() => {
    const map = new Map<string, Summary>();
    buildingOptions.forEach((b) =>
      map.set(b.id, summarizeContent('building', b.id, ctx)),
    );
    return map;
  }, [buildingOptions, ctx]);
  const buildingDescriptions = useMemo(() => {
    const map = new Map<string, Summary>();
    buildingOptions.forEach((b) =>
      map.set(b.id, describeContent('building', b.id, ctx)),
    );
    return map;
  }, [buildingOptions, ctx]);

  const hasDevelopLand = ctx.activePlayer.lands.some((l) => l.slotsFree > 0);
  const developAction = actions.find((a) => a.category === 'development');
  const buildAction = actions.find((a) => a.category === 'building');
  const raisePopAction = actions.find((a) => a.category === 'population');
  const otherActions = actions.filter(
    (a) => (a.category ?? 'basic') === 'basic',
  );

  return (
    <section className="border rounded p-4 bg-white dark:bg-gray-800 shadow relative">
      {!isActionPhase && (
        <div className="absolute inset-0 bg-gray-200/60 dark:bg-gray-900/60 rounded pointer-events-none" />
      )}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">
          Actions (1 {RESOURCES[actionCostResource].icon} each)
        </h2>
        {!isActionPhase && (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Not in Main phase
          </span>
        )}
      </div>
      <div className="space-y-3">
        {(otherActions.length > 0 || raisePopAction) && (
          <BasicOptions
            actions={otherActions}
            raisePopAction={raisePopAction}
            summaries={actionSummaries}
            isActionPhase={isActionPhase}
          />
        )}
        {developAction && (
          <DevelopOptions
            action={developAction}
            isActionPhase={isActionPhase}
            developments={developmentOptions}
            summaries={developmentSummaries}
            hasDevelopLand={hasDevelopLand}
          />
        )}
        {buildAction && (
          <BuildOptions
            action={buildAction}
            isActionPhase={isActionPhase}
            buildings={buildingOptions}
            summaries={buildingSummaries}
            descriptions={buildingDescriptions}
          />
        )}
      </div>
    </section>
  );
}
