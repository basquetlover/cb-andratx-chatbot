import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";

type TipoImagen = "logo" | "banner";

interface Propiedades {
  tipo: TipoImagen;
  archivo: File | null;
  alCambiar: (archivo: File | null) => void;
  deshabilitado?: boolean;
}

const TAMAÑO_MAXIMO = 8 * 1024 * 1024;

const configuracion = {
  logo: {
    titulo: "Logotipo",
    descripcion: "Imagen cuadrada o con fondo transparente.",
    recomendacion: "Recomendado: 1200 × 1200 px",
    clasesVistaPrevia: "aspect-square max-w-56",
    clasesImagen: "object-contain p-4",
  },
  banner: {
    titulo: "Banner promocional",
    descripcion: "Imagen horizontal que podrá aparecer en la web.",
    recomendacion: "Recomendado: 1920 × 800 px",
    clasesVistaPrevia: "aspect-[12/5] w-full",
    clasesImagen: "object-cover",
  },
} satisfies Record<TipoImagen, {
  titulo: string;
  descripcion: string;
  recomendacion: string;
  clasesVistaPrevia: string;
  clasesImagen: string;
}>;

function validarArchivo(archivo: File): string | null {
  const tiposPermitidos = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!tiposPermitidos.includes(archivo.type.toLowerCase())) {
    return "Selecciona una imagen JPG, PNG o WebP.";
  }

  if (archivo.size <= 0) {
    return "El archivo seleccionado está vacío.";
  }

  if (archivo.size > TAMAÑO_MAXIMO) {
    return "La imagen no puede superar los 8 MB.";
  }

  return null;
}

function formatearTamaño(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SelectorImagenPatrocinador({ tipo, archivo, alCambiar, deshabilitado = false }: Propiedades) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const datosVisuales = configuracion[tipo];

  useEffect(() => {
    if (!archivo) {
      setVistaPrevia(null);
      return;
    }

    const urlTemporal = URL.createObjectURL(archivo);

    setVistaPrevia(urlTemporal);

    return () => {
      URL.revokeObjectURL(urlTemporal);
    };
  }, [archivo]);

  const seleccionarArchivo = (nuevoArchivo: File | null) => {
    if (!nuevoArchivo) {
      return;
    }

    const errorArchivo = validarArchivo(nuevoArchivo);

    if (errorArchivo) {
      setError(errorArchivo);
      return;
    }

    setError(null);
    alCambiar(nuevoArchivo);
  };

  const cambiarArchivo = (evento: ChangeEvent<HTMLInputElement>) => {
    seleccionarArchivo(evento.target.files?.[0] ?? null);
    evento.target.value = "";
  };

  const soltarArchivo = (evento: DragEvent<HTMLDivElement>) => {
    evento.preventDefault();
    setArrastrando(false);

    if (deshabilitado) {
      return;
    }

    seleccionarArchivo(evento.dataTransfer.files?.[0] ?? null);
  };

  const eliminarArchivo = () => {
    setError(null);
    alCambiar(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div>
        <p className="font-semibold text-on-surface">{datosVisuales.titulo}</p>
        <p className="mt-1 text-sm text-on-surface-variant">{datosVisuales.descripcion}</p>
      </div>

      {!vistaPrevia ? (
        <div
          onDragEnter={(evento) => {
            evento.preventDefault();

            if (!deshabilitado) {
              setArrastrando(true);
            }
          }}
          onDragOver={(evento) => evento.preventDefault()}
          onDragLeave={(evento) => {
            if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) {
              setArrastrando(false);
            }
          }}
          onDrop={soltarArchivo}
          className={`flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${arrastrando ? "border-primary bg-primary-fixed/50" : "border-outline-variant bg-surface-container-low"} ${deshabilitado ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <span className="inline-block h-6 w-6 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/subir.svg')", WebkitMaskImage: "url('/iconos/panel/subir.svg')" }} aria-hidden="true" />
          </span>

          <p className="mt-4 text-sm font-semibold text-on-surface">Arrastra una imagen hasta aquí</p>
          <p className="mt-1 text-xs text-on-surface-variant">o selecciona un archivo desde tu dispositivo</p>

          <button type="button" onClick={() => inputRef.current?.click()} disabled={deshabilitado} className="mt-4 rounded-xl border border-primary bg-surface-container-lowest px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-50">
            Seleccionar imagen
          </button>

          <p className="mt-3 text-xs text-outline">JPG, PNG o WebP · Máximo 8 MB</p>
          <p className="mt-1 text-xs text-outline">{datosVisuales.recomendacion}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest">
          <div className={`relative mx-auto overflow-hidden bg-surface-container-low ${datosVisuales.clasesVistaPrevia}`}>
            <img src={vistaPrevia} alt={`Vista previa de ${datosVisuales.titulo.toLowerCase()}`} className={`h-full w-full ${datosVisuales.clasesImagen}`} />
          </div>

          <div className="border-t border-outline-variant/60 p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-on-surface">{archivo?.name}</p>
                <p className="mt-1 text-xs text-on-surface-variant">{archivo ? formatearTamaño(archivo.size) : ""} · Se convertirá automáticamente a WebP</p>
              </div>

              <button type="button" onClick={eliminarArchivo} disabled={deshabilitado} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Eliminar ${datosVisuales.titulo.toLowerCase()}`}>
                <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/eliminar.svg')", WebkitMaskImage: "url('/iconos/panel/eliminar.svg')" }} aria-hidden="true" />
              </button>
            </div>

            <button type="button" onClick={() => inputRef.current?.click()} disabled={deshabilitado} className="mt-4 rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-50">
              Cambiar imagen
            </button>
          </div>
        </div>
      )}

      {error && <p className="rounded-xl border border-error/40 bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">{error}</p>}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={cambiarArchivo} disabled={deshabilitado} className="sr-only" />
    </div>
  );
}