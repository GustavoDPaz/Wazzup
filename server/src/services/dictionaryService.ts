import { DictionaryResultDto, DictionaryDefinition } from '@englishtalks/shared';

class DictionaryService {
  private cache: Map<string, DictionaryResultDto> = new Map();

  // Vocabulário de contingência offline / fallback para termos essenciais de conversação
  private fallbackVocab: Record<string, DictionaryResultDto> = {
    hello: {
      word: 'hello',
      phonetic: '/həˈloʊ/',
      definitions: [
        { partOfSpeech: 'interjection', definition: 'Used as a greeting or to begin a conversation.', example: 'Hello! How are you today?', synonyms: ['hi', 'greetings'] },
        { partOfSpeech: 'noun', definition: 'An utterance of "hello"; a greeting.', synonyms: ['greeting'] }
      ],
      allSynonyms: ['hi', 'greetings', 'welcome']
    },
    conversation: {
      word: 'conversation',
      phonetic: '/ˌkɑːnvərˈseɪʃn/',
      definitions: [
        { partOfSpeech: 'noun', definition: 'A talk, especially an informal one, between two or more people in which news and ideas are exchanged.', example: 'We had a pleasant conversation about books.', synonyms: ['chat', 'dialogue'] }
      ],
      allSynonyms: ['chat', 'dialogue', 'talk', 'discussion']
    },
    practice: {
      word: 'practice',
      phonetic: '/ˈpræktɪs/',
      definitions: [
        { partOfSpeech: 'noun', definition: 'Repeated exercise in or performance of an activity so as to acquire or maintain proficiency in it.', example: 'Practice makes perfect.', synonyms: ['exercise', 'drill'] },
        { partOfSpeech: 'verb', definition: 'Perform an activity or exercise repeatedly or regularly in order to improve proficiency.', example: 'I practice English every morning.', synonyms: ['rehearse', 'study'] }
      ],
      allSynonyms: ['exercise', 'drill', 'study', 'rehearse']
    },
    student: {
      word: 'student',
      phonetic: '/ˈstuːdnt/',
      definitions: [
        { partOfSpeech: 'noun', definition: 'A person who is studying at a school, college, or university.', example: 'A student of English literature.', synonyms: ['pupil', 'learner'] }
      ],
      allSynonyms: ['pupil', 'learner', 'scholar']
    },
    monitor: {
      word: 'monitor',
      phonetic: '/ˈmɑːnɪtər/',
      definitions: [
        { partOfSpeech: 'noun', definition: 'A person who observes, assists or guides learners in educational practice.', example: 'The monitor provided helpful grammatical tips.', synonyms: ['guide', 'instructor'] }
      ],
      allSynonyms: ['instructor', 'guide', 'facilitator']
    }
  };

  public async lookup(rawWord: string): Promise<DictionaryResultDto | null> {
    if (!rawWord) return null;

    // Limpa pontuações ao redor da palavra
    const word = rawWord.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').trim().toLowerCase();
    if (!word || word.length < 2) {
      return null;
    }

    if (this.cache.has(word)) {
      return this.cache.get(word)!;
    }

    // Tenta primeiro a API remota com timeout de 4 segundos
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json();
        if (Array.isArray(data) && data.length > 0) {
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
        }
      }
    } catch {
      // Falha de rede ou timeout
    }

    // Se a busca direta falhou, tenta lematizar sufixos simples em inglês (-s, -ed, -ing)
    const baseCandidates: string[] = [];
    if (word.endsWith('ing') && word.length > 5) baseCandidates.push(word.slice(0, -3));
    if (word.endsWith('ed') && word.length > 4) baseCandidates.push(word.slice(0, -2));
    if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) baseCandidates.push(word.slice(0, -1));

    for (const cand of baseCandidates) {
      if (this.cache.has(cand)) return this.cache.get(cand)!;
      if (this.fallbackVocab[cand]) return this.fallbackVocab[cand];
    }

    // Fallback de vocabulário offline
    if (this.fallbackVocab[word]) {
      return this.fallbackVocab[word];
    }

    return null;
  }
}

export const dictionaryService = new DictionaryService();
