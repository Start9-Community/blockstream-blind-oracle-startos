export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Jade Blind Oracle!': 0,
  'Oracle API': 1,
  'The oracle is answering requests': 2,
  'The oracle is not answering requests': 3,

  // interfaces.ts
  'The address your Jade companion app uses to reach this oracle': 4,

  // actions/showOracleDetails.ts
  'Show Oracle Public Key': 5,
  'Display the public key your Jade needs in order to trust this oracle': 6,
  'Oracle Public Key': 7,
  'Give this key to your Jade, along with the oracle address from the Interfaces tab.': 8,
  'Public Key': 9,

  // init/generateServerKey.ts
  'Give your Jade this oracle’s address and public key': 10,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
