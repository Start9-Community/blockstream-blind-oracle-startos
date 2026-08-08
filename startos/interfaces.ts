import { i18n } from './i18n'
import { sdk } from './sdk'
import { oracleHostId, oracleInterfaceId, oraclePort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const oracleMulti = sdk.MultiHost.of(effects, oracleHostId)
  const oracleMultiOrigin = await oracleMulti.bindPort(oraclePort, {
    protocol: 'http',
    preferredExternalPort: oraclePort,
  })
  const oracle = sdk.createInterface(effects, {
    name: i18n('Oracle API'),
    id: oracleInterfaceId,
    description: i18n(
      'The address your Jade companion app uses to reach this oracle',
    ),
    type: 'api',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  const oracleReceipt = await oracleMultiOrigin.export([oracle])

  return [oracleReceipt]
})
