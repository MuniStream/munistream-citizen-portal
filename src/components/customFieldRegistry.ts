import type React from 'react';

/**
 * Registro genérico de renderers para tipos de campo propios de un tenant.
 *
 * El portal base no conoce campos específicos de un tenant (p. ej. una revisión
 * de facturas CFDI de CONAPESCA). En vez de acoplar ese código al shared, un
 * tenant registra aquí un renderer para su `type`; `DataCollectionForm` lo
 * consulta al pintar un campo cuyo tipo no maneja de forma nativa.
 *
 * El registro se dispara solo: los componentes override del tenant se importan
 * al arranque (glob eager en `src/overrides/index.ts`), así que basta con que el
 * `.tsx` del tenant llame `registerCustomFieldRenderer(...)` a nivel de módulo.
 */
export interface CustomFieldRenderArgs {
  field: any;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

export type CustomFieldRenderer = (args: CustomFieldRenderArgs) => React.ReactNode;

const registry: Record<string, CustomFieldRenderer> = {};

export function registerCustomFieldRenderer(type: string, renderer: CustomFieldRenderer): void {
  registry[type] = renderer;
}

export function getCustomFieldRenderer(type: string): CustomFieldRenderer | undefined {
  return registry[type];
}
