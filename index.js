const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')

// Load counter
let counter = JSON.parse(fs.readFileSync('./counter.json'))

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' })
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      let reason = lastDisconnect?.error?.output?.statusCode
      if (reason === DisconnectReason.loggedOut) {
        console.log('Logged out.')
      } else {
        startBot()
      }
    } else if (connection === 'open') {
      console.log('✅ Bot terhubung ke WhatsApp!')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text
    if (text?.toLowerCase().startsWith('.done')) {
      counter.doneCount += 1
      fs.writeFileSync('./counter.json', JSON.stringify(counter))

      const reply = `✅ *Done Transaksi #${counter.doneCount}*\nTerima kasih telah bertransaksi! 🙏`
      await sock.sendMessage(msg.key.remoteJid, { text: reply }, { quoted: msg })
    }
  })
}

startBot()
