import React, { useState } from 'react';
import { Search, X, BookOpen, Volume2, Sparkles } from 'lucide-react';
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

  React.useEffect(() => {
    if (isOpen && initialWord.trim()) {
      setSearchTerm(initialWord.trim());
      handleSearch(initialWord.trim());
    }
  }, [isOpen, initialWord]);

  const handleSearch = async (wordToSearch?: string) => {
    const word = (wordToSearch || searchTerm).trim();
    if (!word) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dictionary/${encodeURIComponent(word)}`);
      if (!response.ok) {
        throw new Error('Palavra não encontrada no dicionário.');
      }
      const data: DictionaryResultDto = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar dicionário.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePronounce = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}>
        {/* Cabeçalho do Modal */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} color="var(--color-primary)" />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Dicionário em Contexto</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Pesquisa */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            style={{ display: 'flex', gap: '0.5rem' }}
          >
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: '0 0.75rem',
              border: '1px solid var(--border-color)',
            }}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Busque uma palavra em inglês..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                padding: '0 1rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        </div>

        {/* Conteúdo dos Resultados */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(200, 16, 46, 0.1)',
              color: 'var(--color-accent-alert)',
              fontSize: '0.875rem',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Palavra e Pronúncia */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                  onClick={() => handlePronounce(result.word)}
                  title="Ouvir pronúncia"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--color-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <Volume2 size={16} />
                  <span>Ouvir</span>
                </button>
              </div>

              {/* Sinônimos em Destaque */}
              {result.allSynonyms.length > 0 && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem' }}>
                    <Sparkles size={14} color="var(--color-primary)" />
                    <strong style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Sinônimos Recomendados (Evite o português):
                    </strong>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {result.allSynonyms.map((syn, idx) => (
                      <span
                        key={idx}
                        onClick={() => {
                          setSearchTerm(syn);
                          handleSearch(syn);
                        }}
                        style={{
                          fontSize: '0.8125rem',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                        }}
                      >
                        {syn}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Definições Curtas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <strong style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Definições:</strong>
                {result.definitions.map((def, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--color-primary)',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                    }}>
                      {def.partOfSpeech}
                    </span>
                    <p style={{ fontSize: '0.875rem', marginTop: '2px' }}>{def.definition}</p>
                    {def.example && (
                      <p style={{
                        fontSize: '0.8125rem',
                        fontStyle: 'italic',
                        color: 'var(--text-muted)',
                        marginTop: '4px',
                      }}>
                        "{def.example}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result && !error && !loading && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '2rem 0' }}>
              Digite uma palavra em inglês para consultar sinônimos e definições rápidas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
