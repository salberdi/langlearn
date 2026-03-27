'use client';

import { useState, useEffect } from 'react';

interface StreakData {
  current_streak: number;
  longest_streak: number;
}

export default function StreakBadge() {
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
      .catch(() => {});
  }, []);

  if (!streak || streak.current_streak === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
      {streak.current_streak} day streak
    </span>
  );
}
