const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();

app.use(cors());
app.use(express.json());

const ADMIN_EMAIL = "jessicastore89@gmail.com";

// KONFIGURASI PENGIRIM EMAIL (Sudah menggunakan App Password Anda)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jessicastore89@gmail.com', 
    pass: 'tmep eker bekd fekh' 
  }
});

// Database sementara di memori
let userDatabase = {};
let pendingTransactions = {};

app.get('/', (req, res) => {
  res.send('Server Duitin Gmail Sistem Email Aktif!');
});

// 1. ENDPOINT: SUBMIT GMAIL
app.post('/api/submit-gmail', async (req, res) => {
  try {
    const { username, userEmail, gmailList } = req.body;
    const totalGmail = gmailList ? gmailList.length : 0;
    const transactionId = `TX-${Date.now()}`;

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
        <pre>${gmailList ? gmailList.join('\n') : ''}</pre>
        <hr />
        <p><strong>ID Transaksi:</strong> ${transactionId}</p>
        <p><em>Ketik <b>SETUJUI</b> atau <b>TOLAK</b> saat membalas email ini.</em></p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Notifikasi dikirim ke email Admin." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ENDPOINT: WITHDRAW
app.post('/api/withdraw', async (req, res) => {
  try {
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
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Permintaan withdraw dikirim ke email Admin." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. WEBHOOK BALASAN EMAIL
app.post('/email-replied-webhook', (req, res) => {
  const emailBody = req.body.plain || req.body.text || "";
  const txMatch = emailBody.match(/TX-\d+/);
  
  if (!txMatch) return res.status(200).send("ID Transaksi tidak ditemukan.");

  const transactionId = txMatch[0];
  const txData = pendingTransactions[transactionId];

  if (!txData || txData.status !== 'pending') {
    return res.status(200).send("Transaksi tidak valid.");
  }

  const decision = emailBody.toUpperCase();

  if (decision.includes("SETUJUI")) {
    txData.status = 'approved';
    const bonusSaldo = txData.totalGmail * 1000; 
    
    if (!userDatabase[txData.username]) {
      userDatabase[txData.username] = { saldo: 0 };
    }
    userDatabase[txData.username].saldo += bonusSaldo;
    console.log(`Saldo ${txData.username} bertambah Rp ${bonusSaldo}`);
  } else if (decision.includes("TOLAK")) {
    txData.status = 'rejected';
    console.log(`Setoran ${txData.username} ditolak.`);
  }

  res.status(200).send("Selesai diproses.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
          
