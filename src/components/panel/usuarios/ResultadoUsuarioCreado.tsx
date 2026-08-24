import { useEffect, useRef, useState } from "react";

interface DatosUsuarioCreado {
  usuarioId: string;
  nombreCompleto: string;
  email: string;
  estado: string;
  enlaceInvitacion?: string;
  emailEnviado: boolean;
}

interface Propiedades {
  resultado: DatosUsuarioCreado;
  alCrearOtro: () => void;
}

export default function ResultadoUsuarioCreado({ resultado, alCrearOtro }: Propiedades) {
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);
  const temporizadorRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (temporizadorRef.current !== null) {
        window.clearTimeout(temporizadorRef.current);
      }
    };
  }, []);

  const copiarEnlaceInvitacion = async () => {
    if (!resultado.enlaceInvitacion) {
      return;
    }

    try {
      await navigator.clipboard.writeText(resultado.enlaceInvitacion);

      setEnlaceCopiado(true);

      if (temporizadorRef.current !== null) {
        window.clearTimeout(temporizadorRef.current);
      }

      temporizadorRef.current = window.setTimeout(() => {
        setEnlaceCopiado(false);
      }, 3000);
    } catch (error) {
      console.error("No se ha podido copiar el enlace de invitación:", error);
    }
  };

  return (
    <section className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-[0_18px_50px_rgba(0,60,90,0.12)]">
      <div className="border-b border-outline-variant/60 bg-gradient-to-br from-primary-fixed/70 to-surface-container-lowest px-5 py-8 text-center sm:px-8">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-8 border-success-container bg-success text-on-success">
          <span className="inline-block h-7 w-7 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/correcto.svg')", WebkitMaskImage: "url('/iconos/panel/correcto.svg')" }} aria-hidden="true" />
        </span>

        <h2 className="mt-4 text-2xl font-bold text-on-surface">Usuario creado</h2>
        <p className="mt-1 text-sm text-on-surface-variant">El perfil de {resultado.nombreCompleto} se ha registrado correctamente.</p>
      </div>

      <div className="p-5 sm:p-8">
        <h3 className="font-bold text-on-surface">Estado de activación</h3>

        <ol className="relative mt-5 flex flex-col gap-5 before:absolute before:bottom-4 before:left-2.75 before:top-4 before:w-0.5 before:bg-outline-variant">
          <li className="relative flex items-start gap-3">
            <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-on-success">
              <span className="inline-block h-3.5 w-3.5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/correcto.svg')", WebkitMaskImage: "url('/iconos/panel/correcto.svg')" }} aria-hidden="true" />
            </span>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface">Perfil creado</p>
              <p className="mt-0.5 text-sm text-on-surface-variant">Los datos básicos, permisos y equipos se han registrado.</p>
            </div>
          </li>

          <li className="relative flex items-start gap-3">
            <span className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${resultado.emailEnviado ? "bg-success text-on-success" : "bg-tertiary-fixed text-on-tertiary-fixed"}`}>
              <span className="inline-block h-3.5 w-3.5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: `url('/iconos/panel/${resultado.emailEnviado ? "correcto" : "pendiente"}.svg')`, WebkitMaskImage: `url('/iconos/panel/${resultado.emailEnviado ? "correcto" : "pendiente"}.svg')` }} aria-hidden="true" />
            </span>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface">{resultado.emailEnviado ? "Invitación enviada" : "Invitación pendiente de envío"}</p>
              <p className="mt-0.5 text-sm text-on-surface-variant">{resultado.emailEnviado ? `La invitación se ha enviado a ${resultado.email}.` : "El perfil está creado, pero todavía no se ha enviado el correo de invitación."}</p>
            </div>
          </li>

          <li className="relative flex items-start gap-3">
            <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
              <span className="inline-block h-3.5 w-3.5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/pendiente.svg')", WebkitMaskImage: "url('/iconos/panel/pendiente.svg')" }} aria-hidden="true" />
            </span>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-on-surface">Pendiente de contraseña</p>
                <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 text-[10px] font-bold uppercase text-on-tertiary-fixed">Pendiente</span>
              </div>

              <p className="mt-0.5 text-sm text-on-surface-variant">El usuario deberá establecer su contraseña mediante el enlace de activación.</p>
            </div>
          </li>
        </ol>

        <div className="my-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-outline-variant" />
          <span className="inline-block h-4 w-4 bg-tertiary mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/balon.svg')", WebkitMaskImage: "url('/iconos/panel/balon.svg')" }} />
          <span className="h-px flex-1 bg-outline-variant" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a href={`/panel/usuarios/${resultado.usuarioId}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-primary px-4 text-sm font-bold text-primary transition-colors hover:bg-primary-fixed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/usuario.svg')", WebkitMaskImage: "url('/iconos/panel/usuario.svg')" }} aria-hidden="true" />
            Ver usuario
          </a>

          <button type="button" onClick={alCrearOtro} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/añadir-usuario.svg')", WebkitMaskImage: "url('/iconos/panel/añadir-usuario.svg')" }} aria-hidden="true" />
            Crear otro usuario
          </button>
        </div>

        {resultado.enlaceInvitacion && (
          <div className="mt-3">
            <button type="button" onClick={copiarEnlaceInvitacion} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: `url('/iconos/panel/${enlaceCopiado ? "correcto" : "enlace"}.svg')`, WebkitMaskImage: `url('/iconos/panel/${enlaceCopiado ? "correcto" : "enlace"}.svg')` }} aria-hidden="true" />
              {enlaceCopiado ? "Enlace copiado" : "Copiar enlace de invitación"}
            </button>

            <p className="mt-1 text-center text-xs text-on-surface-variant">El enlace contiene un token privado. Compártelo únicamente con la persona invitada.</p>
          </div>
        )}
      </div>
    </section>
  );
}