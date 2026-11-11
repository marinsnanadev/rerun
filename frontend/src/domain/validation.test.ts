import { describe, expect, it } from 'vitest';

import { MAX_TITLE_LENGTH, validateShowDraft, type ShowDraft } from './validation';

const TODAY = '2026-10-20';

const VALID: ShowDraft = {
  title: 'The Office',
  genre: 'comedy',
  finishedOn: '2026-07-10',
  startedOn: '',
  status: 'looping',
};

describe('validateShowDraft', () => {
  it('accepts a complete draft and normalizes it', () => {
    const result = validateShowDraft({ ...VALID, title: '  The   Office ' }, TODAY);

    expect(result).toEqual({
      ok: true,
      value: {
        title: 'The Office',
        genre: 'comedy',
        finishedOn: '2026-07-10',
        startedOn: null,
        status: 'looping',
      },
    });
  });

  it('keeps an optional start date when it is valid', () => {
    const result = validateShowDraft({ ...VALID, startedOn: '2026-06-01' }, TODAY);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.startedOn).toBe('2026-06-01');
  });

  it('requires a title, genre, finish date and status', () => {
    const result = validateShowDraft(
      { title: '  ', genre: '', finishedOn: '', startedOn: '', status: '' },
      TODAY,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(['finishedOn', 'genre', 'status', 'title']);
    }
  });

  it('rejects titles that are too long', () => {
    const result = validateShowDraft({ ...VALID, title: 'a'.repeat(MAX_TITLE_LENGTH + 1) }, TODAY);

    expect(result.ok).toBe(false);
  });

  it('rejects unknown genres and statuses', () => {
    const result = validateShowDraft({ ...VALID, genre: 'sitcom', status: 'maybe' }, TODAY);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['genre', 'status']);
  });

  it('rejects finish dates in the future', () => {
    const result = validateShowDraft({ ...VALID, finishedOn: '2026-10-21' }, TODAY);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.finishedOn).toBeDefined();
  });

  it('allows finishing a series today', () => {
    expect(validateShowDraft({ ...VALID, finishedOn: TODAY }, TODAY).ok).toBe(true);
  });

  it('rejects a start date after the finish date', () => {
    const result = validateShowDraft({ ...VALID, startedOn: '2026-08-01' }, TODAY);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.startedOn).toBeDefined();
  });

  it('allows starting and finishing on the same day', () => {
    expect(validateShowDraft({ ...VALID, startedOn: '2026-07-10' }, TODAY).ok).toBe(true);
  });

  it('rejects impossible dates', () => {
    const result = validateShowDraft({ ...VALID, finishedOn: '2026-02-30' }, TODAY);

    expect(result.ok).toBe(false);
  });
});
