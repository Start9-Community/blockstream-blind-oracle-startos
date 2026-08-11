import { i18n } from '../i18n'
import { maxQrLength, oracleQr } from '../oracleQr'
import { sdk } from '../sdk'
import { oracleAddresses, publicKeyFile } from '../utils'

const { InputSpec, Value } = sdk

export const inputSpec = InputSpec.of({
  urls: Value.dynamicMultiselect(async ({ effects }) => ({
    name: i18n('Addresses'),
    description: i18n(
      'The addresses to write to your Jade, which holds two. A Tor address keeps this oracle unlisted; a public domain is published permanently in certificate transparency logs. An address marked below is served with this server\u2019s own certificate, which no Jade camera can read as a code — set those up over USB.',
    ),
    values: Object.fromEntries(
      (await oracleAddresses(effects)).map(({ url, needsCert }) => [
        url,
        needsCert ? `${url} — ${i18n('cannot be scanned')}` : url,
      ]),
    ),
    default: [],
    maxLength: 2,
  })),
})

export const showOracleDetails = sdk.Action.withInput(
  'show-oracle-details',

  async () => ({
    name: i18n('Show Oracle Details'),
    description: i18n(
      'Display the QR code and public key your Jade needs in order to trust this oracle',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async () => ({ urls: [] }),

  async ({ effects, input }) => {
    // Upstream writes the raw 33-byte compressed point; Jade wants it as hex.
    const raw = (await sdk.volumes.main.readFile(publicKeyFile)) as Buffer
    if (raw.length !== 33) {
      throw new Error(
        `${publicKeyFile} should hold a 33-byte compressed public key, found ${raw.length} bytes`,
      )
    }

    const selected = (await oracleAddresses(effects)).filter((a) =>
      input.urls.includes(a.url),
    )
    const [urlA, urlB] = selected

    // One certificate covers both slots, so the first address that needs one
    // settles it; the root is the last entry of the fullchain.
    const untrusted = selected.find((a) => a.needsCert)
    const certificate = untrusted
      ? (await sdk.getSslCertificate(effects, [untrusted.hostname]).const())[2]
      : undefined

    const payload =
      (urlA && oracleQr(urlA.url, urlB?.url, raw, certificate)) || undefined
    const scannable = payload && payload.length <= maxQrLength

    return {
      version: '1',
      title: i18n('Oracle Details'),
      message: !payload
        ? i18n(
            'Give the Oracle API interface an address to get a code your Jade can scan. Until then, set the oracle up over USB using the public key below.',
          )
        : scannable
          ? i18n(
              'On your Jade, open Boot Menu → Blind Oracle → Scan Oracle QR and scan the code below.',
            )
          : i18n(
              'A code carrying this server’s certificate is denser than a Jade’s camera can read. Set the oracle up over USB with the public key below, or pick a Tor address to get a code you can scan.',
            ),
      result: {
        type: 'group',
        value: [
          ...(payload
            ? [
                {
                  name: scannable
                    ? i18n('Scan With Your Jade')
                    : i18n('Enrollment Code'),
                  description: certificate
                    ? i18n(
                        'Sets this oracle’s address, public key and certificate on the device in one step',
                      )
                    : i18n(
                        'Sets this oracle’s address and public key on the device in one step',
                      ),
                  type: 'single' as const,
                  value: payload,
                  copyable: true,
                  qr: !!scannable,
                  masked: false,
                },
              ]
            : []),
          {
            name: i18n('Public Key'),
            description: i18n('For setting the oracle up over USB instead'),
            type: 'single' as const,
            value: raw.toString('hex'),
            copyable: true,
            qr: false,
            masked: false,
          },
        ],
      },
    }
  },
)
