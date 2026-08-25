import { useMemo, useState, type FormEvent } from "react";

import SelectorImagenPatrocinador from "@components/panel/patrocinadores/formulario/SelectorImagenPatrocinador";

interface Propiedades {
  patrocinadorId: string;
  nombrePatrocinador: string;
  logoInicial: string | null;
  bannerInicial: string | null;
  alActualizar: (logo: string | null, banner: string | null) => void;
}

interface RespuestaImagenes {
  ok: boolean;
  data?: {
    imagenes?: {
      logo: string | null;
      banner: string | null;
    };
  };
  error?: string;
}

export default function ImagenesPatrocinador({ patrocinadorId, nombrePatrocinador, logoInicial, bannerInicial, alActualizar }: Propiedades) {
  const [logoActual, setLogoActual] = useState(logoInicial);
  const [bannerActual, setBannerActual] = useState(bannerInicial);
  const [logoNuevo, setLogoNuevo] = useState<File | null>(null);
  const [bannerNuevo, setBannerNuevo] = useState<File | null>(null);
  const [eliminarLogo, setEliminarLogo] = useState(false);
  const [eliminarBanner, setEliminarBanner] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const hayCambios = useMemo(() => {
    return logoNuevo !== null || bannerNuevo !== null || eliminarLogo || eliminarBanner;
  }, [bannerNuevo, eliminarBanner, eliminarLogo, logoNuevo]);

  const cambiarLogo = (archivo: File | null) => {
    setLogoNuevo(archivo);

    if (archivo) {
      setEliminarLogo(false);
    }
  };

  const cambiarBanner = (archivo: File | null) => {
    setBannerNuevo(archivo);

    if (archivo) {
      setEliminarBanner(false);
    }
  };

  const descartar = () => {
    setLogoNuevo(null);
    setBannerNuevo(null);
    setEliminarLogo(false);
    setEliminarBanner(false);
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

    const formulario = new FormData();

    formulario.append(
      "datos",
      JSON.stringify({
        eliminarLogo,
        eliminarBanner,
      }),
    );

    if (logoNuevo) {
      formulario.append("logo", logoNuevo);
    }

    if (bannerNuevo) {
      formulario.append("banner", bannerNuevo);
    }

    try {
      const respuesta = await fetch(`/api/panel/patrocinadores/${encodeURIComponent(patrocinadorId)}/imagenes`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
        body: formulario,
      });

      const contenido = (await respuesta.json()) as RespuestaImagenes;

      if (!respuesta.ok || !contenido.ok || !contenido.data?.imagenes) {
        throw new Error(contenido.error ?? "No se han podido actualizar las imágenes");
      }

      const imagenes = contenido.data.imagenes;

      setLogoActual(imagenes.logo);
      setBannerActual(imagenes.banner);
      setLogoNuevo(null);
      setBannerNuevo(null);
      setEliminarLogo(false);
      setEliminarBanner(false);
      setMensaje("La identidad visual se ha actualizado.");
      alActualizar(imagenes.logo, imagenes.banner);
    } catch (error) {
      console.error("Error actualizando las imágenes:", error);
      setError(error instanceof Error ? error.message : "No se han podido actualizar las imágenes.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-on-surface">Identidad visual</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Cambia o elimina el logotipo y el banner del patrocinador.</p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {mensaje && <p className="rounded-xl border border-success/40 bg-success-container px-4 py-3 text-sm text-on-success-container" role="status">{mensaje}</p>}
        {error && <p className="rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">{error}</p>}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
            <h3 className="font-bold text-on-surface">Logotipo actual</h3>

            {logoActual && !eliminarLogo && !logoNuevo ? (
              <>
                <div className="mx-auto mt-4 aspect-square max-w-56 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
                  <img src={logoActual} alt={`Logotipo de ${nombrePatrocinador}`} className="h-full w-full object-contain p-4" />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setEliminarLogo(true)} disabled={guardando} className="rounded-xl border border-error px-4 py-2 text-sm font-bold text-error hover:bg-error-container">
                    Eliminar logotipo
                  </button>
                </div>
              </>
            ) : eliminarLogo ? (
              <div className="mt-4 rounded-xl border border-error/40 bg-error-container p-4 text-sm text-on-error-container">
                <p className="font-bold">El logotipo se eliminará al guardar</p>
                <button type="button" onClick={() => setEliminarLogo(false)} className="mt-3 font-bold underline">Cancelar eliminación</button>
              </div>
            ) : (
              <div className="mt-4">
                <SelectorImagenPatrocinador tipo="logo" archivo={logoNuevo} alCambiar={cambiarLogo} deshabilitado={guardando} />
              </div>
            )}

            {logoActual && !eliminarLogo && (
              <div className="mt-4">
                <SelectorImagenPatrocinador tipo="logo" archivo={logoNuevo} alCambiar={cambiarLogo} deshabilitado={guardando} />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
            <h3 className="font-bold text-on-surface">Banner actual</h3>

            {bannerActual && !eliminarBanner && !bannerNuevo ? (
              <>
                <div className="mt-4 aspect-12/5 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
                  <img src={bannerActual} alt={`Banner de ${nombrePatrocinador}`} className="h-full w-full object-cover" />
                </div>

                <button type="button" onClick={() => setEliminarBanner(true)} disabled={guardando} className="mt-4 rounded-xl border border-error px-4 py-2 text-sm font-bold text-error hover:bg-error-container">
                  Eliminar banner
                </button>
              </>
            ) : eliminarBanner ? (
              <div className="mt-4 rounded-xl border border-error/40 bg-error-container p-4 text-sm text-on-error-container">
                <p className="font-bold">El banner se eliminará al guardar</p>
                <button type="button" onClick={() => setEliminarBanner(false)} className="mt-3 font-bold underline">Cancelar eliminación</button>
              </div>
            ) : (
              <div className="mt-4">
                <SelectorImagenPatrocinador tipo="banner" archivo={bannerNuevo} alCambiar={cambiarBanner} deshabilitado={guardando} />
              </div>
            )}

            {bannerActual && !eliminarBanner && (
              <div className="mt-4">
                <SelectorImagenPatrocinador tipo="banner" archivo={bannerNuevo} alCambiar={cambiarBanner} deshabilitado={guardando} />
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/60 bg-surface-container-low p-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={descartar} disabled={!hayCambios || guardando} className="rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-2.5 text-sm font-bold text-on-surface-variant disabled:opacity-40">
          Descartar cambios
        </button>

        <button type="submit" disabled={!hayCambios || guardando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary disabled:opacity-40">
          {guardando && <span className="h-5 w-5 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />}
          {guardando ? "Guardando..." : "Guardar imágenes"}
        </button>
      </div>
    </form>
  );
}