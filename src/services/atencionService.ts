import api from './api';

/** Legal term of a request as the applicant sees it (no internal metrics). */
export interface PlazoCiudadano {
  en_captura: boolean;
  sin_plazo?: boolean;
  fecha_presentacion?: string;
  fecha_compromiso?: string;
  plazo_dias?: number;
  plazo_habiles?: boolean;
  dias_transcurridos?: number;
  pausado?: boolean;
  resuelto?: boolean;
  en_plazo?: boolean | null;
  estado?: 'en_tiempo' | 'por_vencer' | 'vencido' | null;
}

export interface IndicadorTramite {
  workflow_id: string;
  nombre: string;
  plazo_dias: number;
  plazo_habiles: boolean;
  recibidos: number | null;
  en_revision: number | null;
  resueltos: number | null;
  aprobados: number | null;
  rechazados: number | null;
  porcentaje_en_plazo: number | null;
  dias_promedio_resolucion: number | null;
  satisfaccion: number | null;
  suprimido: boolean;
}

export interface Indicadores {
  periodo: { desde: string; hasta: string; meses: number };
  minimo_publicable: number;
  resumen: {
    recibidos: number;
    resueltos: number;
    en_revision: number;
    porcentaje_en_plazo: number | null;
    dias_promedio_resolucion: number | null;
    satisfaccion: number | null;
    opiniones: number;
    tipos_de_tramite: number;
  };
  por_mes: { mes: string; recibidos: number; resueltos: number }[];
  por_tramite: IndicadorTramite[];
  generado: string;
}

export interface Feedback {
  instance_id: string;
  calificacion: number;
  comentario?: string | null;
  created_at: string;
}

export type CategoriaAtencion = 'duda_tramite' | 'problema_tecnico' | 'queja' | 'sugerencia' | 'otro';
export type EstadoAtencion = 'abierta' | 'respondida' | 'cerrada';

export interface MensajeAtencion {
  autor: 'ciudadano' | 'personal';
  autor_nombre?: string | null;
  texto: string;
  fecha: string;
}

export interface SolicitudAtencion {
  solicitud_id: string;
  folio: string;
  asunto: string;
  categoria: CategoriaAtencion;
  estado: EstadoAtencion;
  instance_id?: string | null;
  workflow_id?: string | null;
  mensajes: MensajeAtencion[];
  created_at: string;
  updated_at: string;
}

export const atencionService = {
  async indicadores(meses = 12): Promise<Indicadores> {
    return (await api.get('/public/indicadores', { params: { meses } })).data;
  },

  async getFeedback(instanceId: string): Promise<Feedback | null> {
    return (await api.get(`/public/instances/${instanceId}/feedback`)).data.feedback;
  },

  async enviarFeedback(instanceId: string, calificacion: number, comentario?: string): Promise<Feedback> {
    return (await api.post(`/public/instances/${instanceId}/feedback`, { calificacion, comentario })).data.feedback;
  },

  async misSolicitudes(): Promise<SolicitudAtencion[]> {
    return (await api.get('/public/atencion')).data.solicitudes;
  },

  async solicitud(id: string): Promise<SolicitudAtencion> {
    return (await api.get(`/public/atencion/${id}`)).data;
  },

  async crearSolicitud(body: {
    asunto: string;
    categoria: CategoriaAtencion;
    mensaje: string;
    instance_id?: string;
  }): Promise<SolicitudAtencion> {
    return (await api.post('/public/atencion', body)).data;
  },

  async responder(id: string, texto: string): Promise<SolicitudAtencion> {
    return (await api.post(`/public/atencion/${id}/mensajes`, { texto })).data;
  },

  async cerrar(id: string): Promise<SolicitudAtencion> {
    return (await api.post(`/public/atencion/${id}/cerrar`)).data;
  },
};

export default atencionService;
