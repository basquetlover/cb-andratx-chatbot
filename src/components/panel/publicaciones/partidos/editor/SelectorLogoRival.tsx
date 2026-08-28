import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import type {
  RespuestaLogoRival,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  logoActual: string | null;
  nombreRival: string;

  alCambiar: (
    logo: string | null,
  ) => void;

  deshabilitado?: boolean;
}

const TAMANO_MAXIMO =
  5 * 1024 * 1024;

const TIPOS_PERMITIDOS =
  new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
  ]);

export default function SelectorLogoRival({
  logoActual,
  nombreRival,
  alCambiar,
  deshabilitado = false,
}: Propiedades) {
  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    subiendo,
    setSubiendo,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    errorImagen,
    setErrorImagen,
  ] = useState(false);

  useEffect(() => {
    setErrorImagen(false);
  }, [logoActual]);

  const abrirSelector = () => {
    if (
      deshabilitado ||
      subiendo
    ) {
      return;
    }

    inputRef.current?.click();
  };

  const subirArchivo = async (
    evento:
      ChangeEvent<HTMLInputElement>,
  ) => {
    const archivo =
      evento.target.files?.[0];

    evento.target.value = "";

    if (!archivo) {
      return;
    }

    if (
      !TIPOS_PERMITIDOS.has(
        archivo.type,
      )
    ) {
      setError(
        "El escudo debe ser PNG, JPG, WEBP o SVG.",
      );

      return;
    }

    if (
      archivo.size >
      TAMANO_MAXIMO
    ) {
      setError(
        "El escudo no puede superar los 5 MB.",
      );

      return;
    }

    try {
      setSubiendo(true);
      setError(null);

      const formulario =
        new FormData();

      formulario.append(
        "archivo",
        archivo,
      );

      const respuesta =
        await fetch(
          "/api/panel/publicaciones/partidos/logo-rival",
          {
            method: "POST",
            credentials:
              "same-origin",
            headers: {
              Accept:
                "application/json",
            },
            body: formulario,
          },
        );

      const contenido =
        (await respuesta.json()) as
          RespuestaLogoRival;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data?.url
      ) {
        throw new Error(
          contenido.error ??
            "No se ha podido subir el escudo.",
        );
      }

      alCambiar(
        contenido.data.url,
      );

      setErrorImagen(false);
    } catch (error) {
      console.error(
        "Error subiendo el escudo del rival:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se ha podido subir el escudo.",
      );
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarLogo = () => {
    if (
      deshabilitado ||
      subiendo
    ) {
      return;
    }

    alCambiar(null);
    setError(null);
    setErrorImagen(false);
  };

  const mostrarImagen =
    Boolean(logoActual) &&
    !errorImagen;

  const inicial =
    nombreRival
      .trim()
      .charAt(0)
      .toUpperCase() || "?";

  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-3">
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={subirArchivo}
        disabled={
          deshabilitado ||
          subiendo
        }
        className="sr-only"
      />

      <div className="flex items-center gap-3">
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-container text-lg font-bold text-primary">
          {inicial}

          {mostrarImagen && (
            <img
              src={
                logoActual ??
                undefined
              }
              alt={
                nombreRival
                  ? `Escudo de ${nombreRival}`
                  : "Escudo del rival"
              }
              onError={() =>
                setErrorImagen(true)
              }
              className="absolute inset-0 h-full w-full bg-white object-contain p-1"
            />
          )}

          {subiendo && (
            <span className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/90">
              <span
                className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-primary"
                aria-hidden="true"
              />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-on-surface">
            Escudo del rival
          </p>

          <p className="mt-0.5 text-xs leading-5 text-on-surface-variant">
            Puedes utilizar el escudo de la
            FBIB o subir uno manualmente.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={abrirSelector}
          disabled={
            deshabilitado ||
            subiendo
          }
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat"
            style={{
              maskImage:
                "url('/iconos/panel/imagen.svg')",
              WebkitMaskImage:
                "url('/iconos/panel/imagen.svg')",
            }}
            aria-hidden="true"
          />

          {subiendo
            ? "Subiendo..."
            : logoActual
              ? "Sustituir escudo"
              : "Subir escudo"}
        </button>

        {logoActual && (
          <button
            type="button"
            onClick={eliminarLogo}
            disabled={
              deshabilitado ||
              subiendo
            }
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-error/40 px-4 py-2 text-sm font-bold text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50"
          >
            Quitar escudo
          </button>
        )}
      </div>

      {error && (
        <p
          className="mt-3 rounded-lg bg-error-container px-3 py-2 text-xs font-medium text-on-error-container"
          role="alert"
        >
          {error}
        </p>
      )}

      {errorImagen &&
        logoActual && (
          <p
            className="mt-3 rounded-lg bg-error-container px-3 py-2 text-xs font-medium text-on-error-container"
            role="alert"
          >
            No se ha podido mostrar el
            escudo seleccionado.
          </p>
        )}
    </div>
  );
}