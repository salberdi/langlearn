import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ locale }) => {
    // Validate that the incoming locale is supported
    const resolvedLocale = routing.locales.includes(locale as 'en' | 'es')
        ? locale
        : routing.defaultLocale;

    return {
        locale: resolvedLocale,
        messages: (await import(`../../messages/${resolvedLocale}.json`)).default,
    };
});
