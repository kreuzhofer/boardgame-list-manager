/**
 * Hooks barrel export
 */

// Participant hook (new - replaces legacy participant-name storage)
export { useParticipant, PARTICIPANT_ID_STORAGE_KEY } from './useParticipant';
export type { UseParticipantReturn } from './useParticipant';

// Legacy participant name hook (deprecated - use useParticipant instead)
export { useParticipantName, PARTICIPANT_NAME_STORAGE_KEY } from './useParticipantName';
export type { UseParticipantNameReturn } from './useParticipantName';

export { useSortOrder } from './useSortOrder';
export type { UseSortOrderReturn } from './useSortOrder';

export { useGameFilters } from './useGameFilters';
export type { UseGameFiltersReturn } from './useGameFilters';

export { useBggSearch } from './useBggSearch';

export { usePullToRefresh, isStandaloneMode } from './usePullToRefresh';

export { useSSE, calculateBackoffDelay } from './useSSE';
export type { default as UseSSEDefault } from './useSSE';
