import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0:5',
  releaseNotes: {
    en_US: `Hardening of the oracle's key and data.

- A valid oracle key on the server is always kept.
- If the oracle key is lost while PIN records remain, the service will not start until you restore it from a backup.
- Tighter file permissions on the service's data.`,
    es_ES: `Refuerzo de la clave y los datos del oráculo.

- Una clave válida del oráculo en el servidor se conserva siempre.
- Si la clave del oráculo se pierde mientras quedan registros de PIN, el servicio no se iniciará hasta que lo restaures desde una copia de seguridad.
- Permisos de archivo más estrictos sobre los datos del servicio.`,
    de_DE: `Härtung des Oracle-Schlüssels und der Daten.

- Ein gültiger Oracle-Schlüssel auf dem Server bleibt immer erhalten.
- Geht der Oracle-Schlüssel verloren, während PIN-Datensätze vorhanden sind, startet der Dienst erst wieder, wenn du ihn aus einer Sicherung wiederherstellst.
- Strengere Dateiberechtigungen für die Daten des Dienstes.`,
    pl_PL: `Wzmocnienie ochrony klucza i danych wyroczni.

- Prawidłowy klucz wyroczni na serwerze jest zawsze zachowywany.
- Jeśli klucz wyroczni zostanie utracony, a rekordy PIN pozostaną, usługa nie uruchomi się, dopóki nie przywrócisz jej z kopii zapasowej.
- Ściślejsze uprawnienia plików dla danych usługi.`,
    fr_FR: `Renforcement de la clé et des données de l'oracle.

- Une clé d'oracle valide présente sur le serveur est toujours conservée.
- Si la clé de l'oracle est perdue alors que des enregistrements de PIN subsistent, le service ne démarrera pas tant que vous ne l'aurez pas restauré depuis une sauvegarde.
- Permissions de fichiers plus strictes sur les données du service.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
