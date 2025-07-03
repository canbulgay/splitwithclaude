import { useState } from 'react';
import { Button } from './ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { useSettlements } from '../hooks/useSettlements';
import { SettlementSuggestion } from '../api/balances';

interface QuickSettleButtonProps {
  suggestion: SettlementSuggestion;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function QuickSettleButton({
  suggestion,
  onSuccess,
  variant = 'default',
  size = 'sm',
  className
}: QuickSettleButtonProps) {
  const { settleFromSuggestion, isLoading, error } = useSettlements();
  const [showError, setShowError] = useState(false);

  const handleSettle = async () => {
    const success = await settleFromSuggestion(suggestion);
    if (success) {
      onSuccess?.();
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={handleSettle}
        disabled={isLoading}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <CreditCard className="h-4 w-4 mr-2" />
        )}
        Settle ${suggestion.amount.toFixed(2)}
      </Button>
      
      {showError && error && (
        <div className="absolute top-full left-0 mt-2 bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
}