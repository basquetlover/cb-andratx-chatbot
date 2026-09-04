import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

type EstadoCarnet =
  | "pendiente"
  | "activo";

interface TemporadaOpcion {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
}

interface CredencialesCreadas {
  socioId: string;
  email: string;

  numeroSocio: number;
  numeroCarnet: string;
  passwordCarnet: string;

  emailEnviado: boolean;
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaApi {
  ok: boolean;
  data: unknown;
  error: string | null;
  errores?: ErrorCampo[];
}

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function convertirTexto(
  valor: unknown,
): string {
  if (
    typeof valor === "string" ||
    typeof valor === "number"
  ) {
    return String(valor).trim();
  }

  return "";
}

function convertirNumero(
  valor: unknown,
): number | null {
  if (
    typeof valor === "number" &&
    Number.isSafeInteger(valor) &&
    valor >= 1
  ) {
    return valor;
  }

  if (
    typeof valor === "string"
  ) {
    const numero =
      Number(valor);

    if (
      Number.isSafeInteger(numero) &&
      numero >= 1
    ) {
      return numero;
    }
  }

  return null;
}

function convertirTemporada(
  valor: unknown,
): TemporadaOpcion | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const id =
    convertirTexto(
      valor.id,
    );

  if (!id) {
    return null;
  }

  return {
    id,

    nombre:
      convertirTexto(
        valor.nombre,
      ) || "Temporada",

    fechaInicio:
      convertirTexto(
        valor.fechaInicio ??
          valor.fecha_inicio,
      ),

    fechaFin:
      convertirTexto(
        valor.fechaFin ??
          valor.fecha_fin,
      ),

    activa:
      valor.activa === true,
  };
}

function extraerOpciones(
  valor: unknown,
): {
  temporadas: TemporadaOpcion[];
  temporadaActiva:
    TemporadaOpcion | null;
  tiposSocio: string[];
} {
  if (!esObjeto(valor)) {
    return {
      temporadas: [],
      temporadaActiva: null,
      tiposSocio: [],
    };
  }

  const opciones =
    esObjeto(valor.opciones)
      ? valor.opciones
      : valor;

  const temporadas =
    Array.isArray(
      opciones.temporadas,
    )
      ? opciones.temporadas.flatMap(
          (elemento) => {
            const temporada =
              convertirTemporada(
                elemento,
              );

            return temporada
              ? [temporada]
              : [];
          },
        )
      : [];

  const temporadaActiva =
    convertirTemporada(
      opciones.temporadaActiva ??
        opciones.temporada_activa,
    ) ??
    temporadas.find(
      (temporada) =>
        temporada.activa,
    ) ??
    null;

  const tiposSocio =
    Array.isArray(
      opciones.tiposSocio,
    )
      ? opciones.tiposSocio.flatMap(
          (elemento) => {
            if (
              typeof elemento ===
              "string"
            ) {
              const tipo =
                elemento.trim();

              return tipo
                ? [tipo]
                : [];
            }

            if (
              esObjeto(elemento)
            ) {
              const tipo =
                convertirTexto(
                  elemento.nombre ??
                    elemento.valor,
                );

              return tipo
                ? [tipo]
                : [];
            }

            return [];
          },
        )
      : [];

  return {
    temporadas,
    temporadaActiva,
    tiposSocio,
  };
}

function extraerCredenciales(
  valor: unknown,
): CredencialesCreadas | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const socio =
    esObjeto(valor.socio)
      ? valor.socio
      : null;

  const credenciales =
    esObjeto(valor.credenciales)
      ? valor.credenciales
      : null;

  if (
    !socio ||
    !credenciales
  ) {
    return null;
  }

  const socioId =
    convertirTexto(
      socio.id,
    );

  const email =
    convertirTexto(
      credenciales.email,
    );

  const numeroSocio =
    convertirNumero(
      credenciales.numeroSocio ??
        credenciales.numero_socio,
    );

  const numeroCarnet =
    convertirTexto(
      credenciales.numeroCarnet ??
        credenciales.numero_carnet,
    );

  const passwordCarnet =
    convertirTexto(
      credenciales.passwordCarnet ??
        credenciales.password_carnet,
    );

  if (
    !socioId ||
    !email ||
    numeroSocio === null ||
    !numeroCarnet ||
    !passwordCarnet
  ) {
    return null;
  }

  return {
    socioId,
    email,
    numeroSocio,
    numeroCarnet,
    passwordCarnet,

    emailEnviado:
      valor.emailEnviado === true ||
      valor.email_enviado === true,
  };
}

export default function FormularioNuevoSocio() {
  const [
    nombre,
    setNombre,
  ] = useState("");

  const [
    apellidos,
    setApellidos,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    telefono,
    setTelefono,
  ] = useState("");

  const [
    observaciones,
    setObservaciones,
  ] = useState("");

  const [
    socioActivo,
    setSocioActivo,
  ] = useState(true);

  const [
    temporadaId,
    setTemporadaId,
  ] = useState("");

  const [
    tipoSocio,
    setTipoSocio,
  ] = useState("General");

  const [
    estadoCarnet,
    setEstadoCarnet,
  ] =
    useState<EstadoCarnet>(
      "activo",
    );

  const [
    fechaAlta,
    setFechaAlta,
  ] = useState("");

  const [
    fechaCaducidad,
    setFechaCaducidad,
  ] = useState("");

  const [
    temporadas,
    setTemporadas,
  ] = useState<
    TemporadaOpcion[]
  >([]);

  const [
    tiposSocio,
    setTiposSocio,
  ] = useState<string[]>([
    "General",
    "Familiar",
    "Jugador/a",
    "Entrenador/a",
    "Colaborador/a",
    "Directiva",
    "Simpatizante",
  ]);

  const [
    cargandoOpciones,
    setCargandoOpciones,
  ] = useState(true);

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
    credenciales,
    setCredenciales,
  ] =
    useState<CredencialesCreadas | null>(
      null,
    );

  const [
    textoCopiado,
    setTextoCopiado,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    const controlador =
      new AbortController();

    async function cargarOpciones() {
      setCargandoOpciones(true);
      setError(null);

      try {
        const respuesta =
          await fetch(
            "/api/panel/socios/opciones",
            {
              method: "GET",
              credentials:
                "same-origin",
              headers: {
                Accept:
                  "application/json",
              },
              signal:
                controlador.signal,
            },
          );

        const contenido =
          (await respuesta.json()) as
            RespuestaApi;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !contenido.data
        ) {
          throw new Error(
            contenido.error ||
              "No se han podido cargar las opciones.",
          );
        }

        const opciones =
          extraerOpciones(
            contenido.data,
          );

        setTemporadas(
          opciones.temporadas,
        );

        if (
          opciones.tiposSocio
            .length > 0
        ) {
          setTiposSocio(
            opciones.tiposSocio,
          );

          setTipoSocio(
            opciones.tiposSocio[0],
          );
        }

        if (
          opciones.temporadaActiva
        ) {
          setTemporadaId(
            opciones
              .temporadaActiva.id,
          );

          setFechaAlta(
            opciones
              .temporadaActiva
              .fechaInicio,
          );

          setFechaCaducidad(
            opciones
              .temporadaActiva
              .fechaFin,
          );
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Error cargando las opciones del formulario de socios:",
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : "No se han podido cargar las opciones.",
        );
      } finally {
        if (
          !controlador.signal
            .aborted
        ) {
          setCargandoOpciones(
            false,
          );
        }
      }
    }

    void cargarOpciones();

    return () => {
      controlador.abort();
    };
  }, []);

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

  async function guardarSocio(
    evento:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();

    if (
      guardando ||
      credenciales
    ) {
      return;
    }

    setGuardando(true);
    setError(null);
    setErroresCampo([]);

    try {
      const respuesta =
        await fetch(
          "/api/panel/socios",
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
                nombre,
                apellidos,
                email,

                telefono:
                  telefono.trim() ||
                  null,

                observaciones:
                  observaciones.trim() ||
                  null,

                activo:
                  socioActivo,

                carnet: {
                  temporadaId,
                  tipoSocio,
                  estado:
                    estadoCarnet,
                  fechaAlta,
                  fechaCaducidad,
                },
              }),
          },
        );

      const contenido =
        (await respuesta.json()) as
          RespuestaApi;

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
            "No se ha podido crear el socio.",
        );
      }

      const nuevasCredenciales =
        extraerCredenciales(
          contenido.data,
        );

      if (
        !nuevasCredenciales
      ) {
        throw new Error(
          "El socio se ha creado, pero la respuesta no contiene correctamente las credenciales del carnet.",
        );
      }

      setCredenciales(
        nuevasCredenciales,
      );
    } catch (error) {
      console.error(
        "Error creando el socio:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se ha podido crear el socio.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function copiarTexto(
    valor: string,
    identificador: string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        valor,
      );

      setTextoCopiado(
        identificador,
      );

      window.setTimeout(
        () => {
          setTextoCopiado(
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
        "No se ha podido copiar el texto. Selecciónalo y cópialo manualmente.",
      );
    }
  }

  if (credenciales) {
    return (
      <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-success/40 bg-surface-container-lowest shadow-sm">
        <header className="bg-success px-6 py-6 text-on-success">
          <p className="text-sm font-bold uppercase tracking-wider opacity-80">
            Socio creado
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Credenciales del carnet
          </h2>

          <p className="mt-2 text-sm leading-6 opacity-90">
            Estas credenciales pertenecen
            únicamente al carnet de la
            temporada seleccionada.
          </p>
        </header>

        <div className="grid gap-5 p-6">
          <div className="rounded-2xl border border-primary/30 bg-primary-fixed p-5 text-on-primary-fixed">
            <dl className="grid gap-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide opacity-70">
                  Usuario
                </dt>

                <dd className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="break-all font-semibold">
                    {
                      credenciales.email
                    }
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      void copiarTexto(
                        credenciales.email,
                        "email",
                      )
                    }
                    className="w-fit rounded-lg border border-on-primary-fixed/30 px-3 py-1.5 text-xs font-bold"
                  >
                    {textoCopiado ===
                    "email"
                      ? "Copiado"
                      : "Copiar"}
                  </button>
                </dd>
              </div>

              <div className="border-t border-on-primary-fixed/20 pt-4">
                <dt className="text-xs font-bold uppercase tracking-wide opacity-70">
                  Número de socio de la temporada
                </dt>

                <dd className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-mono text-xl font-bold">
                    {
                      credenciales.numeroSocio
                    }
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      void copiarTexto(
                        String(
                          credenciales.numeroSocio,
                        ),
                        "numero-socio",
                      )
                    }
                    className="w-fit rounded-lg border border-on-primary-fixed/30 px-3 py-1.5 text-xs font-bold"
                  >
                    {textoCopiado ===
                    "numero-socio"
                      ? "Copiado"
                      : "Copiar"}
                  </button>
                </dd>
              </div>

              <div className="border-t border-on-primary-fixed/20 pt-4">
                <dt className="text-xs font-bold uppercase tracking-wide opacity-70">
                  Número de carnet
                </dt>

                <dd className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-mono text-xl font-bold">
                    {
                      credenciales.numeroCarnet
                    }
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      void copiarTexto(
                        credenciales.numeroCarnet,
                        "carnet",
                      )
                    }
                    className="w-fit rounded-lg border border-on-primary-fixed/30 px-3 py-1.5 text-xs font-bold"
                  >
                    {textoCopiado ===
                    "carnet"
                      ? "Copiado"
                      : "Copiar"}
                  </button>
                </dd>
              </div>

              <div className="border-t border-on-primary-fixed/20 pt-4">
                <dt className="text-xs font-bold uppercase tracking-wide opacity-70">
                  Contraseña del carnet
                </dt>

                <dd className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-mono text-xl font-bold">
                    {
                      credenciales.passwordCarnet
                    }
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      void copiarTexto(
                        credenciales.passwordCarnet,
                        "password",
                      )
                    }
                    className="w-fit rounded-lg border border-on-primary-fixed/30 px-3 py-1.5 text-xs font-bold"
                  >
                    {textoCopiado ===
                    "password"
                      ? "Copiado"
                      : "Copiar"}
                  </button>
                </dd>
              </div>
            </dl>
          </div>

          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              credenciales.emailEnviado
                ? "border-success/30 bg-success/10 text-success"
                : "border-outline-variant bg-surface-container-low text-on-surface-variant"
            }`}
          >
            {credenciales.emailEnviado
              ? "El correo con las credenciales de este carnet se ha enviado correctamente."
              : "El correo todavía no se ha enviado. Conserva estas credenciales para poder facilitárselas al socio."}
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-xs leading-5 text-on-surface-variant">
            Cuando se cree el carnet de otra
            temporada, el socio recibirá un
            número de temporada, un carnet y
            una contraseña nuevos. Los
            carnets anteriores permanecerán
            guardados como historial.
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <a
              href="/panel/socios"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container"
            >
              Volver al listado
            </a>

            <a
              href={`/panel/socios/${encodeURIComponent(
                credenciales.socioId,
              )}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed-dim"
            >
              Abrir ficha del socio
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={guardarSocio}
      className="grid gap-5"
    >
      {error && (
        <div
          className="rounded-2xl border border-error/40 bg-error-container p-5 text-on-error-container"
          role="alert"
        >
          <p className="font-bold">
            No se ha podido guardar
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        <header className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
          <h2 className="text-xl font-bold text-on-surface">
            Datos del socio
          </h2>

          <p className="mt-1 text-sm text-on-surface-variant">
            Estos datos identifican a la
            persona y se mantienen entre
            temporadas.
          </p>
        </header>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-on-surface">
              Nombre
            </span>

            <input
              type="text"
              value={nombre}
              onChange={(evento) =>
                setNombre(
                  evento.target.value,
                )
              }
              disabled={guardando}
              required
              maxLength={100}
              autoComplete="given-name"
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            {obtenerErrorCampo(
              "nombre",
            ) && (
              <span className="text-xs text-error">
                {obtenerErrorCampo(
                  "nombre",
                )}
              </span>
            )}
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-on-surface">
              Apellidos
            </span>

            <input
              type="text"
              value={apellidos}
              onChange={(evento) =>
                setApellidos(
                  evento.target.value,
                )
              }
              disabled={guardando}
              required
              maxLength={150}
              autoComplete="family-name"
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            {obtenerErrorCampo(
              "apellidos",
            ) && (
              <span className="text-xs text-error">
                {obtenerErrorCampo(
                  "apellidos",
                )}
              </span>
            )}
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-on-surface">
              Correo electrónico
            </span>

            <input
              type="email"
              value={email}
              onChange={(evento) =>
                setEmail(
                  evento.target.value,
                )
              }
              disabled={guardando}
              required
              maxLength={254}
              autoComplete="email"
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            {obtenerErrorCampo(
              "email",
            ) && (
              <span className="text-xs text-error">
                {obtenerErrorCampo(
                  "email",
                )}
              </span>
            )}
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-on-surface">
              Teléfono
            </span>

            <input
              type="tel"
              value={telefono}
              onChange={(evento) =>
                setTelefono(
                  evento.target.value,
                )
              }
              disabled={guardando}
              maxLength={30}
              autoComplete="tel"
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="grid gap-1.5 sm:col-span-2">
            <span className="text-sm font-bold text-on-surface">
              Observaciones internas
            </span>

            <textarea
              value={observaciones}
              onChange={(evento) =>
                setObservaciones(
                  evento.target.value,
                )
              }
              disabled={guardando}
              maxLength={2000}
              rows={4}
              className="resize-y rounded-xl border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:col-span-2">
            <span>
              <span className="block text-sm font-bold text-on-surface">
                Socio activo
              </span>

              <span className="mt-1 block text-xs text-on-surface-variant">
                Si se desactiva, no podrá
                utilizar ningún carnet.
              </span>
            </span>

            <input
              type="checkbox"
              checked={socioActivo}
              onChange={(evento) =>
                setSocioActivo(
                  evento.target.checked,
                )
              }
              disabled={guardando}
              className="h-5 w-5 accent-primary"
            />
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        <header className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
          <h2 className="text-xl font-bold text-on-surface">
            Primer carnet
          </h2>

          <p className="mt-1 text-sm text-on-surface-variant">
            Se asignará automáticamente el
            siguiente número disponible de
            la temporada.
          </p>

          <p className="mt-2 text-xs leading-5 text-on-surface-variant">
            El número de carnet será también
            la contraseña de acceso de este
            carnet. Cada temporada tendrá
            credenciales diferentes.
          </p>
        </header>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
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
              disabled={
                guardando ||
                cargandoOpciones
              }
              required
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
            >
              <option value="">
                Selecciona una temporada
              </option>

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
              disabled={guardando}
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
              value={estadoCarnet}
              onChange={(evento) =>
                setEstadoCarnet(
                  evento.target
                    .value as
                    EstadoCarnet,
                )
              }
              disabled={guardando}
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
              disabled={guardando}
              required
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
            />
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
              disabled={guardando}
              required
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
            />
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
        <a
          href="/panel/socios"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container"
        >
          Cancelar
        </a>

        <button
          type="submit"
          disabled={
            guardando ||
            cargandoOpciones ||
            !temporadaId
          }
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando
            ? "Creando socio..."
            : "Crear socio y carnet"}
        </button>
      </div>
    </form>
  );
}