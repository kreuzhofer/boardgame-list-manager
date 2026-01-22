/**
 * Hooks barrel export
 */

// User hook (new - replaces useUserName)
export { useUser, USER_ID_STORAGE_KEY } from './useUser';
export type { UseUserReturn } from './useUser';

// Legacy user name hook (deprecated - use useUser instead)
export { useUserName, USER_NAME_STORAGE_KEY } from './useUserName';
export type { UseUserNameReturn } from './useUserName';

export { useSortOrder } from './useSortOrder';
export type { UseSortOrderReturn } from './useSortOrder';

export { useGameFilters } from './useGameFilters';
export type { UseGameFiltersReturn } from './useGameFilters';
