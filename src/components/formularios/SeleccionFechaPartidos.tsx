import { useEffect, useId, useState } from "react";

import MensajeIA from "@components/MensajeIA";

import type { RangoFechasPartidos } from "@tipos/PartidosPorFecha";

interface Propiedades {
  rangoConfirmado: RangoFechasPartidos | null;
  alConfirmar: (rango: RangoFechasPartidos) => void;
}

export default function SeleccionFechaPartidos({
  rangoConfirmado,
  alConfirmar,
}: Propiedades) {
  const id = useId();

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const valor = (tipo: string) =>
      partes.find((parte) => parte.type === tipo)?.value ?? "";

    const hoy =
      `${valor("year")}-${valor("month")}-${valor("day")}`;

    setDesde(hoy);
    setHasta(hoy);
  }, []);

  const bloqueado = rangoConfirmado !== null;

  const rangoInvalido = Boolean(
    desde && hasta && hasta < desde,
  );

  const puedeConsultar = Boolean(
    desde && hasta && !rangoInvalido && !bloqueado,
  );

  return (
    <MensajeIA>
      <p className="font-semibold text-on-secondary-fixed">
        ¿Entre qué fechas quieres consultar los partidos?
      </p>

      <p className="mt-1 text-sm text-on-surface-variant">
        Selecciona la fecha inicial y la final. Se incluirán los
        partidos de ambos días.
      </p>

      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={(evento) => {
          evento.preventDefault();

          if (!puedeConsultar) {
            return;
          }

          alConfirmar({ desde, hasta });
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <label
              htmlFor={`${id}-desde`}
              className="text-sm font-semibold text-on-secondary-fixed"
            >
              Desde
            </label>

            <input
              id={`${id}-desde`}
              type="date"
              required
              min="2020-01-01"
              max="2100-12-31"
              value={rangoConfirmado?.desde ?? desde}
              disabled={bloqueado}
              onChange={(evento) => {
                const nuevaFecha = evento.target.value;
                setDesde(nuevaFecha);

                if (nuevaFecha && (!hasta || hasta < nuevaFecha)) {
                  setHasta(nuevaFecha);
                }
              }}
              className="min-w-0 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface focus:border-secondary focus:outline-none disabled:opacity-70"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label
              htmlFor={`${id}-hasta`}
              className="text-sm font-semibold text-on-secondary-fixed"
            >
              Hasta
            </label>

            <input
              id={`${id}-hasta`}
              type="date"
              required
              min={rangoConfirmado?.desde || desde || "2020-01-01"}
              max="2100-12-31"
              value={rangoConfirmado?.hasta ?? hasta}
              disabled={bloqueado}
              aria-invalid={rangoInvalido}
              aria-describedby={
                rangoInvalido ? `${id}-error` : undefined
              }
              onChange={(evento) => setHasta(evento.target.value)}
              className="min-w-0 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface focus:border-secondary focus:outline-none disabled:opacity-70"
            />
          </div>
        </div>

        {rangoInvalido && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-sm text-error"
          >
            La fecha final no puede ser anterior a la fecha inicial.
          </p>
        )}

        <p className="text-xs text-on-surface-variant">
          Se consultarán los equipos de la temporada activa.
          Puedes elegir el mismo día en ambos campos.
        </p>

        {!bloqueado && (
          <button
            type="submit"
            disabled={!puedeConsultar}
            className="self-start rounded-full bg-primary-container px-5 py-3 text-sm font-semibold text-on-primary-container transition-colors hover:bg-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            Consultar partidos
          </button>
        )}
      </form>
    </MensajeIA>
  );
}