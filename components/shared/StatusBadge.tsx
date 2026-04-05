import React from 'react';
import { Badge } from '../ui/Badge';
import { RagStatus, DocumentStatus } from '../../lib/types';
import type { StatusBadgeProps } from '../../lib/types';

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  let variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'neutral';
  let label = status as string;

  if (status === RagStatus.READY || status === DocumentStatus.READY) {
    variant = 'success';
    label = 'Ready';
  } else if (status === RagStatus.ERROR || status === DocumentStatus.FAILED) {
    variant = 'error';
    label = 'Error';
  } else if (status === RagStatus.INDEXING || status === DocumentStatus.PROCESSING) {
    variant = 'info';
    label = 'Processing';
  } else if (status === RagStatus.PENDING || status === DocumentStatus.QUEUED) {
    variant = 'warning';
    label = status === RagStatus.PENDING ? 'Pending' : 'Queued';
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
};
