import { COOLDOWNS } from '@ghostwire/shared';

const hero = [
  [
    'Move',
    'Hold W/A/S/D or arrow keys; touch joystick',
    'Lean toward the left/right side of your mirrored preview. Step a little closer to advance; farther away to retreat.',
    'Open palm: move it left/right/up/down from its calibrated center.',
  ],
  [
    'Run',
    'Hold Shift while moving; RUN toggle for joystick',
    'Step closer until shoulder width is about one third larger than neutral.',
    'Use the touch RUN toggle or keyboard Shift.',
  ],
  [
    'Strike',
    `Tap J · ${COOLDOWNS.punch / 1000}s`,
    'Extend one arm quickly, then return it to neutral before the next punch.',
    'Swipe an open palm sideways.',
  ],
  [
    'Kick',
    `Tap I · ${COOLDOWNS.kick / 1000}s`,
    'Lift one knee above its hip. Hips and knees must be visible.',
    'Use the Kick touch button.',
  ],
  [
    'Guard',
    `Tap K · ${COOLDOWNS.guard / 1000}s`,
    'Cross both wrists near your upper chest for a quarter second.',
    'Close your hand into a fist.',
  ],
  [
    'Evade',
    `Tap L · ${COOLDOWNS.dodge / 1000}s`,
    'Lower both shoulders in a small duck for a quarter second.',
    'Use the Evade touch button.',
  ],
  [
    'Jump',
    `Tap E · ${COOLDOWNS.jump / 1000}s`,
    'Hold one hand above your head, with the other below shoulder level, for a quarter second.',
    'Point only your index finger up; fold the other fingers.',
  ],
  [
    'Overdrive',
    `Tap Space · ${COOLDOWNS.special / 1000}s`,
    'Hold both hands above your head for half a second.',
    'Pinch thumb and index finger for half a second.',
  ],
];
hero.push([
  'Revive',
  'Tap F near the nearest downed ally, or their Revive button',
  'Use keyboard or touch; remain still for 3 seconds.',
  'Use the Revive touch button.',
]);
export function ControlsGuide() {
  return (
    <div className="exact-controls">
      <p>
        Choose Body gestures or One hand in the camera panel. Hold neutral for roughly 1.3 seconds
        to calibrate. Recalibrate after moving the camera. All attacks also have touch buttons.
      </p>
      {[['Hero', hero]].map(([name, rows]) => (
        <section key={name as string}>
          <h3>{name as string} controls · preset defaults</h3>
          <p>
            Custom heroes use the keys on their power buttons. Open Your power and motion guide in
            the fight for your exact gesture assignments, damage and recharge times. The table below
            describes preset heroes.
          </p>
          <div className="controls-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Keyboard / touch</th>
                  <th>Body gestures</th>
                  <th>One hand</th>
                </tr>
              </thead>
              <tbody>
                {(rows as string[][]).map((row) => (
                  <tr key={row[0]}>
                    {row.map((text, i) =>
                      i === 0 ? (
                        <th key={i} scope="row">
                          {text}
                        </th>
                      ) : (
                        <td key={i}>{text}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p>
        Move into striking distance for Strike or Kick. Overdrive reaches across the arena. Warning
        rings mark a locked attack zone: leave it, guard, evade, or time a jump before impact.
        During Reality Breach all heroes move across the live feed. Everyone controls a hero; the
        boss attacks automatically. Coordinate strikes to break its Aegis and Overdrives for Unity
        Burst.
      </p>
    </div>
  );
}
