import { useState } from "react";

type EstadoUsuario = "pendiente" | "activo" | "bloqueado" | "desactivado";
type AccionPendiente = "activar" | "bloquear" | "desactivar" | "cerrar-sesiones" | null;

interface RespuestaSeguridad {
  ok: boolean;
  data?: {
    seguridad?: {
      estado: EstadoUsuario;
      sesionesCerradas: number;
    };
  };
  error?: string;
}

interface Propiedades {
  usuarioId: string;
  estadoInicial: EstadoUsuario;
  sesionesActivasIniciales: number;
  tienePassword: boolean;
  emailVerificadoAt: string | null;
  passwordChangedAt: string | null;
  ultimoAccesoAt: string | null;
  alActualizarEstado?: (estado: EstadoUsuario, sesionesCerradas: number) => void;
}

interface ConfiguracionAccion {
  titulo: string;
  descripcion: string;
  textoBoton: string;
  clasesBoton: string;
}

const configuracionesAccion: Record<Exclude<AccionPendiente, null>, ConfiguracionAccion> = {
  activar: {
    titulo: "Activar la cuenta",
    descripcion: "El usuario recuperará el acceso al panel, siempre que tenga una contraseña configurada y los permisos necesarios.",
    textoBoton: "Activar cuenta",
    clasesBoton: "bg-success text-on-success hover:opacity-90",
  },
  bloquear: {
    titulo: "Bloquear la cuenta",
    descripcion: "El usuario no podrá iniciar sesión y todas sus sesiones abiertas se cerrarán inmediatamente.",
    textoBoton: "Bloquear cuenta",
    clasesBoton: "bg-error text-on-error hover:opacity-90",
  },
  desactivar: {
    titulo: "Desactivar la cuenta",
    descripcion: "El usuario perderá el acceso al panel y todas sus sesiones abiertas se cerrarán. La cuenta podrá volver a activarse posteriormente.",
    textoBoton: "Desactivar cuenta",
    clasesBoton: "bg-error text-on-error hover:opacity-90",
  },
  "cerrar-sesiones": {
    titulo: "Cerrar todas las sesiones",
    descripcion: "Se cerrarán todas las sesiones abiertas de este usuario. Tendrá que volver a iniciar sesión en sus dispositivos.",
    textoBoton: "Cerrar sesiones",
    clasesBoton: "bg-secondary text-on-secondary hover:opacity-90",
  },
};

function formatearFecha(fecha: string | null): string {
  if (!fecha) {
    return "No disponible";
  }

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(fechaConvertida);
}

function obtenerEstadoVisual(estado: EstadoUsuario): {
  nombre: string;
  clases: string;
} {
  if (estado === "activo") {
    return {
      nombre: "Cuenta activa",
      clases: "border-success/40 bg-success-container text-on-success-container",
    };
  }

  if (estado === "pendiente") {
    return {
      nombre: "Activación pendiente",
      clases: "border-tertiary/40 bg-tertiary-fixed text-on-tertiary-fixed",
    };
  }

  if (estado === "bloqueado") {
    return {
      nombre: "Cuenta bloqueada",
      clases: "border-error/40 bg-error-container text-on-error-container",
    };
  }

  return {
    nombre: "Cuenta desactivada",
    clases: "border-outline-variant bg-surface-container text-on-surface-variant",
  };
}

export default function SeguridadUsuario({ usuarioId, estadoInicial, sesionesActivasIniciales, tienePassword, emailVerificadoAt, passwordChangedAt, ultimoAccesoAt, alActualizarEstado }: Propiedades) {
  const [estado, setEstado] = useState<EstadoUsuario>(estadoInicial);
  const [sesionesActivas, setSesionesActivas] = useState(sesionesActivasIniciales);
  const [accionPendiente, setAccionPendiente] = useState<AccionPendiente>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const estadoVisual = obtenerEstadoVisual(estado);
  const configuracionAccion = accionPendiente ? configuracionesAccion[accionPendiente] : null;

  const ejecutarAccion = async () => {
    if (!accionPendiente || procesando) {
      return;
    }

    setProcesando(true);
    setError(null);
    setMensaje(null);

    const esCerrarSesiones = accionPendiente === "cerrar-sesiones";

    const nuevoEstado: EstadoUsuario | null =
      accionPendiente === "activar"
        ? "activo"
        : accionPendiente === "bloquear"
          ? "bloqueado"
          : accionPendiente === "desactivar"
            ? "desactivado"
            : null;

    try {
      const respuesta = await fetch(`/api/panel/usuarios/${encodeURIComponent(usuarioId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seccion: "seguridad",
          datos: esCerrarSesiones
            ? {
                accion: "cerrar-sesiones",
              }
            : {
                accion: "cambiar-estado",
                estado: nuevoEstado,
              },
        }),
      });

      const contenido = (await respuesta.json()) as RespuestaSeguridad;

      if (!respuesta.ok || !contenido.ok || !contenido.data?.seguridad) {
        throw new Error(contenido.error ?? "No se ha podido completar la acción");
      }

      const resultado = contenido.data.seguridad;

      setEstado(resultado.estado);

      if (esCerrarSesiones || resultado.estado === "bloqueado" || resultado.estado === "desactivado") {
        setSesionesActivas(0);
      }

      if (esCerrarSesiones) {
        setMensaje(resultado.sesionesCerradas === 1 ? "Se ha cerrado una sesión del usuario." : `Se han cerrado ${resultado.sesionesCerradas} sesiones del usuario.`);
      } else if (resultado.estado === "activo") {
        setMensaje("La cuenta del usuario se ha activado.");
      } else if (resultado.estado === "bloqueado") {
        setMensaje("La cuenta se ha bloqueado y sus sesiones se han cerrado.");
      } else {
        setMensaje("La cuenta se ha desactivado y sus sesiones se han cerrado.");
      }

      alActualizarEstado?.(resultado.estado, resultado.sesionesCerradas);
      setAccionPendiente(null);
    } catch (error) {
      console.error("Error actualizando la seguridad del usuario:", error);
      setError(error instanceof Error ? error.message : "No se ha podido completar la acción");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-on-surface">Seguridad y sesiones</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Consulta el estado de acceso del usuario y administra sus sesiones abiertas.</p>
      </div>

      {mensaje && (
        <div className="rounded-xl border border-success/40 bg-success-container px-4 py-3 text-sm text-on-success-container" role="status">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-on-surface">Estado de la cuenta</h3>
              <p className="mt-1 text-sm text-on-surface-variant">Controla si el usuario puede acceder al panel.</p>
            </div>

            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${estadoVisual.clases}`}>{estadoVisual.nombre}</span>
          </div>

          <dl className="mt-5 divide-y divide-outline-variant/50 border-y border-outline-variant/50">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-on-surface-variant">Contraseña configurada</dt>
              <dd className="text-sm font-semibold text-on-surface">{tienePassword ? "Sí" : "No"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-on-surface-variant">Correo verificado</dt>
              <dd className="text-right text-sm font-semibold text-on-surface">{emailVerificadoAt ? formatearFecha(emailVerificadoAt) : "Pendiente"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-on-surface-variant">Último cambio de contraseña</dt>
              <dd className="text-right text-sm font-semibold text-on-surface">{formatearFecha(passwordChangedAt)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-3">
            {estado !== "activo" && (
              <button type="button" onClick={() => setAccionPendiente("activar")} className="rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-on-success transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success">
                Activar cuenta
              </button>
            )}

            {estado !== "bloqueado" && (
              <button type="button" onClick={() => setAccionPendiente("bloquear")} className="rounded-xl border border-error px-4 py-2.5 text-sm font-bold text-error transition-colors hover:bg-error-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error">
                Bloquear
              </button>
            )}

            {estado !== "desactivado" && (
              <button type="button" onClick={() => setAccionPendiente("desactivar")} className="rounded-xl border border-outline px-4 py-2.5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-outline">
                Desactivar
              </button>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/seguridad.svg')", WebkitMaskImage: "url('/iconos/panel/seguridad.svg')" }} aria-hidden="true" />
            </span>

            <div>
              <h3 className="font-bold text-on-surface">Sesiones abiertas</h3>
              <p className="mt-1 text-sm text-on-surface-variant">Dispositivos en los que la cuenta continúa identificada.</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-surface-container-low p-5 text-center">
            <p className="text-4xl font-bold text-primary">{sesionesActivas}</p>
            <p className="mt-1 text-sm text-on-surface-variant">{sesionesActivas === 1 ? "sesión activa" : "sesiones activas"}</p>
          </div>

          <dl className="mt-5 border-y border-outline-variant/50">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-on-surface-variant">Último acceso</dt>
              <dd className="text-right text-sm font-semibold text-on-surface">{formatearFecha(ultimoAccesoAt)}</dd>
            </div>
          </dl>

          <button type="button" onClick={() => setAccionPendiente("cerrar-sesiones")} disabled={sesionesActivas === 0} className="mt-5 w-full rounded-xl border border-secondary px-4 py-2.5 text-sm font-bold text-secondary transition-colors hover:bg-secondary hover:text-on-secondary disabled:cursor-not-allowed disabled:opacity-40">
            Cerrar todas las sesiones
          </button>
        </article>
      </div>

      {accionPendiente && configuracionAccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmacion-seguridad">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_24px_80px_rgba(0,30,50,0.28)]">
            <div className="border-b border-outline-variant/60 p-5">
              <h3 id="titulo-confirmacion-seguridad" className="text-lg font-bold text-on-surface">{configuracionAccion.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{configuracionAccion.descripcion}</p>
            </div>

            <div className="flex flex-col-reverse gap-3 bg-surface-container-low p-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setAccionPendiente(null)} disabled={procesando} className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50">
                Cancelar
              </button>

              <button type="button" onClick={ejecutarAccion} disabled={procesando} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-opacity disabled:cursor-wait disabled:opacity-60 ${configuracionAccion.clasesBoton}`}>
                {procesando ? "Procesando..." : configuracionAccion.textoBoton}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}