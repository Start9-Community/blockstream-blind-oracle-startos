import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0:1',
  releaseNotes: {
    en_US: `StartOS package improvements; no change to Blockstream Blind Oracle.`,
    es_ES: `Mejoras en el paquete de StartOS; sin cambios en Blockstream Blind Oracle.`,
    de_DE: `Verbesserungen am StartOS-Paket; keine Änderungen an Blockstream Blind Oracle.`,
    pl_PL: `Ulepszenia pakietu StartOS; bez zmian w Blockstream Blind Oracle.`,
    fr_FR: `Améliorations du paquet StartOS ; aucun changement pour Blockstream Blind Oracle.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
