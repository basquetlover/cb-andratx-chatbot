import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type {
  CredencialesCarnetSocio,
  ResultadoCrearCarnetSocio,
  SocioPanel,
} from "@tipos/SocioPanel";

export interface TemporadaDisponibleCarnet {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
}

interface Propiedades {
  socioId: string;

  temporadas:
    TemporadaDisponibleCarnet[];

  tiposSocio: string[];

  alCrear: (
    socio: SocioPanel,
  ) => void;

  alCancelar: () => void;
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaCreacion {
  ok: boolean;

  data:
    | ResultadoCrearCarnetSocio
    | null;

  error: string | null;

  errores?: ErrorCampo[];
}

export default function FormularioNuevoCarnetSocio({
  socioId,
  temporadas,
  tiposSocio,
  alCrear,
  alCancelar,
}: Propiedades) {
  const [
    temporadaId,
    setTemporadaId,
  ] = useState(
    temporadas[0]?.id ?? "",
  );

  const [
    tipoSocio,
    setTipoSocio,
  ] = useState(
    tiposSocio[0] ??
      "General",
  );

  const [
    estado,
    setEstado,
  ] = useState<
    "pendiente" | "activo"
  >("activo");

  const [
    fechaAlta,
    setFechaAlta,
  ] = useState(
    temporadas[0]
      ?.fechaInicio ?? "",
  );

  const [
    fechaCaducidad,
    setFechaCaducidad,
  ] = useState(
    temporadas[0]
      ?.fechaFin ?? "",
  );

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    erroresCampo,
    setErroresCampo,
  ] = useState<
    ErrorCampo[]
  >([]);

  const [
    resultadoCreacion,
    setResultadoCreacion,
  ] =
    useState<ResultadoCrearCarnetSocio | null>(
      null,
    );

  const [
    copiado,
    setCopiado,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    if (
      temporadas.length === 0
    ) {
      setTemporadaId("");
      setFechaAlta("");
      setFechaCaducidad("");

      return;
    }

    const temporadaActual =
      temporadas.find(
        (temporada) =>
          temporada.id ===
          temporadaId,
      );

    if (temporadaActual) {
      return;
    }

    const primeraTemporada =
      temporadas[0];

    setTemporadaId(
      primeraTemporada.id,
    );

    setFechaAlta(
      primeraTemporada.fechaInicio,
    );

    setFechaCaducidad(
      primeraTemporada.fechaFin,
    );
  }, [
    temporadas,
    temporadaId,
  ]);

  useEffect(() => {
    if (
      tiposSocio.includes(
        tipoSocio,
      )
    ) {
      return;
    }

    setTipoSocio(
      tiposSocio[0] ??
        "General",
    );
  }, [
    tiposSocio,
    tipoSocio,
  ]);

  function cambiarTemporada(
    nuevaTemporadaId: string,
  ): void {
    setTemporadaId(
      nuevaTemporadaId,
    );

    const temporada =
      temporadas.find(
        (elemento) =>
          elemento.id ===
          nuevaTemporadaId,
      );

    if (!temporada) {
      return;
    }

    setFechaAlta(
      temporada.fechaInicio,
    );

    setFechaCaducidad(
      temporada.fechaFin,
    );
  }

  function obtenerErrorCampo(
    campo: string,
  ): string | null {
    return (
      erroresCampo.find(
        (elemento) =>
          elemento.campo ===
            campo ||
          elemento.campo.endsWith(
            `.${campo}`,
          ),
      )?.mensaje ?? null
    );
  }

  async function crearCarnet(
    evento:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();

    if (
      guardando ||
      resultadoCreacion ||
      !temporadaId
    ) {
      return;
    }

    setGuardando(true);
    setError(null);
    setErroresCampo([]);

    try {
      const respuesta =
        await fetch(
          `/api/panel/socios/${encodeURIComponent(
            socioId,
          )}/carnets`,
          {
            method: "POST",
            credentials:
              "same-origin",
            headers: {
              Accept:
                "application/json",
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                temporadaId,
                tipoSocio,
                estado,
                fechaAlta,
                fechaCaducidad,
              }),
          },
        );

      const contenido =
        (await respuesta.json()) as
          RespuestaCreacion;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data
      ) {
        setErroresCampo(
          Array.isArray(
            contenido.errores,
          )
            ? contenido.errores
            : [],
        );

        throw new Error(
          contenido.error ||
            "No se ha podido crear el carnet.",
        );
      }

      setResultadoCreacion(
        contenido.data,
      );

      alCrear(
        contenido.data.socio,
      );
    } catch (error) {
      console.error(
        "Error creando el carnet del socio:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se ha podido crear el carnet.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function copiarTexto(
    texto: string,
    identificador: string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        texto,
      );

      setCopiado(
        identificador,
      );

      window.setTimeout(
        () => {
          setCopiado(
            (actual) =>
              actual ===
              identificador
                ? null
                : actual,
          );
        },
        1800,
      );
    } catch (error) {
      console.error(
        "No se ha podido copiar el texto:",
        error,
      );

      setError(
        "No se ha podido copiar el valor.",
      );
    }
  }

  function renderizarCredencial({
    etiqueta,
    valor,
    identificador,
  }: {
    etiqueta: string;
    valor: string;
    identificador: string;
  }) {
    return (
      <div className="border-t border-on-primary-fixed/20 pt-4 first:border-t-0 first:pt-0">
        <dt className="text-xs font-bold uppercase tracking-wide opacity-70">
          {etiqueta}
        </dt>

        <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="break-all font-mono text-xl font-bold">
            {valor}
          </span>

          <button
            type="button"
            onClick={() =>
              void copiarTexto(
                valor,
                identificador,
              )
            }
            className="w-fit rounded-lg border border-on-primary-fixed/30 px-3 py-1.5 text-xs font-bold"
          >
            {copiado ===
            identificador
              ? "Copiado"
              : "Copiar"}
          </button>
        </dd>
      </div>
    );
  }

  if (resultadoCreacion) {
    const {
      carnet,
      credenciales,
      emailEnviado,
    } = resultadoCreacion;

    const datosAcceso:
      Array<{
        etiqueta: string;
        valor: string;
        identificador: string;
      }> = [
        {
          etiqueta:
            "Usuario",
          valor:
            credenciales.email,
          identificador:
            "email",
        },
        {
          etiqueta:
            "Número de socio de la temporada",
          valor:
            String(
              credenciales.numeroSocio,
            ),
          identificador:
            "numero-socio",
        },
        {
          etiqueta:
            "Número del nuevo carnet",
          valor:
            credenciales.numeroCarnet,
          identificador:
            "numero-carnet",
        },
        {
          etiqueta:
            "Contraseña del nuevo carnet",
          valor:
            credenciales.passwordCarnet,
          identificador:
            "password",
        },
      ];

    return (
      <section className="overflow-hidden rounded-2xl border border-success/40 bg-surface-container-lowest shadow-sm">
        <header className="bg-success px-5 py-5 text-on-success">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">
            Carnet creado
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Nueva temporada añadida
          </h3>

          <p className="mt-2 text-sm leading-6 opacity-90">
            Se han generado unas credenciales
            nuevas para este carnet.
          </p>
        </header>

        <div className="grid gap-4 p-5">
          <div className="rounded-2xl border border-primary/30 bg-primary-fixed p-5 text-on-primary-fixed">
            <dl className="grid gap-4">
              {datosAcceso.map(
                (dato) => (
                  <div
                    key={
                      dato.identificador
                    }
                  >
                    {renderizarCredencial(
                      dato,
                    )}
                  </div>
                ),
              )}
            </dl>
          </div>

          <div
            className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
              emailEnviado
                ? "border-success/30 bg-success/10 text-success"
                : "border-outline-variant bg-surface-container-low text-on-surface-variant"
            }`}
          >
            {emailEnviado
              ? "El correo con las nuevas credenciales se ha enviado correctamente."
              : carnet.estado ===
                    "activo"
                ? "No se ha podido enviar el correo. Conserva estas credenciales para facilitárselas al socio."
                : "El carnet está pendiente. El correo con sus credenciales se enviará cuando sea activado."}
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm leading-6 text-on-surface-variant">
            <strong className="text-on-surface">
              Estas credenciales solo
              corresponden a este carnet.
            </strong>{" "}
            El carnet anterior permanece en
            el historial, pero su contraseña
            no permite acceder al carnet de
            esta nueva temporada.
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={alCancelar}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed-dim"
            >
              Cerrar
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (
    temporadas.length === 0
  ) {
    return (
      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
        <h3 className="font-bold text-on-surface">
          No hay temporadas disponibles
        </h3>

        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          Este socio ya tiene un carnet
          asociado a todas las temporadas
          disponibles.
        </p>

        <button
          type="button"
          onClick={alCancelar}
          className="mt-4 rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container"
        >
          Cerrar
        </button>
      </section>
    );
  }

  return (
    <form
      onSubmit={crearCarnet}
      className="overflow-hidden rounded-2xl border border-primary/40 bg-surface-container-lowest shadow-sm"
    >
      <header className="border-b border-outline-variant/60 bg-primary-fixed px-5 py-5 text-on-primary-fixed">
        <h3 className="text-lg font-bold">
          Crear carnet para otra
          temporada
        </h3>

        <p className="mt-1 text-sm leading-6">
          El historial anterior se
          conservará y se generarán un
          número y una contraseña nuevos
          para la temporada seleccionada.
        </p>
      </header>

      <fieldset
        disabled={guardando}
        className="grid gap-5 p-5 sm:grid-cols-2 disabled:opacity-75"
      >
        <label className="grid gap-1.5 sm:col-span-2">
          <span className="text-sm font-bold text-on-surface">
            Temporada
          </span>

          <select
            value={temporadaId}
            onChange={(evento) =>
              cambiarTemporada(
                evento.target.value,
              )
            }
            required
            className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
          >
            {temporadas.map(
              (temporada) => (
                <option
                  key={
                    temporada.id
                  }
                  value={
                    temporada.id
                  }
                >
                  {
                    temporada.nombre
                  }

                  {temporada.activa
                    ? " · Activa"
                    : ""}
                </option>
              ),
            )}
          </select>

          {obtenerErrorCampo(
            "temporadaId",
          ) && (
            <span className="text-xs text-error">
              {obtenerErrorCampo(
                "temporadaId",
              )}
            </span>
          )}
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-on-surface">
            Tipo de socio
          </span>

          <select
            value={tipoSocio}
            onChange={(evento) =>
              setTipoSocio(
                evento.target.value,
              )
            }
            required
            className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
          >
            {tiposSocio.map(
              (tipo) => (
                <option
                  key={tipo}
                  value={tipo}
                >
                  {tipo}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-on-surface">
            Estado inicial
          </span>

          <select
            value={estado}
            onChange={(evento) =>
              setEstado(
                evento.target
                  .value as
                  | "pendiente"
                  | "activo",
              )
            }
            className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
          >
            <option value="activo">
              Activo
            </option>

            <option value="pendiente">
              Pendiente
            </option>
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-on-surface">
            Fecha de alta
          </span>

          <input
            type="date"
            value={fechaAlta}
            onChange={(evento) =>
              setFechaAlta(
                evento.target.value,
              )
            }
            required
            className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
          />

          {obtenerErrorCampo(
            "fechaAlta",
          ) && (
            <span className="text-xs text-error">
              {obtenerErrorCampo(
                "fechaAlta",
              )}
            </span>
          )}
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-on-surface">
            Fecha de caducidad
          </span>

          <input
            type="date"
            value={fechaCaducidad}
            onChange={(evento) =>
              setFechaCaducidad(
                evento.target.value,
              )
            }
            required
            className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
          />

          {obtenerErrorCampo(
            "fechaCaducidad",
          ) && (
            <span className="text-xs text-error">
              {obtenerErrorCampo(
                "fechaCaducidad",
              )}
            </span>
          )}
        </label>
      </fieldset>

      {error && (
        <div className="px-5 pb-5">
          <p
            className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container"
            role="alert"
          >
            {error}
          </p>
        </div>
      )}

      <footer className="flex flex-col gap-3 border-t border-outline-variant/60 bg-surface-container-low px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={alCancelar}
          disabled={guardando}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={
            guardando ||
            !temporadaId
          }
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed-dim disabled:opacity-50"
        >
          {guardando
            ? "Creando carnet..."
            : "Crear carnet"}
        </button>
      </footer>
    </form>
  );
}