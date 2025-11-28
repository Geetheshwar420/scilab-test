require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role for Admin actions, or Anon for client? 
// Actually, for backend we often need admin privileges to manage users/data securely.
// But we should be careful. Let's initialize it in utils/supabase.js

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const examRoutes = require('./routes/exam');
const agentRoutes = require('./routes/agent');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/exam', examRoutes);
app.use('/agent', agentRoutes);

app.get('/', (req, res) => {
  res.send('Physics Dept Platform API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
