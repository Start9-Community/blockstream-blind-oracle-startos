import { createECDH } from 'node:crypto'
import { chmod, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { sdk } from '../sdk'
import { dataDir, pinsDir, privateKeyFile, publicKeyFile } from '../utils'

const volumePath = (file: string) => sdk.volumes.main.subpath(file)

const absentAs =
  <T>(value: T) =>
  (e: NodeJS.ErrnoException) => {
    if (e.code === 'ENOENT') return value
    throw e
  }

const publicKeyOf = (privateKey: Buffer) => {
  if (privateKey.length !== 32) return null
  try {
    const ecdh = createECDH('secp256k1')
    ecdh.setPrivateKey(privateKey)
    return ecdh.getPublicKey(null, 'compressed')
  } catch {
    return null
  }
}

export const generateServerKey = sdk.setupOnInit(async (effects) => {
  const privateKey = await readFile(volumePath(privateKeyFile)).catch(
    absentAs(null),
  )
  const publicKey = privateKey && publicKeyOf(privateKey)

  if (publicKey) {
    await writeFile(volumePath(publicKeyFile), publicKey)
  } else {
    // Every record is encrypted under the private key, so a new one would lock out every enrolled Jade.
    const records = await readdir(volumePath(pinsDir)).catch(absentAs([]))
    if (records.length) {
      throw new Error(
        `${privateKeyFile} is missing or invalid, but ${pinsDir}/ holds ${records.length} PIN records encrypted under it. Restore this service from a backup; a new key would lock out every enrolled Jade.`,
      )
    }

    await rm(volumePath(privateKeyFile), { force: true })
    await rm(volumePath(publicKeyFile), { force: true })
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
          // -P: the volume is the working directory, and must not shadow any module
          ['python3', '-P', '-m', 'pinserver.generateserverkey'],
          { cwd: dataDir },
        ),
    )
  }

  await chmod(volumePath(privateKeyFile), 0o600)
})
