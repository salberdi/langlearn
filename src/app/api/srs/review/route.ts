import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { srsCards, streaks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sm2 } from '@/lib/sm2';
import type { SRSQuality } from '@/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { card_id, quality } = body as { card_id: number; quality: SRSQuality };

  if (card_id === undefined || quality === undefined) {
    return NextResponse.json(
      { error: 'card_id and quality required' },
      { status: 400 }
    );
  }

  const card = db
    .select()
    .from(srsCards)
    .where(eq(srsCards.id, card_id))
    .get();

  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  const updated = sm2(
    {
      ease_factor: card.ease_factor ?? 2.5,
      interval_days: card.interval_days ?? 1,
      repetitions: card.repetitions ?? 0,
      due_at: card.due_at,
    },
    quality
  );

  db.update(srsCards)
    .set({
      ease_factor: updated.ease_factor,
      interval_days: updated.interval_days,
      repetitions: updated.repetitions,
      due_at: updated.due_at,
    })
    .where(eq(srsCards.id, card_id))
    .run();

  // Update streak
  updateStreak();

  return NextResponse.json({
    card_id,
    next_due: updated.due_at,
    interval_days: updated.interval_days,
    ease_factor: updated.ease_factor,
  });
}

function updateStreak(): void {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400_000)
    .toISOString()
    .split('T')[0];

  const streak = db.select().from(streaks).get();

  if (!streak) {
    db.insert(streaks)
      .values({ current_streak: 1, longest_streak: 1, last_active_date: today })
      .run();
    return;
  }

  if (streak.last_active_date === today) return; // Already counted today

  let newStreak = 1;
  if (streak.last_active_date === yesterday) {
    newStreak = (streak.current_streak ?? 0) + 1;
  }

  const newLongest = Math.max(newStreak, streak.longest_streak ?? 0);

  db.update(streaks)
    .set({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
    })
    .where(eq(streaks.id, streak.id))
    .run();
}
