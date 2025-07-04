import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  variant?: "default" | "destructive" | "warning";
}

export function ErrorMessage({ 
  title = "Something went wrong", 
  message, 
  onRetry, 
  className,
  variant = "default" 
}: ErrorMessageProps) {
  const variantClasses = {
    default: "border-red-200 bg-red-50",
    destructive: "border-red-300 bg-red-100", 
    warning: "border-yellow-200 bg-yellow-50"
  };

  const textClasses = {
    default: "text-red-800",
    destructive: "text-red-900",
    warning: "text-yellow-800"
  };

  const iconClasses = {
    default: "text-red-600",
    destructive: "text-red-700", 
    warning: "text-yellow-600"
  };

  return (
    <Card className={cn("border", variantClasses[variant], className)}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className={cn("h-5 w-5 mt-0.5", iconClasses[variant])} />
          <div className="flex-1">
            <h3 className={cn("font-semibold", textClasses[variant])}>{title}</h3>
            <p className={cn("mt-1 text-sm", textClasses[variant])}>{message}</p>
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                className="mt-3"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon && <div className="mb-4 text-gray-400">{icon}</div>}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4 max-w-sm">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}