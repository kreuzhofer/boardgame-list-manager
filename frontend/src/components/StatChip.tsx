import type { FC } from 'react';

export interface StatChipProps {
  n: number;
  label: string;
  tone: 'plum' | 'sage' | 'butter' | 'ocean';
}

const toneColorMap: Record<StatChipProps['tone'], string> = {
  plum: 'text-plum',
  sage: 'text-sage-deep',
  butter: 'text-butter-deep',
  ocean: 'text-ocean-deep',
};

export const StatChip: FC<StatChipProps> = ({ n, label, tone }) => {
  const toneColor = toneColorMap[tone];

  return (
    <div className="bg-paper-hi border-[1.5px] border-rule rounded-[14px] px-4 py-2.5 min-w-[92px] text-center">
      <div className={`font-display font-semibold text-[28px] leading-none ${toneColor}`}>{n}</div>
      <div className="font-sans text-[11px] font-bold text-ink-mute uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
};
