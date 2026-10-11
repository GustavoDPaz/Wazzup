import React, { useState, useEffect } from 'react';
import { MessageCircle, QrCode, ExternalLink, X } from 'lucide-react';

export const WhatsAppBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('speakup_whatsapp_banner_dismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('speakup_whatsapp_banner_dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  const whatsappUrl = 'https://chat.whatsapp.com/SpeakUpCommunity';

  return (
    <>
      <div
        style={{
          width: '100%',
          backgroundColor: 'rgba(0, 150, 57, 0.08)',
          borderBottom: '1px solid rgba(0, 150, 57, 0.25)',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MessageCircle size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Comunidade SpeakUp no WhatsApp
              </strong>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(0, 150, 57, 0.15)',
                  color: 'var(--color-primary)',
                }}
              >
                OFICIAL
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
              Participe da prática diária de conversação e tire dúvidas diretamente com outros estudantes e monitores.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            title="Escanear com a câmera do celular"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <QrCode size={14} color="var(--color-primary)" />
            <span>QR Code</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <span>Entrar no Grupo</span>
            <ExternalLink size={13} />
          </a>

          <button
            type="button"
            onClick={handleDismiss}
            title="Ocultar aviso"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Modal Compacto de QR Code para Conexão Mobile */}
      {showQrModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '1rem',
            backdropFilter: 'blur(3px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowQrModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '340px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={18} color="var(--color-primary)" />
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
                  Acesso pelo Celular
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Aponte a câmera do seu smartphone para o QR Code abaixo para ingressar no grupo oficial:
            </p>

            {/* Simulação Visual de QR Code Vetorial com borda 4px */}
            <div
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '4px',
                border: '2px solid var(--border-color)',
                padding: '12px',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <svg width="150" height="150" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#FFFFFF" />
                {/* Posicionadores dos cantos */}
                <rect x="5" y="5" width="26" height="26" fill="#000000" rx="1" />
                <rect x="8" y="8" width="20" height="20" fill="#FFFFFF" rx="1" />
                <rect x="12" y="12" width="12" height="12" fill="#009639" rx="1" />

                <rect x="69" y="5" width="26" height="26" fill="#000000" rx="1" />
                <rect x="72" y="8" width="20" height="20" fill="#FFFFFF" rx="1" />
                <rect x="76" y="12" width="12" height="12" fill="#009639" rx="1" />

                <rect x="5" y="69" width="26" height="26" fill="#000000" rx="1" />
                <rect x="8" y="72" width="20" height="20" fill="#FFFFFF" rx="1" />
                <rect x="12" y="76" width="12" height="12" fill="#009639" rx="1" />

                {/* Padrão interno de dados */}
                <rect x="36" y="10" width="8" height="8" fill="#000000" />
                <rect x="48" y="16" width="8" height="8" fill="#000000" />
                <rect x="36" y="28" width="8" height="8" fill="#000000" />
                <rect x="10" y="38" width="8" height="8" fill="#000000" />
                <rect x="22" y="44" width="8" height="8" fill="#000000" />
                <rect x="36" y="42" width="14" height="14" fill="#009639" />
                <rect x="56" y="38" width="8" height="8" fill="#000000" />
                <rect x="68" y="44" width="8" height="8" fill="#000000" />
                <rect x="82" y="38" width="8" height="8" fill="#000000" />
                <rect x="42" y="64" width="8" height="8" fill="#000000" />
                <rect x="56" y="60" width="8" height="8" fill="#000000" />
                <rect x="70" y="68" width="8" height="8" fill="#000000" />
                <rect x="48" y="78" width="8" height="8" fill="#000000" />
                <rect x="62" y="82" width="8" height="8" fill="#000000" />
                <rect x="78" y="78" width="8" height="8" fill="#000000" />
              </svg>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                textDecoration: 'underline',
              }}
            >
              Ou clique aqui para abrir diretamente no navegador
            </a>
          </div>
        </div>
      )}
    </>
  );
};
