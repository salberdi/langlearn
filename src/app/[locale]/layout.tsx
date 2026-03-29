import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import AuthButton from '@/components/ui/AuthButton';
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

    return (
        <>
            <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <a href="/" className="text-lg font-semibold">LangLearn</a>
                    <div className="flex items-center gap-4 text-sm">
                        <a href="/" className="text-blue-600 hover:text-blue-800">{t('library')}</a>
                        <a href="/upload" className="text-blue-600 hover:text-blue-800">{t('upload')}</a>
                        <a href="/study" className="text-blue-600 hover:text-blue-800">{t('study')}</a>
                        <a href="/review" className="text-blue-600 hover:text-blue-800">{t('review')}</a>
                        <AuthButton />
                    </div>
                </div>
            </nav>
            <main className="max-w-3xl mx-auto px-4 py-6">
                <NextIntlClientProvider locale={locale} messages={messages}>
                    {children}
                </NextIntlClientProvider>
            </main>
        </>
    );
}
