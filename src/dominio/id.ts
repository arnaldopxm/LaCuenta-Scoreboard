/**
 * Identificadores locales. Nunca salen del dispositivo, así que solo tienen que
 * ser únicos dentro de este IndexedDB.
 */
export function nuevoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Respaldo para entornos sin Web Crypto (navegadores viejos en contexto no seguro).
  const aleatorio = Math.floor(Math.random() * 0xffffffff).toString(36)
  return `id-${Date.now().toString(36)}-${aleatorio}`
}
