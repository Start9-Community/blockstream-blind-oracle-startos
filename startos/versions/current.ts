import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0:2',
  releaseNotes: {
    en_US:
      'Wrong-PIN attempts are counted reliably when requests arrive at the same time.',
    es_ES:
      'Los intentos de PIN incorrectos se cuentan de forma fiable cuando llegan solicitudes al mismo tiempo.',
    de_DE:
      'Falsche PIN-Versuche werden zuverlässig gezählt, auch wenn Anfragen gleichzeitig eintreffen.',
    pl_PL:
      'Nieudane próby PIN są liczone niezawodnie, gdy żądania nadchodzą jednocześnie.',
    fr_FR:
      'Les tentatives de PIN erronées sont comptées de manière fiable lorsque des requêtes arrivent en même temps.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
