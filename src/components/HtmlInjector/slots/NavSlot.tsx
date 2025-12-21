import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';

interface NavLinkProps {
  label: string;
  path: string;
  current: string;
  navigate: (path: string) => void;
}

const NavLink: React.FC<NavLinkProps> = ({ label, path, current, navigate }) => {
  const isActive = current === path || current.startsWith(path + '/');
  return (
    <a
      href={path}
      onClick={(e) => { e.preventDefault(); navigate(path); }}
      style={{
        color: isActive ? '#fff' : 'rgba(255,255,255,0.8)',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: isActive ? 700 : 400,
        fontFamily: 'sans-serif',
        padding: '4px 0',
        borderBottom: isActive ? '2px solid #fff' : '2px solid transparent',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {label}
    </a>
  );
};

export const NavSlot: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const current = location.pathname;

  return (
    <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
      <NavLink label={t('navigation.home')} path="/services" current={current} navigate={navigate} />
      {isAuthenticated && (
        <>
          <NavLink label={t('navigation.myEntities')} path="/my-entities" current={current} navigate={navigate} />
          <NavLink label={t('navigation.myInstances')} path="/instances" current={current} navigate={navigate} />
        </>
      )}
    </nav>
  );
};
