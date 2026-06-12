import { RRule, RRuleSet, rrulestr, Frequency } from "rrule";
import type { CalendarActivity } from "./types";

export interface ExpandedOccurrence extends CalendarActivity {
  occurrence_id: string;
  occurrence_start: string;
  occurrence_end: string;
  is_recurrence_instance: boolean;
}

/** Expand a single activity (which may carry a recurrence_rule) into occurrences inside [from,to]. */
export function expandActivity(
  activity: CalendarActivity,
  from: Date,
  to: Date,
  exceptions: Map<string, CalendarActivity> = new Map(),
): ExpandedOccurrence[] {
  const start = new Date(activity.start_at);
  const end = new Date(activity.end_at);
  const durationMs = Math.max(end.getTime() - start.getTime(), 0);

  if (!activity.recurrence_rule) {
    if (end < from || start > to) return [];
    return [
      {
        ...activity,
        occurrence_id: activity.id,
        occurrence_start: activity.start_at,
        occurrence_end: activity.end_at,
        is_recurrence_instance: false,
      },
    ];
  }

  try {
    const rule = rrulestr(activity.recurrence_rule, { dtstart: start });
    const dates = rule.between(from, to, true);
    return dates.map((d) => {
      const occStart = d.toISOString();
      const exc = exceptions.get(`${activity.id}|${occStart}`);
      if (exc) {
        return {
          ...exc,
          occurrence_id: exc.id,
          occurrence_start: exc.start_at,
          occurrence_end: exc.end_at,
          is_recurrence_instance: true,
        };
      }
      return {
        ...activity,
        occurrence_id: `${activity.id}@${occStart}`,
        occurrence_start: occStart,
        occurrence_end: new Date(d.getTime() + durationMs).toISOString(),
        is_recurrence_instance: true,
      };
    });
  } catch (e) {
    console.error("[calendar] rrule expand failed", e);
    return [];
  }
}

export interface RecurrenceConfig {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  byweekday?: number[]; // 0=MO ... 6=SU per rrule
  bymonthday?: number[];
  until?: string | null;
  count?: number | null;
}

export function buildRRuleString(config: RecurrenceConfig, dtstart: Date): string {
  const freqMap = { DAILY: Frequency.DAILY, WEEKLY: Frequency.WEEKLY, MONTHLY: Frequency.MONTHLY, YEARLY: Frequency.YEARLY };
  const rule = new RRule({
    freq: freqMap[config.freq],
    interval: config.interval,
    dtstart,
    byweekday: config.byweekday,
    bymonthday: config.bymonthday,
    until: config.until ? new Date(config.until) : undefined,
    count: config.count ?? undefined,
  });
  return rule.toString();
}

export function parseRRule(ruleStr: string | null | undefined): RecurrenceConfig | null {
  if (!ruleStr) return null;
  try {
    const r = rrulestr(ruleStr) as RRule;
    const o = r.origOptions;
    const freqStr = (["YEARLY", "MONTHLY", "WEEKLY", "DAILY"] as const)[o.freq ?? 3] ?? "DAILY";
    return {
      freq: freqStr,
      interval: o.interval ?? 1,
      byweekday: Array.isArray(o.byweekday) ? (o.byweekday as number[]) : undefined,
      bymonthday: Array.isArray(o.bymonthday) ? (o.bymonthday as number[]) : undefined,
      until: o.until ? new Date(o.until).toISOString() : null,
      count: o.count ?? null,
    };
  } catch {
    return null;
  }
}
