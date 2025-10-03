import { translations } from './translations.js';

class TranslationService {
  constructor() {
    this.translations = translations;
    // Default to 'en', load saved preference if it exists
    this.currentLanguage = localStorage.getItem('lunai-lang') || 'en';
  }

  init() {
    this.updateDOM();
    this.updateHtmlLang();
  }

  toggleLanguage() {
    this.currentLanguage = this.currentLanguage === 'en' ? 'ta' : 'en';
    localStorage.setItem('lunai-lang', this.currentLanguage);
    this.updateDOM();
    this.updateHtmlLang();
    return this.currentLanguage;
  }

  updateDOM() {
    document.querySelectorAll('[data-translate]').forEach(element => {
      const key = element.getAttribute('data-translate');
      const translation = this.getTranslation(key);
      if (translation) {
        // Handle different element types to prevent breaking them
        const target = element.hasAttribute('data-translate-target') ? element.querySelector(element.getAttribute('data-translate-target')) : element;
        
        if (target) {
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                if(target.placeholder) target.placeholder = translation;
            } else {
                target.innerHTML = translation; // Use innerHTML to support simple tags if needed
            }
        }
      }
    });
  }

  updateHtmlLang() {
    document.documentElement.lang = this.currentLanguage;
    if (this.currentLanguage === 'ta') {
      document.body.classList.add('lang-ta');
    } else {
      document.body.classList.remove('lang-ta');
    }
  }

  getTranslation(key, replacements = {}) {
    let translation = this.translations[this.currentLanguage]?.[key] || this.translations['en'][key] || key;
    for (const placeholder in replacements) {
      translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
    }
    return translation;
  }
}

export const translationService = new TranslationService();
