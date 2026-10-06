import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortOrder = 'asc' | 'desc' | null;

interface SortableHeaderProps {
  label: string;
  field?: string;
  sortKey?: string;
  currentSortField?: string | null;
  currentSortKey?: string | null;
  currentSortOrder: SortOrder;
  onSort: (field: string) => void;
  style?: React.CSSProperties;
  align?: 'left' | 'center' | 'right';
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  field,
  sortKey,
  currentSortField,
  currentSortKey,
  currentSortOrder,
  onSort,
  style,
  align = 'left'
}) => {
  const activeField = field || sortKey || '';
  const activeCurrentField = currentSortField !== undefined ? currentSortField : currentSortKey;
  const isSorted = activeCurrentField === activeField;

  return (
    <th
      onClick={() => onSort(activeField)}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        textAlign: align,
        transition: 'background 0.15s ease',
        whiteSpace: 'nowrap',
        ...style
      }}
      className="sortable-th"
      title={`Klik untuk mengurutkan berdasarkan ${label}`}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
          width: '100%'
        }}
      >
        <span>{label}</span>
        {isSorted ? (
          currentSortOrder === 'asc' ? (
            <ArrowUp size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          ) : (
            <ArrowDown size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          )
        ) : (
          <ArrowUpDown size={12} style={{ color: 'var(--text-muted)', opacity: 0.5, flexShrink: 0 }} />
        )}
      </div>
    </th>
  );
};
