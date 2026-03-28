import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { srsCards, streaks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sm2 } from '@/lib/sm2';
import { getRequiredUser } from '@/lib/auth-helpers';
import type { SRSQuality } from '@/types';

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await getRequiredUser();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { card_id, quality } = body as { card_id: number; quality: SRSQuality };

  if (card_id === undefined || quality === undefined) {
    return NextResponse.json(
      { error: 'card_id and quality required' },
      { status: 400 }
    );
  }

  const cardRows = await db
    .select()
    .from(srsCards)
    .where(eq(srsCards.id, card_id))
    .limit(1);
  const card = cardRows[0];

  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  if (card.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

  await db.update(srsCards)
    .set({
      ease_factor: updated.ease_factor,
      interval_days: updated.interval_days,
      repetitions: updated.repetitions,
      due_at: updated.due_at,
    })
    .where(eq(srsCards.id, card_id));

  // Update streak
  await updateStreak(user.id);

  return NextResponse.json({
    card_id,
    next_due: updated.due_at,
    interval_days: updated.interval_days,
    ease_factor: updated.ease_factor,
  });
}

async function updateStreak(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400_000)
    .toISOString()
    .split('T')[0];

  const streakRows = await db.select().from(streaks).where(eq(streaks.user_id, userId)).limit(1);
  const streak = streakRows[0];

  if (!streak) {
    await db.insert(streaks)
      .values({ user_id: userId, current_streak: 1, longest_streak: 1, last_active_date: today });
    return;
  }

  if (streak.last_active_date === today) return; // Already counted today

  let newStreak = 1;
  if (streak.last_active_date === yesterday) {
    newStreak = (streak.current_streak ?? 0) + 1;
  }

  const newLongest = Math.max(newStreak, streak.longest_streak ?? 0);

  await db.update(streaks)
    .set({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
    })
    .where(eq(streaks.user_id, userId));
}
