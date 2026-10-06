import MensajeIA from "@components/MensajeIA";
import MensajeUsuario from "@components/MensajeUsuario";

import type { EquipoDisponible } from "@tipos/Equipo";
import type { RangoFechasPartidos } from "@tipos/PartidosPorFecha";

export function formatearFechaPartidos(fecha: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${fecha}T12:00:00Z`));
}

export function formatearRangoPartidos(
  rango: RangoFechasPartidos,
): string {
  if (rango.desde === rango.hasta) {
    return formatearFechaPartidos(rango.desde);
  }

  return (
    `Del ${formatearFechaPartidos(rango.desde)} ` +
    `al ${formatearFechaPartidos(rango.hasta)}`
  );
}

export function MensajeEquiposPartidos({
  equipos,
}: {
  equipos: EquipoDisponible[];
}) {
  return (
    <MensajeUsuario>
      <p className="text-sm text-secondary-fixed">
        Equipos seleccionados:
      </p>

      <ul className="mt-1 flex flex-col gap-1">
        {equipos.map((equipo) => (
          <li key={equipo.id} className="font-semibold">
            {equipo.nombre ?? equipo.nombreCorto ?? "Equipo"}
          </li>
        ))}
      </ul>
    </MensajeUsuario>
  );
}

export function MensajeFechaPartidos({
  rango,
}: {
  rango: RangoFechasPartidos;
}) {
  return (
    <MensajeUsuario>
      <p className="text-sm text-secondary-fixed">
        Periodo seleccionado:
      </p>

      <p className="font-semibold">
        {formatearRangoPartidos(rango)}
      </p>
    </MensajeUsuario>
  );
}

export function MensajeCargaPartidosFecha({
  cantidad,
}: {
  cantidad: number;
}) {
  return (
    <MensajeIA>
      <div className="flex items-center gap-3" role="status">
        <span
          className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-outline-variant border-t-secondary"
          aria-hidden="true"
        />

        <p className="text-sm text-on-surface-variant">
          {cantidad === 1
            ? "Consultando los partidos del equipo en el periodo seleccionado..."
            : `Consultando los partidos de ${cantidad} equipos en el periodo seleccionado...`}
        </p>
      </div>
    </MensajeIA>
  );
}

export function MensajeErrorPartidosFecha({
  equipos,
  alReintentar,
  alContinuar,
}: {
  equipos: EquipoDisponible[];
  alReintentar: () => void;
  alContinuar: () => void;
}) {
  return (
    <MensajeIA>
      <div role="alert">
        <p className="font-semibold text-error">
          {equipos.length === 1
            ? "No se han podido consultar los partidos de un equipo"
            : "No se han podido consultar los partidos de algunos equipos"}
        </p>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-on-surface-variant">
          {equipos.map((equipo) => (
            <li key={equipo.id}>
              {equipo.nombre ?? equipo.nombreCorto ?? "Equipo"}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={alReintentar}
          className="rounded-xl border border-error px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-container"
        >
          Volver a intentarlo
        </button>

        <button
          type="button"
          onClick={alContinuar}
          className="rounded-xl border border-secondary px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary hover:text-on-secondary"
        >
          Continuar
        </button>
      </div>
    </MensajeIA>
  );
}