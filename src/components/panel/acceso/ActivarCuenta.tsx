import { useEffect, useMemo, useState } from "react";

interface InvitacionActivacion {
  nombre: string;
  email: string;
  cargo: string | null;
  expiresAt: string;
}

interface RespuestaComprobarInvitacion {
  ok: boolean;
  data?: InvitacionActivacion;
  error?: string;
}

interface RespuestaActivarCuenta {
  ok: boolean;
  data?: {
    nombre: string;
    email: string;
    bienvenidaEnviada: boolean;
  };
  error?: string;
}

function calcularFortaleza(password: string): number {
  let puntuacion = 0;

  if (password.length >= 8) {
    puntuacion += 1;
  }

  if (password.length >= 16) {
    puntuacion += 1;
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    puntuacion += 1;
  }

  if (/\d/.test(password)) {
    puntuacion += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    puntuacion += 1;
  }

  return Math.min(puntuacion, 4);
}

export default function ActivarCuenta() {
  const [token, setToken] = useState<string | null>(null);
  const [urlProcesada, setUrlProcesada] = useState(false);

  const [comprobando, setComprobando] = useState(true);
  const [invitacion, setInvitacion] = useState<InvitacionActivacion | null>(null);
  const [errorInvitacion, setErrorInvitacion] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [activando, setActivando] = useState(false);
  const [resultado, setResultado] = useState<RespuestaActivarCuenta["data"] | null>(null);

  const fortaleza = useMemo(() => calcularFortaleza(password), [password]);
  const longitudValida = password.length >= 8 && password.length <= 128;
  const coinciden = password === confirmarPassword && confirmarPassword.length > 0;

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const tokenRecibido = parametros.get("token")?.trim() || null;

    setToken(tokenRecibido);
    setUrlProcesada(true);
  }, []);

  useEffect(() => {
    if (!token) {
      setComprobando(false);
      setErrorInvitacion("El enlace de activación no contiene un token válido.");
      return;
    }

    const controlador = new AbortController();

    const comprobarInvitacion = async () => {
      try {
        setComprobando(true);
        setErrorInvitacion(null);

        const parametros = new URLSearchParams({
          token,
        });

        const respuesta = await fetch(`/api/acceso/activar-cuenta?${parametros.toString()}`, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controlador.signal,
        });

        const contenido = (await respuesta.json()) as RespuestaComprobarInvitacion;

        if (!respuesta.ok || !contenido.ok || !contenido.data) {
          throw new Error(contenido.error ?? "La invitación no es válida.");
        }

        setInvitacion(contenido.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Error al comprobar la invitación:", error);
        setErrorInvitacion(error instanceof Error ? error.message : "No se ha podido comprobar la invitación.");
      } finally {
        if (!controlador.signal.aborted) {
          setComprobando(false);
        }
      }
    };

    comprobarInvitacion();

    return () => {
      controlador.abort();
    };
  }, [token]);

  const activarCuenta = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (!token || activando) {
      return;
    }

    setErrorFormulario(null);

    if (!longitudValida) {
      setErrorFormulario("La contraseña debe contener entre 8 y 128 caracteres.");
      return;
    }

    if (!coinciden) {
      setErrorFormulario("Las contraseñas no coinciden.");
      return;
    }

    try {
      setActivando(true);

      const respuesta = await fetch("/api/acceso/activar-cuenta", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          confirmarPassword,
        }),
      });

      const contenido = (await respuesta.json()) as RespuestaActivarCuenta;

      if (!respuesta.ok || !contenido.ok || !contenido.data) {
        throw new Error(contenido.error ?? "No se ha podido activar la cuenta.");
      }

      setResultado(contenido.data);
      setPassword("");
      setConfirmarPassword("");
    } catch (error) {
      console.error("Error al activar la cuenta:", error);
      setErrorFormulario(error instanceof Error ? error.message : "No se ha podido activar la cuenta.");
    } finally {
      setActivando(false);
    }
  };

  if (comprobando) {
    return (
      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-8 text-center shadow-[0_18px_50px_rgba(0,60,90,0.12)]">
        <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-primary-fixed border-t-primary" aria-hidden="true" />
        <h1 className="mt-5 text-xl font-bold text-on-surface">Comprobando invitación</h1>
        <p className="mt-2 text-sm text-on-surface-variant">Espera un momento mientras verificamos tu enlace de acceso.</p>
      </section>
    );
  }

  if (errorInvitacion || !invitacion) {
    return (
      <section className="rounded-2xl border border-error/30 bg-surface-container-lowest p-6 text-center shadow-[0_18px_50px_rgba(0,60,90,0.12)] sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-container text-error">
          <span className="inline-block h-7 w-7 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/error.svg')", WebkitMaskImage: "url('/iconos/panel/error.svg')" }} aria-hidden="true" />
        </span>

        <h1 className="mt-4 text-2xl font-bold text-on-surface">No se puede utilizar esta invitación</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">{errorInvitacion ?? "El enlace no es válido."}</p>

        <p className="mt-5 text-sm text-on-surface-variant">Pide a una persona autorizada del club que genere una nueva invitación.</p>

        <a href="/" className="mt-6 inline-flex h-11 items-center justify-center rounded-lg border border-primary px-5 text-sm font-bold text-primary transition-colors hover:bg-primary-fixed">
          Volver a la web
        </a>
      </section>
    );
  }

  if (resultado) {
    return (
      <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-[0_18px_50px_rgba(0,60,90,0.12)]">
        <div className="bg-gradient-to-br from-primary-fixed to-surface-container-lowest px-6 py-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-8 border-success-container bg-success text-on-success">
            <span className="inline-block h-7 w-7 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/correcto.svg')", WebkitMaskImage: "url('/iconos/panel/correcto.svg')" }} aria-hidden="true" />
          </span>

          <h1 className="mt-4 text-2xl font-bold text-on-surface">Cuenta activada</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Tu contraseña se ha establecido correctamente, {resultado.nombre}.</p>
        </div>

        <div className="p-6 text-center sm:p-8">
          <p className="text-sm text-on-surface-variant">Ya puedes acceder al panel de gestión con tu correo electrónico y la contraseña que acabas de crear.</p>

          {!resultado.bienvenidaEnviada && <p className="mt-4 rounded-lg bg-tertiary-fixed/50 p-3 text-sm text-on-tertiary-fixed-variant">La cuenta está activa, aunque no se ha podido enviar el correo de bienvenida.</p>}

          <a href="/panel/iniciar-sesion" className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container sm:w-auto">
            Iniciar sesión
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-[0_18px_50px_rgba(0,60,90,0.12)]">
      <div className="border-b border-outline-variant/60 bg-surface-container-low px-5 py-5 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Activación de cuenta</p>
        <h1 className="mt-1 text-2xl font-bold text-on-surface">Establece tu contraseña</h1>
        <p className="mt-2 text-sm text-on-surface-variant">Hola, {invitacion.nombre}. Completa este último paso para activar tu acceso.</p>
      </div>

      <form onSubmit={activarCuenta} className="p-5 sm:p-8">
        <div className="rounded-xl border border-primary/20 bg-primary-fixed/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-on-primary-fixed-variant">Cuenta que vas a activar</p>
          <p className="mt-1 font-bold text-on-primary-container">{invitacion.email}</p>
          {invitacion.cargo && <p className="mt-0.5 text-sm text-on-primary-fixed-variant">{invitacion.cargo}</p>}
        </div>

        <div className="mt-6 flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Nueva contraseña</span>

            <span className="relative block">
              <input type={mostrarPassword ? "text" : "password"} value={password} onChange={(evento) => setPassword(evento.target.value)} minLength={8} maxLength={128} autoComplete="new-password" className="h-12 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 pr-12 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" />

              <button type="button" onClick={() => setMostrarPassword((valor) => !valor)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: `url('/iconos/panel/${mostrarPassword ? "ocultar" : "mostrar"}.svg')`, WebkitMaskImage: `url('/iconos/panel/${mostrarPassword ? "ocultar" : "mostrar"}.svg')` }} aria-hidden="true" />
              </button>
            </span>
          </label>

          <div>
            <div className="grid grid-cols-4 gap-2" aria-label="Fortaleza de la contraseña">
              {[1, 2, 3, 4].map((nivel) => (
                <span key={nivel} className={`h-1.5 rounded-full ${fortaleza >= nivel ? (fortaleza <= 1 ? "bg-error" : fortaleza === 2 ? "bg-tertiary" : "bg-success") : "bg-surface-container-high"}`} />
              ))}
            </div>

            <p className="mt-2 text-xs text-on-surface-variant">Utiliza al menos 8 caracteres. Una frase larga es más segura y fácil de recordar.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Confirmar contraseña</span>

            <span className="relative block">
              <input type={mostrarConfirmacion ? "text" : "password"} value={confirmarPassword} onChange={(evento) => setConfirmarPassword(evento.target.value)} minLength={12} maxLength={128} autoComplete="new-password" className="h-12 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 pr-12 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" />

              <button type="button" onClick={() => setMostrarConfirmacion((valor) => !valor)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container" aria-label={mostrarConfirmacion ? "Ocultar contraseña" : "Mostrar contraseña"}>
                <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: `url('/iconos/panel/${mostrarConfirmacion ? "ocultar" : "mostrar"}.svg')`, WebkitMaskImage: `url('/iconos/panel/${mostrarConfirmacion ? "ocultar" : "mostrar"}.svg')` }} aria-hidden="true" />
              </button>
            </span>
          </label>
        </div>

        {errorFormulario && (
          <div className="mt-5 rounded-lg border border-error/30 bg-error-container p-3" role="alert">
            <p className="text-sm font-semibold text-on-error-container">{errorFormulario}</p>
          </div>
        )}

        <button type="submit" disabled={activando || !longitudValida || !coinciden} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-45">
          {activando ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" aria-hidden="true" />
              Activando cuenta...
            </>
          ) : (
            "Establecer contraseña y activar cuenta"
          )}
        </button>
      </form>
    </section>
  );
}