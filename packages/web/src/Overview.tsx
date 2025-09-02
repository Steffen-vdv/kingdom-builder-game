import React from 'react';
import Button from './components/common/Button';
import {
  ACTIONS as actionInfo,
  LAND_INFO,
  SLOT_INFO,
  RESOURCES,
  Resource,
  PHASES,
  POPULATION_ROLES,
  PopulationRole,
  STATS,
  Stat,
} from '@kingdom-builder/contents';

interface OverviewProps {
  onBack: () => void;
}

export default function Overview({ onBack }: OverviewProps) {
  const icons = {
    expand: actionInfo.get('expand')?.icon,
    build: actionInfo.get('build')?.icon,
    attack: actionInfo.get('army_attack')?.icon,
    develop: actionInfo.get('develop')?.icon,
    raisePop: actionInfo.get('raise_pop')?.icon,
    growth: PHASES.find((p) => p.id === 'growth')?.icon,
    upkeep: PHASES.find((p) => p.id === 'upkeep')?.icon,
    main: PHASES.find((p) => p.id === 'main')?.icon,
    land: LAND_INFO.icon,
    slot: SLOT_INFO.icon,
    gold: RESOURCES[Resource.gold].icon,
    ap: RESOURCES[Resource.ap].icon,
    happiness: RESOURCES[Resource.happiness].icon,
    castle: RESOURCES[Resource.castleHP].icon,
    army: STATS[Stat.armyStrength].icon,
    fort: STATS[Stat.fortificationStrength].icon,
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-center mb-4">Game Overview</h1>
      <p>
        Welcome to <strong>Kingdom Builder</strong>, a brisk duel of wits where
        {icons.expand} expansion, {icons.build} clever construction and
        {icons.attack} daring raids decide who rules the realm.
      </p>
      <section>
        <h2 className="text-xl font-semibold mt-4 mb-2">
          Your Objective {icons.castle}
        </h2>
        <p>
          Keep your {icons.castle} castle standing while plotting your rival's
          downfall. A game ends when a stronghold crumbles, a ruler can't
          sustain their realm, or the final round closes with one monarch ahead.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-4 mb-2">Turn Flow</h2>
        <p>Each round flows through three phases:</p>
        <ul className="list-disc list-inside">
          <li>
            <strong>{icons.growth} Growth</strong> – your realm produces income,
            raises {icons.army} Army and {icons.fort} Fortification Strength,
            and triggered effects fire.
          </li>
          <li>
            <strong>{icons.upkeep} Upkeep</strong> – pay wages and resolve
            ongoing effects.
          </li>
          <li>
            <strong>{icons.main} Main</strong> – both players secretly queue
            actions then reveal them.
          </li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-4 mb-2">Resources</h2>
        <p className="mb-2">Juggle your economy to stay in power:</p>
        <ul className="list-disc list-inside">
          <li>
            {icons.gold} <strong>Gold</strong> funds {icons.build} buildings and
            schemes.
          </li>
          <li>
            {icons.ap} <strong>Action Points</strong> fuel every move in the
            {icons.main} Main phase.
          </li>
          <li>
            {icons.happiness} <strong>Happiness</strong> keeps the populace
            smiling (or rioting).
          </li>
          <li>
            {icons.castle} <strong>Castle HP</strong> is your lifeline—lose it
            and the crown is gone.
          </li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-4 mb-2">
          Land &amp; Developments
        </h2>
        <p>
          Claim {icons.land} land and fill each {icons.slot} slot with
          developments. Farms grow {icons.gold} gold while other projects unlock
          more slots or unique perks.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-4 mb-2">Population</h2>
        <p>Raise citizens and train them into specialists:</p>
        <ul className="list-disc list-inside">
          <li>
            {POPULATION_ROLES[PopulationRole.Council].icon} Council – grants
            extra {icons.ap} AP each round.
          </li>
          <li>
            {POPULATION_ROLES[PopulationRole.Legion].icon} Legion – boosts your
            army for {icons.attack} raids.
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
          Spend {icons.ap} AP on plays like {icons.expand} expanding territory,
          {icons.develop} developing land, {icons.raisePop} raising population,
          or unleashing {icons.attack} attacks. Mix and match to outwit your
          foe!
        </p>
      </section>
      <Button onClick={onBack}>Back to Start</Button>
    </div>
  );
}
