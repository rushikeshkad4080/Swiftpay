require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const RATE = process.env.CURRENCY_RATE || 83.50;

// Middleware
app.use(cors());
app.use(express.json());

// For Vercel, static files are handled by the vercel.json routes, 
// but we keep this for local development.
app.use(express.static(path.join(__dirname, 'public')));

// Mock Database (Note: Serverless functions are stateless. 
// For production, you should migrate this to Firestore/Database).
let transactions = [];

// --- ROUTES ---

app.post('/api/create-link', (req, res) => {
    const { itemName, amountInr } = req.body;
    if (!itemName || !amountInr) return res.status(400).json({ error: "Details missing" });

    const newTx = {
        id: uuidv4().substring(0, 8),
        itemName,
        amountInr: parseFloat(amountInr),
        amountUsdc: (amountInr / RATE).toFixed(2),
        status: 'PENDING',
        solanaHash: null,
        date: new Date().toLocaleString()
    };
    
    transactions.unshift(newTx);
    res.json(newTx);
});

app.get('/api/tx/:id', (req, res) => {
    const tx = transactions.find(t => t.id === req.params.id);
    tx ? res.json(tx) : res.status(404).json({ error: "Link not found" });
});

app.post('/api/settle/:id', (req, res) => {
    const tx = transactions.find(t => t.id === req.params.id);
    if (tx) {
        tx.status = 'SETTLED';
        tx.solanaHash = `5Yt7...${Math.random().toString(36).substring(7)}`; 
        res.json({ 
            success: true, 
            explorerUrl: `https://explorer.solana.com/tx/${tx.solanaHash}?cluster=devnet` 
        });
    } else {
        res.status(404).json({ error: "Transaction not found" });
    }
});

app.get('/api/links', (req, res) => res.json(transactions));

// Serve Checkout Page - Explicitly for Vercel Routing
app.get('/pay/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

// CRITICAL FIX FOR VERCEL: 
// Only call app.listen if we are running locally. 
// In Vercel (Production), the app is exported as a serverless function.
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Local Server: http://localhost:${PORT}`));
}

// Export for Vercel
module.exports = app;