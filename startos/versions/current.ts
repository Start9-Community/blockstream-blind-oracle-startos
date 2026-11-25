import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0:4',
  releaseNotes: {
    en_US: `Updated the blind oracle to the latest upstream code.

**Security**

- An intercepted PIN-setup request can no longer be replayed against the oracle.
- Stored PIN records are verified in constant time.
- A flood of abandoned handshakes can no longer exhaust the oracle's memory.
- Failed requests no longer write their encrypted contents to the service log.

[Full upstream changes](https://github.com/Blockstream/blind_pin_server/compare/22607096cc0f0c703b355cf2886511d354a8b994...7f499c108b9898af230fad642e3c5e8220d5891b)`,
    es_ES: `Se actualizó el oráculo ciego al código más reciente de upstream.

**Seguridad**

- Una solicitud de configuración de PIN interceptada ya no puede reenviarse al oráculo.
- Los registros de PIN almacenados se verifican en tiempo constante.
- Una avalancha de handshakes abandonados ya no puede agotar la memoria del oráculo.
- Las solicitudes fallidas ya no escriben su contenido cifrado en el registro del servicio.

[Cambios completos de upstream](https://github.com/Blockstream/blind_pin_server/compare/22607096cc0f0c703b355cf2886511d354a8b994...7f499c108b9898af230fad642e3c5e8220d5891b)`,
    de_DE: `Das Blind Oracle wurde auf den neuesten Upstream-Code aktualisiert.

**Sicherheit**

- Eine abgefangene PIN-Einrichtungsanfrage kann nicht mehr erneut an das Oracle gesendet werden.
- Gespeicherte PIN-Datensätze werden in konstanter Zeit geprüft.
- Eine Flut abgebrochener Handshakes kann den Speicher des Oracles nicht mehr erschöpfen.
- Fehlgeschlagene Anfragen schreiben ihren verschlüsselten Inhalt nicht mehr in das Dienstprotokoll.

[Alle Upstream-Änderungen](https://github.com/Blockstream/blind_pin_server/compare/22607096cc0f0c703b355cf2886511d354a8b994...7f499c108b9898af230fad642e3c5e8220d5891b)`,
    pl_PL: `Zaktualizowano ślepą wyrocznię do najnowszego kodu upstream.

**Bezpieczeństwo**

- Przechwyconego żądania ustawienia PIN-u nie można już ponownie wysłać do wyroczni.
- Zapisane rekordy PIN są weryfikowane w stałym czasie.
- Zalew porzuconych handshake'ów nie może już wyczerpać pamięci wyroczni.
- Nieudane żądania nie zapisują już swojej zaszyfrowanej treści w dzienniku usługi.

[Pełna lista zmian upstream](https://github.com/Blockstream/blind_pin_server/compare/22607096cc0f0c703b355cf2886511d354a8b994...7f499c108b9898af230fad642e3c5e8220d5891b)`,
    fr_FR: `L'oracle aveugle a été mis à jour vers le code upstream le plus récent.

**Sécurité**

- Une requête de configuration de PIN interceptée ne peut plus être rejouée contre l'oracle.
- Les enregistrements de PIN stockés sont vérifiés en temps constant.
- Un afflux de handshakes abandonnés ne peut plus épuiser la mémoire de l'oracle.
- Les requêtes échouées n'écrivent plus leur contenu chiffré dans le journal du service.

[Modifications upstream complètes](https://github.com/Blockstream/blind_pin_server/compare/22607096cc0f0c703b355cf2886511d354a8b994...7f499c108b9898af230fad642e3c5e8220d5891b)`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
