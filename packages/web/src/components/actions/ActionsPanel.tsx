import React, { useMemo } from 'react';
import {
  getActionCosts,
  getActionRequirements,
  Resource,
  PopulationRole,
  RESOURCES,
  POPULATION_ROLES,
  ACTION_INFO as actionInfo,
  DEVELOPMENT_INFO as developmentInfo,
  BUILDING_INFO as buildingInfo,
} from '@kingdom-builder/engine';
import {
  describeContent,
  summarizeContent,
  type Summary,
} from '../../translation';
import { renderSummary, renderCosts } from '../../translation/render';
import { useGameEngine } from '../../state/GameContext';
import { isActionPhaseActive } from '../../utils/isActionPhaseActive';

interface Action {
  id: string;
  name: string;
  system?: boolean;
}
interface Development {
  id: string;
  name: string;
  system?: boolean;
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
  const { ctx, handlePerform, handleHoverCard, clearHoverCard } =
    useGameEngine();
  const formatRequirement = (req: string) => req;
  return (
    <div className="grid grid-cols-4 gap-2 auto-rows-fr">
      {actions.map((action) => {
        const costs = getActionCosts(action.id, ctx);
        const requirements = getActionRequirements(action.id, ctx).map(
          formatRequirement,
        );
        const canPay = Object.entries(costs).every(
          ([k, v]) =>
            ctx.activePlayer.resources[
              k as keyof typeof ctx.activePlayer.resources
            ] >= v,
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
          <button
            key={action.id}
            className={`relative panel-card border border-black/10 dark:border-white/10 p-2 flex flex-col items-start gap-1 h-full shadow-sm ${
              enabled
                ? 'hoverable cursor-pointer'
                : 'opacity-50 cursor-not-allowed'
            }`}
            title={title}
            onClick={() => enabled && handlePerform(action)}
            onMouseEnter={() =>
              handleHoverCard({
                title: `${actionInfo[action.id]?.icon || ''} ${action.name}`,
                effects: describeContent('action', action.id, ctx),
                requirements,
                costs,
                ...(!implemented && {
                  description: 'Not implemented yet',
                  descriptionClass: 'italic text-red-600',
                }),
                bgClass: 'bg-gray-100 dark:bg-gray-700',
              })
            }
            onMouseLeave={clearHoverCard}
          >
            <span className="text-base font-medium">
              {actionInfo[action.id]?.icon || ''} {action.name}
            </span>
            <span className="absolute top-2 right-2 text-sm text-gray-600 dark:text-gray-300">
              {renderCosts(costs, ctx.activePlayer.resources)}
            </span>
            <ul className="text-sm list-disc pl-4 text-left">
              {implemented ? (
                renderSummary(summary)
              ) : (
                <li className="italic text-red-600">Not implemented yet</li>
              )}
            </ul>
            {requirements.length > 0 && (
              <div className="text-sm text-red-600 text-left">
                <span className="font-semibold">Requirements</span>
                <ul className="list-disc pl-4">
                  {requirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function RaisePopOptions({
  action,
  isActionPhase,
}: {
  action: Action;
  isActionPhase: boolean;
}) {
  const { ctx, handlePerform, handleHoverCard, clearHoverCard } =
    useGameEngine();
  const formatRequirement = (req: string) => req;
  return (
    <div>
      <h3 className="font-medium">
        {actionInfo['raise_pop']?.icon ?? ''}{' '}
        {actionInfo['raise_pop']?.label ?? ''}
      </h3>
      <div className="grid grid-cols-3 gap-2 mt-1 auto-rows-fr">
        {[
          PopulationRole.Council,
          PopulationRole.Commander,
          PopulationRole.Fortifier,
        ].map((role) => {
          const costs = getActionCosts('raise_pop', ctx);
          const requirements = getActionRequirements('raise_pop', ctx).map(
            formatRequirement,
          );
          const canPay = Object.entries(costs).every(
            ([k, v]) =>
              ctx.activePlayer.resources[
                k as keyof typeof ctx.activePlayer.resources
              ] >= v,
          );
          const meetsReq = requirements.length === 0;
          const enabled = canPay && meetsReq && isActionPhase;
          const title = !meetsReq
            ? requirements.join(', ')
            : !canPay
              ? 'Cannot pay costs'
              : undefined;
          const summary = describeContent('action', 'raise_pop', ctx);
          const shortSummary = summarizeContent('action', 'raise_pop', ctx);
          const first = summary[0];
          if (first && typeof first !== 'string') {
            first.items.push(`👥(${POPULATION_ROLES[role]?.icon}) +1`);
          }
          const shortFirst = shortSummary[0];
          if (shortFirst && typeof shortFirst !== 'string') {
            shortFirst.items.push(`👥(${POPULATION_ROLES[role]?.icon}) +1`);
          }
          return (
            <button
              key={role}
              className={`relative panel-card border border-black/10 dark:border-white/10 p-2 flex flex-col items-start gap-1 h-full shadow-sm ${
                enabled
                  ? 'hoverable cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              title={title}
              onClick={() => enabled && handlePerform(action, { role })}
              onMouseEnter={() =>
                handleHoverCard({
                  title: `${actionInfo['raise_pop']?.icon ?? ''} ${
                    actionInfo['raise_pop']?.label ?? ''
                  } - ${POPULATION_ROLES[role]?.icon} ${
                    POPULATION_ROLES[role]?.label || ''
                  }`,
                  effects: summary,
                  requirements,
                  costs,
                  bgClass: 'bg-gray-100 dark:bg-gray-700',
                })
              }
              onMouseLeave={clearHoverCard}
            >
              <span className="text-base font-medium">
                {POPULATION_ROLES[role]?.icon} {POPULATION_ROLES[role]?.label}
              </span>
              <span className="absolute top-2 right-2 text-sm text-gray-600 dark:text-gray-300">
                {renderCosts(costs, ctx.activePlayer.resources)}
              </span>
              <ul className="text-sm list-disc pl-4 text-left">
                {renderSummary(shortSummary)}
              </ul>
              {requirements.length > 0 && (
                <div className="text-sm text-red-600 text-left">
                  <span className="font-semibold">Requirements</span>
                  <ul className="list-disc pl-4">
                    {requirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </button>
          );
        })}
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
  const { ctx, handlePerform, handleHoverCard, clearHoverCard } =
    useGameEngine();
  return (
    <div>
      <h3 className="font-medium">
        {actionInfo['develop']?.icon ?? ''} {actionInfo['develop']?.label ?? ''}
      </h3>
      <div className="grid grid-cols-4 gap-2 mt-1 auto-rows-fr">
        {developments.map((d) => {
          const landIdForCost = ctx.activePlayer.lands[0]?.id as string;
          const costs = getActionCosts('develop', ctx, {
            id: d.id,
            landId: landIdForCost,
          });
          const requirements = hasDevelopLand
            ? []
            : ['Requires land with free development slot'];
          const canPay =
            hasDevelopLand &&
            Object.entries(costs).every(
              ([k, v]) =>
                ctx.activePlayer.resources[
                  k as keyof typeof ctx.activePlayer.resources
                ] >= v,
            );
          const summary = summaries.get(d.id);
          const implemented = (summary?.length ?? 0) > 0; // TODO: implement development effects
          const enabled = canPay && isActionPhase && implemented;
          const title = !implemented
            ? 'Not implemented yet'
            : !hasDevelopLand
              ? 'No land with free development slot'
              : !canPay
                ? 'Cannot pay costs'
                : undefined;
          return (
            <button
              key={d.id}
              className={`relative panel-card border border-black/10 dark:border-white/10 p-2 flex flex-col items-start gap-1 h-full shadow-sm ${
                enabled
                  ? 'hoverable cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              title={title}
              onClick={() => {
                if (!enabled) return;
                const landId = ctx.activePlayer.lands.find(
                  (l) => l.slotsFree > 0,
                )?.id;
                handlePerform(action, { id: d.id, landId });
              }}
              onMouseEnter={() =>
                handleHoverCard({
                  title: `${actionInfo['develop']?.icon ?? ''} ${
                    actionInfo['develop']?.label ?? ''
                  } - ${developmentInfo[d.id]?.icon} ${d.name}`,
                  effects: describeContent('development', d.id, ctx),
                  requirements,
                  costs,
                  ...(!implemented && {
                    description: 'Not implemented yet',
                    descriptionClass: 'italic text-red-600',
                  }),
                  bgClass: 'bg-gray-100 dark:bg-gray-700',
                })
              }
              onMouseLeave={clearHoverCard}
            >
              <span className="text-base font-medium">
                {developmentInfo[d.id]?.icon} {d.name}
              </span>
              <span className="absolute top-2 right-2 text-sm text-gray-600 dark:text-gray-300">
                {renderCosts(costs, ctx.activePlayer.resources)}
              </span>
              <ul className="text-sm list-disc pl-4 text-left">
                {implemented ? (
                  renderSummary(summary)
                ) : (
                  <li className="italic text-red-600">Not implemented yet</li>
                )}
              </ul>
            </button>
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
  const { ctx, handlePerform, handleHoverCard, clearHoverCard } =
    useGameEngine();
  return (
    <div>
      <h3 className="font-medium">
        {actionInfo['build']?.icon ?? ''} {actionInfo['build']?.label ?? ''}
      </h3>
      <div className="grid grid-cols-4 gap-2 mt-1 auto-rows-fr">
        {buildings.map((b) => {
          const costs = getActionCosts('build', ctx, { id: b.id });
          const requirements: string[] = [];
          const canPay = Object.entries(costs).every(
            ([k, v]) =>
              ctx.activePlayer.resources[
                k as keyof typeof ctx.activePlayer.resources
              ] >= v,
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
            <button
              key={b.id}
              className={`relative panel-card border border-black/10 dark:border-white/10 p-2 flex flex-col items-start gap-1 h-full shadow-sm ${
                enabled
                  ? 'hoverable cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              title={title}
              onClick={() => enabled && handlePerform(action, { id: b.id })}
              onMouseEnter={() =>
                handleHoverCard({
                  title: `${actionInfo['build']?.icon ?? ''} ${
                    actionInfo['build']?.label ?? ''
                  } - ${buildingInfo[b.id]?.icon || ''} ${b.name}`,
                  effects: descriptions.get(b.id) ?? [],
                  requirements,
                  costs,
                  ...(!implemented && {
                    description: 'Not implemented yet',
                    descriptionClass: 'italic text-red-600',
                  }),
                  bgClass: 'bg-gray-100 dark:bg-gray-700',
                })
              }
              onMouseLeave={clearHoverCard}
            >
              <span className="text-base font-medium">
                {buildingInfo[b.id]?.icon || actionInfo['build']?.icon || ''}{' '}
                {b.name}
              </span>
              <span className="absolute top-2 right-2 text-sm text-gray-600 dark:text-gray-300">
                {renderCosts(costs, ctx.activePlayer.resources)}
              </span>
              <ul className="text-sm list-disc pl-4 text-left">
                {implemented ? (
                  renderSummary(summary)
                ) : (
                  <li className="italic text-red-600">Not implemented yet</li>
                )}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ActionsPanel() {
  const { ctx, tabsEnabled } = useGameEngine();

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
      ).filter((a) => !a.system || ctx.activePlayer.actions.has(a.id)),
    [ctx, ctx.activePlayer.actions.size],
  );
  const developmentOptions = useMemo<Development[]>(
    () =>
      Array.from(
        (
          ctx.developments as unknown as { map: Map<string, Development> }
        ).map.values(),
      ).filter((d) => !d.system),
    [ctx],
  );
  const developmentOrder = ['house', 'farm', 'outpost', 'watchtower'];
  const sortedDevelopments = useMemo(
    () =>
      developmentOrder
        .map((id) => developmentOptions.find((d) => d.id === id))
        .filter(Boolean) as Development[],
    [developmentOptions],
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
    sortedDevelopments.forEach((d) =>
      map.set(d.id, summarizeContent('development', d.id, ctx)),
    );
    return map;
  }, [sortedDevelopments, ctx]);
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
  const developAction = actions.find((a) => a.id === 'develop');
  const buildAction = actions.find((a) => a.id === 'build');
  const raisePopAction = actions.find((a) => a.id === 'raise_pop');
  const otherActions = actions.filter(
    (a) => a.id !== 'develop' && a.id !== 'build' && a.id !== 'raise_pop',
  );

  return (
    <section className="border rounded p-4 bg-white dark:bg-gray-800 shadow relative">
      {!isActionPhase && (
        <div className="absolute inset-0 bg-gray-200/60 dark:bg-gray-900/60 rounded pointer-events-none" />
      )}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">
          Actions (1 {RESOURCES[Resource.ap].icon} each)
        </h2>
        {!isActionPhase && (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Not in Main phase
          </span>
        )}
      </div>
      <div className="space-y-3">
        <GenericActions
          actions={otherActions}
          summaries={actionSummaries}
          isActionPhase={isActionPhase}
        />
        {raisePopAction && (
          <RaisePopOptions
            action={raisePopAction}
            isActionPhase={isActionPhase}
          />
        )}
        {developAction && (
          <DevelopOptions
            action={developAction}
            isActionPhase={isActionPhase}
            developments={sortedDevelopments}
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
