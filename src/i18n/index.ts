import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN';
import en from './locales/en';

export const SUPPORTED_LOCALES = ['zh-CN', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_STORAGE_KEY = 'bear-draw.locale';

function isLocale(value: string | null): value is Locale {
	return value !== null && SUPPORTED_LOCALES.includes(value as Locale);
}

function getInitialLocale(): Locale {
	const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
	if (isLocale(savedLocale)) {
		return savedLocale;
	}

	return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

void i18n.use(initReactI18next).init({
	resources: {
		'zh-CN': { translation: zhCN },
		en: { translation: en },
	},
	lng: getInitialLocale(),
	fallbackLng: 'zh-CN',
	supportedLngs: SUPPORTED_LOCALES,
	interpolation: {
		escapeValue: false,
	},
});

function applyDocumentMetadata(locale: string): void {
	document.documentElement.lang = locale;
	document.title = i18n.t('app.name');
}

applyDocumentMetadata(i18n.language);
i18n.on('languageChanged', (locale) => {
	localStorage.setItem(LOCALE_STORAGE_KEY, locale);
	applyDocumentMetadata(locale);
});

export default i18n;
