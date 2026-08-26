import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

export type CambioImagenEquipo =
  | {
      tipo: "sin-cambios";
    }
  | {
      tipo: "nueva";
      archivo: File;
    }
  | {
      tipo: "eliminar";
    };

interface Propiedades {
  imagenActual?: string | null;
  cambio: CambioImagenEquipo;
  alCambiar: (cambio: CambioImagenEquipo) => void;
  alCambiarError: (mensaje: string | null) => void;
  error?: string | null;
  deshabilitado?: boolean;
}

const TAMAÑO_MAXIMO = 8 * 1024 * 1024;

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function formatearTamaño(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validarArchivo(archivo: File): string | null {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return "La imagen debe estar en formato JPG, PNG o WebP.";
  }

  if (archivo.size <= 0) {
    return "El archivo seleccionado está vacío.";
  }

  if (archivo.size > TAMAÑO_MAXIMO) {
    return "La imagen no puede superar los 8 MB.";
  }

  return null;
}

export default function SelectorImagenEquipo({
  imagenActual = null,
  cambio,
  alCambiar,
  alCambiarError,
  error = null,
  deshabilitado = false,
}: Propiedades) {
  const idInput = useId();

  const referenciaInput =
    useRef<HTMLInputElement>(null);

  const [previsualizacion, setPrevisualizacion] =
    useState<string | null>(null);

  const [arrastrando, setArrastrando] =
    useState(false);

  useEffect(() => {
    if (cambio.tipo !== "nueva") {
      setPrevisualizacion(null);
      return;
    }

    const urlTemporal = URL.createObjectURL(
      cambio.archivo,
    );

    setPrevisualizacion(urlTemporal);

    return () => {
      URL.revokeObjectURL(urlTemporal);
    };
  }, [cambio]);

  const imagenVisible =
    cambio.tipo === "nueva"
      ? previsualizacion
      : cambio.tipo === "eliminar"
        ? null
        : imagenActual;

  const seleccionarArchivo = (
    archivo?: File,
  ) => {
    if (!archivo || deshabilitado) {
      return;
    }

    const mensajeError =
      validarArchivo(archivo);

    if (mensajeError) {
      alCambiarError(mensajeError);
      return;
    }

    alCambiarError(null);

    alCambiar({
      tipo: "nueva",
      archivo,
    });
  };

  const manejarCambio = (
    evento: ChangeEvent<HTMLInputElement>,
  ) => {
    seleccionarArchivo(
      evento.currentTarget.files?.[0],
    );

    evento.currentTarget.value = "";
  };

  const manejarArrastre = (
    evento: DragEvent<HTMLLabelElement>,
  ) => {
    evento.preventDefault();

    if (!deshabilitado) {
      setArrastrando(true);
    }
  };

  const manejarSalida = (
    evento: DragEvent<HTMLLabelElement>,
  ) => {
    evento.preventDefault();
    setArrastrando(false);
  };

  const manejarSoltar = (
    evento: DragEvent<HTMLLabelElement>,
  ) => {
    evento.preventDefault();
    setArrastrando(false);

    seleccionarArchivo(
      evento.dataTransfer.files?.[0],
    );
  };

  const descartarImagenNueva = () => {
    alCambiar({
      tipo: "sin-cambios",
    });

    alCambiarError(null);

    if (referenciaInput.current) {
      referenciaInput.current.value = "";
    }
  };

  const marcarParaEliminar = () => {
    alCambiar({
      tipo: "eliminar",
    });

    alCambiarError(null);
  };

  const deshacerEliminacion = () => {
    alCambiar({
      tipo: "sin-cambios",
    });

    alCambiarError(null);
  };

  const textoImagen =
    cambio.tipo === "nueva"
      ? cambio.archivo.name
      : cambio.tipo === "eliminar"
        ? "La imagen actual se eliminará al guardar."
        : imagenActual
          ? "Imagen actual del equipo"
          : "El equipo todavía no tiene imagen.";

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-bold text-on-surface">
        Imagen del equipo
      </span>

      <div className="grid gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-4">
        <label
          htmlFor={idInput}
          onDragEnter={manejarArrastre}
          onDragOver={manejarArrastre}
          onDragLeave={manejarSalida}
          onDrop={manejarSoltar}
          className={`relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-surface-container-lowest text-center transition-colors ${
            error
              ? "border-error"
              : arrastrando
                ? "border-primary bg-primary-fixed/50"
                : "border-outline-variant hover:border-primary"
          } ${
            deshabilitado
              ? "cursor-not-allowed opacity-60"
              : ""
          }`}
        >
          <input
            ref={referenciaInput}
            id={idInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={manejarCambio}
            disabled={deshabilitado}
            className="sr-only"
          />

          {imagenVisible ? (
            <img
              src={imagenVisible}
              alt={
                cambio.tipo === "nueva"
                  ? "Previsualización de la nueva imagen"
                  : "Imagen actual del equipo"
              }
              className="h-full w-full bg-white object-contain p-2"
            />
          ) : (
            <span className="px-4 text-xs font-semibold leading-5 text-on-surface-variant">
              {cambio.tipo === "eliminar"
                ? "Imagen marcada para eliminar"
                : "Seleccionar imagen"}
            </span>
          )}

          {!deshabilitado && (
            <span className="absolute inset-x-2 bottom-2 rounded-lg bg-on-surface/80 px-2 py-1.5 text-xs font-bold text-surface">
              {imagenVisible
                ? "Cambiar imagen"
                : "Seleccionar imagen"}
            </span>
          )}
        </label>

        <div className="flex min-w-0 flex-col justify-between gap-4">
          <div>
            <p className="wrap-break-words text-sm font-semibold text-on-surface">
              {textoImagen}
            </p>

            {cambio.tipo === "nueva" && (
              <p className="mt-1 text-xs text-on-surface-variant">
                {formatearTamaño(
                  cambio.archivo.size,
                )}
              </p>
            )}

            <p className="mt-2 text-xs leading-5 text-on-surface-variant">
              Formatos permitidos: JPG, PNG y WebP.
              Tamaño máximo: 8 MB. La imagen se
              convertirá automáticamente a WebP.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {cambio.tipo === "nueva" && (
              <button
                type="button"
                onClick={descartarImagenNueva}
                disabled={deshabilitado}
                className="rounded-xl border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {imagenActual
                  ? "Descartar cambio"
                  : "Quitar selección"}
              </button>
            )}

            {cambio.tipo === "sin-cambios" &&
              imagenActual && (
                <button
                  type="button"
                  onClick={marcarParaEliminar}
                  disabled={deshabilitado}
                  className="rounded-xl border border-error px-3 py-2 text-xs font-bold text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Eliminar imagen
                </button>
              )}

            {cambio.tipo === "eliminar" && (
              <button
                type="button"
                onClick={deshacerEliminacion}
                disabled={deshabilitado}
                className="rounded-xl border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Deshacer
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <span
          className="text-xs font-semibold text-error"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}