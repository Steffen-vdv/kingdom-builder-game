import React from 'react';
import {
  ACTIONS as actionInfo,
  LAND_ICON as landIcon,
  SLOT_ICON as slotIcon,
  RESOURCES,
  Resource,
  PHASES,
  POPULATION_ROLES,
  PopulationRole,
} from '@kingdom-builder/contents';

interface OverviewProps {
  onBack: () => void;
}

export default function Overview({ onBack }: OverviewProps) {
  const growthIcon = PHASES.find((p) => p.id === 'growth')?.icon;
  const upkeepIcon = PHASES.find((p) => p.id === 'upkeep')?.icon;
  const mainIcon = PHASES.find((p) => p.id === 'main')?.icon;
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-center mb-4">Game Overview</h1>
      <p>
        Welcome to <strong>Kingdom Builder</strong>, a brisk duel of wits where{' '}
        {actionInfo.get('expand')?.icon} expansion,
        {actionInfo.get('build')?.icon} clever construction and
        {actionInfo.get('army_attack')?.icon} daring raids decide who rules the
        realm.
      </p>
      <section>
        <h2 className="text-xl font-semibold mt-4 mb-2">
          Your Objective {RESOURCES[Resource.castleHP].icon}
        </h2>
        <p>
          Keep your {RESOURCES[Resource.castleHP].icon} castle standing while
          plotting your rival's downfall. A game ends when a stronghold
          crumbles, a ruler can't sustain their realm, or the final round closes
          with one monarch ahead.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-4 mb-2">Turn Flow</h2>
        <p>Each round flows through three phases:</p>
        <ul className="list-disc list-inside">
          <li>
            <strong>{growthIcon} Growth</strong> – your realm produces income,
            bolsters offense and defenses, and triggered effects fire.
          </li>
          <li>
            <strong>{upkeepIcon} Upkeep</strong> – pay wages and resolve ongoing
            effects.
          </li>
          <li>
            <strong>{mainIcon} Main</strong> – both players secretly queue
            actions then reveal them.
          </li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-4 mb-2">Resources</h2>
        <p className="mb-2">Juggle your economy to stay in power:</p>
        <ul className="list-disc list-inside">
          <li>
            {RESOURCES[Resource.gold].icon} <strong>Gold</strong> funds
            {actionInfo.get('build')?.icon} buildings and schemes.
          </li>
          <li>
            {RESOURCES[Resource.ap].icon} <strong>Action Points</strong> fuel
            every move in the {mainIcon} Main phase.
          </li>
          <li>
            {RESOURCES[Resource.happiness].icon} <strong>Happiness</strong>
            keeps the populace smiling (or rioting).
          </li>
          <li>
            {RESOURCES[Resource.castleHP].icon} <strong>Castle HP</strong> is
            your lifeline—lose it and the crown is gone.
          </li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-4 mb-2">
          Land &amp; Developments
        </h2>
        <p>
          Claim {landIcon} land and fill each {slotIcon} slot with developments.
          Farms grow {RESOURCES[Resource.gold].icon} gold while other projects
          unlock more slots or unique perks.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-4 mb-2">Population</h2>
        <p>Raise citizens and train them into specialists:</p>
        <ul className="list-disc list-inside">
          <li>
            {POPULATION_ROLES[PopulationRole.Council].icon} Council – grants
            extra {RESOURCES[Resource.ap].icon} AP each round.
          </li>
          <li>
            {POPULATION_ROLES[PopulationRole.Commander].icon} Commander – boosts
            your army for {actionInfo.get('army_attack')?.icon} raids.
          </li>
          <li>
            {POPULATION_ROLES[PopulationRole.Fortifier].icon} Fortifier –
            reinforces defenses around your castle.
          </li>
          <li>
            {POPULATION_ROLES[PopulationRole.Citizen].icon} Citizens – future
            specialists awaiting guidance.
          </li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-4 mb-2">
          Actions &amp; Strategy
        </h2>
        <p className="mb-4">
          Spend {RESOURCES[Resource.ap].icon} AP on plays like
          {actionInfo.get('expand')?.icon} expanding territory,
          {actionInfo.get('develop')?.icon} developing land,
          {actionInfo.get('raise_pop')?.icon} raising population, or unleashing
          {actionInfo.get('army_attack')?.icon} attacks. Mix and match to outwit
          your foe!
        </p>
      </section>
      <button
        className="border px-4 py-2 hoverable cursor-pointer"
        onClick={onBack}
      >
        Back to Start
      </button>
    </div>
  );
}
