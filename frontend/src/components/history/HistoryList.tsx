import React, { useMemo } from 'react';
import { HistoryItem } from './HistoryItem';
import { ActivityHistoryItem } from '@/hooks/useActivityHistory';

interface HistoryListProps {
  activities: ActivityHistoryItem[];
}

interface GroupedActivity {
  key: string;
  activities: ActivityHistoryItem[];
  latestActivity: ActivityHistoryItem;
  isGrouped: boolean;
}

export const HistoryList: React.FC<HistoryListProps> = ({ activities }) => {
  // Group activities by entity_id for SALES module
  const groupedActivities = useMemo(() => {
    const salesGroups = new Map<string, ActivityHistoryItem[]>();
    const nonSalesActivities: ActivityHistoryItem[] = [];

    // Separate sales from other activities
    activities.forEach(activity => {
      if (activity.module === 'SALES' && activity.entity_id) {
        if (!salesGroups.has(activity.entity_id)) {
          salesGroups.set(activity.entity_id, []);
        }
        salesGroups.get(activity.entity_id)!.push(activity);
      } else {
        nonSalesActivities.push(activity);
      }
    });

    const grouped: GroupedActivity[] = [];

    // Convert sales groups to grouped format
    salesGroups.forEach((groupActivities, entityId) => {
      // Sort activities within group by date (newest first)
      const sortedActivities = groupActivities.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      grouped.push({
        key: `sale-${entityId}`,
        activities: sortedActivities,
        latestActivity: sortedActivities[0],
        isGrouped: sortedActivities.length > 1
      });
    });

    // Add non-sales as individual groups
    nonSalesActivities.forEach(activity => {
      grouped.push({
        key: activity.id,
        activities: [activity],
        latestActivity: activity,
        isGrouped: false
      });
    });

    // Sort all groups by latest activity date
    return grouped.sort((a, b) =>
      new Date(b.latestActivity.created_at).getTime() -
      new Date(a.latestActivity.created_at).getTime()
    );
  }, [activities]);

  if (groupedActivities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No activities found for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {groupedActivities.map((group) => (
        <HistoryItem
          key={group.key}
          activities={group.activities}
          isGrouped={group.isGrouped}
        />
      ))}
    </div>
  );
};