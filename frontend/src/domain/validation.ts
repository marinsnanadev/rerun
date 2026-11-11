import { isISODate, type ISODate } from '../lib/dates';
import { isGenre, isStatus, type ShowInput } from './show';

export const MAX_TITLE_LENGTH = 120;

/** Raw form values, before they are known to be valid. */
export interface ShowDraft {
  title: string;
  genre: string;
  finishedOn: string;
  startedOn: string;
  status: string;
}

export type ShowDraftErrors = Partial<Record<keyof ShowDraft, string>>;

export type ShowDraftResult =
  | { ok: true; value: ShowInput }
  | { ok: false; errors: ShowDraftErrors };

export const EMPTY_DRAFT: ShowDraft = {
  title: '',
  genre: '',
  finishedOn: '',
  startedOn: '',
  status: '',
};

export function validateShowDraft(draft: ShowDraft, today: ISODate): ShowDraftResult {
  const errors: ShowDraftErrors = {};

  const title = draft.title.trim().replace(/\s+/g, ' ');
  if (title.length === 0) {
    errors.title = 'Enter a title.';
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `Keep the title under ${MAX_TITLE_LENGTH} characters.`;
  }

  if (!isGenre(draft.genre)) {
    errors.genre = 'Choose a genre.';
  }

  const hasFinished = draft.finishedOn !== '';
  if (!hasFinished) {
    errors.finishedOn = 'Choose the date you finished watching.';
  } else if (!isISODate(draft.finishedOn)) {
    errors.finishedOn = 'Enter a valid date.';
  } else if (draft.finishedOn > today) {
    errors.finishedOn = 'The finish date can’t be in the future.';
  }

  if (draft.startedOn !== '') {
    if (!isISODate(draft.startedOn)) {
      errors.startedOn = 'Enter a valid date.';
    } else if (draft.startedOn > today) {
      errors.startedOn = 'The start date can’t be in the future.';
    } else if (
      hasFinished &&
      isISODate(draft.finishedOn) &&
      draft.startedOn > draft.finishedOn
    ) {
      errors.startedOn = 'The start date must be on or before the finish date.';
    }
  }

  if (!isStatus(draft.status)) {
    errors.status = 'Choose where this series belongs.';
  }

  if (Object.keys(errors).length > 0 || !isGenre(draft.genre) || !isStatus(draft.status)) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      title,
      genre: draft.genre,
      finishedOn: draft.finishedOn,
      startedOn: draft.startedOn === '' ? null : draft.startedOn,
      status: draft.status,
    },
  };
}
