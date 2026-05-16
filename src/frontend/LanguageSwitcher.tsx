import { useTranslation } from 'react-i18next'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('hr') ? 'hr' : 'en'

  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${className ?? ''}`}>
      <button
        onClick={() => i18n.changeLanguage('en')}
        className={lang === 'en' ? 'font-bold' : 'opacity-40 hover:opacity-70 transition'}
      >
        EN
      </button>
      <span className="opacity-30">/</span>
      <button
        onClick={() => i18n.changeLanguage('hr')}
        className={lang === 'hr' ? 'font-bold' : 'opacity-40 hover:opacity-70 transition'}
      >
        HR
      </button>
    </div>
  )
}
