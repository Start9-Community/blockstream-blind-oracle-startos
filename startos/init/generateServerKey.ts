import { existsSync } from 'node:fs'
import { chmod } from 'node:fs/promises'
import { sdk } from '../sdk'
import { dataDir, privateKeyFile, publicKeyFile } from '../utils'

const keyPairExists = () =>
  existsSync(sdk.volumes.main.subpath(privateKeyFile)) &&
  existsSync(sdk.volumes.main.subpath(publicKeyFile))

export const generateServerKey = sdk.setupOnInit(async (effects) => {
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
})
