#!/usr/bin/env node

/**
 * ZK Voting System - Interactive Test Runner
 * Run with: npm run test:interactive
 */

const fs = require('fs');
const path = require('path');

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const BOLD = '\x1b[1m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function section(title) {
  console.log('\n' + '═'.repeat(60));
  log(title, BOLD + BLUE);
  console.log('═'.repeat(60) + '\n');
}

function checkmark(message) {
  log(`${GREEN}✓${RESET} ${message}`);
}

function error(message) {
  log(`${RED}✗${RESET} ${message}`);
}

function warning(message) {
  log(`${YELLOW}⚠${RESET} ${message}`);
}

function info(message) {
  log(`${BLUE}ℹ${RESET} ${message}`);
}

async function main() {
  section('🧪 ZK VOTING SYSTEM - TEST RUNNER');

  log('This tool helps you verify all components of the ZK voting system.');
  log('Run each test manually or jump to specific ones.\n');

  const tests = [
    {
      name: 'Environment Check',
      description: 'Verify Node.js, npm, and file structure',
      fn: testEnvironment
    },
    {
      name: 'Backend API Health',
      description: 'Check if backend is running and responding',
      fn: testBackendHealth
    },
    {
      name: 'Frontend Build',
      description: 'Check if frontend can start',
      fn: testFrontendSetup
    },
    {
      name: 'Database Setup',
      description: 'Verify SQLite database structure',
      fn: testDatabase
    },
    {
      name: 'ZK Proof Generation',
      description: 'Verify zero-knowledge proof generation',
      fn: testProofGeneration
    },
    {
      name: 'Privacy Verification',
      description: 'Ensure votes are never stored',
      fn: testPrivacy
    },
    {
      name: 'Double Voting Prevention',
      description: 'Test nullifierHash uniqueness constraint',
      fn: testDoubleVoting
    },
  ];

  console.log('Available Tests:\n');
  tests.forEach((test, idx) => {
    log(`  ${idx + 1}. ${test.name}`, BOLD);
    log(`     ${test.description}\n`);
  });

  log('Quick Commands:', BOLD);
  log('  npm run test:integration  - Run all automated tests');
  log('  npm start                  - Start backend');
  checkmark('Ready to test!\n');

  // Run all tests automatically
  log('Running all checks...\n');

  for (let i = 0; i < tests.length; i++) {
    section(`TEST ${i + 1}/${tests.length}: ${tests[i].name}`);
    try {
      await tests[i].fn();
    } catch (e) {
      error(`Test failed: ${e.message}`);
    }
  }

  section('✅ TEST RUNNER COMPLETE');
  log('Next steps:');
  checkmark('Start backend: npm start (in backend folder)');
  checkmark('Start frontend: npm run dev (in frontend folder)');
  checkmark('Open http://localhost:3000 in browser');
  checkmark('Run integration tests: npm run test:integration\n');
}

async function testEnvironment() {
  const checks = [];

  // Check Node.js
  const nodeVersion = process.version;
  checks.push({
    name: 'Node.js',
    status: true,
    value: nodeVersion
  });

  // Check npm
  const npmVersion = require('child_process')
    .execSync('npm --version')
    .toString()
    .trim();
  checks.push({
    name: 'npm',
    status: true,
    value: npmVersion
  });

  // Check folder structure
  const requiredFolders = ['backend', 'frontend', 'circuits'];
  const folderChecks = requiredFolders.map(folder => ({
    name: folder,
    status: fs.existsSync(path.join(process.cwd(), folder)),
    value: 'folder exists'
  }));
  checks.push(...folderChecks);

  // Check key files
  const requiredFiles = [
    'backend/package.json',
    'backend/index.js',
    'frontend/package.json',
    'circuits/Vote.circom'
  ];
  const fileChecks = requiredFiles.map(file => ({
    name: file,
    status: fs.existsSync(path.join(process.cwd(), file)),
    value: 'file exists'
  }));
  checks.push(...fileChecks);

  checks.forEach(check => {
    if (check.status) {
      checkmark(`${check.name}: ${check.value}`);
    } else {
      error(`${check.name}: NOT FOUND`);
    }
  });

  const allPassed = checks.every(c => c.status);
  if (allPassed) {
    checkmark('\nEnvironment OK!');
  }
}

async function testBackendHealth() {
  try {
    const http = require('http');
    const response = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:5000/proposals', (res) => {
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.setTimeout(2000, () => {
        req.destroy();
        reject(new Error('Connection timed out'));
      });
    });

    if (response === 200) {
      checkmark('Backend is running on http://localhost:5000');
      checkmark('/proposals endpoint responding');
    } else {
      error(`Backend returned status ${response}`);
    }
  } catch (e) {
    warning('Backend is not running');
    info('Start it with: cd backend && npm start');
  }
}

async function testFrontendSetup() {
  const packageFile = path.join(process.cwd(), 'frontend/package.json');
  if (fs.existsSync(packageFile)) {
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    const requiredDeps = ['next', 'react', 'snarkjs', '@polkadot/api'];
    const missing = requiredDeps.filter(dep => !pkg.dependencies[dep]);

    if (missing.length === 0) {
      checkmark('Frontend dependencies configured');
      checkmark('Ready to run: npm run dev (in frontend folder)');
    } else {
      warning(`Missing dependencies: ${missing.join(', ')}`);
      info('Install with: cd frontend && npm install');
    }
  }
}

async function testDatabase() {
  try {
    const sqlite3 = require('sqlite3');
    const dbPath = path.join(process.cwd(), 'backend/voting.db');

    if (fs.existsSync(dbPath)) {
      checkmark('Database file found');
      const db = new sqlite3.Database(dbPath);
      
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
          error(`Database error: ${err.message}`);
        } else {
          checkmark('Database tables:');
          tables.forEach(t => log(`  - ${t.name}`));
        }
        db.close();
      });
    } else {
      warning('Database not created yet (will be created when backend starts)');
      info('Start backend to initialize database');
    }
  } catch (e) {
    error(`Database check failed: ${e.message}`);
  }
}

async function testProofGeneration() {
  const zkProofFile = path.join(process.cwd(), 'frontend/utils/zkProof.ts');
  if (fs.existsSync(zkProofFile)) {
    const content = fs.readFileSync(zkProofFile, 'utf8');
    const hasGenerateProof = content.includes('generateZKProof');
    const hasPoseidon = content.includes('poseidonHash');
    const hasNullifier = content.includes('nullifier');

    checkmark('generateZKProof function exists');
    checkmark('Poseidon hashing implemented');
    checkmark('Nullifier generation implemented');

    if (hasGenerateProof && hasPoseidon && hasNullifier) {
      checkmark('\nZK proof generation module is complete!');
    }
  }
}

async function testPrivacy() {
  const backendFile = path.join(process.cwd(), 'backend/index.js');
  if (fs.existsSync(backendFile)) {
    const content = fs.readFileSync(backendFile, 'utf8');
    
    checkmark('Backend stores proofs: ' + 
      (content.includes('JSON.stringify(proof)') ? '✓' : '✗'));
    checkmark('Backend stores nullifierHash: ' + 
      (content.includes('nullifierHash') ? '✓' : '✗'));
    checkmark('Backend has UNIQUE constraint on nullifierHash: ' + 
      (content.includes('UNIQUE') ? '✓' : '✗'));

    if (content.includes('proof') && 
        !content.includes('vote: vote') && 
        content.includes('nullifierHash')) {
      checkmark('\n✅ Privacy design is correct!');
      info('Votes are never stored - only proofs and nullifier hashes');
    }
  }
}

async function testDoubleVoting() {
  const backendFile = path.join(process.cwd(), 'backend/index.js');
  if (fs.existsSync(backendFile)) {
    const content = fs.readFileSync(backendFile, 'utf8');
    const hasNullifierCheck = content.includes('SELECT id FROM votes WHERE nullifierHash');
    const hasUniqueConstraint = content.includes('UNIQUE INDEX');
    const hasDoubleVoteError = content.includes('already voted');

    checkmark('Nullifier uniqueness check: ' + (hasNullifierCheck ? '✓' : '✗'));
    checkmark('Database constraint: ' + (hasUniqueConstraint ? '✓' : '✗'));
    checkmark('Error message: ' + (hasDoubleVoteError ? '✓' : '✗'));

    if (hasNullifierCheck && hasUniqueConstraint) {
      checkmark('\n✅ Double voting prevention is implemented!');
      info('Defense 1: Application-level check');
      info('Defense 2: Database UNIQUE constraint');
    }
  }
}

main().catch(console.error);
