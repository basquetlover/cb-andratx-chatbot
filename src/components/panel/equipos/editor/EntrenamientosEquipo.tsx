import {
  useState,
} from "react";

import ExcepcionesEntrenamientosEquipo from "./ExcepcionesEntrenamientosEquipo";
import HorarioHabitualEquipo from "./HorarioHabitualEquipo";

interface Propiedades {
  equipoId: string;
  temporadaId: string;
}

type SubseccionEntrenamientos =
  | "horario"
  | "excepciones";

export default function EntrenamientosEquipo({
  equipoId,
  temporadaId,
}: Propiedades) {
  const [subseccion, setSubseccion] =
    useState<SubseccionEntrenamientos>(
      "horario",
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">
          Entrenamientos
        </h2>

        <p className="mt-1 text-sm text-on-surface-variant">
          Configura el horario habitual y los
          cambios puntuales de entrenamiento.
        </p>
      </div>

      <nav
        className="flex gap-2 overflow-x-auto border-b border-outline-variant/60 bg-surface-container-low p-3 sm:px-5"
        aria-label="Secciones de entrenamientos"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          id="pestana-horario-habitual"
          aria-selected={
            subseccion === "horario"
          }
          aria-controls="panel-horario-habitual"
          onClick={() =>
            setSubseccion("horario")
          }
          className={`min-w-max rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
            subseccion === "horario"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container hover:text-primary"
          }`}
        >
          Horario habitual
        </button>

        <button
          type="button"
          role="tab"
          id="pestana-excepciones"
          aria-selected={
            subseccion === "excepciones"
          }
          aria-controls="panel-excepciones"
          onClick={() =>
            setSubseccion("excepciones")
          }
          className={`min-w-max rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
            subseccion === "excepciones"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container hover:text-primary"
          }`}
        >
          Excepciones
        </button>
      </nav>

      <div className="p-4 sm:p-5">
        {subseccion === "horario" && (
          <div
            id="panel-horario-habitual"
            role="tabpanel"
            aria-labelledby="pestana-horario-habitual"
          >
            <HorarioHabitualEquipo
              equipoId={equipoId}
            />
          </div>
        )}

        {subseccion ===
          "excepciones" && (
          <div
            id="panel-excepciones"
            role="tabpanel"
            aria-labelledby="pestana-excepciones"
          >
            <ExcepcionesEntrenamientosEquipo
              equipoId={equipoId}
              temporadaId={temporadaId}
            />
          </div>
        )}
      </div>
    </section>
  );
}