import { isCombat, type BattleState } from '@ghostwire/shared';
export function WorldMap({
  state,
  onView,
  onTravel,
  invite,
}: {
  state: BattleState;
  onView: (id: string) => void;
  onTravel: (id: string) => void;
  invite: string;
}) {
  const raid = state.raid!,
    hero = raid.heroes[state.viewPlayerId ?? ''];
  const transit = raid.bossTransit;
  return (
    <section className="world-map" aria-label="Connected world">
      <div className="section-heading">
        <h3>THE CONNECTED WORLD</h3>
        <span>
          {Object.keys(raid.regions).length} realms · {Object.keys(raid.heroes).length}/4 heroes
        </span>
      </div>
      <p>
        {transit
          ? `Boss invading ${raid.regions[transit.to]?.name} in ${Math.max(0, (transit.arrivesAt - state.clock) / 1000).toFixed(1)}s`
          : `Boss in ${raid.regions[raid.bossRegionId]?.name}. Linked rift strikes reach it from every realm.`}
      </p>
      <details className="world-map-details">
        <summary>World map · travel & invites</summary>
        <div className="realm-grid">
          {Object.values(raid.regions).map((region) => (
            <article
              key={region.id}
              className={`realm-card ${state.viewRegionId === region.id ? 'selected' : ''}`}
              style={{ borderColor: region.color }}
              data-region-id={region.id}
            >
              <span className="eyebrow">
                {region.ownerId === hero?.id ? 'YOUR DEVICE REALM' : `REALM ${region.index + 1}`}{' '}
                {raid.bossRegionId === region.id ? ' · BOSS' : ''}
              </span>
              <strong>{region.name}</strong>
              <small>
                {Object.values(raid.heroes)
                  .filter((h) => h.regionId === region.id && !h.eliminated)
                  .map((h) => h.design?.name ?? h.name)
                  .join(' · ') || 'Unoccupied'}
                {transit?.to === region.id ? ' · INCOMING BOSS' : ''}
              </small>
              <div>
                <button className="button subtle small" onClick={() => onView(region.id)}>
                  {state.viewRegionId === region.id ? 'Viewing' : 'Watch'}
                </button>
                {hero?.regionId !== region.id && (
                  <button
                    className="button secondary small"
                    disabled={
                      !isCombat(state.phase) ||
                      !hero?.renderReady ||
                      hero.hp <= 0 ||
                      Boolean(hero.travel) ||
                      hero.travelReadyAt > state.clock
                    }
                    onClick={() => onTravel(region.id)}
                  >
                    Travel here
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {hero?.travel ? (
          <p role="status">
            Crossing the rift… stand still.{' '}
            {(Math.max(0, hero.travel.arrivesAt - state.clock) / 1000).toFixed(1)}s
          </p>
        ) : state.viewRegionId !== hero?.regionId ? (
          <button className="text-link" onClick={() => onView(hero.regionId)}>
            Return view to my hero · controls paused while watching
          </button>
        ) : (
          <p className="source-note">
            Strike through a rift for support; travel for full melee damage and revives. Travel
            channels for 1.2s, then recharges for 6s. Movement or damage cancels it.
          </p>
        )}
        {!state.practice && (
          <details>
            <summary>Invite reinforcements · {state.code}</summary>
            <input
              className="invite-url"
              aria-label="Live invite URL"
              value={invite}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <p>
              Share this link or code. A new device adds a new realm, including during combat (up to
              four players).
            </p>
          </details>
        )}
      </details>
    </section>
  );
}
