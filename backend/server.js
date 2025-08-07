const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const easytime = require('./easytime');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Authentication endpoint
app.post('/api/authenticate', async (req, res) => {
  try {
    const token = await easytime.authenticate();
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create employee endpoint
app.post('/api/employees', async (req, res) => {
  try {
    const data = await easytime.createEmployee(req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove employee endpoint
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const data = await easytime.removeEmployee(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});