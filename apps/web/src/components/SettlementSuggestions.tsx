import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { SettlementSuggestion, SettlementOptimization } from '../api/settlements';
import { ArrowRight, TrendingDown, Users, DollarSign } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface SettlementSuggestionsProps {
  suggestions: SettlementSuggestion[];
  optimization: SettlementOptimization;
  users: User[];
  onCreateSettlement?: (suggestion: SettlementSuggestion) => void;
  className?: string;
}

export const SettlementSuggestions: React.FC<SettlementSuggestionsProps> = ({
  suggestions,
  optimization,
  users,
  onCreateSettlement,
  className = '',
}) => {
  const [isCreating, setIsCreating] = useState<string | null>(null);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown User';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleCreateSettlement = async (suggestion: SettlementSuggestion) => {
    if (!onCreateSettlement) return;
    
    const suggestionKey = `${suggestion.fromUser}-${suggestion.toUser}`;
    setIsCreating(suggestionKey);
    
    try {
      await onCreateSettlement(suggestion);
    } catch (error) {
      console.error('Error creating settlement:', error);
    } finally {
      setIsCreating(null);
    }
  };

  if (suggestions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-green-600" />
            Settlement Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-4">
            <p className="font-medium">All balanced! 🎉</p>
            <p className="text-sm mt-1">No settlements needed - everyone is even.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-blue-600" />
          Settlement Suggestions
        </CardTitle>
        
        {/* Optimization Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {optimization.optimizedTransactions}
            </div>
            <div className="text-xs text-gray-500">Suggested Payments</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">
              {optimization.currentTransactions}
            </div>
            <div className="text-xs text-gray-500">Individual Debts</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              -{optimization.transactionReduction}
            </div>
            <div className="text-xs text-gray-500">Fewer Payments</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {optimization.percentageReduction}%
            </div>
            <div className="text-xs text-gray-500">Reduction</div>
          </div>
        </div>
        
        {optimization.transactionReduction > 0 && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>Optimization:</strong> These suggestions reduce the number of payments from {optimization.currentTransactions} to {optimization.optimizedTransactions}, 
              saving {optimization.transactionReduction} transaction{optimization.transactionReduction !== 1 ? 's' : ''}.
            </p>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => {
            const suggestionKey = `${suggestion.fromUser}-${suggestion.toUser}`;
            const isCreatingThis = isCreating === suggestionKey;
            
            return (
              <div
                key={suggestionKey}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                  
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-medium text-gray-900">
                      {getUserName(suggestion.fromUser)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {getUserName(suggestion.toUser)}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-lg text-green-600">
                      {formatCurrency(suggestion.amount)}
                    </div>
                  </div>
                </div>

                {onCreateSettlement && (
                  <div className="ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleCreateSettlement(suggestion)}
                      disabled={isCreatingThis}
                      className="min-w-[100px]"
                    >
                      {isCreatingThis ? 'Recording...' : 'Record'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{users.length} members</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span>{formatCurrency(suggestions.reduce((sum, s) => sum + s.amount, 0))} total</span>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              Optimized for minimum transactions
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};