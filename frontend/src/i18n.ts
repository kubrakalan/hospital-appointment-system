import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import tr from './locales/tr'
import en from './locales/en'

const savedLang = localStorage.getItem('dil') || 'tr'

i18n
  .use(initReactI18next)
  .init({
    resources: { tr, en },
    lng: savedLang,
    fallbackLng: 'tr',
    interpolation: { escapeValue: false },
  })

export default i18n
