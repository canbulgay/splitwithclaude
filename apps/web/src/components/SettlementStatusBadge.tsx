import React from "react";
import { Badge } from "./ui/badge";
import { SettlementStatus } from "../api/settlements";

interface SettlementStatusBadgeProps {
  status: SettlementStatus;
  className?: string;
}

export const SettlementStatusBadge: React.FC<SettlementStatusBadgeProps> = ({
  status,
  className = "",
}) => {
  const getStatusConfig = (status: SettlementStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Pending',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        };
      case 'CONFIRMED':
        return {
          label: 'Confirmed',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
        };
      case 'COMPLETED':
        return {
          label: 'Completed',
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-100',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          variant: 'secondary' as const,
          className: 'bg-red-100 text-red-800 hover:bg-red-100',
        };
      default:
        return {
          label: 'Unknown',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${className}`}
    >
      {config.label}
    </Badge>
  );
};