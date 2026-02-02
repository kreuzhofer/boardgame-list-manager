/**
 * Utility functions barrel export
 */

export {
  deriveGameStatus,
  isWunschGame,
  shouldShowDuplicateHint,
} from './gameStatus';

export {
  sortGamesByName,
  toggleSortOrder,
  DEFAULT_SORT_ORDER,
} from './sorting';

export type { SortOrder } from './sorting';

export {
  filterByName,
  filterByPlayer,
  filterByBringer,
  filterWunschGames,
  filterMyGames,
  filterPrototypeGames,
  applyAllFilters,
  hasActiveFilters,
  DEFAULT_FILTER_STATE,
} from './filtering';

export type { FilterState, PrototypeFilter } from './filtering';


export { normalizeName } from './nameNormalization';

export {
  checkDuplicate,
  getExistingBggIds,
  getExistingNormalizedNames,
} from './duplicateDetection';

export type { DuplicateCheckResult } from './duplicateDetection';

export {
  filterGamesByName,
  shouldHighlightGame,
  getHighlightedGameIds,
  getMatchingGamesWithBringers,
  countMatchingGames,
} from './gameFiltering';

export type { GameWithBringerInfo } from './gameFiltering';

export { getToastMessage, shouldShowToast } from './toastMessages';
