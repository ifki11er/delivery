require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 4000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db_time: dbRes.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// TODO: 추후 스크래핑 관련 API나 백그라운드 워커 로직을 여기에 추가하세요.

app.listen(port, () => {
  console.log(`[Backend] Server is running on port ${port}`);
});
