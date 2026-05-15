export function buildEventPayload(eventId: number, qrEventCode: string): string {
  // esquema "estable": lo consumen tus scanners (web o mobile)
  return `FEMPAPP://checkin?e=${eventId}&t=${encodeURIComponent(qrEventCode)}`;
}
// ejemplo "modo dev": lo usa tu scanner actual (web) para autocompletar el uid
// const payload = `FEMPAPP://checkin?e=${evento.id}&t=${evento.qrEventCode}&uid=${usuarioId}`;
// ejemplo "modo prod": lo usan los scanners móviles (iOS/Android) para pedir el uid
// const payload = `FEMPAPP://checkin?e=${evento.id}&t=${evento.qrEventCode}`;