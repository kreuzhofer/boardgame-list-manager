/**
 * StatisticsPage - Dedicated statistics page
 * Displays event statistics dashboard and popular games list
 * All UI text in German (Requirement 8.2)
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.2
 */

import { Statistics } from '../components/Statistics';

/**
 * StatisticsPage component
 * Wraps the existing Statistics component with a page title
 * Loading/error states are handled by the Statistics component
 */
export function StatisticsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Statistiken</h2>
      <Statistics />
    </div>
  );
}

export default StatisticsPage;
