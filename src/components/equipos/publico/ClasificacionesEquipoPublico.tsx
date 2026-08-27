import {
  useEffect,
  useState,
} from "react";

import type {
  ClasificacionEquipoFbib,
} from "@tipos/FbibEquipoPublico";

interface Propiedades {
  clasificaciones?:
    ClasificacionEquipoFbib[];
}

export default function ClasificacionesEquipoPublico({
  clasificaciones = [],
}: Propiedades) {
  const clasificacionesSeguras =
    Array.isArray(
      clasificaciones,
    )
      ? clasificaciones
      : [];

  const [
    grupoSeleccionado,
    setGrupoSeleccionado,
  ] = useState(
    clasificacionesSeguras[0]
      ?.grupo.id ?? "",
  );

  useEffect(() => {
    if (
      clasificacionesSeguras.length ===
      0
    ) {
      if (grupoSeleccionado) {
        setGrupoSeleccionado("");
      }

      return;
    }

    const grupoExiste =
      clasificacionesSeguras.some(
        (clasificacion) =>
          clasificacion.grupo.id ===
          grupoSeleccionado,
      );

    if (!grupoExiste) {
      setGrupoSeleccionado(
        clasificacionesSeguras[0]
          ?.grupo.id ?? "",
      );
    }
  }, [
    clasificacionesSeguras,
    grupoSeleccionado,
  ]);

  const clasificacionActual =
    clasificacionesSeguras.find(
      (clasificacion) =>
        clasificacion.grupo.id ===
        grupoSeleccionado,
    ) ??
    clasificacionesSeguras[0] ??
    null;

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <header className="p-5 pb-4 sm:p-6 sm:pb-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-secondary">
          Liga
        </p>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-on-surface">
            Clasificación
          </h2>

          {clasificacionActual && (
            <a
              href={
                clasificacionActual
                  .enlaceFbib
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-primary hover:underline"
            >
              Ver en la FBIB ↗
            </a>
          )}
        </div>
      </header>

      {clasificacionesSeguras.length >
        1 && (
        <nav
          className="flex gap-2 overflow-x-auto border-y border-outline-variant/60 bg-surface-container-low p-3 sm:px-5"
          aria-label="Clasificaciones del equipo"
        >
          {clasificacionesSeguras.map(
            (clasificacion) => {
              const seleccionada =
                clasificacion
                  .grupo.id ===
                clasificacionActual
                  ?.grupo.id;

              return (
                <button
                  key={
                    clasificacion
                      .grupo.id
                  }
                  type="button"
                  onClick={() =>
                    setGrupoSeleccionado(
                      clasificacion
                        .grupo.id,
                    )
                  }
                  aria-pressed={
                    seleccionada
                  }
                  className={`min-w-max rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                    seleccionada
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                  }`}
                >
                  {
                    clasificacion
                      .grupo
                      .competicion
                  }

                  {" · "}

                  {
                    clasificacion
                      .grupo.nombre
                  }
                </button>
              );
            },
          )}
        </nav>
      )}

      {clasificacionActual ? (
        <>
          <div className="border-b border-outline-variant/60 px-5 py-3 text-sm sm:px-6">
            <p className="font-bold text-on-surface">
              {
                clasificacionActual
                  .grupo.competicion
              }
            </p>

            <p className="mt-0.5 text-xs text-on-surface-variant">
              {
                clasificacionActual
                  .grupo.nombre
              }

              {clasificacionActual
                .grupo.categoria
                ? ` · ${clasificacionActual.grupo.categoria}`
                : ""}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-outline-variant/60 bg-surface-container-low text-xs font-black uppercase text-on-surface-variant">
                  <th className="w-14 px-3 py-3 text-center">
                    Pos.
                  </th>

                  <th className="min-w-52 px-3 py-3 text-left">
                    Equipo
                  </th>

                  <th className="px-3 py-3 text-center">
                    PJ
                  </th>

                  <th className="px-3 py-3 text-center">
                    PG
                  </th>

                  <th className="px-3 py-3 text-center">
                    PP
                  </th>

                  <th className="px-3 py-3 text-center">
                    PF
                  </th>

                  <th className="px-3 py-3 text-center">
                    PC
                  </th>

                  <th className="px-3 py-3 text-center">
                    PTS
                  </th>
                </tr>
              </thead>

              <tbody>
                {clasificacionActual.filas.map(
                  (fila) => (
                    <tr
                      key={
                        fila.equipoId ??
                        `${fila.posicion}-${fila.equipoNombre}`
                      }
                      className={`border-b border-outline-variant/40 last:border-b-0 ${
                        fila.esEquipoActual
                          ? "bg-primary-fixed/60"
                          : "transition-colors hover:bg-surface-container-low"
                      }`}
                    >
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-black ${
                            fila.esEquipoActual
                              ? "bg-primary text-on-primary"
                              : "bg-surface-container-high text-on-surface"
                          }`}
                        >
                          {fila.posicion}
                        </span>
                      </td>

                      <td className="px-3 py-3 font-bold text-on-surface">
                        <div className="flex items-center gap-2">
                          <span>
                            {
                              fila.equipoNombre
                            }
                          </span>

                          {fila.esEquipoActual && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-on-primary">
                              Nuestro equipo
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center text-on-surface-variant">
                        {fila.jugados}
                      </td>

                      <td className="px-3 py-3 text-center font-semibold text-success">
                        {fila.ganados}
                      </td>

                      <td className="px-3 py-3 text-center font-semibold text-error">
                        {fila.perdidos}
                      </td>

                      <td className="px-3 py-3 text-center text-on-surface-variant">
                        {fila.puntosFavor}
                      </td>

                      <td className="px-3 py-3 text-center text-on-surface-variant">
                        {fila.puntosContra}
                      </td>

                      <td className="px-3 py-3 text-center font-black text-on-surface">
                        {
                          fila.puntosClasificacion
                        }
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="m-5 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center sm:m-6">
          <p className="text-sm font-bold text-on-surface">
            Clasificación no disponible
          </p>

          <p className="mt-1 text-xs text-on-surface-variant">
            La FBIB todavía no ha
            publicado una clasificación
            para este equipo.
          </p>
        </div>
      )}
    </section>
  );
}