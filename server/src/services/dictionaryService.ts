import { DictionaryResultDto, DictionaryDefinition } from '@englishtalks/shared';

class DictionaryService {
  private cache: Map<string, DictionaryResultDto> = new Map();

  public async lookup(rawWord: string): Promise<DictionaryResultDto | null> {
    const word = rawWord.trim().toLowerCase();
    if (!word || !/^[a-zA-Z-]+$/.test(word)) {
      return null;
    }

    if (this.cache.has(word)) {
      return this.cache.get(word)!;
    }

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      const entry = data[0];
      const definitions: DictionaryDefinition[] = [];
      const synonymSet = new Set<string>();

      if (Array.isArray(entry.meanings)) {
        for (const meaning of entry.meanings) {
          const partOfSpeech = meaning.partOfSpeech || 'noun';
          if (Array.isArray(meaning.synonyms)) {
            meaning.synonyms.forEach((s: string) => synonymSet.add(s));
          }

          if (Array.isArray(meaning.definitions)) {
            for (const def of meaning.definitions.slice(0, 2)) {
              if (Array.isArray(def.synonyms)) {
                def.synonyms.forEach((s: string) => synonymSet.add(s));
              }
              definitions.push({
                partOfSpeech,
                definition: def.definition,
                example: def.example,
                synonyms: (def.synonyms || []).slice(0, 3),
              });
            }
          }
        }
      }

      const result: DictionaryResultDto = {
        word: entry.word,
        phonetic: entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text,
        definitions: definitions.slice(0, 4),
        allSynonyms: Array.from(synonymSet).slice(0, 6),
      };

      this.cache.set(word, result);
      return result;
    } catch {
      return null;
    }
  }
}

export const dictionaryService = new DictionaryService();
