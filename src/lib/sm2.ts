import type { SRSQuality } from '@/types';

export interface SRSCard {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_at: Date;
}

export function sm2(card: SRSCard, quality: SRSQuality): SRSCard {
  let { ease_factor, interval_days, repetitions } = card;

  // Always update ease_factor per SM-2 spec
  ease_factor = Math.max(
    1.3,
    ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  if (quality < 3) {
    repetitions = 0;
    interval_days = 1;
  } else {
    repetitions++;
    interval_days =
      repetitions === 1
        ? 1
        : repetitions === 2
          ? 6
          : Math.round(interval_days * ease_factor);
  }

  return {
    ...card,
    ease_factor,
    interval_days,
    repetitions,
    due_at: new Date(Date.now() + interval_days * 86400_000),
  };
}
