import type { FC, ReactNode } from 'react';

export interface FilterPillProps {
  icon?: ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick?: () => void;
}

export const FilterPill: FC<FilterPillProps> = ({ icon, label, count, active, onClick }) => {
  return (
    <div className="min-h-[44px] flex items-center">
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 h-[34px] px-3 rounded-full font-sans text-xs font-bold border-[1.5px] transition-colors ${
          active
            ? 'bg-plum text-paper-hi border-plum'
            : 'bg-paper-hi text-ink-soft border-rule hover:bg-paper-lo'
        }`}
      >
        {icon && <span className="w-[13px] h-[13px]">{icon}</span>}
        {label}
        <span
          className={`ml-0.5 px-1.5 rounded-full text-[11px] ${
            active
              ? 'bg-white/20 text-paper-hi'
              : 'bg-paper text-ink-mute'
          }`}
        >
          {count}
        </span>
      </button>
    </div>
  );
};
