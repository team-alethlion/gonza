
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths } from 'date-fns';

export const getDateRangeFromFilter = (filter: string): { from: Date; to: Date } => {
  const now = new Date();
  const today = startOfDay(now);
  
  switch (filter) {
    case 'today':
      return {
        from: today,
        to: endOfDay(now)
      };
    case 'yesterday':
      const yesterday = subDays(today, 1);
      return {
        from: yesterday,
        to: endOfDay(yesterday)
      };
    case 'this-week':
      return {
        from: startOfWeek(now),
        to: endOfWeek(now)
      };
    case 'last-week':
      const lastWeekStart = startOfWeek(subWeeks(now, 1));
      return {
        from: lastWeekStart,
        to: endOfWeek(lastWeekStart)
      };
    case 'this-month':
      return {
        from: startOfMonth(now),
        to: endOfMonth(now)
      };
    case 'last-month':
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      return {
        from: lastMonthStart,
        to: endOfMonth(lastMonthStart)
      };
    case 'this-year':
      return {
        from: startOfYear(now),
        to: endOfYear(now)
      };
    default:
      // For 'all' or any other case, return a very wide range
      return {
        from: new Date(2000, 0, 1),
        to: endOfDay(now)
      };
  }
};

export const isDateInRange = (date: Date, from: Date | undefined, to: Date | undefined): boolean => {
  if (!from && !to) return true;
  if (!from) return date <= to!;
  if (!to) return date >= from;
  return date >= from && date <= to;
};
