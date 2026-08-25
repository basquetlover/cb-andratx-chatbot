import { useMemo, useState, type FormEvent } from "react";

import RedesPatrocinador from "@components/panel/patrocinadores/formulario/RedesPatrocinador";

import type { RedSocialPatrocinador } from "@tipos/PatrocinadorPanel";

interface Propiedades {
  patrocinadorId: string;
  redesIniciales: RedSocialPatrocinador[];
  alActualizar: (redes: RedSocialPatrocinador[]) => void;
}

interface RespuestaRedes {
  ok: boolean;
  data?: {
    redes?: RedSocialPatrocinador[];
  };
  error?: string;
}

function copiarRedes(redes: RedSocialPatrocinador[]): RedSocialPatrocinador[] {
  return redes.map((red) => ({
    ...red,
  }));
}

function serializarRedes(redes: RedSocialPatrocinador[]): string {
  return JSON.stringify(
    redes.map((red, indice) => ({
      id: red.id,
      nombre: red.nombre,
      usuario: red.usuario?.trim() || null,
      url: red.url.trim(),
      icono: red.icono,
      activo: red.activo,
      orden: indice + 1,
    })),
  );
}

export default function RedesSocialesPatrocinador({ patrocinadorId, redesIniciales, alActualizar }: Propiedades) {
  const [redesGuardadas, setRedesGuardadas] = useState(() => copiarRedes(redesIniciales));
  const [redes, setRedes] = useState(() => copiarRedes(redesIniciales));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const hayCambios = useMemo(() => {
    return serializarRedes(redes) !== serializarRedes(redesGuardadas);
  }, [redes, redesGuardadas]);

  const cambiarRedes = (nuevasRedes: RedSocialPatrocinador[]) => {
    setRedes(nuevasRedes);
    setError(null);
    setMensaje(null);
  };

  const descartarCambios = () => {
    setRedes(copiarRedes(redesGuardadas));
    setError(null);
    setMensaje(null);
  };

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (!hayCambios || guardando) {
      return;
    }

    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      const respuesta = await fetch(`/api/panel/patrocinadores/${encodeURIComponent(patrocinadorId)}/redes`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redes,
        }),
      });

      const contenido = (await respuesta.json()) as RespuestaRedes;

      if (!respuesta.ok || !contenido.ok || !contenido.data?.redes) {
        throw new Error(contenido.error ?? "No se han podido actualizar las redes sociales");
      }

      const redesActualizadas = copiarRedes(contenido.data.redes);

      setRedes(redesActualizadas);
      setRedesGuardadas(redesActualizadas);
      setMensaje("Las redes sociales se han actualizado.");
      alActualizar(redesActualizadas);
    } catch (error) {
      console.error("Error actualizando las redes sociales:", error);
      setError(error instanceof Error ? error.message : "No se han podido actualizar las redes sociales.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Redes sociales</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Gestiona los enlaces públicos del patrocinador.</p>
          </div>

          <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold text-on-primary-fixed-variant">{redes.length} redes</span>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {mensaje && <p className="rounded-xl border border-success/40 bg-success-container px-4 py-3 text-sm text-on-success-container" role="status">{mensaje}</p>}
        {error && <p className="rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">{error}</p>}

        <RedesPatrocinador redes={redes} alCambiar={cambiarRedes} deshabilitado={guardando} />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/60 bg-surface-container-low p-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={descartarCambios} disabled={!hayCambios || guardando} className="rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-2.5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40">
          Descartar cambios
        </button>

        <button type="submit" disabled={!hayCambios || guardando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          {guardando && <span className="h-5 w-5 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" aria-hidden="true" />}
          {guardando ? "Guardando..." : "Guardar redes"}
        </button>
      </div>
    </form>
  );
}