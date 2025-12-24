import { startOfDay, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

/**
 * Constants for slot management
 */
export const SLOT_LIMIT = 4;
export const SLOT_WINDOW_DAYS = 15;
export const DEFAULT_TIMEZONE = "Asia/Dhaka";

/**
 * Calculate the cutoff date for slot usage (15 days ago from reference date)
 * Returns start of day in the specified timezone to avoid timezone issues
 */
export function getSlotCutoffDate(referenceDate: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): Date {
  // Convert to target timezone first
  const zonedDate = toZonedTime(referenceDate, timezone);
  const cutoff = subDays(zonedDate, SLOT_WINDOW_DAYS);
  return startOfDay(cutoff);
}

/**
 * Check if a date is within the slot usage window (last 15 days)
 */
export function isWithinSlotWindow(date: Date, referenceDate: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): boolean {
  const cutoff = getSlotCutoffDate(referenceDate, timezone);
  const zonedRef = toZonedTime(referenceDate, timezone);
  const startOfToday = startOfDay(zonedRef);
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  
  return date >= cutoff && date < startOfTomorrow;
}

/**
 * Calculate total slot usage from an array of slot counts
 */
export function calculateTotalUsage(slots: Array<{ count?: number | null }>): number {
  return slots.reduce((sum, slot) => sum + (slot.count ?? 1), 0);
}

/**
 * Check if a resource (phone/IP) is at capacity
 */
export function isAtCapacity(usage: number): boolean {
  return usage >= SLOT_LIMIT;
}

/**
 * Get remaining slots available
 */
export function getRemainingSlots(usage: number): number {
  return Math.max(0, SLOT_LIMIT - usage);
}

/**
 * Validate if a new allocation would exceed limit
 */
export function canAllocate(currentUsage: number, newCount: number): boolean {
  return currentUsage + newCount <= SLOT_LIMIT;
}

/**
 * Get usage percentage (0-100)
 */
export function getUsagePercentage(usage: number): number {
  return Math.min((usage / SLOT_LIMIT) * 100, 100);
}
