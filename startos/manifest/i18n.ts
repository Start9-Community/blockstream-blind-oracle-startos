export const short = {
  en_US: 'Your own blind PIN oracle for a Blockstream Jade hardware wallet',
  es_ES: 'Tu propio oráculo ciego de PIN para una cartera Blockstream Jade',
  de_DE:
    'Ihr eigenes blindes PIN-Orakel für eine Blockstream-Jade-Hardware-Wallet',
  pl_PL:
    'Twoja własna ślepa wyrocznia PIN dla portfela sprzętowego Blockstream Jade',
  fr_FR: 'Votre propre oracle aveugle de PIN pour un portefeuille Jade',
}

export const long = {
  en_US:
    'A Blockstream Jade unlocks with a short PIN rather than your full recovery phrase. To make that safe, it asks an oracle to help decrypt its stored seed, and the oracle destroys the record after three wrong PINs. The oracle is blind: it never sees your PIN, your seed, or your keys. Run this package and your Jade asks your own server instead of someone else’s.',
  es_ES:
    'Una Blockstream Jade se desbloquea con un PIN corto en lugar de tu frase de recuperación completa. Para que eso sea seguro, pide a un oráculo que le ayude a descifrar la semilla almacenada, y el oráculo destruye el registro tras tres PIN incorrectos. El oráculo es ciego: nunca ve tu PIN, tu semilla ni tus claves. Con este paquete, tu Jade pregunta a tu propio servidor.',
  de_DE:
    'Eine Blockstream Jade wird mit einer kurzen PIN statt mit Ihrer vollständigen Wiederherstellungsphrase entsperrt. Damit das sicher ist, bittet sie ein Orakel um Hilfe beim Entschlüsseln des gespeicherten Seeds, und das Orakel löscht den Datensatz nach drei falschen PINs. Das Orakel ist blind: Es sieht weder Ihre PIN noch Ihren Seed oder Ihre Schlüssel. Mit diesem Paket fragt Ihre Jade Ihren eigenen Server.',
  pl_PL:
    'Blockstream Jade odblokowuje się krótkim PIN-em zamiast pełną frazą odzyskiwania. Aby było to bezpieczne, prosi wyrocznię o pomoc w odszyfrowaniu zapisanego ziarna, a wyrocznia niszczy zapis po trzech błędnych PIN-ach. Wyrocznia jest ślepa: nigdy nie widzi Twojego PIN-u, ziarna ani kluczy. Dzięki temu pakietowi Twoja Jade pyta Twój własny serwer.',
  fr_FR:
    "Une Blockstream Jade se déverrouille avec un PIN court plutôt qu'avec votre phrase de récupération complète. Pour que ce soit sûr, elle demande à un oracle de l'aider à déchiffrer la graine stockée, et l'oracle détruit l'enregistrement après trois PIN erronés. L'oracle est aveugle : il ne voit jamais votre PIN, votre graine ni vos clés. Avec ce paquet, votre Jade interroge votre propre serveur.",
}
