import MensajeIA from "@components/MensajeIA";

import type { ResultadoEntrenamientos } from "@tipos/Entrenamiento";

interface Propiedades {
  resultado: ResultadoEntrenamientos;
}

function convertirFecha(fecha: string): Date {
  return new Date(`${fecha}T12:00:00`);
}

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  }).format(convertirFecha(fecha));
}

function formatearFechaCorta(fecha: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Madrid",
  }).format(convertirFecha(fecha));
}

function formatearFechaCompleta(fecha: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(convertirFecha(fecha));
}

function formatearHora(hora: string | null): string {
  return hora ? hora.slice(0, 5) : "Hora pendiente";
}

export default function RespuestaHorariosEntrenamiento({ resultado }: Propiedades) {
  const nombreEquipo = resultado.equipo.nombre?.trim() || "Equipo";
  const antesDelInicio = resultado.periodo.estado === "antes-inicio";
  const despuesDelFinal = resultado.periodo.estado === "despues-fin";

  let titulo = `Entrenamientos de esta semana: ${nombreEquipo}`;
  let descripcion = `Del ${formatearFechaCorta(resultado.semana.inicio)} al ${formatearFechaCorta(resultado.semana.fin)}`;

  if (antesDelInicio && resultado.periodo.fechaInicio) {
    titulo = `Los entrenamientos de ${nombreEquipo} todavía no han comenzado`;
    descripcion = `Está previsto que comiencen el ${formatearFechaCompleta(resultado.periodo.fechaInicio)}. Estos son los horarios correspondientes a la primera semana de entrenamientos.`;
  }

  if (despuesDelFinal && resultado.periodo.fechaFin) {
    titulo = `Los entrenamientos de ${nombreEquipo} han finalizado`;
    descripcion = `El periodo de entrenamientos terminó el ${formatearFechaCompleta(resultado.periodo.fechaFin)}. Estos fueron los horarios correspondientes a la última semana.`;
  }

  if (resultado.entrenamientos.length === 0) {
    return (
      <MensajeIA>
        <p className="font-semibold text-on-secondary-fixed">{titulo}</p>
        <p className="mt-1 text-sm text-on-surface-variant">{descripcion}</p>
        <p className="mt-3 text-sm text-on-surface-variant">No hay sesiones configuradas para esta semana.</p>
      </MensajeIA>
    );
  }

  return (
    <MensajeIA>
      <p className="font-semibold text-on-secondary-fixed">{titulo}</p>
      <p className="mt-1 text-sm text-on-surface-variant">{descripcion}</p>

      <div className="mt-4 flex flex-col gap-3">
        {resultado.entrenamientos.map((entrenamiento) => {
          const nombreInstalacion = entrenamiento.instalacion?.nombre ?? entrenamiento.instalacion?.nombreCorto ?? "Instalación pendiente";
          const direccion = [entrenamiento.instalacion?.direccion, entrenamiento.instalacion?.localidad].filter(Boolean).join(", ");

          return (
            <article key={entrenamiento.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <p className="font-semibold capitalize text-on-secondary-fixed">{formatearFecha(entrenamiento.fecha)}</p>

              <p className="mt-1 text-sm font-semibold text-secondary">
                {formatearHora(entrenamiento.horaInicio)} – {formatearHora(entrenamiento.horaFin)}
              </p>

              <p className="mt-2 text-sm text-on-surface">{nombreInstalacion}</p>

              {direccion && <p className="mt-1 text-sm text-on-surface-variant">{direccion}</p>}

              {entrenamiento.observaciones && <p className="mt-3 rounded-lg bg-surface-container px-3 py-2 text-sm text-on-surface-variant">{entrenamiento.observaciones}</p>}
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-on-surface-variant">Los horarios pueden sufrir modificaciones. Comprueba los avisos oficiales del club.</p>
    </MensajeIA>
  );
}