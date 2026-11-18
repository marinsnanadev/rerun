import { describe, expect, it } from 'vitest';

import { buildQueue, getUpNext, moveDeferredToComingUp } from './looping';
import type { Show } from './show';

function show(overrides: Partial<Show> & Pick<Show, 'id' | 'title' | 'finishedOn'>): Show {
  return {
    genre: 'comedy',
    startedOn: null,
    status: 'looping',
    watchCount: 1,
    ...overrides,
  };
}

const TODAY = '2026-10-20';

describe('buildQueue', () => {
  it('puts the show watched longest ago first', () => {
    const shows = [
      show({ id: '1', title: 'Community', finishedOn: '2026-09-19' }),
      show({ id: '2', title: 'Modern Family', finishedOn: '2026-08-15' }),
      show({ id: '3', title: 'The Office', finishedOn: '2026-07-10' }),
    ];

    const queue = buildQueue(shows, TODAY);

    expect(queue.map((entry) => entry.show.title)).toEqual([
      'The Office',
      'Modern Family',
      'Community',
    ]);
    expect(queue.map((entry) => entry.position)).toEqual([1, 2, 3]);
  });

  it('only includes shows marked as looping', () => {
    const shows = [
      show({ id: '1', title: 'Community', finishedOn: '2026-09-19' }),
      show({ id: '2', title: 'Severance', finishedOn: '2026-01-01', status: 'rewatch' }),
      show({ id: '3', title: 'Fleabag', finishedOn: '2026-01-02', status: 'one_time' }),
      show({ id: '4', title: 'Dark', finishedOn: '2026-01-03', status: 'pondering' }),
    ];

    expect(buildQueue(shows, TODAY).map((entry) => entry.show.title)).toEqual(['Community']);
  });

  it('reports whole days since each show was finished', () => {
    const queue = buildQueue(
      [
        show({ id: '1', title: 'Community', finishedOn: '2026-09-19' }),
        show({ id: '2', title: 'The Office', finishedOn: '2026-07-10' }),
      ],
      TODAY,
    );

    expect(queue.map((entry) => entry.daysSince)).toEqual([102, 31]);
  });

  it('never reports negative days for dates in the future', () => {
    const queue = buildQueue([show({ id: '1', title: 'Community', finishedOn: '2026-12-01' })], TODAY);

    expect(queue[0]?.daysSince).toBe(0);
  });

  it('breaks ties by title so the order is stable', () => {
    const queue = buildQueue(
      [
        show({ id: '1', title: 'The Office', finishedOn: '2026-09-01' }),
        show({ id: '2', title: 'Community', finishedOn: '2026-09-01' }),
      ],
      TODAY,
    );

    expect(queue.map((entry) => entry.show.title)).toEqual(['Community', 'The Office']);
  });

  it('moves a show to the back once it is finished again', () => {
    const before = [
      show({ id: '1', title: 'Community', finishedOn: '2026-09-19' }),
      show({ id: '2', title: 'Modern Family', finishedOn: '2026-08-15' }),
      show({ id: '3', title: 'The Office', finishedOn: '2026-07-10' }),
    ];
    const after = before.map((item) =>
      item.id === '3' ? { ...item, finishedOn: TODAY } : item,
    );

    expect(getUpNext(buildQueue(before, TODAY))?.show.title).toBe('The Office');
    expect(buildQueue(after, TODAY).map((entry) => entry.show.title)).toEqual([
      'Modern Family',
      'Community',
      'The Office',
    ]);
  });

  it('does not mutate its input', () => {
    const shows = [
      show({ id: '1', title: 'Community', finishedOn: '2026-09-19' }),
      show({ id: '2', title: 'The Office', finishedOn: '2026-07-10' }),
    ];
    const snapshot = shows.map((item) => item.id);

    buildQueue(shows, TODAY);

    expect(shows.map((item) => item.id)).toEqual(snapshot);
  });
});

describe('getUpNext', () => {
  it('returns null for an empty rotation', () => {
    expect(getUpNext(buildQueue([], TODAY))).toBeNull();
  });
});

describe('moveDeferredToComingUp', () => {
  const queue = buildQueue(
    [
      show({ id: 'community', title: 'Community', finishedOn: '2026-09-19' }),
      show({ id: 'modern-family', title: 'Modern Family', finishedOn: '2026-08-15' }),
      show({ id: 'the-office', title: 'The Office', finishedOn: '2026-07-10' }),
    ],
    TODAY,
  );

  it('moves the deferred show below the next active show and renumbers the queue', () => {
    const deferred = moveDeferredToComingUp(queue, ['the-office']);

    expect(deferred.map((entry) => entry.show.title)).toEqual([
      'Modern Family',
      'The Office',
      'Community',
    ]);
    expect(deferred.map((entry) => entry.position)).toEqual([1, 2, 3]);
    expect(getUpNext(deferred)?.show.title).toBe('Modern Family');
  });

  it('keeps deferred shows at the top of Coming up in defer order', () => {
    const deferred = moveDeferredToComingUp(queue, [
      'community',
      'the-office',
      'missing-show',
      'community',
    ]);

    expect(deferred.map((entry) => entry.show.title)).toEqual([
      'Modern Family',
      'Community',
      'The Office',
    ]);
  });

  it('keeps all shows available in Coming up when every show is deferred', () => {
    const deferred = moveDeferredToComingUp(queue, ['community', 'the-office', 'modern-family']);

    expect(deferred.map((entry) => entry.show.title)).toEqual([
      'Community',
      'The Office',
      'Modern Family',
    ]);
    expect(deferred.map((entry) => entry.position)).toEqual([1, 2, 3]);
  });
});
