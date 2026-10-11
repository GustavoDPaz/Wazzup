import React, { useState } from 'react';
import { Search, X, BookOpen, Volume2, Sparkles, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { DictionaryResultDto } from '@englishtalks/shared';

interface DictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWord?: string;
}

export const DictionaryModal: React.FC<DictionaryModalProps> = ({
  isOpen,
  onClose,
  initialWord = '',
}) => {
  const [searchTerm, setSearchTerm] = useState(initialWord);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DictionaryResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  React.useEffect(() => {
    if (isOpen && initialWord.trim()) {
      const clean = initialWord.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').trim();
      setSearchTerm(clean);
      setHistory([]);
      handleSearch(clean, false);
    }
  }, [isOpen, initialWord]);

  const handleSearch = async (wordToSearch?: string, pushToHistory = true) => {
    const raw = (wordToSearch || searchTerm).trim();
    const word = raw.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').trim().toLowerCase();
    if (!word) return;

    if (pushToHistory && result && result.word.toLowerCase() !== word) {
      setHistory(prev => [...prev, result.word]);
    }

    setSearchTerm(word);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dictionary/${encodeURIComponent(word)}`);
      if (!response.ok) {
        throw new Error('Não foi possível carregar o significado no momento. Verifique a grafia da palavra.');
      }
      const data: DictionaryResultDto = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar o significado no momento.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (history.length === 0) return;
    const prevWord = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    handleSearch(prevWord, false);
  };

  const handlePronounce = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          borderRadius: '4px',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleGoBack}
                title="Voltar para palavra anterior"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginRight: '4px',
                }}
              >
                <ArrowLeft size={14} />
                <span>Voltar</span>
              </button>
            )}
            <BookOpen size={20} color="var(--color-primary)" />
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Dicionário em Contexto</h3>
          </div>
          <button
            onClick={onClose}
            title="Fechar"
            style={{
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '2px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Pesquisa */}
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            style={{ display: 'flex', gap: '0.5rem' }}
          >
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                padding: '0 0.75rem',
                border: '1px solid var(--border-color)',
              }}
            >
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Busque uma palavra em inglês (ex: speak, practice)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                lang="en"
                spellCheck={true}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.9375rem',
                }}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                padding: '0 1.25rem',
                borderRadius: '4px',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        </div>

        {/* Conteúdo dos Resultados */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div
              style={{
                padding: '1rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(200, 16, 46, 0.08)',
                border: '1px solid var(--color-accent-alert)',
                color: 'var(--color-accent-alert)',
                fontSize: '0.875rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <AlertCircle size={18} />
                <span>Consulta não concluída</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem' }}>{error}</p>
              <button
                type="button"
                onClick={() => handleSearch()}
                style={{
                  marginTop: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--color-accent-alert)',
                  color: 'var(--color-accent-alert)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} />
                <span>Tentar Novamente</span>
              </button>
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Palavra e Pronúncia */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {result.word}
                  </h2>
                  {result.phonetic && (
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {result.phonetic}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handlePronounce(result.word)}
                  title="Ouvir pronúncia em inglês (Web Speech API)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--color-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: '1px solid var(--color-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <Volume2 size={16} />
                  <span>Ouvir Pronúncia</span>
                </button>
              </div>

              {/* Sinônimos em Destaque com Busca Encadeada (Item 3.3) */}
              {result.allSynonyms.length > 0 && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                    <Sparkles size={14} color="var(--color-primary)" />
                    <strong style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Sinônimos em Inglês (Clique para explorar):
                    </strong>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {result.allSynonyms.map((syn, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSearch(syn, true)}
                        title={`Pesquisar '${syn}' no dicionário`}
                        style={{
                          fontSize: '0.8125rem',
                          padding: '3px 10px',
                          borderRadius: '2px',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        {syn}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de Definições */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  Significados & Exemplos de Uso:
                </strong>
                {result.definitions.map((def, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderLeft: '3px solid var(--color-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                      {def.partOfSpeech}
                    </div>
                    <p style={{ margin: '4px 0 6px 0', fontSize: '0.875rem', lineHeight: 1.5 }}>
                      {def.definition}
                    </p>
                    {def.example && (
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Exemplo: "{def.example}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
