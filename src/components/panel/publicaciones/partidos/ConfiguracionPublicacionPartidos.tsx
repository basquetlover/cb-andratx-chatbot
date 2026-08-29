import SelectorIdiomaPublicacion from "./SelectorIdiomaPublicacion";
import SelectorPeriodoPublicacion from "./SelectorPeriodoPublicacion";

import type {
  IdiomaPublicacionPartidos,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  nombre: string;
  titulo: string;

  idioma:
    IdiomaPublicacionPartidos;

  fechaInicio: string;
  fechaFin: string;

  partidosPorImagen: number;

  alCambiarNombre: (
    nombre: string,
  ) => void;

  alCambiarTitulo: (
    titulo: string,
  ) => void;

  alCambiarIdioma: (
    idioma:
      IdiomaPublicacionPartidos,
  ) => void;

  alCambiarPeriodo: (
    fechaInicio: string,
    fechaFin: string,
  ) => void;

  alCambiarPartidosPorImagen: (
    cantidad: number,
  ) => void;

  deshabilitado?: boolean;
}

export default function ConfiguracionPublicacionPartidos({
  nombre,
  titulo,
  idioma,
  fechaInicio,
  fechaFin,
  partidosPorImagen,
  alCambiarNombre,
  alCambiarTitulo,
  alCambiarIdioma,
  alCambiarPeriodo,
  alCambiarPartidosPorImagen,
  deshabilitado = false,
}: Propiedades) {
  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">
          Configuración
        </h2>

        <p className="mt-1 text-sm text-on-surface-variant">
          Define el periodo, el idioma y los
          textos que aparecerán en la
          publicación.
        </p>
      </div>

      <div className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:grid-cols-2 sm:p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Nombre interno
            </span>

            <input
              type="text"
              value={nombre}
              onChange={(evento) =>
                alCambiarNombre(
                  evento.target.value,
                )
              }
              disabled={deshabilitado}
              maxLength={150}
              placeholder="Ej. Partidos del 24 al 30 de agosto"
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <span className="text-xs leading-5 text-on-surface-variant">
              Solo se utiliza para localizar
              esta publicación en el
              historial.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Título de la imagen
            </span>

            <input
              type="text"
              value={titulo}
              onChange={(evento) =>
                alCambiarTitulo(
                  evento.target.value,
                )
              }
              disabled={deshabilitado}
              maxLength={150}
              placeholder={
                idioma === "ca"
                  ? "PARTITS DE LA SETMANA"
                  : "PARTIDOS DE LA SEMANA"
              }
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm font-bold uppercase text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <span className="text-xs leading-5 text-on-surface-variant">
              Este texto sí aparecerá en la
              parte superior de cada imagen.
            </span>
          </label>
        </div>

        <SelectorIdiomaPublicacion
          idioma={idioma}
          alCambiar={
            alCambiarIdioma
          }
          deshabilitado={
            deshabilitado
          }
        />

        <SelectorPeriodoPublicacion
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          alCambiar={({
            fechaInicio:
              nuevaFechaInicio,
            fechaFin:
              nuevaFechaFin,
          }) =>
            alCambiarPeriodo(
              nuevaFechaInicio,
              nuevaFechaFin,
            )
          }
          deshabilitado={
            deshabilitado
          }
        />

        <fieldset
          className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:p-5"
          disabled={deshabilitado}
        >
          <legend className="px-1 text-sm font-bold text-on-surface">
            Distribución de las imágenes
          </legend>

          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            Cuando haya más partidos de los
            que caben en una imagen, se
            crearán automáticamente varias
            páginas.
          </p>

          <label className="mt-4 flex max-w-sm flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Partidos por imagen
            </span>

            <select
              value={
                partidosPorImagen
              }
              onChange={(evento) =>
                alCambiarPartidosPorImagen(
                  Number(
                    evento.target.value,
                  ),
                )
              }
              disabled={deshabilitado}
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value={6}>
                6 partidos
              </option>

              <option value={7}>
                7 partidos
              </option>

              <option value={8}>
                8 partidos
              </option>

              <option value={9}>
                9 partidos
              </option>

              <option value={10}>
                10 partidos
              </option>
            </select>

            <span className="text-xs leading-5 text-on-surface-variant">
              Con menos filas, cada partido
              dispondrá de más espacio. La
              opción recomendada es 7.
            </span>
          </label>
        </fieldset>
      </div>
    </section>
  );
}