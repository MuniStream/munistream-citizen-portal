import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

/**
 * Selector de entidades: una pantalla por tipo requerido.
 *
 * Es la primera pantalla que toca el ciudadano en casi todos los trámites. Antes
 * apilaba todos los tipos requeridos en la misma vista —hay trámites que piden
 * tres a la vez— y el backend mandaba la cartera entera dentro del formulario,
 * con un techo de 100 entidades y sin forma de buscar. La entidad 101 era
 * inalcanzable y el trámite imposible de completar.
 *
 * Ahora las candidatas se piden paginadas a
 * `/public/instances/{id}/picker/{store_as}` y cada tipo tiene su pantalla, con
 * su búsqueda y su contador.
 */

export interface RequisitoDescriptor {
  name: string;
  type: 'entity_select' | 'entity_multi_select';
  label: string;
  entity_type: string | string[];
  display_fields: string[];
  min_count: number;
  max_count: number;
  required: boolean;
  selection_mode?: 'individual' | 'masiva';
  total?: number;
  info?: { instructions?: string; workflow_id?: string; display_name?: string };
}

interface Candidata {
  entity_id: string;
  entity_type: string;
  name: string;
  status: string;
  campos: Array<{ campo: string; valor: any }>;
  vigencia: { hasta: string; vencida: boolean; origen: 'guardada' | 'derivada' } | null;
}

interface Props {
  instanceId: string;
  requisitos: RequisitoDescriptor[];
  seleccionPrevia?: Record<string, string[]>;
  erroresDelServidor?: string[];
  isSubmitting?: boolean;
  onSubmit: (selecciones: Record<string, string[]>) => void | Promise<void>;
}

const TAM_PAGINA = 25;

function etiquetaDeCampo(clave: string): string {
  const ultima = clave.split('.').pop() || clave;
  const texto = ultima.replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function valorLegible(valor: any): string {
  if (valor === null || valor === undefined) return '';
  if (Array.isArray(valor)) return valor.map(valorLegible).filter(Boolean).join(', ');
  if (typeof valor === 'object') {
    return valor.nombre_comun || valor.especie || valor.nombre || JSON.stringify(valor);
  }
  return String(valor);
}

function Vigencia({ vigencia }: { vigencia: Candidata['vigencia'] }) {
  if (!vigencia) return null;
  const fecha = new Date(vigencia.hasta).toLocaleDateString('es-MX');
  return (
    <span className={`picker-vigencia ${vigencia.vencida ? 'vencida' : ''}`}>
      {vigencia.vencida ? `Venció el ${fecha}` : `Vigente hasta ${fecha}`}
    </span>
  );
}

export const EntityPickerWizard: React.FC<Props> = ({
  instanceId,
  requisitos,
  seleccionPrevia,
  erroresDelServidor,
  isSubmitting,
  onSubmit,
}) => {
  const [pantalla, setPantalla] = useState(0);
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);
  const [candidatas, setCandidatas] = useState<Candidata[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La selección vive fuera de la página visible: con paginación y búsqueda, si
  // viviera en la lista se perdería al cambiar de filtro.
  const [seleccion, setSeleccion] = useState<Record<string, string[]>>(
    () => seleccionPrevia || {}
  );

  const requisito = requisitos[pantalla];
  const elegidas = seleccion[requisito?.name] || [];

  useEffect(() => {
    const id = setTimeout(() => {
      setBusqueda(texto);
      setPagina(0);
    }, 350);
    return () => clearTimeout(id);
  }, [texto]);

  // Al cambiar de pantalla, la búsqueda es de ese tipo, no de la anterior.
  useEffect(() => {
    setTexto('');
    setBusqueda('');
    setPagina(0);
  }, [pantalla]);

  useEffect(() => {
    if (!requisito) return;
    let cancelado = false;
    setCargando(true);
    setError(null);
    api
      .get(`/public/instances/${instanceId}/picker/${requisito.name}`, {
        params: {
          page: pagina + 1,
          page_size: TAM_PAGINA,
          ...(busqueda ? { q: busqueda } : {}),
        },
      })
      .then(({ data }) => {
        if (cancelado) return;
        setCandidatas(data.candidatas || []);
        setTotal(data.total || 0);
      })
      .catch(() => {
        if (!cancelado) setError('No pudimos cargar tus documentos. Vuelve a intentarlo.');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [instanceId, requisito?.name, busqueda, pagina]);

  const alternar = useCallback(
    (entityId: string) => {
      if (!requisito) return;
      setSeleccion((previa) => {
        const actuales = previa[requisito.name] || [];
        const yaEsta = actuales.includes(entityId);
        if (requisito.max_count <= 1) {
          return { ...previa, [requisito.name]: yaEsta ? [] : [entityId] };
        }
        if (!yaEsta && actuales.length >= requisito.max_count) return previa;
        return {
          ...previa,
          [requisito.name]: yaEsta
            ? actuales.filter((id) => id !== entityId)
            : [...actuales, entityId],
        };
      });
    },
    [requisito]
  );

  const seleccionarTodoLoFiltrado = useCallback(() => {
    if (!requisito) return;
    setSeleccion((previa) => {
      const actuales = previa[requisito.name] || [];
      const nuevas = candidatas.map((c) => c.entity_id).filter((id) => !actuales.includes(id));
      const cabe = Math.max(0, requisito.max_count - actuales.length);
      return { ...previa, [requisito.name]: [...actuales, ...nuevas.slice(0, cabe)] };
    });
  }, [requisito, candidatas]);

  const faltanEnEstaPantalla = useMemo(() => {
    if (!requisito) return 0;
    return Math.max(0, requisito.min_count - elegidas.length);
  }, [requisito, elegidas]);

  if (!requisito) return null;

  const ultima = pantalla === requisitos.length - 1;
  const paginas = Math.ceil(total / TAM_PAGINA) || 1;
  const topeAlcanzado = requisito.max_count > 1 && elegidas.length >= requisito.max_count;

  return (
    <div className="entity-picker-wizard">
      {requisitos.length > 1 && (
        <p className="picker-progreso">
          Paso {pantalla + 1} de {requisitos.length}
        </p>
      )}

      <h4 className="picker-titulo">{requisito.label}</h4>
      {requisito.info?.instructions && (
        <p className="picker-instrucciones">{requisito.info.instructions}</p>
      )}

      {erroresDelServidor && erroresDelServidor.length > 0 && (
        <div className="picker-errores" role="alert">
          {erroresDelServidor.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      <div className="picker-barra">
        <input
          type="search"
          className="picker-busqueda"
          placeholder="Buscar por nombre, matrícula, folio…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label={`Buscar en ${requisito.label}`}
        />
        <span className="picker-contador" aria-live="polite">
          {elegidas.length}
          {requisito.max_count > 1 ? ` de ${requisito.max_count}` : ''} seleccionad
          {elegidas.length === 1 ? 'a' : 'as'}
          {faltanEnEstaPantalla > 0 && ` · faltan ${faltanEnEstaPantalla}`}
        </span>
      </div>

      {requisito.selection_mode === 'masiva' && candidatas.length > 0 && (
        <button type="button" className="picker-seleccionar-todo" onClick={seleccionarTodoLoFiltrado}>
          Seleccionar los {candidatas.length} de esta página
        </button>
      )}

      {cargando && <p className="picker-cargando">Buscando…</p>}
      {error && <p className="picker-error" role="alert">{error}</p>}

      {!cargando && !error && candidatas.length === 0 && (
        <div className="picker-vacio">
          {busqueda ? (
            <p>Ninguno de tus documentos coincide con «{busqueda}».</p>
          ) : (
            <>
              <p>Todavía no tienes {requisito.label.toLowerCase()}.</p>
              {requisito.info?.workflow_id && (
                <a className="picker-obtener" href={`/services/${requisito.info.workflow_id}`}>
                  Obtener {requisito.info.display_name || requisito.label} →
                </a>
              )}
            </>
          )}
        </div>
      )}

      <div className="picker-lista">
        {candidatas.map((c) => {
          const marcada = elegidas.includes(c.entity_id);
          const bloqueada = !marcada && topeAlcanzado;
          return (
            <div
              key={c.entity_id}
              className={`entity-card ${marcada ? 'selected' : ''} ${bloqueada ? 'bloqueada' : ''}`}
              role="checkbox"
              aria-checked={marcada}
              aria-disabled={bloqueada}
              tabIndex={bloqueada ? -1 : 0}
              onClick={() => !bloqueada && alternar(c.entity_id)}
              onKeyDown={(e) => {
                if (bloqueada) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  alternar(c.entity_id);
                }
              }}
            >
              <div className="entity-card-encabezado">
                <strong>{c.name}</strong>
                <Vigencia vigencia={c.vigencia} />
              </div>
              {c.campos.map((campo) => (
                <div key={campo.campo} className="entity-card-campo">
                  <span className="entity-card-etiqueta">{etiquetaDeCampo(campo.campo)}:</span>{' '}
                  {valorLegible(campo.valor)}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {paginas > 1 && (
        <div className="picker-paginacion">
          <button type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
            ← Anteriores
          </button>
          <span>
            Página {pagina + 1} de {paginas} · {total} en total
          </span>
          <button
            type="button"
            disabled={pagina + 1 >= paginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguientes →
          </button>
        </div>
      )}

      <div className="picker-navegacion">
        {pantalla > 0 && (
          <button type="button" className="btn-secondary" onClick={() => setPantalla((p) => p - 1)}>
            ← Atrás
          </button>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={isSubmitting || faltanEnEstaPantalla > 0}
          onClick={() => {
            if (!ultima) {
              setPantalla((p) => p + 1);
              return;
            }
            onSubmit(seleccion);
          }}
        >
          {ultima ? 'Continuar' : 'Siguiente →'}
        </button>
      </div>
    </div>
  );
};

export default EntityPickerWizard;
