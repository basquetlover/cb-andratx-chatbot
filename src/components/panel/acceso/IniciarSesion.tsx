import { useState, type FormEvent } from "react";

interface RespuestaInicioSesion {
  ok: boolean;
  data: {
    redirectUrl?: string;
  } | null;
  error: string | null;
}

export default function IniciarSesion() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mantenerSesion, setMantenerSesion] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formularioValido = email.trim().length > 0 && password.length > 0 && !enviando;

  const iniciarSesion = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (!formularioValido) {
      return;
    }

    try {
      setEnviando(true);
      setError(null);

      const respuesta = await fetch("/api/acceso/iniciar-sesion", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          mantenerSesion,
        }),
      });

      const contenido = (await respuesta.json()) as RespuestaInicioSesion;

      if (!respuesta.ok || !contenido.ok) {
        throw new Error(contenido.error ?? "No se ha podido iniciar sesión.");
      }

      window.location.assign(contenido.data?.redirectUrl ?? "/panel");
    } catch (error) {
      console.error("Error iniciando sesión:", error);

      setError(error instanceof Error ? error.message : "No se ha podido iniciar sesión.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-outline-variant/70 bg-surface-container-lowest shadow-[0_18px_50px_rgba(0,80,107,0.10)]">
        <div className="border-b border-outline-variant/60 bg-surface-container px-6 py-7 text-center sm:px-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
            <img src="/favicon.png" alt="Escudo del C.B. Andratx" className="h-16 w-16 object-contain" />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-on-surface">Acceso al panel</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Introduce tus datos para acceder a la gestión del C.B. Andratx.</p>
        </div>

        <form onSubmit={iniciarSesion} className="p-6 sm:p-8" noValidate>
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-error/40 bg-error-container px-4 py-3 text-on-error-container" role="alert">
              <span className="mt-0.5 inline-block h-5 w-5 shrink-0 bg-error mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/error.svg')", WebkitMaskImage: "url('/iconos/panel/error.svg')" }} aria-hidden="true" />

              <div className="min-w-0">
                <p className="text-sm font-bold">No se ha podido iniciar sesión</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-on-surface">Correo electrónico</span>

              <span className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 inline-block h-5 w-5 -translate-y-1/2 bg-outline mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/email.svg')", WebkitMaskImage: "url('/iconos/panel/email.svg')" }} aria-hidden="true" />

                <input type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} autoComplete="email" inputMode="email" required disabled={enviando} placeholder="nombre@ejemplo.com" className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60" />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-on-surface">Contraseña</span>

              <span className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 inline-block h-5 w-5 -translate-y-1/2 bg-outline mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/seguridad.svg')", WebkitMaskImage: "url('/iconos/panel/seguridad.svg')" }} aria-hidden="true" />

                <input type={mostrarPassword ? "text" : "password"} value={password} onChange={(evento) => setPassword(evento.target.value)} autoComplete="current-password" required disabled={enviando} placeholder="Introduce tu contraseña" className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-11 pr-12 text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60" />

                <button type="button" onClick={() => setMostrarPassword((valorActual) => !valorActual)} disabled={enviando} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={mostrarPassword}>
                  <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: `url('/iconos/panel/${mostrarPassword ? "ocultar" : "mostrar"}.svg')`, WebkitMaskImage: `url('/iconos/panel/${mostrarPassword ? "ocultar" : "mostrar"}.svg')` }} aria-hidden="true" />
                </button>
              </span>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-on-surface-variant">
              <input type="checkbox" checked={mantenerSesion} onChange={(evento) => setMantenerSesion(evento.target.checked)} disabled={enviando} className="h-4 w-4 rounded border-outline-variant accent-primary" />

              <span>Mantener la sesión iniciada</span>
            </label>

            <a href="/panel/recuperar-password" className="text-sm font-semibold text-primary transition-colors hover:text-on-primary-container hover:underline">
              ¿Has olvidado la contraseña?
            </a>
          </div>

          <button type="submit" disabled={!formularioValido} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-on-primary shadow-sm transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-50">
            {enviando ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" aria-hidden="true" />
                <span>Comprobando acceso...</span>
              </>
            ) : (
              <>
                <span>Iniciar sesión</span>
                <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/siguiente.svg')", WebkitMaskImage: "url('/iconos/panel/siguiente.svg')" }} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-outline-variant/60 bg-surface-container-low px-6 py-4 text-center">
          <p className="text-xs text-on-surface-variant">El acceso está reservado a personas autorizadas por el C.B. Andratx.</p>
        </div>
      </div>

      <a href="/" className="mx-auto mt-6 flex w-max items-center gap-2 text-sm font-semibold text-primary transition-colors hover:underline">
        <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/volver.svg')", WebkitMaskImage: "url('/iconos/panel/volver.svg')" }} aria-hidden="true" />
        Volver a la web
      </a>
    </section>
  );
}