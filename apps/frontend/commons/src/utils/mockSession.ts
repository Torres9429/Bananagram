// DEPRECATED — eliminado en el refactor de sesión cookie (2026-06-30).
// getMockSessionEmail leía el email del ?mock_user= de la URL.
// El mecanismo ?mock_user ya no existe; la sesión vive en la cookie bananagram_token.

/** @deprecated La sesión ya no viaja por URL. */
export function getMockSessionEmail(): string | null {
  return null;
}
