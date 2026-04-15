require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Connection, clusterApiUrl } = require('@solana/web3.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Mock Database
let transactions = [];

// Solana Connection (for verification/explorer links)
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// --- ROUTES ---

// 1. Create Link (Merchant Side)
app.post('/api/create-link', (req, res) => {
    const { itemName, amountInr } = req.body;
    if (!itemName || !amountInr) return res.status(400).json({ error: "Details missing" });

    const newTx = {
        id: uuidv4().substring(0, 8),
        itemName,
        amountInr: parseFloat(amountInr),
        amountUsdc: (amountInr / process.env.CURRENCY_RATE).toFixed(2),
        status: 'PENDING',
        solanaHash: null,
        date: new Date().toLocaleString()
    };
    
    transactions.unshift(newTx);
    res.json(newTx);
});

// 2. Get Transaction (Checkout Side)
app.get('/api/tx/:id', (req, res) => {
    const tx = transactions.find(t => t.id === req.params.id);
    tx ? res.json(tx) : res.status(404).json({ error: "Link not found" });
});

// 3. Settle Transaction (The Web3 Bridge)
app.post('/api/settle/:id', async (req, res) => {
    const tx = transactions.find(t => t.id === req.params.id);
    if (tx) {
        // Simulate a Solana Transaction Hash
        // In a real app, this is where you'd sign a real transfer
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

// 4. Get All Links (Dashboard)
app.get('/api/links', (req, res) => res.json(transactions));

// 5. Serve Checkout Page
app.get('/pay/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 SWIFTPAY WEB3 RUNNING`);
    console.log(`🔗 Dashboard: http://localhost:${PORT}`);
    console.log(`🌐 Network: Solana Devnet\n`);
});