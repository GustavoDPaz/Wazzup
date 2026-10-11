import React from 'react';
import { X, BookOpen, Volume2, HelpCircle, MessageSquare, Languages, MousePointerClick } from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const guideSections = [
    {
      icon: <MessageSquare size={18} color="var(--color-primary)" />,
      title: '1. Acesso e Diálogo nas Salas',
      description: 'Informe seu nickname e código de sala (ou escolha uma das abertas no lobby). Cada participante deve possuir um nickname único por sala para garantir a identidade da conversa.',
    },
    {
      icon: <MousePointerClick size={18} color="var(--color-primary)" />,
      title: '2. Dicionário em Contexto (Duplo Clique)',
      description: 'Ao encontrar qualquer palavra desconhecida no chat, dê um duplo clique sobre ela para abrir o dicionário instantâneo com classe gramatical, tradução, sinônimos navegáveis e pronúncia.',
    },
    {
      icon: <Volume2 size={18} color="var(--color-primary)" />,
      title: '3. Ouvir Pronúncia em Inglês Nativo',
      description: 'Clique no ícone de alto-falante ao lado de qualquer mensagem ou acesse o menu de contexto com o botão direito para escutar a pronúncia fluida em inglês americano (en-US).',
    },
    {
      icon: <Languages size={18} color="var(--color-primary)" />,
      title: '4. Tradução Rápida via Botão Direito',
      description: 'Dúvidas sobre o sentido completo de uma frase? Clique com o botão direito do mouse sobre o balão e escolha "Traduzir Mensagem (PT)" para alternar a exibição da tradução.',
    },
    {
      icon: <HelpCircle size={18} color="var(--color-accent-alert)" />,
      title: '5. Suporte Pedagógico com Monitores',
      description: 'Precisa de esclarecimento sobre regras ou vocabulário? Clique em "Chamar Monitor" na barra superior. Os monitores recebem um alerta na fila e fornecem feedbacks pedagógicos em tempo real.',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '1rem',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '4px',
          border: '1px solid var(--border-color)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 150, 57, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Guia de Utilização SpeakUp
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Instruções essenciais para aproveitar todos os recursos interativos do laboratório.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Fechar Guia"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '2px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de Recursos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {guideSections.map((sec, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '0.75rem 0.875rem',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {sec.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <strong style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                  {sec.title}
                </strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                  {sec.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé com Botão de Fechar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
