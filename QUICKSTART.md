# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- Polkadot.js Extension ([install](https://polkadot.js.org/extension/))

## 1️⃣ Setup

```bash
# From project root directory
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

**On Windows**, you can run: `scripts\setup.bat`
**On Mac/Linux**, you can run: `scripts\setup.sh`

## 2️⃣ Create Wallet Account (One-time)

1. Click the Polkadot extension icon in your browser
2. Click "+" to create a new account
3. Set a name and password (can be "test" for demo)
4. Save seed phrase safely
5. Close the extension

## 3️⃣ Start Backend

```bash
cd backend
npm start
```

You should see:
```
Server listening on port 5000
Database: ./voting.db
```

## 4️⃣ Start Frontend (new terminal)

```bash
cd frontend
npm run dev
```

You should see:
```
  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
```

## 5️⃣ Open in Browser

Go to: **http://localhost:3000**

Click the wallet icon (top right) to connect your account.

## 6️⃣ Try It Out

1. **Create a Proposal**
   - Click "Create Proposal" button
   - Fill in title, description
   - Click "Create Proposal"

2. **Vote on a Proposal**
   - Click on any proposal
   - Choose "Yes" (👍) or "No" (👎)
   - Vote is sent with ZK proof
   - Your actual vote choice is never stored!

3. **View Results**
   - Total votes are shown
   - Individual votes stay private ✓

## 🛑 Stop Everything

Press `Ctrl+C` in each terminal to stop the servers.

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Wallet not found" | Install [Polkadot extension](https://polkadot.js.org/extension/) |
| Backend won't start | Make sure port 5000 is free. Try: `lsof -i :5000` (Mac/Linux) or `netstat -ano \| findstr :5000` (Windows) |
| Frontend won't connect to backend | Check backend is running on port 5000 |
| CORS error | Make sure backend started first |

## 📚 What's Happening?

```
When you vote:
├─ Your vote choice (0 or 1) is kept on your computer
├─ A zero-knowledge proof is generated
├─ The proof is sent to the server (NOT your vote!)
├─ Server stores the proof to verify you voted
└─ Nobody can tell if you voted Yes or No!
```

## 🔗 Wallet Test Accounts

You can create multiple test accounts in the Polkadot extension and switch between them. Each account can only vote once per proposal.

## 🚀 Next Steps

- Read [DEVELOPMENT.md](./DEVELOPMENT.md) for technical details
- Read [README.md](./README.md) for full documentation
- Try creating multiple proposals
- Try voting as different accounts
- Check the database: `backend/voting.db`

---

**Happy voting! 🗳️🔒**
