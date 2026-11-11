import { useEffect, useState } from 'react';

import { todayISO, type ISODate } from '../../lib/dates';

/**
 * Today's date, refreshed when the tab regains focus so a page left open
 * overnight doesn't keep counting days from yesterday.
 */
export function useToday(): ISODate {
  const [today, setToday] = useState<ISODate>(() => todayISO());

  useEffect(() => {
    const refresh = () => setToday(todayISO());

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return today;
}
