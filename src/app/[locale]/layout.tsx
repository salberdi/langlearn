import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import AuthButton from '@/components/ui/AuthButton';
import StreakBadge from '@/components/ui/StreakBadge';
import NavLinks from '@/components/ui/NavLinks';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('Metadata');
    return {
        title: t('title'),
        description: t('description'),
    };
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    const { locale } = params;
    const messages = await getMessages();
    const t = await getTranslations('Nav');

    const navLinks = [
        { href: '/', label: t('library') },
        { href: '/upload', label: t('upload') },
        { href: '/study', label: t('study') },
        { href: '/review', label: t('review') },
    ];

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <a href="/" className="flex items-center gap-2 font-bold text-slate-900 shrink-0">
                            <span className="text-xl leading-none">📚</span>
                            <span className="text-base tracking-tight">LangLearn</span>
                        </a>
                        <div className="hidden sm:block">
                            <NavLinks links={navLinks} />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <StreakBadge />
                        <AuthButton />
                    </div>
                </div>
                {/* Mobile nav row */}
                <div className="sm:hidden border-t border-slate-100 px-3 py-1.5">
                    <NavLinks links={navLinks} />
                </div>
            </nav>
            <main className="max-w-3xl mx-auto px-4 py-6">
                {children}
            </main>
        </NextIntlClientProvider>
    );
}
