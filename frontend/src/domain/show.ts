import type { ISODate } from '../lib/dates';

export const STATUSES = ['looping', 'rewatch', 'one_time', 'pondering'] as const;
export type ShowStatus = (typeof STATUSES)[number];

/** Wording of the choices when adding a series. */
export const STATUS_OPTION_LABELS: Record<ShowStatus, string> = {
  looping: 'Add to looping',
  rewatch: 'Would watch again',
  one_time: 'One time thing',
  pondering: 'Pondering',
};

/** Wording used once a series is in the library. */
export const STATUS_LABELS: Record<ShowStatus, string> = {
  looping: 'Looping',
  rewatch: 'Would watch again',
  one_time: 'One time thing',
  pondering: 'Pondering',
};

export const GENRES = [
  'action',
  'animation',
  'comedy',
  'crime',
  'documentary',
  'drama',
  'fantasy',
  'horror',
  'mystery',
  'reality',
  'romance',
  'sci_fi',
  'thriller',
  'other',
] as const;
export type Genre = (typeof GENRES)[number];

export const GENRE_LABELS: Record<Genre, string> = {
  action: 'Action',
  animation: 'Animation',
  comedy: 'Comedy',
  crime: 'Crime',
  documentary: 'Documentary',
  drama: 'Drama',
  fantasy: 'Fantasy',
  horror: 'Horror',
  mystery: 'Mystery',
  reality: 'Reality',
  romance: 'Romance',
  sci_fi: 'Sci-Fi',
  thriller: 'Thriller',
  other: 'Other',
};

export interface Show {
  id: string;
  title: string;
  genre: Genre;
  /** When the latest watch started. Optional. */
  startedOn: ISODate | null;
  /** When the latest watch ended. Drives the rotation order. */
  finishedOn: ISODate;
  status: ShowStatus;
}

export type ShowInput = Omit<Show, 'id'>;

export function isStatus(value: string): value is ShowStatus {
  return (STATUSES as readonly string[]).includes(value);
}

export function isGenre(value: string): value is Genre {
  return (GENRES as readonly string[]).includes(value);
}
