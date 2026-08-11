export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Blockstream Blind Oracle!': 0,
  'Oracle API': 1,
  'The oracle is answering requests': 2,
  'The oracle is not answering requests': 3,

  // interfaces.ts
  'The address your Jade companion app uses to reach this oracle': 4,

  // actions/showOracleDetails.ts
  Addresses: 5,
  'The addresses to write to your Jade, which holds two. A Tor address keeps this oracle unlisted; a public domain is published permanently in certificate transparency logs. An address marked below is served with this server’s own certificate, which no Jade camera can read as a code — set those up over USB.': 6,
  'Show Oracle Details': 7,
  'Display the QR code and public key your Jade needs in order to trust this oracle': 8,
  'Oracle Details': 9,
  'On your Jade, open Boot Menu → Blind Oracle → Scan Oracle QR and scan the code below.': 10,
  'Give the Oracle API interface an address to get a code your Jade can scan. Until then, set the oracle up over USB using the public key below.': 11,
  'Scan With Your Jade': 12,
  'Sets this oracle’s address and public key on the device in one step': 13,
  'A code carrying this server’s certificate is denser than a Jade’s camera can read. Set the oracle up over USB with the public key below, or pick a Tor address to get a code you can scan.': 16,
  'Enrollment Code': 17,
  'Sets this oracle’s address, public key and certificate on the device in one step': 18,
  'Public Key': 14,
  'For setting the oracle up over USB instead': 15,
  'cannot be scanned': 19,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
