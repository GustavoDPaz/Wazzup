class TranslationService {
  private cache: Map<string, string> = new Map();

  public async translate(text: string, from = 'en', to = 'pt'): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return '';

    const cacheKey = `${from}:${to}:${trimmed.toLowerCase()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // MyMemory Public Translation API (rápida, sem necessidade de credenciais)
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${from}|${to}`;
      const response = await fetch(url);

      if (response.ok) {
        const data: any = await response.json();
        if (data?.responseData?.translatedText) {
          const translated = data.responseData.translatedText;
          this.cache.set(cacheKey, translated);
          return translated;
        }
      }
    } catch (error) {
      console.error('[TranslationService] Erro ao traduzir:', error);
    }

    return trimmed;
  }
}

export const translationService = new TranslationService();
