import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Receipt, CreditCard, Users, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ActivityItem {
  id: string;
  type: 'expense' | 'settlement' | 'group' | 'balance';
  title: string;
  description: string;
  amount?: number;
  timestamp: Date;
  groupName?: string;
  userName?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  className?: string;
  maxItems?: number;
}

export function ActivityFeed({ 
  activities, 
  className, 
  maxItems = 10 
}: ActivityFeedProps) {
  const [displayedActivities, setDisplayedActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    // Sort by timestamp (most recent first) and limit
    const sorted = [...activities]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);
    setDisplayedActivities(sorted);
  }, [activities, maxItems]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'expense':
        return Receipt;
      case 'settlement':
        return CreditCard;
      case 'group':
        return Users;
      case 'balance':
        return TrendingUp;
      default:
        return Receipt;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'expense':
        return 'text-blue-600 bg-blue-50';
      case 'settlement':
        return 'text-green-600 bg-green-50';
      case 'group':
        return 'text-purple-600 bg-purple-50';
      case 'balance':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getBadgeVariant = (type: ActivityItem['type']) => {
    switch (type) {
      case 'expense':
        return 'default';
      case 'settlement':
        return 'secondary';
      case 'group':
        return 'outline';
      case 'balance':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (displayedActivities.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">Start by adding an expense or creating a group</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedActivities.map((activity, index) => {
            const Icon = getActivityIcon(activity.type);
            const colorClasses = getActivityColor(activity.type);
            
            return (
              <div key={activity.id}>
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    'p-2 rounded-full',
                    colorClasses
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-gray-900">
                        {activity.title}
                      </p>
                      <div className="flex items-center space-x-2">
                        {activity.amount && (
                          <span className="font-semibold text-sm">
                            ${activity.amount.toFixed(2)}
                          </span>
                        )}
                        <Badge variant={getBadgeVariant(activity.type)}>
                          {activity.type}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </span>
                      {activity.groupName && (
                        <>
                          <span>•</span>
                          <span>{activity.groupName}</span>
                        </>
                      )}
                      {activity.userName && (
                        <>
                          <span>•</span>
                          <span>{activity.userName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {index < displayedActivities.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}