const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database setup
const dbPath = path.join(__dirname, 'voting.db');
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
  // Create proposals table
  db.run(`
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      creator TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      endTime INTEGER NOT NULL,
      status TEXT DEFAULT 'active'
    )
  `);

  // Create votes table (stores proof + nullifierHash, NOT the actual vote value)
  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposalId TEXT NOT NULL,
      nullifierHash TEXT NOT NULL UNIQUE,
      proof TEXT NOT NULL,
      voteCommitment TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (proposalId) REFERENCES proposals(id)
    )
  `);

  // Create nullifier index for fast double-voting check
  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_nullifier_hash ON votes(nullifierHash)
  `);
});

// Utility functions
function generateProposalId() {
  return 'proposal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

// API Endpoints

/**
 * POST /proposal
 * Create a new proposal
 */
app.post('/proposal', (req, res) => {
  try {
    const { title, description, endTime, creator } = req.body;

    if (!title || !description || !endTime || !creator) {
      return res.status(400).json({
        error: 'Missing required fields: title, description, endTime, creator'
      });
    }

    const proposalId = generateProposalId();
    const createdAt = getCurrentTimestamp();

    db.run(
      `INSERT INTO proposals (id, title, description, creator, createdAt, endTime, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [proposalId, title, description, creator, createdAt, endTime, 'active'],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
          success: true,
          proposalId,
          message: 'Proposal created successfully'
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /proposals
 * List all proposals
 */
app.get('/proposals', (req, res) => {
  try {
    db.all(
      `SELECT id, title, description, creator, createdAt, endTime, status FROM proposals 
       ORDER BY createdAt DESC`,
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const now = getCurrentTimestamp();
        const proposals = rows.map(proposal => ({
          ...proposal,
          status: proposal.endTime > now ? 'active' : 'closed'
        }));

        res.json(proposals);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /proposal/:proposalId
 * Get a specific proposal with vote count (without revealing individual votes)
 */
app.get('/proposal/:proposalId', (req, res) => {
  try {
    const { proposalId } = req.params;

    db.get(
      `SELECT * FROM proposals WHERE id = ?`,
      [proposalId],
      (err, proposal) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!proposal) {
          return res.status(404).json({ error: 'Proposal not found' });
        }

        res.json(proposal);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /vote
 * Submit a vote with zero-knowledge proof
 * Body: {
 *   proposalId: string,
 *   proof: object,
 *   nullifierHash: string,
 *   voteCommitment: string
 * }
 */
app.post('/vote', (req, res) => {
  try {
    const { proposalId, proof, nullifierHash, voteCommitment } = req.body;

    if (!proposalId || !proof || !nullifierHash || !voteCommitment) {
      return res.status(400).json({
        error: 'Missing required fields: proposalId, proof, nullifierHash, voteCommitment'
      });
    }

    // Check if proposal exists and is active
    db.get(
      `SELECT * FROM proposals WHERE id = ?`,
      [proposalId],
      (err, proposal) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!proposal) {
          return res.status(404).json({ error: 'Proposal not found' });
        }

        const now = getCurrentTimestamp();
        if (proposal.endTime < now) {
          return res.status(400).json({ error: 'Proposal has ended' });
        }

        // Check for double voting using nullifierHash
        db.get(
          `SELECT id FROM votes WHERE nullifierHash = ?`,
          [nullifierHash],
          (err, existingVote) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            if (existingVote) {
              return res.status(400).json({
                error: 'User has already voted on this proposal (double voting detected)'
              });
            }

            // Store the vote with proof (NOT the actual vote value)
            const timestamp = getCurrentTimestamp();
            db.run(
              `INSERT INTO votes (proposalId, nullifierHash, proof, voteCommitment, timestamp)
               VALUES (?, ?, ?, ?, ?)`,
              [proposalId, nullifierHash, JSON.stringify(proof), voteCommitment, timestamp],
              function(err) {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }
                res.status(201).json({
                  success: true,
                  message: 'Vote recorded successfully'
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /results/:proposalId
 * Get vote results (only vote count, no individual votes)
 */
app.get('/results/:proposalId', (req, res) => {
  try {
    const { proposalId } = req.params;

    db.get(
      `SELECT * FROM proposals WHERE id = ?`,
      [proposalId],
      (err, proposal) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!proposal) {
          return res.status(404).json({ error: 'Proposal not found' });
        }

        // Count votes
        db.get(
          `SELECT COUNT(*) as totalVotes FROM votes WHERE proposalId = ?`,
          [proposalId],
          (err, voteCount) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            const now = getCurrentTimestamp();
            const isActive = proposal.endTime > now;

            res.json({
              proposalId: proposal.id,
              title: proposal.title,
              description: proposal.description,
              creator: proposal.creator,
              endTime: proposal.endTime,
              status: isActive ? 'active' : 'closed',
              totalVotes: voteCount.totalVotes,
              message: isActive ? 'Voting is still active' : 'This proposal has ended. Results are final.'
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Database: ${dbPath}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error(err.message);
    console.log('Database closed');
    process.exit(0);
  });
});

module.exports = app;
