import MensajeIA from "@components/MensajeIA";

import type { ResultadoProximoPartido } from "@tipos/Partido";

interface Propiedades {
  resultado: ResultadoProximoPartido;
}

function formatearFecha(fecha: string): string {
  const fechaLocal = new Date(`${fecha}T12:00:00`);

  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(fechaLocal);
}

function formatearHora(hora: string | null): string {
  if (!hora) {
    return "Hora pendiente";
  }

  return hora.slice(0, 5);
}

export default function RespuestaProximoPartido({ resultado }: Propiedades) {
  const partido = resultado.partido;

  console.log(partido)
  console.log("Escudo local FBIB:", partido?.localClubLogo);
// console.log("Escudo local normalizado:", escudoLocal);

  if (!partido) {
    return (
      <MensajeIA>
        <p className="font-semibold text-on-secondary-fixed">Todavía no hay un próximo partido publicado</p>
        <p className="mt-1 text-sm text-on-surface-variant">La FBIB todavía no ha publicado ningún partido pendiente para {resultado.equipo.nombre ?? "este equipo"}.</p>
      </MensajeIA>
    );
  }


  const informacionCompeticion = [partido.categoria, partido.competicion, partido.grupo].filter(Boolean).join(" · ");
  const informacionJornada = partido.jornada ? `Jornada ${partido.jornada}` : null;
  const direccion = [partido.instalacion?.direccion, partido.instalacion?.localidad].filter(Boolean).join(", ");

  return (
    <MensajeIA>
      <p className="font-semibold text-on-secondary-fixed">Próximo partido</p>

      {informacionCompeticion && <p className="mt-1 text-sm text-on-surface-variant">{informacionCompeticion}</p>}

      {informacionJornada && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-secondary">{informacionJornada}</p>}

      <article className="mt-4 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="bg-secondary px-4 py-3 text-center text-on-secondary">
          <p className="font-semibold capitalize">{formatearFecha(partido.fecha)}</p>
          <p className="mt-1 text-sm">{formatearHora(partido.hora)}</p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-6">
            <div className="flex min-w-0 flex-col items-center text-center">
                {partido.equipoLocal.escudo ? (
                <img src={partido.equipoLocal.escudo} alt={`Escudo de ${partido.equipoLocal.nombre}`} className="mb-3 h-16 w-16 object-contain sm:h-20 sm:w-20" decoding="async" />
                ) : (
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-xl font-bold text-secondary sm:h-20 sm:w-20 sm:text-2xl" aria-hidden="true">
                    {partido.equipoLocal.nombre.charAt(0)}
                </div>
                )}

                <p className="wrap-break-word font-semibold text-on-secondary-fixed">{partido.equipoLocal.nombre}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-on-surface-variant">Local</p>
            </div>

            <span className="rounded-full bg-primary-container px-3 py-2 text-sm font-bold text-on-primary-container">VS</span>

            <div className="flex min-w-0 flex-col items-center text-center">
                {partido.equipoVisitante.escudo ? (
                <img src={partido.equipoVisitante.escudo} alt={`Escudo de ${partido.equipoVisitante.nombre}`} className="mb-3 h-16 w-16 object-contain sm:h-20 sm:w-20" decoding="async" />
                ) : (
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-xl font-bold text-secondary sm:h-20 sm:w-20 sm:text-2xl" aria-hidden="true">
                    {partido.equipoVisitante.nombre.charAt(0)}
                </div>
                )}

                <p className="wrap-break-word font-semibold text-on-secondary-fixed">{partido.equipoVisitante.nombre}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-on-surface-variant">Visitante</p>
            </div>
        </div>

        {partido.instalacion && (
          <div className="border-t border-outline-variant bg-surface-container px-4 py-3">
            <p className="text-sm font-semibold text-on-surface">{partido.instalacion.nombre ?? "Instalación pendiente"}</p>
            {direccion && <p className="mt-1 text-sm text-on-surface-variant">{direccion}</p>}
          </div>
        )}
      </article>

      {partido.urlFbib && (
        <a href={partido.urlFbib} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-full border border-secondary px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary hover:text-on-secondary">
          Ver partido en la FBIB
        </a>
      )}

      <p className="mt-4 text-xs text-on-surface-variant">La fecha, la hora y la instalación pueden sufrir modificaciones. Comprueba siempre la información oficial de la FBIB.</p>
    </MensajeIA>
  );
}