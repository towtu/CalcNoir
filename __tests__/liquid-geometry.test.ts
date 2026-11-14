import {
  betweenFrames,
  liquidFrame,
  motionFrame,
} from '../src/app/navigation/liquidGeometry';

test.each([288, 343, 736, 1408])(
  'the curved silhouette stays inside a %idp bar, including its end tabs',
  width => {
    for (let index = 0; index < 4; index++) {
      const center = 12 + ((width - 24) / 4) * (index + 0.5);
      for (const spread of [0, 7]) {
        const frame = liquidFrame(width, 84, center, spread);
        expect(frame.path.endsWith('Z')).toBe(true);
        expect(frame.path).not.toMatch(/NaN|Infinity/);
        for (const command of frame.path.match(/[MCQHVZ][^MCQHVZ]*/g)!) {
          const values = (command.slice(1).match(/-?\d*\.?\d+/g) ?? []).map(
            Number,
          );
          values.forEach((value, coordinateIndex) => {
            const limit =
              command[0] === 'H'
                ? width
                : command[0] === 'V'
                ? 84
                  : coordinateIndex % 2 === 0
                ? width
                : 84;
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(limit);
          });
        }
      }
    }
  },
);
test('the travel silhouette changes shape and lifts the circle before returning to rest', () => {
  const from = liquidFrame(400, 84, 59);
  const to = liquidFrame(400, 84, 153);
  const middle = liquidFrame(400, 84, 106, 7, -5);
  expect(middle.path).not.toBe(liquidFrame(400, 84, 106).path);
  expect(motionFrame(from, middle, to, 0.45)).toEqual(middle);
  expect(motionFrame(from, middle, to, 1)).toEqual(to);
  expect(motionFrame(from, middle, to, 0.45).lift).toBe(-5);
});
test('interrupted geometry can continue from the current curve without a position jump', () => {
  const from = liquidFrame(400, 84, 59),
    middle = liquidFrame(400, 84, 106, 7, -5),
    to = liquidFrame(400, 84, 153);
  const interrupted = motionFrame(from, middle, to, 0.31);
  const next = liquidFrame(400, 84, 341);
  expect(betweenFrames(interrupted, next, 0)).toEqual({
    ...interrupted,
    width: next.width,
    height: next.height,
  });
  expect(betweenFrames(interrupted, next, 1)).toEqual(next);
});
