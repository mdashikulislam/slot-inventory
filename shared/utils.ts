import { startOfDay, subDays } from "date-fns";

/**
 * Constants for slot management
 */
export const SLOT_LIMIT = 4;
export const SLOT_WINDOW_DAYS = 15;

/**
 * Calculate the cutoff date for slot usage (15 days ago from reference date)
 * Returns start of day to avoid timezone issues
 */
export function getSlotCutoffDate(referenceDate: Date = new Date()): Date {
  return startOfDay(subDays(referenceDate, SLOT_WINDOW_DAYS));
}

/**
 * Check if a date is within the slot usage window (last 15 days)
 */
export function isWithinSlotWindow(date: Date, referenceDate: Date = new Date()): boolean {
  const cutoff = getSlotCutoffDate(referenceDate);
  const startOfToday = startOfDay(referenceDate);
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
