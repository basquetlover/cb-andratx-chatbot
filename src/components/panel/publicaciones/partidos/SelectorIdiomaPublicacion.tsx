import type {
  IdiomaPublicacionPartidos,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  idioma:
    IdiomaPublicacionPartidos;

  alCambiar: (
    idioma:
      IdiomaPublicacionPartidos,
  ) => void;

  deshabilitado?: boolean;
}

interface OpcionIdioma {
  id: IdiomaPublicacionPartidos;
  nombre: string;
  descripcion: string;
}

const IDIOMAS: OpcionIdioma[] = [
  {
    id: "ca",
    nombre: "Català",
    descripcion:
      "La imagen utilizará los textos y encabezados en catalán.",
  },
  {
    id: "es",
    nombre: "Castellano",
    descripcion:
      "La imagen utilizará los textos y encabezados en castellano.",
  },
];

export default function SelectorIdiomaPublicacion({
  idioma,
  alCambiar,
  deshabilitado = false,
}: Propiedades) {
  return (
    <fieldset
      className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:p-5"
      disabled={deshabilitado}
    >
      <legend className="px-1 text-sm font-bold text-on-surface">
        Idioma de la publicación
      </legend>

      <p className="mt-1 text-xs leading-5 text-on-surface-variant">
        Solo afecta a los textos generados
        dentro de la imagen. Los nombres de
        equipos, rivales e instalaciones no se
        traducen automáticamente.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {IDIOMAS.map((opcion) => {
          const seleccionado =
            idioma === opcion.id;

          return (
            <label
              key={opcion.id}
              className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                seleccionado
                  ? "border-primary bg-primary-fixed/60"
                  : "border-outline-variant bg-surface-container-lowest hover:border-primary/60"
              } ${
                deshabilitado
                  ? "cursor-not-allowed opacity-60"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="idioma-publicacion"
                value={opcion.id}
                checked={seleccionado}
                onChange={() =>
                  alCambiar(opcion.id)
                }
                disabled={deshabilitado}
                className="sr-only"
              />

              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  seleccionado
                    ? "border-primary"
                    : "border-outline"
                }`}
                aria-hidden="true"
              >
                {seleccionado && (
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                )}
              </span>

              <span className="min-w-0">
                <span className="block text-sm font-bold text-on-surface">
                  {opcion.nombre}
                </span>

                <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                  {opcion.descripcion}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}