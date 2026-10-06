import MensajeIA from "@components/MensajeIA";
import MensajeUsuario from "@components/MensajeUsuario";

import type { EquipoDisponible } from "@tipos/Equipo";

export function MensajeEquiposClasificacion({
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

export function MensajeCargaClasificacion({
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
            ? "Consultando la clasificación..."
            : `Consultando las clasificaciones de ${cantidad} equipos...`}
        </p>
      </div>
    </MensajeIA>
  );
}

export function MensajeErrorClasificacion({
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
            ? "No se ha podido consultar la clasificación de un equipo"
            : "No se han podido consultar algunas clasificaciones"}
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