import MensajeIA from "@components/MensajeIA";
import type { EventoChatbot } from "@tipos/EventoChatbot";

interface Propiedades {
  evento: EventoChatbot;
}

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${fecha}T12:00:00Z`));
}

export default function RespuestaEventoClub({
  evento,
}: Propiedades) {
  const variosDias = evento.fechaFin !== evento.fechaInicio;

  const fechas = variosDias
    ? `Del ${formatearFecha(evento.fechaInicio)} al ${formatearFecha(evento.fechaFin)}`
    : formatearFecha(evento.fechaInicio);

  const horario = evento.todoElDia
    ? "Todo el día"
    : variosDias
      ? [
          evento.horaInicio
            ? `Inicio: ${evento.horaInicio}`
            : "",
          evento.horaFin
            ? `Finalización: ${evento.horaFin}`
            : "",
        ].filter(Boolean).join(" · ")
      : evento.horaInicio && evento.horaFin
        ? `${evento.horaInicio} – ${evento.horaFin}`
        : evento.horaInicio
          ? `A las ${evento.horaInicio}`
          : evento.horaFin
            ? `Hasta las ${evento.horaFin}`
            : "";

  const destinoMapa = [
    evento.ubicacion,
    evento.direccion,
  ].filter(Boolean).join(", ");

  return (
    <MensajeIA>
      <article className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        {evento.imagen && (
          <img
            src={evento.imagen}
            alt={`Cartel de ${evento.titulo}`}
            className="max-h-80 w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        )}

        <div className="bg-secondary px-4 py-3 text-on-secondary">
          <h2 className="text-lg font-semibold">
            {evento.titulo}
          </h2>

          <p className="mt-2 text-sm">{fechas}</p>

          <p className="mt-1 text-sm">
            {horario || "Horario pendiente de confirmar"}
          </p>
        </div>

        <div className="space-y-4 p-4">
          {evento.descripcionCorta && (
            <p className="whitespace-pre-wrap text-sm font-semibold text-on-secondary-fixed">
              {evento.descripcionCorta}
            </p>
          )}

          {evento.descripcion &&
            evento.descripcion !== evento.descripcionCorta && (
              <p className="whitespace-pre-wrap text-sm text-on-surface-variant">
                {evento.descripcion}
              </p>
            )}

          {destinoMapa && (
            <div className="rounded-xl bg-surface-container p-3">
              <p className="text-sm font-semibold text-on-secondary-fixed">
                Ubicación
              </p>

              {evento.ubicacion && (
                <p className="mt-1 text-sm text-on-surface">
                  {evento.ubicacion}
                </p>
              )}

              {evento.direccion && (
                <p className="mt-1 text-sm text-on-surface-variant">
                  {evento.direccion}
                </p>
              )}

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinoMapa)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm font-semibold text-secondary hover:underline"
              >
                Ver ubicación en Google Maps
              </a>
            </div>
          )}

          {evento.requiereInscripcion && (
            <p className="rounded-lg bg-primary-fixed px-3 py-2 text-sm font-semibold text-on-primary-fixed">
              Este evento requiere inscripción.
            </p>
          )}

          {(evento.urlInformacion || evento.urlInscripcion) && (
            <div className="flex flex-wrap gap-3">
              {evento.urlInformacion && (
                <a
                  href={evento.urlInformacion}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-full border border-secondary px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary hover:text-on-secondary"
                >
                  Más información
                </a>
              )}

              {evento.urlInscripcion && (
                <a
                  href={evento.urlInscripcion}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary transition-colors hover:bg-on-secondary-fixed"
                >
                  Ver inscripción
                </a>
              )}
            </div>
          )}
        </div>
      </article>
    </MensajeIA>
  );
}