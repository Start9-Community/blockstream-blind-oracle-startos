import { existsSync } from 'node:fs'
import { chmod } from 'node:fs/promises'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { showOracleDetails } from '../actions/showOracleDetails'
import { dataDir, privateKeyFile, publicKeyFile } from '../utils'

const keyPairExists = () =>
  existsSync(sdk.volumes.main.subpath(privateKeyFile)) &&
  existsSync(sdk.volumes.main.subpath(publicKeyFile))

export const generateServerKey = sdk.setupOnInit(async (effects, kind) => {
  // Keyed on the files, not on `kind`: a key restored from backup must survive,
  // because regenerating it would orphan every Jade already enrolled here.
  // Upstream writes the pair non-atomically, so require both halves.
  if (!keyPairExists()) {
    await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'pinserver' },
      sdk.Mounts.of().mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: dataDir,
        readonly: false,
      }),
      'generate-server-key',
      (subcontainer) =>
        subcontainer.execFail(
          [
            'sh',
            '-c',
            `rm -f ${privateKeyFile} ${publicKeyFile} && python3 -m pinserver.generateserverkey`,
          ],
          { cwd: dataDir },
        ),
    )
  }

  await chmod(sdk.volumes.main.subpath(privateKeyFile), 0o600)

  if (kind === 'install') {
    await sdk.action.createOwnTask(effects, showOracleDetails, 'important', {
      reason: i18n('Give your Jade this oracle’s address and public key'),
    })
  }
})
