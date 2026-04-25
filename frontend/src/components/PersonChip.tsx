import type { FC } from 'react';

export interface PersonChipProps {
  name: string;
  short?: string;
  mine?: boolean;
  subtle?: boolean;
}

export const PersonChip: FC<PersonChipProps> = ({ name, short, mine, subtle }) => {
  const displayName = short || name.split(' ')[0];
  const initial = name.charAt(0).toUpperCase();

  const containerClass = mine
    ? 'bg-sage-100 border-sage'
    : subtle
      ? 'bg-paper border-rule'
      : 'bg-paper-hi border-rule';

  const nameClass = mine ? 'text-sage-deep' : 'text-ink-soft';

  return (
    <span className={`inline-flex items-center gap-1.5 pl-0.5 pr-2.5 h-7 rounded-full border ${containerClass}`}>
      <span className="w-[18px] h-[18px] rounded-full bg-plum-50 text-plum text-[10px] font-bold flex items-center justify-center">
        {initial}
      </span>
      <span className={`font-sans text-[11px] font-bold ${nameClass}`}>
        {displayName}
      </span>
    </span>
  );
};
