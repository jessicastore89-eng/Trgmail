const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();

app.use(cors());
app.use(express.json());

const ADMIN_EMAIL = "jessicastore89@gmail.com";

// KONFIGURASI PENGIRIM EMAIL (Menggunakan Gmail)
// Catatan: Untuk "pass", disarankan menggunakan "App Password" dari Google Security akun pengirim
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jessicastore89@gmail.com', 
    pass: 'Isi_Password_Aplikasi_Gmail_Disini' 
  }
});

// Database sederhana di memori untuk simulasi Saldo & Status (Jika server restart, data kembali ke awal)
let userDatabase = {
  "contoh_user123": { saldo: 0 }
};
let pendingTransactions = {};

app.get('/', (req, res) => {
  res.send('Server Duitin Gmail Sistem Email Aktif!');
});

// 1. ENDPOINT: SUBMIT GMAIL (Kirim Notifikasi ke Email Admin)
app.post('/api/submit-gmail', async (req, res) => {
  const { username, userEmail, gmailList } = req.body;
  const totalGmail = gmailList.length;
  const transactionId = `TX-${Date.now()}`;

  // Simpan data transaksi ke memori untuk proses persetujuan nanti
  pendingTransactions[transactionId] = {
    username,
    totalGmail,
    status: 'pending'
  };

  const mailOptions = {
    from: ADMIN_EMAIL,
    to: ADMIN_EMAIL,
    subject: `📥 [SETORAN BARU] ${username} - ${totalGmail} Gmail`,
    html: `
      <h3>MOHON PERSETUJUAN SETORAN GMAIL</h3>
      <p><strong>Pengirim:</strong> ${username} (${userEmail})</p>
      <p><strong>Total:</strong> ${totalGmail} Akun Gmail</p>
      <p><strong>Daftar Akun:</strong></p>
      <pre>${gmailList.join('\n')}</pre>
      <hr />
      <p><strong>ID Transaksi:</strong> ${transactionId}</p>
      <p><em>Ketik <b>SETUJUI</b> atau <b>TOLAK</b> di baris paling atas saat membalas email ini untuk memproses saldo pengguna secara otomatis.</em></p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Notifikasi setoran telah dikirim ke email Admin." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ENDPOINT: WITHDRAW (Kirim Notifikasi Penarikan ke Email Admin)
app.post('/api/withdraw', async (req, res) => {
  const { username, amount, method } = req.body;

  const mailOptions = {
    from: ADMIN_EMAIL,
    to: ADMIN_EMAIL,
    subject: `📢 [REQ WITHDRAW] ${username} - Rp ${parseInt(amount).toLocaleString('id-ID')}`,
    html: `
      <h3>NOTIFIKASI PERMINTAAN WITHDRAW</h3>
      <p><strong>Username:</strong> ${username}</p>
      <p><strong>Jumlah Penarikan:</strong> Rp ${parseInt(amount).toLocaleString('id-ID')}</p>
      <p><strong>Metode Pembayaran:</strong> ${method}</p>
      <p>Silakan proses transfer manual ke pengguna tersebut.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Permintaan withdraw telah dikirim ke email Admin." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. ENDPOINT: WEBHOOK UNTUK MENERIMA BALASAN EMAIL ADMIN (Dihubungkan ke layanan penerima seperti Inbound Email Cloudmailin/Sendgrid)
app.post('/email-replied-webhook', (req, res) => {
  // Mengambil teks balasan dan subjek dari webhook email masuk
  const emailBody = req.body.plain || req.body.text || "";
  const emailSubject = req.body.subject || "";

  // Cari ID Transaksi dari subjek atau isi email
  const txMatch = emailBody.match(/TX-\d+/);
  if (!txMatch) return res.status(200).send("ID Transaksi tidak ditemukan.");

  const transactionId = txMatch[0];
  const txData = pendingTransactions[transactionId];

  if (!txData || txData.status !== 'pending') {
    return res.status(200).send("Transaksi sudah diproses atau tidak valid.");
  }

  const decision = emailBody.toUpperCase();

  if (decision.includes("SETUJUI")) {
    txData.status = 'approved';
    // Asumsi per gmail dihargai Rp 1.000 (silakan sesuaikan nominal kelipatan sesukamu)
    const bonusSaldo = txData.totalGmail * 1000; 
    
    if (!userDatabase[txData.username]) {
      userDatabase[txData.username] = { saldo: 0 };
    }
    userDatabase[txData.username].saldo += bonusSaldo;

    console.log(`[SUKSES] ${txData.username} ditambahkan saldo sebesar Rp ${bonusSaldo}`);
  } else if (decision.includes("TOLAK")) {
    txData.status = 'rejected';
    console.log(`[DITOLAK] Setoran dari ${txData.username} ditolak oleh admin.`);
  }

  res.status(200).send("Email reply processed successfully.");
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
