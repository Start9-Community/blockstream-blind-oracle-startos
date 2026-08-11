import { T } from '@start9labs/start-sdk'
import { sdk } from './sdk'

export const oraclePort = 8096
export const oracleHostId = 'oracle-multi'
export const oracleInterfaceId = 'oracle'

export const dataDir = '/data'
export const appDir = '/app'
export const serverUser = 'www-data'

export const privateKeyFile = 'server_private_key.key'
export const publicKeyFile = 'server_public_key.pub'
export const pinsDir = 'pins'

/**
 * Every address a Jade could reach this oracle at, onions last so they land in
 * Jade's second slot — it relays the first to the companion app as a clearnet
 * URL and the second as an onion.
 *
 * `needsCert` marks the ones served with this server's own CA. The app has no
 * reason to trust that, so enrolling one of them means shipping the root
 * certificate along with the address.
 */
export const oracleAddresses = (effects: T.Effects) =>
  sdk.host
    .getOwn(effects, oracleHostId, (host) => {
      const addresses =
        host?.bindings[oraclePort]?.interfaces[oracleInterfaceId]?.addressInfo
      if (!host || !addresses) return []

      const isOnion = (h: T.HostnameInfo) =>
        h.metadata.kind === 'plugin' && h.metadata.packageId === 'tor'

      return addresses.nonLocal
        .filter({ exclude: { kind: 'bridge' } })
        .format('hostname-info')
        .sort((a, b) => Number(isOnion(a)) - Number(isOnion(b)))
        .map((h) => ({
          url: addresses.toUrl(h),
          hostname: h.hostname,
          needsCert:
            h.ssl &&
            !(
              h.metadata.kind === 'public-domain' &&
              !!host.publicDomains[h.hostname]?.acme
            ),
        }))
    })
    .const()
