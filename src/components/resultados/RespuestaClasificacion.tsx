import { useState } from "react";

import MensajeIA from "@components/MensajeIA";
import type { ResultadoClasificacion } from "@tipos/Clasificacion";

interface Propiedades {
  resultado: ResultadoClasificacion;
}

export default function RespuestaClasificacion({
  resultado,
}: Propiedades) {
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(
    resultado.clasificaciones[0]?.grupo.id ?? "",
  );

  const clasificacion =
    resultado.clasificaciones.find(
      (elemento) => elemento.grupo.id === grupoSeleccionado,
    ) ??
    resultado.clasificaciones[0] ??
    null;

  const enlace = clasificacion?.enlaceFbib ?? resultado.enlaceFbib;

  return (
    <MensajeIA>
      <p className="font-semibold text-on-secondary-fixed">
        Clasificación: {resultado.equipo.nombre}
      </p>

      {resultado.clasificaciones.length > 1 && (
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label={`Clasificaciones de ${resultado.equipo.nombre}`}
        >
          {resultado.clasificaciones.map((elemento) => {
            const seleccionada =
              elemento.grupo.id === clasificacion?.grupo.id;

            return (
              <button
                key={elemento.grupo.id}
                type="button"
                aria-pressed={seleccionada}
                onClick={() => setGrupoSeleccionado(elemento.grupo.id)}
                className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  seleccionada
                    ? "border-secondary bg-secondary text-on-secondary"
                    : "border-outline-variant bg-surface-container-lowest text-on-secondary-fixed hover:border-secondary hover:bg-secondary-container"
                }`}
              >
                {elemento.grupo.competicion} · {elemento.grupo.nombre}
              </button>
            );
          })}
        </div>
      )}

      {clasificacion ? (
        <article className="mt-4 min-w-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <div className="bg-secondary px-4 py-3 text-on-secondary">
            <p className="font-semibold">
              {clasificacion.grupo.competicion}
            </p>

            <p className="mt-1 text-sm">
              {[
                clasificacion.grupo.nombre,
                clasificacion.grupo.categoria,
                clasificacion.grupo.temporada,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div
            className="w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-secondary"
            role="region"
            aria-label={`Tabla de clasificación de ${resultado.equipo.nombre}`}
            tabIndex={0}
          >
            <table className="w-full min-w-[540px] border-collapse text-sm">
              <caption className="sr-only">
                {clasificacion.grupo.competicion} ·{" "}
                {clasificacion.grupo.nombre}
              </caption>

              <thead className="bg-surface-container text-xs text-on-surface-variant">
                <tr>
                  <th scope="col" className="px-3 py-3 text-center">Pos.</th>
                  <th scope="col" className="min-w-40 px-3 py-3 text-left">Equipo</th>
                  <th scope="col" className="px-3 py-3 text-center">PJ</th>
                  <th scope="col" className="px-3 py-3 text-center">PG</th>
                  <th scope="col" className="px-3 py-3 text-center">PP</th>
                  <th scope="col" className="px-3 py-3 text-center">PF</th>
                  <th scope="col" className="px-3 py-3 text-center">PC</th>
                  <th scope="col" className="px-3 py-3 text-center">PTS</th>
                </tr>
              </thead>

              <tbody>
                {clasificacion.filas.map((fila, indice) => (
                  <tr
                    key={`${fila.equipoId ?? fila.equipoNombre}-${indice}`}
                    className={`border-t border-outline-variant ${
                      fila.esEquipoActual
                        ? "bg-primary-fixed font-semibold text-on-primary-fixed"
                        : "text-on-surface"
                    }`}
                  >
                    <td className="px-3 py-3 text-center">
                      {fila.posicion}
                    </td>

                    <th scope="row" className="px-3 py-3 text-left font-semibold">
                      {fila.equipoNombre}

                      {fila.esEquipoActual && (
                        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide">
                          Equipo consultado
                        </span>
                      )}
                    </th>

                    <td className="px-3 py-3 text-center">{fila.jugados}</td>
                    <td className="px-3 py-3 text-center">{fila.ganados}</td>
                    <td className="px-3 py-3 text-center">{fila.perdidos}</td>
                    <td className="px-3 py-3 text-center">{fila.puntosFavor}</td>
                    <td className="px-3 py-3 text-center">{fila.puntosContra}</td>
                    <td className="px-3 py-3 text-center font-bold">
                      {fila.puntosClasificacion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="border-t border-outline-variant px-4 py-3 text-xs text-on-surface-variant">
            PJ: jugados · PG: ganados · PP: perdidos · PF: puntos a favor
            · PC: puntos en contra · PTS: puntos de clasificación.
          </p>
        </article>
      ) : (
        <p className="mt-3 text-sm text-on-surface-variant">
          No se ha podido obtener una clasificación para este equipo.
          Puedes comprobar su información directamente en la FBIB.
        </p>
      )}

      <a
        href={enlace}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex rounded-full border border-secondary px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary hover:text-on-secondary"
      >
        {clasificacion ? "Ver clasificación en la FBIB" : "Ver equipo en la FBIB"}
      </a>

      <p className="mt-4 text-xs text-on-surface-variant">
        Información obtenida de la FBIB en el momento de la consulta.
        Comprueba las actualizaciones en su web oficial.
      </p>
    </MensajeIA>
  );
}