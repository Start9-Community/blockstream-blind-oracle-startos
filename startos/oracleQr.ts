/**
 * Jade takes oracle details as a QR holding a BC-UR-wrapped CBOR
 * `update_pinserver` message. `jade-updps` is the UR type its scanner
 * dispatches on — see Jade's `main/qrmode.c` and `main/process/update_pinserver.c`.
 */

/**
 * Longest payload worth drawing as a code, set by Jade's camera rather than by
 * what will encode. It scans at 320x240 in grayscale (`main/camera.c`), so the
 * whole symbol has to resolve within 240 pixels; at a workable three pixels per
 * module that is 80 modules including the quiet zone, which is a version-13
 * code — 796 alphanumeric characters at the level StartOS draws with. Even the
 * two-pixel Nyquist floor only reaches version 23.
 *
 * A certificate can never come in under this: 688 bytes of PEM is 1376
 * characters once bytewords doubles it, landing at version 28 and about 1.7
 * pixels per module. Rendering it larger does not help, because the limit is
 * how much of the sensor the symbol occupies once it fills the frame.
 */
export const maxQrLength = 796

const BYTEWORDS =
  'ableacidalsoapexaquaarchatomauntawayaxisbackbaldbarnbeltbetabiasbluebodybragbrewbulbbuzzcalmcashcatschefcityclawcodecolacookcostcruxcurlcuspcyandarkdatadaysdelidicedietdoordowndrawdropdrumdulldutyeacheasyechoedgeepicevenexamexiteyesfactfairfernfigsfilmfishfizzflapflewfluxfoxyfreefrogfuelfundgalagamegeargemsgiftgirlglowgoodgraygrimgurugushgyrohalfhanghardhawkheathelphighhillholyhopehornhutsicedideaidleinchinkyintoirisironitemjadejazzjoinjoltjowljudojugsjumpjunkjurykeepkenokeptkeyskickkilnkingkitekiwiknoblamblavalazyleaflegsliarlimplionlistlogoloudloveluaulucklungmainmanymathmazememomenumeowmildmintmissmonknailnavyneednewsnextnoonnotenumbobeyoboeomitonyxopenovalowlspaidpartpeckplaypluspoempoolposepuffpumapurrquadquizraceramprealredorichroadrockroofrubyruinrunsrustsafesagascarsetssilkskewslotsoapsolosongstubsurfswantacotasktaxitenttiedtimetinytoiltombtoystriptunatwinuglyundouniturgeuservastveryvetovialvibeviewvisavoidvowswallwandwarmwaspwavewaxywebswhatwhenwhizwolfworkyankyawnyellyogayurtzapszerozestzinczonezoom'

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

const crc32 = (bytes: Buffer) => {
  let crc = 0xffffffff
  for (const byte of bytes) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

const cborHead = (major: number, length: number) =>
  Buffer.from(
    length < 24
      ? [(major << 5) | length]
      : length < 0x100
        ? [(major << 5) | 24, length]
        : [(major << 5) | 25, length >> 8, length & 0xff],
  )

const cborText = (value: string) => {
  const bytes = Buffer.from(value, 'utf8')
  return Buffer.concat([cborHead(3, bytes.length), bytes])
}

const cborBytes = (bytes: Buffer) =>
  Buffer.concat([cborHead(2, bytes.length), bytes])

const cborMap = (entries: [string, Buffer][]) =>
  Buffer.concat([
    cborHead(5, entries.length),
    ...entries.flatMap(([key, value]) => [cborText(key), value]),
  ])

/**
 * Jade keeps two oracle URLs and relays both to the companion app, which makes
 * the actual requests — `urlA` as the clearnet address, `urlB` as the onion.
 * Omitting `urlB` stores an empty string, which Jade reads as "no second URL"
 * rather than falling back to Blockstream's built-in onion.
 *
 * Uppercased because Jade reads the type case-insensitively and an all-caps
 * payload encodes in the QR's alphanumeric mode rather than the bulkier byte mode.
 */
export const oracleQr = (
  urlA: string,
  urlB: string | undefined,
  publicKey: Buffer,
  certificate?: string,
) => {
  const params: [string, Buffer][] = [['urlA', cborText(urlA)]]
  if (urlB) params.push(['urlB', cborText(urlB)])
  params.push(['pubkey', cborBytes(publicKey)])
  if (certificate) params.push(['certificate', cborText(certificate)])

  const message = cborMap([
    ['id', cborText('001')],
    ['method', cborText('update_pinserver')],
    ['params', cborMap(params)],
  ])
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(message))

  return `ur:jade-updps/${Array.from(Buffer.concat([message, checksum]))
    .map((byte) => BYTEWORDS[byte * 4] + BYTEWORDS[byte * 4 + 3])
    .join('')}`.toUpperCase()
}
