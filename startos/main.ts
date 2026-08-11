import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  appDir,
  dataDir,
  oraclePort,
  pinsDir,
  privateKeyFile,
  serverUser,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Blockstream Blind Oracle!'))

  const subcontainer = sdk.SubContainer.of(
    effects,
    { imageId: 'pinserver' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: dataDir,
      readonly: false,
    }),
    'pinserver-sub',
  )

  return sdk.Daemons.of(effects)
    .addOneshot('prepare-data', {
      subcontainer,
      exec: {
        command: [
          'sh',
          '-c',
          `mkdir -p ${dataDir}/${pinsDir} && chown -R ${serverUser}:${serverUser} ${dataDir} && chmod 600 ${dataDir}/${privateKeyFile}`,
        ],
        user: 'root',
      },
      requires: [],
    })
    .addDaemon('primary', {
      subcontainer,
      exec: {
        // One worker only: v1 handshake sessions live in worker memory, so a
        // second worker would miss the handshake its get_pin call refers to.
        // Threads add concurrency within that one worker, sharing the sessions.
        command: [
          'uwsgi',
          '--plugin',
          'python3',
          '--http-socket',
          `0.0.0.0:${oraclePort}`,
          '--module',
          'pinserver.wsgi:app',
          '--chdir',
          dataDir,
          '--pythonpath',
          appDir,
          '--master',
          '--processes',
          '1',
          '--threads',
          '4',
          '--need-app',
          '--die-on-term',
          '--uid',
          serverUser,
          '--gid',
          serverUser,
        ],
        user: 'root',
      },
      ready: {
        display: i18n('Oracle API'),
        // Fetches rather than checking the port, so the check exercises the
        // WSGI app and its one worker rather than just the bound socket.
        fn: () =>
          sdk.healthCheck.checkWebUrl(
            effects,
            `http://127.0.0.1:${oraclePort}/`,
            {
              successMessage: i18n('The oracle is answering requests'),
              errorMessage: i18n('The oracle is not answering requests'),
            },
          ),
      },
      requires: ['prepare-data'],
    })
})
