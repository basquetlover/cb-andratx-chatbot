import MensajeIA from "@components/MensajeIA";

export function MensajeCargaEventosClub() {
  return (
    <MensajeIA>
      <div className="flex items-center gap-3" role="status">
        <span
          className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-outline-variant border-t-secondary"
          aria-hidden="true"
        />

        <p className="text-sm text-on-surface-variant">
          Consultando los próximos eventos del club...
        </p>
      </div>
    </MensajeIA>
  );
}

export function MensajeSinEventosClub() {
  return (
    <MensajeIA>
      <p className="font-semibold text-on-secondary-fixed">
        No hay próximos eventos publicados
      </p>

      <p className="mt-1 text-sm text-on-surface-variant">
        En este momento no hay eventos vigentes o futuros publicados
        para todo el club. Puedes volver a consultar más adelante.
      </p>
    </MensajeIA>
  );
}

export function MensajeErrorEventosClub({
  alReintentar,
  alContinuar,
}: {
  alReintentar: () => void;
  alContinuar: () => void;
}) {
  return (
    <MensajeIA>
      <div role="alert">
        <p className="font-semibold text-error">
          No se han podido consultar los eventos
        </p>

        <p className="mt-1 text-sm text-on-surface-variant">
          Puedes volver a intentarlo o continuar con otra consulta.
        </p>
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