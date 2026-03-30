'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface StreakData {
  current_streak: number;
  longest_streak: number;
}

export default function StreakBadge() {
  const t = useTranslations('Streak');
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    fetch('/api/srs/streak')
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((data) => {
        if (data) setStreak(data);
      })
      .catch(() => { });
  }, []);

  if (!streak || streak.current_streak === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-200 text-xs font-semibold px-2.5 py-1 rounded-full">
      🔥 {t('dayStreak', { count: streak.current_streak })}
    </span>
  );
}
