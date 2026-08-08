# Jade Blind Oracle

Pointing a Jade at a different oracle is close to a one-way door: the firmware refuses to change the oracle key on a device that already holds a wallet. If your Jade is set up, you will have to factory reset it and restore from your recovery phrase. **Have your recovery phrase in hand before you start.**

## Documentation

- [Blockstream Jade](https://github.com/Blockstream/Jade/blob/master/README.md) — the Jade firmware repo, including the oracle protocol and the `set_jade_pinserver.py` tool.
- [Blind PIN server](https://github.com/Blockstream/blind_pin_server) — the upstream server this package runs.

## What you get on StartOS

- **Your own oracle.** Your Jade asks your server to help decrypt its seed, instead of asking Blockstream's.
- **A key pair created for you.** The oracle's keys are generated on install; you never run a key generation command.
- **Everything in your backups.** The oracle key and the per-device records live on one volume that is backed up whole.

Your Jade has no network connection of its own — the Green companion app makes the requests for it. So the address you give the Jade has to be reachable from the phone or computer running Green, not from the Jade itself.

## Getting set up

1. Run the **Show Oracle Public Key** action and copy the value.  StartOS also prompts you to do this right after install.
2. Copy the oracle's address from the **Interfaces** tab. The Tor address is the simplest choice — it needs no extra setup on the app side. A LAN or `.local` address is served over HTTPS with a certificate your phone or computer will not trust by default, so it also needs `--set-certificate` in step 4.
3. If your Jade already holds a wallet, factory reset it now. It will not accept a new oracle key otherwise.
4. Point the Jade at your oracle over USB, using Blockstream's `set_jade_pinserver.py` from the Jade repo. It wants the key as a binary file, so convert the hex you copied:

   ```
   echo <the hex you copied> | xxd -r -p > server_public_key.pub
   python3 set_jade_pinserver.py --serialport <PORT> \
     --set-url <the address you copied> \
     --set-pubkey server_public_key.pub
   ```

   The Jade shows you the URL and key under **Confirm Oracle** — check them and approve on the device.

5. Restore your wallet from your recovery phrase and set a PIN. This is the point at which the Jade enrolls with your oracle.

When Green connects to your oracle it shows a red **Connection Blocked** warning saying the Jade is trying to reach a non-default blind PIN oracle and telling you to contact support. That is expected here — it is what any Jade pointed at a self-hosted oracle sees. Choose **Advanced**, then **Allow Non-Default Connection**, and tick **Don't ask me again** so you are not asked on every unlock.

## Using Jade Blind Oracle

Day to day there is nothing to do. The oracle sits there and answers your Jade's unlock requests.

### Actions

- **Show Oracle Public Key** — displays the key your Jade needs in order to trust this oracle, as text and as a QR code. Run it again whenever you set up another Jade against this oracle. The QR is there to move the key to another device; the Jade's own **Scan Oracle QR** expects a different format and will not read it.

On the Jade itself, **Boot Menu → Blind Oracle** shows which oracle the device is currently using and lets you reset it back to Blockstream's, once the device holds no wallet.

## Limitations

- **Your backups are the only copy.** If you lose this service's data and have no backup, no Jade enrolled here can be unlocked with its PIN again — each one has to be factory reset and restored from its recovery phrase.
- **Reaching it from wherever you are.** Green has to be able to reach the address you gave the Jade. If that address only resolves on your home network, PIN unlock will not work when you are away from it.
- **The oracle does not authenticate callers.** It is written to be safe against whoever it is talking to, but anyone who knows the address can reach it, so treat the address as private and prefer the Tor one.
