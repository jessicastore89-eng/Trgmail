const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Kredensial Telegram (Pastikan Token & ID kamu sudah benar)
const TELEGRAM_BOT_TOKEN = "8900009325:AAEAP-IkisdY7kec8WmesuvQ0EtBnRCsjGc"; 
const ADMIN_CHAT_ID = "7137550430"; 
const CHANNEL_CHAT_ID = "@threeilm"; 

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

app.get('/', (req, res) => {
  res.send('Server Duitin Gmail Aktif!');
});

// 1. ENDPOINT: WITHDRAW
app.post('/api/withdraw', async (req, res) => {
  const { username, amount, method } = req.body;
  const textChannel = `📢 *NOTIFIKASI WITHDRAW*\n\n${username} sedang dalam proses withdraw sebesar *Rp ${parseInt(amount).toLocaleString('id-ID')}* via *${method}*.`;
  
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: CHANNEL_CHAT_ID, text: textChannel, parse_mode: 'Markdown' });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ENDPOINT: SUBMIT GMAIL
app.post('/api/submit-gmail', async (req, res) => {
  const { username, userEmail, gmailList } = req.body;
  const totalGmail = gmailList.length;
  const textChannel = `📩 Akun Gmail *${userEmail}* telah menyetor *${totalGmail} Gmail*. Sedang ditinjau oleh Admin.`;
  const textAdmin = `📥 *SETORAN GMAIL BARU*\n\nPengirim: ${username} (${userEmail})\nTotal: ${totalGmail} Akun\n\n*Daftar Gmail*:\n${gmailList.join('\n')}`;

  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: CHANNEL_CHAT_ID, text: textChannel, parse_mode: 'Markdown' });
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: ADMIN_CHAT_ID,
      text: textAdmin,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Terima (ACC)", callback_data: `acc_${username}_${totalGmail}` },
            { text: "❌ Tolak (Reject)", callback_data: `reject_${username}` }
          ]
        ]
      }
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. WEBHOOK CALLBACK
app.post('/telegram-webhook', async (req, res) => {
  const { callback_query, message } = req.body;

  if (message && message.reply_to_message) {
     return res.sendStatus(200);
  }
  if (!callback_query) return res.sendStatus(200);

  const data = callback_query.data;
  const chatId = callback_query.message.chat.id;
  const messageId = callback_query.message.message_id;

  try {
    if (data.startsWith('acc_')) {
      const [_, user, total] = data.split('_');
      await axios.post(`${TELEGRAM_API}/editMessageText`, {
        chat_id: chatId,
        message_id: messageId,
        text: `✅ *SETORAN DISETUJUI*\n\nAkun milik *${user}* sebanyak ${total} Gmail telah diterima.`,
        parse_mode: 'Markdown'
      });
    } else if (data.startsWith('reject_')) {
      const [_, user] = data.split('_');
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: `✍️ Silakan reply pesan ini dan ketik *Alasan Penolakan* untuk *${user}*:`,
        reply_markup: { force_reply: true }
      });
    }
  } catch (err) {
    console.error("Error webhook:", err.message);
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  const textChannel = `📩 Akun Gmail *${userEmail}* telah menyetor *${totalGmail} Gmail*. Sedang ditinjau oleh Admin.`;
  const textAdmin = `📥 *SETORAN GMAIL BARU*\n\nPengirim: ${username} (${userEmail})\nTotal: ${totalGmail} Akun\n\n*Daftar Gmail*:\n${gmailList.join('\n')}`;

  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: CHANNEL_CHAT_ID, text: textChannel, parse_mode: 'Markdown' });
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: ADMIN_CHAT_ID,
      text: textAdmin,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Terima (ACC)", callback_data: `acc_${username}_${totalGmail}` },
            { text: "❌ Tolak (Reject)", callback_data: `reject_${username}` }
          ]
        ]
      }
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. WEBHOOK CALLBACK
app.post('/telegram-webhook', async (req, res) => {
  const { callback_query, message } = req.body;

  if (message && message.reply_to_message) {
     return res.sendStatus(200);
  }
  if (!callback_query) return res.sendStatus(200);

  const data = callback_query.data;
  const chatId = callback_query.message.chat.id;
  const messageId = callback_query.message.message_id;

  if (data.startsWith('acc_')) {
    const [_, user, total] = data.split('_');
    await axios.post(`${TELEGRAM_API}/editMessageText`, {
      chat_id: chatId,
      message_id: messageId,
      text: `✅ *SETORAN DISETUJUI*\n\nAkun milik *${user}* sebanyak ${total} Gmail telah diterima.`,
      parse_mode: 'Markdown'
    });
  } else if (data.startsWith('reject_')) {
    const [_, user] = data.split('_');
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: `✍️ Silakan reply pesan ini dan ketik *Alasan Penolakan* untuk *${user}*:`,
      reply_markup: { force_reply: true }
    });
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  const textChannel = `📩 Akun Gmail *${userEmail}* telah menyetor *${totalGmail} Gmail*. Sedang ditinjau oleh Admin.`;
  const textAdmin = `📥 *SETORAN GMAIL BARU*\n\nPengirim: ${username} (${userEmail})\nTotal: ${totalGmail} Akun\n\n*Daftar Gmail*:\n${gmailList.join('\n')}`;

  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: CHANNEL_CHAT_ID, text: textChannel, parse_mode: 'Markdown' });
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: ADMIN_CHAT_ID,
      text: textAdmin,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Terima (ACC)", callback_data: `acc_${username}_${totalGmail}` },
            { text: "❌ Tolak (Reject)", callback_data: `reject_${username}` }
          ]
        ]
      }
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. WEBHOOK CALLBACK
app.post('/telegram-webhook', async (req, res) => {
  const { callback_query, message } = req.body;

  if (message && message.reply_to_message) {
     return res.sendStatus(200);
  }
  if (!callback_query) return res.sendStatus(200);

  const data = callback_query.data;
  const chatId = callback_query.message.chat.id;
  const messageId = callback_query.message.message_id;

  if (data.startsWith('acc_')) {
    const [_, user, total] = data.split('_');
    await axios.post(`${TELEGRAM_API}/editMessageText`, {
      chat_id: chatId,
      message_id: messageId,
      text: `✅ *SETORAN DISETUJUI*\n\nAkun milik *${user}* sebanyak ${total} Gmail telah diterima.`,
      parse_mode: 'Markdown'
    });
  } else if (data.startsWith('reject_')) {
    const [_, user] = data.split('_');
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: `✍️ Silakan reply pesan ini dan ketik *Alasan Penolakan* untuk *${user}*:`,
      reply_markup: { force_reply: true }
    });
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
