import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Users, Plus, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface GroupOverviewProps {
  groups: Array<{
    id: string;
    name: string;
    description?: string;
    memberCount: number;
    totalExpenses: number;
    yourBalance: number;
    lastActivity: Date;
  }>;
  className?: string;
  onCreateGroup?: () => void;
  onViewGroup?: (groupId: string) => void;
}

export function GroupOverview({
  groups,
  className,
  onCreateGroup,
  onViewGroup,
}: GroupOverviewProps) {
  const [sortedGroups, setSortedGroups] = useState(groups);

  useEffect(() => {
    // Sort by last activity (most recent first)
    const sorted = [...groups].sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
    );
    setSortedGroups(sorted);
  }, [groups]);

  const getBalanceColor = (balance: number) => {
    if (Math.abs(balance) < 0.01) return 'text-gray-600';
    return balance > 0 ? 'text-green-600' : 'text-red-600';
  };

  if (groups.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>Your Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first group to start splitting expenses
            </p>
            <Button onClick={onCreateGroup} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Your Groups</CardTitle>
        <Button variant="outline" size="sm" onClick={onCreateGroup} className="gap-2">
          <Plus className="h-4 w-4" />
          New Group
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedGroups.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold">{group.name}</h4>
                  <Badge variant="secondary">
                    {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                  </Badge>
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {group.description}
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-2 text-sm">
                  <span className="text-muted-foreground">
                    ${group.totalExpenses.toFixed(2)} total expenses
                  </span>
                  <span className={cn('font-medium', getBalanceColor(group.yourBalance))}>
                    {Math.abs(group.yourBalance) < 0.01
                      ? 'Settled up'
                      : group.yourBalance > 0
                      ? `You're owed $${group.yourBalance.toFixed(2)}`
                      : `You owe $${Math.abs(group.yourBalance).toFixed(2)}`}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewGroup?.(group.id)}
                className="gap-2"
              >
                View
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}