import { auth, signOut } from '@/auth';
import { getTranslations } from 'next-intl/server';

export default async function AuthButton() {
  const session = await auth();
  const t = await getTranslations('Auth');

  if (!session?.user) {
    return (
      <a href="/auth/signin" className="text-blue-600 hover:text-blue-800 text-sm">
        {t('signIn')}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {session.user.image && (
        <img
          src={session.user.image}
          alt={session.user.name ?? 'User'}
          className="w-7 h-7 rounded-full"
        />
      )}
      <span className="text-sm text-gray-700 hidden sm:block">
        {session.user.name}
      </span>
      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/auth/signin' });
        }}
      >
        <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
          {t('signOut')}
        </button>
      </form>
    </div>
  );
}
