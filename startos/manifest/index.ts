import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'jade-blind-oracle',
  title: 'Jade Blind Oracle',
  license: 'MIT',
  packageRepo: 'https://github.com/Start9Labs/jade-blind-oracle-startos',
  upstreamRepo: 'https://github.com/Blockstream/blind_pin_server',
  marketingUrl: 'https://blockstream.com/jade/',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    pinserver: {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64'],
    },
  },
  dependencies: {},
})
