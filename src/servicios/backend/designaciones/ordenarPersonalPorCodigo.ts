
export interface PersonaOrdenableCba {
  codigo: string;
  activo: boolean;
  nombreCompleto: string;
}

function numeroCodigoCba(
  codigo: string,
): number | null {
  const coincidencia = codigo
    .trim()
    .match(/^CBA-(\d+)$/i);

  if (!coincidencia) return null;

  const numero = Number(coincidencia[1]);

  return Number.isSafeInteger(numero)
    ? numero
    : null;
}

export function compararPersonalPorCodigo<
  T extends PersonaOrdenableCba
>(
  a: T,
  b: T,
): number {
  // Activos primero.
  if (a.activo !== b.activo) {
    return a.activo ? -1 : 1;
  }

  const numeroA = numeroCodigoCba(a.codigo);
  const numeroB = numeroCodigoCba(b.codigo);

  // Códigos CBA válidos antes de los que
  // estén sin configurar.
  if (numeroA === null && numeroB !== null) {
    return 1;
  }

  if (numeroA !== null && numeroB === null) {
    return -1;
  }

  // Orden numérico: CBA-002 antes de CBA-010.
  if (numeroA !== null && numeroB !== null) {
    if (numeroA !== numeroB) {
      return numeroA - numeroB;
    }
  }

  // Desempate por código y nombre.
  const diferenciaCodigo =
    a.codigo.localeCompare(b.codigo, "es", {
      numeric: true,
      sensitivity: "base",
    });

  if (diferenciaCodigo !== 0) {
    return diferenciaCodigo;
  }

  return a.nombreCompleto.localeCompare(
    b.nombreCompleto,
    "es",
    {
      sensitivity: "base",
    },
  );
}
