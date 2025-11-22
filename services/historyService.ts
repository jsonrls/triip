import { RideRequest } from "../types";

const getStorageKey = (userId: string) => `triip_history_${userId}`;

export const getRideHistory = (userId: string): RideRequest[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveRideToHistory = (userId: string, ride: RideRequest): RideRequest[] => {
  if (typeof window === 'undefined') return [];
  try {
    const history = getRideHistory(userId);
    // Add to top of list
    const updated = [ride, ...history];
    localStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to save history", e);
    return [];
  }
};