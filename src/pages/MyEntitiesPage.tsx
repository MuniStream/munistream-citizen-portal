import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { MainLayout } from '../components/Layout/MainLayout';
import { authService } from '../services/authService';
import { humanizeKey } from '../utils/humanize';
import { entityAddressSubtitle } from '../utils/address';
import './MyEntitiesPage.css';

interface Entity {
  entity_id: string;
  entity_type: string;
  name: string;
  status: string;
  verified: boolean;
  data: Record<string, any>;
  created_at: string | null;
  updated_at: string | null;
  valid_until?: string | null;
  relationships_count: number;
}

interface EntityType {
  type_id: string;
  name: string;
}

interface TypeCount {
  entity_type: string;
  count: number;
}

const API_BASE_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}`;

// Documents fetched per request. The backend caps a page at 100.
const PAGE_SIZE = 30;
// A document whose validity ends within this many days is flagged as expiring.
const EXPIRING_DAYS = 30;
const SEARCH_DEBOUNCE_MS = 300;

// Official identifiers worth showing under the name, in order of preference.
// Same fields the backend search looks into.
const ID_FIELDS = ['matricula', 'folio', 'numero_permiso', 'numero_titulo', 'rnpa', 'rfc', 'curp'];

type Validity = { kind: 'valid' | 'expiring' | 'expired'; date: Date } | null;

function validityOf(entity: Entity, now: number): Validity {
  if (!entity.valid_until) return null;
  const date = new Date(entity.valid_until);
  if (Number.isNaN(date.getTime())) return null;
  const days = (date.getTime() - now) / 86_400_000;
  if (days < 0) return { kind: 'expired', date };
  if (days <= EXPIRING_DAYS) return { kind: 'expiring', date };
  return { kind: 'valid', date };
}

// Names written by some workflows are raw keys ("mia_particular").
function displayName(name: string): string {
  return /^[a-z0-9]+(_[a-z0-9]+)+$/.test(name) ? humanizeKey(name) : name;
}

/**
 * Height of whatever the layout pins to the top of the viewport (the tenant
 * header is sticky and its height differs per tenant and breakpoint), so the
 * wallet's own sticky parts sit right under it.
 */
function useStickyTop(ref: React.RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const measure = () => {
      let bottom = 0;
      document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
        if (ref.current?.contains(el)) return;
        const st = getComputedStyle(el);
        // Full-screen fixed layers (backdrops, drawers) are not a header.
        if ((st.position === 'sticky' || st.position === 'fixed') && st.top === '0px'
          && el.offsetHeight > 0 && el.offsetHeight < window.innerHeight * 0.5) {
          const r = el.getBoundingClientRect();
          if (r.top <= 0.5 && r.width >= window.innerWidth * 0.5) bottom = Math.max(bottom, r.bottom);
        }
      });
      ref.current?.style.setProperty('--wallet-top', `${Math.round(bottom)}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    const t = window.setTimeout(measure, 500);
    return () => {
      window.removeEventListener('resize', measure);
      window.clearTimeout(t);
    };
  }, [ref]);
}

export const MyEntitiesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, login } = useAuth();
  const [params, setParams] = useSearchParams();
  const selectedType = params.get('tipo') || '';
  const query = params.get('q') || '';

  const [searchInput, setSearchInput] = useState(query);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [total, setTotal] = useState(0);
  const [typeCounts, setTypeCounts] = useState<TypeCount[]>([]);
  const [typeNames, setTypeNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entityToDelete, setEntityToDelete] = useState<Entity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const listTopRef = useRef<HTMLDivElement>(null);
  // Only the latest request may write to state: a slow page from a previous
  // filter must not land on top of the new results.
  const requestId = useRef(0);
  useStickyTop(pageRef);

  const now = useMemo(() => Date.now(), [entities]);
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language || 'es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
    [i18n.language],
  );

  const typeLabel = useCallback(
    (type: string) => typeNames[type] || humanizeKey(type),
    [typeNames],
  );

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const fetchPage = useCallback(async (skip: number) => {
    const token = authService.getToken();
    if (!token) {
      login();
      return null;
    }
    const qs = new URLSearchParams({ skip: String(skip), limit: String(PAGE_SIZE) });
    if (selectedType) qs.set('entity_type', selectedType);
    if (query) qs.set('q', query);
    const response = await fetch(`${API_BASE_URL}/public/entities?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      authService.logout();
      return null;
    }
    if (!response.ok) throw new Error(t('my_entities.load_error'));
    return response.json();
  }, [selectedType, query, login, t]);

  const loadFirstPage = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPage(0);
      if (!data || id !== requestId.current) return;
      setEntities(data.entities || []);
      setTotal(data.total || 0);
      setTypeCounts(data.type_counts || []);
    } catch (err) {
      if (id === requestId.current) setError(err instanceof Error ? err.message : t('my_entities.load_error'));
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [fetchPage, t]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || entities.length >= total) return;
    const id = requestId.current;
    setIsLoadingMore(true);
    try {
      const data = await fetchPage(entities.length);
      if (!data || id !== requestId.current) return;
      setEntities((prev) => {
        const seen = new Set(prev.map((e) => e.entity_id));
        return [...prev, ...(data.entities || []).filter((e: Entity) => !seen.has(e.entity_id))];
      });
      setTotal(data.total || 0);
    } catch (err) {
      if (id === requestId.current) setError(err instanceof Error ? err.message : t('my_entities.load_error'));
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, entities.length, total, fetchPage, t]);

  useEffect(() => {
    if (isAuthenticated) loadFirstPage();
  }, [isAuthenticated, loadFirstPage]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/public/entity-types`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const names: Record<string, string> = {};
        (data.entity_types || []).forEach((et: EntityType) => { names[et.type_id] = et.name; });
        setTypeNames(names);
      })
      .catch(() => {});
  }, []);

  // Search as the citizen types, without a request per keystroke.
  useEffect(() => {
    if (searchInput.trim() === query) return;
    const handle = window.setTimeout(() => setParam('q', searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Load the next page when the end of the list scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) loadMore(); },
      { rootMargin: '400px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // Keep the selected type visible in the index (it scrolls sideways on mobile).
  useEffect(() => {
    pageRef.current
      ?.querySelector('.wallet-index-item[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedType, typeCounts]);

  const chooseType = (type: string) => {
    setParam('tipo', type);
    const top = listTopRef.current;
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
  };

  const handleDelete = async () => {
    if (!entityToDelete) return;
    setIsDeleting(true);
    try {
      const token = await authService.getToken();
      if (!token) {
        await login();
        return;
      }
      const response = await fetch(`${API_BASE_URL}/public/entities/${entityToDelete.entity_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || t('my_entities.delete_error'));
      }
      const gone = entityToDelete;
      setEntities((prev) => prev.filter((e) => e.entity_id !== gone.entity_id));
      setTotal((n) => Math.max(0, n - 1));
      setTypeCounts((prev) => prev
        .map((c) => (c.entity_type === gone.entity_type ? { ...c, count: c.count - 1 } : c))
        .filter((c) => c.count > 0));
      setEntityToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('my_entities.delete_error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const groups = useMemo(() => {
    const out: { type: string; items: Entity[] }[] = [];
    for (const e of entities) {
      const last = out[out.length - 1];
      if (last && last.type === e.entity_type) last.items.push(e);
      else out.push({ type: e.entity_type, items: [e] });
    }
    return out;
  }, [entities]);

  const countOf = (type: string) => typeCounts.find((c) => c.entity_type === type)?.count ?? 0;
  const allCount = typeCounts.reduce((a, c) => a + c.count, 0);
  // A type picked from a link or a previous search may have no matches now;
  // keep it in the index so the citizen can see it is selected and leave it.
  const indexTypes = selectedType && !typeCounts.some((c) => c.entity_type === selectedType)
    ? [...typeCounts, { entity_type: selectedType, count: 0 }]
    : typeCounts;

  const subtitle = (e: Entity) => {
    const address = entityAddressSubtitle(e.data);
    if (address) return address;
    for (const field of ID_FIELDS) {
      const v = e.data?.[field];
      if (typeof v === 'string' || typeof v === 'number') {
        return `${t(`my_entities.id_labels.${field}`)} ${v}`;
      }
    }
    return '';
  };

  const validityText = (v: Validity, e: Entity) => {
    if (!v) {
      return e.created_at ? t('my_entities.registered_on', { date: dateFmt.format(new Date(e.created_at)) }) : '';
    }
    const date = dateFmt.format(v.date);
    if (v.kind === 'expired') return t('my_entities.expired_on', { date });
    if (v.kind === 'expiring') return t('my_entities.expires_on', { date });
    return t('my_entities.valid_until', { date });
  };

  if (!isAuthenticated) return null;

  const hasAny = allCount > 0 || !!query || !!selectedType;
  const remaining = total - entities.length;

  return (
    <MainLayout>
      <div className="wallet" ref={pageRef}>
        <header className="wallet-head">
          <div>
            <h1 className="wallet-title">{t('my_entities.title')}</h1>
            <p className="wallet-lead">{t('my_entities.description')}</p>
          </div>
          {hasAny && (
            <div className="wallet-search" role="search">
              <label htmlFor="wallet-search-input" className="visually-hidden">{t('my_entities.search_label')}</label>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="wallet-search-icon">
                <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                id="wallet-search-input"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('my_entities.search_placeholder')}
                autoComplete="off"
              />
            </div>
          )}
        </header>

        {error && (
          <div className="wallet-error" role="alert">
            <p>{error}</p>
            <button type="button" className="wallet-btn" onClick={loadFirstPage}>{t('common.retry')}</button>
          </div>
        )}

        {!isLoading && !hasAny && !error && (
          <div className="wallet-empty">
            <h2>{t('my_entities.no_entities')}</h2>
            <p>{t('my_entities.no_entities_desc')}</p>
            <Link to="/services" className="wallet-btn wallet-btn-primary">{t('my_entities.start_workflow')}</Link>
          </div>
        )}

        {hasAny && (
          <div className="wallet-body">
            <nav className="wallet-index" aria-label={t('my_entities.index_label')}>
              <ul>
                <li>
                  <button
                    type="button"
                    className="wallet-index-item"
                    aria-current={!selectedType ? 'true' : undefined}
                    onClick={() => chooseType('')}
                  >
                    <span className="wallet-index-name">{t('my_entities.all_types')}</span>
                    <span className="wallet-index-count">{allCount}</span>
                  </button>
                </li>
                {indexTypes.map((c) => (
                  <li key={c.entity_type}>
                    <button
                      type="button"
                      className="wallet-index-item"
                      aria-current={selectedType === c.entity_type ? 'true' : undefined}
                      onClick={() => chooseType(c.entity_type)}
                    >
                      <span className="wallet-index-name">{typeLabel(c.entity_type)}</span>
                      <span className="wallet-index-count">{c.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="wallet-list" ref={listTopRef} aria-busy={isLoading}>
              <p className="wallet-status" aria-live="polite">
                {isLoading
                  ? t('common.loading')
                  : total === 0
                    ? (query
                      ? t('my_entities.no_results', { query })
                      : t('my_entities.no_results_type'))
                    : t('my_entities.showing', { shown: entities.length, total })}
              </p>

              {!isLoading && total === 0 && (query || selectedType) && (
                <div className="wallet-noresults">
                  {query && (
                    <button type="button" className="wallet-btn" onClick={() => { setSearchInput(''); setParam('q', ''); }}>
                      {t('my_entities.clear_search')}
                    </button>
                  )}
                  {selectedType && (
                    <button type="button" className="wallet-btn" onClick={() => chooseType('')}>
                      {t('my_entities.show_all')}
                    </button>
                  )}
                </div>
              )}

              {!isLoading && groups.map((g) => (
                <section key={g.type} className="wallet-group" aria-labelledby={`grp-${g.type}`}>
                  <h2 className="wallet-group-head" id={`grp-${g.type}`}>
                    <span>{typeLabel(g.type)}</span>
                    <span className="wallet-group-count">{countOf(g.type) || g.items.length}</span>
                  </h2>
                  <ul className="wallet-rows">
                    {g.items.map((e) => {
                      const v = validityOf(e, now);
                      const sub = subtitle(e);
                      return (
                        <li key={e.entity_id} className="wallet-row">
                          <Link to={`/entity/${e.entity_id}`} className="wallet-row-link">
                            <span className="wallet-row-main">
                              <span className="wallet-row-name">{displayName(e.name)}</span>
                              {sub && <span className="wallet-row-sub">{sub}</span>}
                            </span>
                            <span className={`wallet-row-validity${v ? ` is-${v.kind}` : ''}`}>
                              {validityText(v, e)}
                            </span>
                          </Link>
                          <button
                            type="button"
                            className="wallet-row-delete"
                            onClick={() => setEntityToDelete(e)}
                            aria-label={t('my_entities.delete_named', { name: displayName(e.name) })}
                            title={t('common.delete')}
                          >
                            <svg aria-hidden="true" viewBox="0 0 20 20">
                              <path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

              <div ref={sentinelRef} />
              {!isLoading && remaining > 0 && (
                <button type="button" className="wallet-btn wallet-more" onClick={loadMore} disabled={isLoadingMore}>
                  {isLoadingMore
                    ? t('common.loading')
                    : t('my_entities.load_more', { count: Math.min(PAGE_SIZE, remaining) })}
                </button>
              )}
            </div>
          </div>
        )}

        {entityToDelete && (
          <div className="modal-overlay" onClick={() => !isDeleting && setEntityToDelete(null)}>
            <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="wallet-delete-title" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 id="wallet-delete-title">{t('my_entities.delete_title')}</h3>
              </div>
              <div className="modal-body">
                <p className="modal-subtitle">{t('entities.deleteConfirmMessage')}</p>
                <div className="entity-to-delete">
                  <strong>{displayName(entityToDelete.name)}</strong>
                  <br />
                  <small>{typeLabel(entityToDelete.entity_type)}</small>
                </div>
                <p className="warning-text">{t('entities.deleteWarning')}</p>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEntityToDelete(null)} className="btn-secondary" disabled={isDeleting}>
                  {t('common.cancel')}
                </button>
                <button type="button" onClick={handleDelete} className="btn-danger" disabled={isDeleting}>
                  {isDeleting ? t('common.deleting') : t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
