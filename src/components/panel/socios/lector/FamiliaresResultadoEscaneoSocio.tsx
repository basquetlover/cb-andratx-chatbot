
import { useEffect, useState } from "react";

import type {
  FamiliarCarnetSocio,
  RespuestaFamiliaresCarnetSocio,
} from "@tipos/FamiliaresCarnetSocio";

interface Propiedades {
  socioId: string;
  carnetId: string;
  titular: string;
}

export default function FamiliaresResultadoEscaneoSocio({
  socioId,
  carnetId,
  titular,
}: Propiedades) {
  const [familiares, setFamiliares] =
    useState<FamiliarCarnetSocio[]>([]);

  const [cargando, setCargando] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const controlador = new AbortController();

    setFamiliares([]);
    setError(null);
    setCargando(true);

    const cargar = async () => {
      try {
        const ruta =
          `/api/panel/socios/${encodeURIComponent(socioId)}` +
          `/carnets/${encodeURIComponent(carnetId)}/familiares`;

        const respuesta = await fetch(ruta, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controlador.signal,
          headers: {
            Accept: "application/json",
          },
        });

        const contenido =
          (await respuesta.json()) as
            RespuestaFamiliaresCarnetSocio;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !Array.isArray(contenido.data?.familiares)
        ) {
          throw new Error(
            contenido.error ||
              "No se han podido consultar los familiares.",
          );
        }

        if (!controlador.signal.aborted) {
          setFamiliares(contenido.data.familiares);
        }
      } catch (capturado) {
        if (!controlador.signal.aborted) {
          setError(
            capturado instanceof Error
              ? capturado.message
              : "No se han podido cargar los familiares.",
          );
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    };

    void cargar();

    return () => controlador.abort();
  }, [socioId, carnetId]);

  return (
    <section className="mt-4 min-w-0 rounded-xl border border-primary/20 bg-primary-container/20 p-3 sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-on-surface">
          Personas incluidas en este carnet
        </h4>

        {!cargando && !error && (
          <span className="rounded-full bg-primary-container px-2.5 py-1 text-xs font-bold text-on-primary-container">
            {familiares.length + 1} persona
            {familiares.length === 0 ? "" : "s"}
          </span>
        )}
      </div>

      <ul className="mt-3 grid min-w-0 gap-2">
        <li className="flex min-w-0 flex-wrap items-start justify-between gap-2 rounded-lg border border-primary/20 bg-surface-container-lowest px-3 py-2">
          <span className="min-w-0 break-words text-sm font-semibold text-on-surface">
            {titular}
          </span>

          <span className="shrink-0 text-xs font-bold text-primary">
            Titular
          </span>
        </li>

        {familiares.map((familiar) => (
          <li
            key={familiar.id}
            className="min-w-0 break-words rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface"
          >
            {familiar.nombreCompleto}
          </li>
        ))}
      </ul>

      {cargando && (
        <p
          role="status"
          className="mt-3 text-xs text-on-surface-variant"
        >
          Consultando los familiares del carnet...
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 text-xs font-semibold text-error"
        >
          No se ha podido cargar la lista de
          familiares: {error}
        </p>
      )}

      {!cargando &&
        !error &&
        familiares.length === 0 && (
          <p className="mt-3 text-xs text-on-surface-variant">
            No hay familiares adicionales
            registrados en esta temporada.
          </p>
        )}
    </section>
  );
}
