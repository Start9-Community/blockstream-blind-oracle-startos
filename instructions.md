# Jade Blind Oracle

Pointing a Jade at a different oracle is close to a one-way door: the firmware refuses to change the oracle key on a device that already holds a wallet. If your Jade is set up, you will have to factory reset it and restore from your recovery phrase. **Have your recovery phrase in hand before you start.**

## Documentation

- [Set up a personal blind oracle](https://help.blockstream.com/hc/en-us/articles/12800132096793-Set-up-a-personal-blind-oracle) — Blockstream's guide to the USB method, used below only if you are not setting up over Tor.
- [How Jade's blind oracle protects your recovery phrase](https://help.blockstream.com/hc/en-us/articles/9639949755673-How-does-Jade-protect-my-recovery-phrase-with-a-blind-oracle) — what the oracle does and why a short PIN is safe.
- [Blockstream Jade](https://github.com/Blockstream/Jade) — the firmware repo, where `set_jade_pinserver.py` lives.
- [Blind PIN server](https://github.com/Blockstream/blind_pin_server) — the upstream server this package runs.

## What you get on StartOS

- **Your own oracle.** Your Jade asks your server to help decrypt its seed, instead of asking Blockstream's.
- **A key pair created for you.** The oracle's keys are generated on install; you never run a key generation command.
- **Setup by QR.** The **Show Oracle Details** action gives you a code your Jade scans off the screen, which sets the address and key on the device in one step. Blockstream's own instructions need a computer, a cable, and a Python script.
- **Everything in your backups.** The oracle key and the per-device records live on one volume that is backed up whole.

Your Jade has no network connection of its own — the Blockstream app makes the requests for it. So the address you give the Jade has to be reachable from the phone or computer running that app, not from the Jade itself.

## Getting set up

### Scanning a QR — the easy way

This needs a Tor address, or a domain with a Let's Encrypt certificate. Any other address is served with your server's own certificate, which has to travel in the code alongside the address — and that makes the code far denser than a Jade's camera can read. Those addresses are set up over USB instead, below.

1. Install the **Tor** service if you do not already run it, then add a Tor address to this service's **Oracle API** interface.
2. If your Jade already holds a wallet, factory reset it now. The firmware refuses to change the oracle otherwise — this is what your recovery phrase is for.
3. Run the **Show Oracle Details** action and choose which address your Jade should use — nothing is selected for you. It stores two, so you can give it a Tor address and a second one alongside.
4. On the Jade, click the centre button once at the logo screen to reach the boot menu, then choose **Blind Oracle → Scan Oracle QR** and scan the code.
5. Check the address and key on the Jade's **Confirm Oracle** screen and approve on the device.
6. Restore your wallet from your recovery phrase and set a PIN. Setting the PIN is the moment the Jade enrolls with your oracle; nothing is stored on your server until then.
7. If you gave the Jade a Tor address, turn on the Blockstream app's own Tor option for that wallet — it has one built in, and without it the app cannot reach a `.onion` address at all.
8. The first time the Blockstream app reaches your oracle it shows a red **Connection Blocked** warning telling you to contact support. That is what any Jade on a self-hosted oracle sees. Choose **Advanced**, then **Allow Non-Default Connection**, and tick **Don't ask me again**.

### Over USB instead

Use this if the code will not scan, or you would simply rather work from a command line. It needs a computer, your Jade's USB cable, and an uninitialized Jade.

Follow [Blockstream's guide](https://help.blockstream.com/hc/en-us/articles/12800132096793-Set-up-a-personal-blind-oracle), with three differences:

- **The public key comes from the action, as hex.** Their guide points `--set-pubkey` at a `server_public_key.pub` file you would only have if you had run the oracle yourself. Copy the **Public Key** value from **Show Oracle Details** and write it to a file:

  ```
  python3 -c "import binascii,sys; open('server_public_key.pub','wb').write(binascii.unhexlify(sys.argv[1]))" YOUR_HEX
  ```

- **`--set-url` is your own address**, copied from the **Oracle API** interface — not the `http://127.0.0.1:8096` in their example.
- **A LAN address, `.local` address, IP, or private domain also needs `--set-certificate`**, pointing at your server's root certificate as a `.pem` file. Those are served with a certificate your phone or computer does not trust yet. A domain with a Let's Encrypt certificate does not need it.

## Using Jade Blind Oracle

Day to day there is nothing to do. The oracle sits there and answers your Jade's unlock requests.

### Actions

- **Show Oracle Details** — you choose which addresses to write to the device, and it gives you the code your Jade scans plus the oracle's public key as text for the USB method. Run it again whenever you set up another Jade, or to point one at a different address.

On the Jade itself, **Boot Menu → Blind Oracle** shows which oracle the device is currently using and lets you reset it back to Blockstream's, once the device holds no wallet.

## Limitations

- **Your backups are the only copy.** If you lose this service's data and have no backup, no Jade enrolled here can be unlocked with its PIN again — each one has to be factory reset and restored from its recovery phrase.
- **Only a Tor address or a Let's Encrypt domain can be set up by scanning.** Every other address is served with your server's own certificate, which has to travel in the code alongside the address. That makes a code far denser than the Jade's camera can resolve — it scans at 320×240 — so those addresses have to be set up over USB. Making the code bigger on screen does not help: once it fills the camera's view, that is as much detail as the sensor gets.
- **A public domain makes this oracle findable.** Certificates for it are published permanently in public transparency logs, so the hostname — and the fact that someone runs a Jade oracle there — is discoverable by anyone, and every unlock is attributable to you. Using Blockstream's own oracle leaks your unlock pattern to them instead, but hides you in the crowd of everyone else using it. A Tor address avoids both.
- **Reaching it from wherever you are.** The Blockstream app has to be able to reach the address you gave the Jade. If that address only resolves on your home network, PIN unlock will not work when you are away from it.
- **The oracle does not authenticate callers.** It is written to be safe against whoever it is talking to, but anyone who knows the address can reach it, so treat the address as private and prefer the Tor one.
