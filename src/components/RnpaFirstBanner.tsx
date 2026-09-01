import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}`;
const RNPA_ENTITY = 'pescador_rnpa';
const RNPA_WORKFLOW = 'registro_rnpa_pescadores';

/**
 * Aviso "RNPA como primer paso": si el ciudadano autenticado aún no tiene su
 * inscripción al Registro Nacional de Pesca y Acuacultura (entidad
 * `pescador_rnpa`), muestra un aviso prominente invitándolo a registrarse antes
 * de iniciar trámites. No oculta el catálogo (hay trámites que no requieren RNPA,
 * como la pesca deportiva), pero pone el registro RNPA al frente.
 */
export const RnpaFirstBanner: React.FC = () => {
  const [needsRnpa, setNeedsRnpa] = useState(false);

  useEffect(() => {
    const token = authService.getToken();
    if (!token) return; // solo para usuarios autenticados
    fetch(`${API_BASE_URL}/public/entities?entity_type=${RNPA_ENTITY}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { entities: [] }))
      .then((d) => setNeedsRnpa(!(d.entities && d.entities.length > 0)))
      .catch(() => { /* silencioso: el aviso es una ayuda, no bloquea */ });
  }, []);

  if (!needsRnpa) return null;

  return (
    <div
      role="status"
      style={{
        maxWidth: 1100,
        margin: '1rem auto',
        padding: '1rem 1.25rem',
        background: '#fff7e6',
        border: '1px solid #e0a800',
        borderLeft: '6px solid #e0a800',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ color: '#5c4400' }}>
        <strong>Primero regístrate en el RNPA.</strong> Para realizar la mayoría de los
        trámites de pesca y acuacultura necesitas tu inscripción en el Registro Nacional de
        Pesca y Acuacultura. Complétala antes de continuar.
      </div>
      <Link
        to={`/services/${RNPA_WORKFLOW}`}
        style={{
          whiteSpace: 'nowrap',
          padding: '0.6rem 1.25rem',
          background: '#9d2449',
          color: '#fff',
          borderRadius: 4,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Registrarme en el RNPA
      </Link>
    </div>
  );
};

export default RnpaFirstBanner;
