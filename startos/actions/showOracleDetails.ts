import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { publicKeyFile } from '../utils'

export const showOracleDetails = sdk.Action.withoutInput(
  'show-oracle-details',
  async () => ({
    name: i18n('Show Oracle Public Key'),
    description: i18n(
      'Display the public key your Jade needs in order to trust this oracle',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),
  async ({ effects }) => {
    // Upstream writes the raw 33-byte compressed point; Jade wants it as hex.
    const raw = (await sdk.volumes.main.readFile(publicKeyFile)) as Buffer
    if (raw.length !== 33) {
      throw new Error(
        `${publicKeyFile} should hold a 33-byte compressed public key, found ${raw.length} bytes`,
      )
    }
    const publicKey = raw.toString('hex')

    return {
      version: '1',
      title: i18n('Oracle Public Key'),
      message: i18n(
        'Give this key to your Jade, along with the oracle address from the Interfaces tab.',
      ),
      result: {
        type: 'single',
        name: i18n('Public Key'),
        description: null,
        value: publicKey,
        copyable: true,
        qr: true,
        masked: false,
      },
    }
  },
)
