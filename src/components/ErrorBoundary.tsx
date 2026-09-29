import React from 'react';

/**
 * Red de seguridad del portal: una excepción en render no puede dejar la pantalla
 * en blanco.
 *
 * El portal no tenía ninguna. En React, una excepción durante el render que nadie
 * captura **desmonta el árbol completo**: el ciudadano no ve una sección rota, ve
 * una página vacía, sin mensaje y sin forma de seguir. Ya había pasado al menos
 * una vez —consta un arreglo de "el visor de entidad deja de quedarse en blanco"—
 * y volvió a pasar con el detalle del trámite.
 *
 * Arreglar cada causa una por una es necesario, pero no basta: la siguiente
 * excepción vuelve a tumbar todo. Esto acota el daño a la parte que falló.
 *
 * Se declara como clase porque los hooks no pueden capturar errores de render;
 * `componentDidCatch` sigue siendo el único mecanismo.
 */

interface Props {
  children: React.ReactNode;
  /** Qué mostrar en lugar de lo que falló. Por defecto, un aviso discreto. */
  fallback?: React.ReactNode;
  /** Para distinguir en la consola qué parte del portal reventó. */
  nombre?: string;
}

interface State {
  fallo: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { fallo: false };

  static getDerivedStateFromError(): State {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // No hay recolector de errores en el portal; la consola es lo que hay, y es
    // lo que permite reconstruir el fallo desde el navegador del ciudadano.
    console.error(`[ErrorBoundary${this.props.nombre ? ` ${this.props.nombre}` : ''}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;

    return (
      <div
        role="alert"
        style={{
          padding: '1.5rem',
          margin: '1rem 0',
          border: '1px solid #e0e0e0',
          borderLeft: '4px solid #b3261e',
          borderRadius: 8,
          background: '#fdf5f5',
          color: '#3c3c3b',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>No pudimos mostrar esta sección.</p>
        <p style={{ margin: '0.5rem 0 0' }}>
          El resto de la página sigue disponible. Si el problema continúa, vuelve a cargar la
          página o inténtalo más tarde.
        </p>
      </div>
    );
  }
}

export default ErrorBoundary;
