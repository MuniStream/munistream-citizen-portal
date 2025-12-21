import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  padding: '10px 14px',
  cursor: 'pointer',
  fontSize: '14px',
  fontFamily: 'sans-serif',
  color: '#333',
};

export const SessionSlot: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading) return null;

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={() => login()}
        style={{
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: '6px',
          padding: '6px 16px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: 'sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {t('navigation.login')}
      </button>
    );
  }

  const initials = user.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] || ''}`.toUpperCase()
    : (user.email?.[0] || 'U').toUpperCase();

  return (
    <div style={{ position: 'relative', fontFamily: 'sans-serif' }}>
      <button
        onClick={() => setMenuOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: '6px',
          padding: '5px 12px 5px 5px',
          cursor: 'pointer',
          fontSize: '14px',
          fontFamily: 'sans-serif',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            fontWeight: 700,
            fontSize: '12px',
          }}
        >
          {initials}
        </span>
        <span style={{ fontWeight: 500 }}>
          {user.firstName || user.name || user.email}
        </span>
      </button>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: '#fff',
            color: '#333',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            minWidth: '180px',
            zIndex: 1000,
            overflow: 'hidden',
          }}
          onMouseLeave={() => setMenuOpen(false)}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid #eee',
              fontSize: '12px',
              color: '#666',
            }}
          >
            {user.email}
          </div>
          <button
            onClick={() => { setMenuOpen(false); navigate('/profile'); }}
            style={menuItemStyle}
          >
            {t('navigation.myProfile')}
          </button>
          <button
            onClick={() => { setMenuOpen(false); logout(); }}
            style={{ ...menuItemStyle, color: '#d32f2f' }}
          >
            {t('auth.logout')}
          </button>
        </div>
      )}
    </div>
  );
};
