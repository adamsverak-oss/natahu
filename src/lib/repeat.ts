export type RepeatType = "none" | "daily" | "weekly" | "monthly";

function toDateOnly(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function compareIsoDates(left: string, right: string) {
  return left.localeCompare(right);
}

export function getRepeatLabel(repeatType: RepeatType, repeatEvery: number) {
  if (repeatType === "none") {
    return "Jednorazove";
  }

  if (repeatType === "daily") {
    return repeatEvery === 1 ? "Kazdy den" : `Kazde ${repeatEvery} dny`;
  }

  if (repeatType === "weekly") {
    return repeatEvery === 1 ? "Kazdy tyden" : `Kazde ${repeatEvery} tydny`;
  }

  return repeatEvery === 1 ? "Kazdy mesic" : `Kazde ${repeatEvery} mesice`;
}

export function getNextOccurrence(date: string, repeatType: RepeatType, repeatEvery: number) {
  if (repeatType === "none") {
    return null;
  }

  const next = toDateOnly(date);
  const safeEvery = Math.max(1, repeatEvery);

  if (repeatType === "daily") {
    next.setUTCDate(next.getUTCDate() + safeEvery);
  } else if (repeatType === "weekly") {
    next.setUTCDate(next.getUTCDate() + safeEvery * 7);
  } else if (repeatType === "monthly") {
    next.setUTCMonth(next.getUTCMonth() + safeEvery);
  }

  return toIsoDate(next);
}

export function expandRecurringDates(
  startDate: string,
  repeatType: RepeatType,
  repeatEvery: number,
  rangeStart: string,
  rangeEnd: string,
  limit = 730
) {
  if (repeatType === "none") {
    return compareIsoDates(startDate, rangeStart) >= 0 && compareIsoDates(startDate, rangeEnd) <= 0
      ? [startDate]
      : [];
  }

  const dates: string[] = [];
  const safeEvery = Math.max(1, repeatEvery);
  let cursor = startDate;
  let steps = 0;

  while (compareIsoDates(cursor, rangeEnd) <= 0 && steps < limit) {
    if (compareIsoDates(cursor, rangeStart) >= 0) {
      dates.push(cursor);
    }

    const next = getNextOccurrence(cursor, repeatType, safeEvery);
    if (!next || next === cursor) break;
    cursor = next;
    steps += 1;
  }

  return dates;
}
