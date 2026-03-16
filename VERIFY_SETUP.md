# Pre-Deployment Verification Checklist

Run this before starting the deployment process to ensure everything is in place.

## Files Check ✅

Run this command to verify all critical files exist:

```powershell
$files = @(
    "contracts/PrivateVoting.sol",
    "contracts/ChaumPedersen.sol", 
    "contracts/Verifier.sol",
    "circuits/vote.circom",
    "circuits/pot12_final.ptau",
    "circuits/pot12_0000.ptau",
    "frontend/src/pages/Proposals.jsx",
    "frontend/src/pages/Vote.jsx",
    "frontend/src/pages/CreateProposal.jsx",
    "frontend/src/pages/Result.jsx",
    "frontend/src/utils/elgamal.js",
    "frontend/src/utils/nullifier.js",
    "frontend/src/utils/zkproof.js",
    "frontend/src/utils/contract.js",
    "scripts/deploy.js",
    "scripts/keyholder.js",
    ".env",
    ".env.example",
    "hardhat.config.js",
    "package.json",
    "frontend/package.json"
)

Write-Host "Checking for required files..." -ForegroundColor Green
$missing = @()

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✓ $file" -ForegroundColor Green
    } else {
        Write-Host "✗ $file" -ForegroundColor Red
        $missing += $file
    }
}

if ($missing.Count -eq 0) {
    Write-Host "`n✅ All files present!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Missing files: $($missing -join ', ')" -ForegroundColor Red
}
```

## Installation Check

After running `npm install --legacy-peer-deps`, verify:

```powershell
# Check npm version
npm --version

# Check Node version
node --version

# Check hardhat installation
npx hardhat --version

# Check snarkjs installation
npx snarkjs --version
```

## System Requirements

Before proceeding, ensure:

- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm 8+ installed (`npm --version`)
- [ ] Git installed (`git --version`)
- [ ] At least 2GB free disk space
- [ ] Internet connection (for npm packages and RPC)

## Environment Configuration

Check that `.env` file exists and has these sections populated:

```powershell
# View .env configuration
Get-Content .env
```

Required fields:
- [ ] DEPLOYER_PRIVATE_KEY - Your funded test account private key
- [ ] KEYHOLDER_0, KEYHOLDER_1, KEYHOLDER_2 - Three addresses (can be same account)
- [ ] RPC_URL - Set to Paseo Asset Hub RPC

## Network Configuration

Verify Polkadot PVM network in your wallet:

- [ ] Network name: Paseo Asset Hub
- [ ] RPC URL: https://asset-hub-paseo-rpc.polkadot.io
- [ ] Chain ID: 420420421
- [ ] Currency: DOT
- [ ] Account funded with test tokens

## Next Steps After Verification

Once all checks pass:

1. **Install Dependencies**
   ```powershell
   npm install --legacy-peer-deps
   cd frontend
   npm install --legacy-peer-deps
   cd ..
   ```

2. **Generate Verifier**
   ```powershell
   npx circom circuits/vote.circom --r1cs --wasm
   npx snarkjs groth16 setup circuits/vote.r1cs circuits/pot12_final.ptau circuits/vote_0000.zkey
   npx snarkjs zkey contribute circuits/vote_0000.zkey circuits/vote_final.zkey --name="Contribution" -v
   npx snarkjs zkey export solidityverifier circuits/vote_final.zkey contracts/Verifier.sol
   npx snarkjs zkey export vkey circuits/vote_final.zkey circuits/vote_verification_key.json
   ```

3. **Compile Contracts**
   ```powershell
   npx hardhat compile
   ```

4. **Deploy**
   ```powershell
   npx hardhat run scripts/deploy.js --network paseo-asset-hub
   ```

5. **Update .env with Contract Addresses**
   ```
   REACT_APP_CONTRACT_ADDRESS=0x...
   REACT_APP_VERIFIER_ADDRESS=0x...
   REACT_APP_CHAUM_PEDERSEN_ADDRESS=0x...
   ```

6. **Run Frontend**
   ```powershell
   cd frontend
   npm run dev
   ```

## Common Issues & Solutions

### Node version too old
```powershell
# Download and install Node 18+ from nodejs.org
# Then verify:
node --version  # Should be 16+
```

### Port 5173 already in use
```powershell
# Kill process on that port or use a different port:
npm run dev -- --port 3000
```

### "Verifier.sol is stub" error
- Run snarkjs export command in Step 2 above
- Verify file is populated (not showing "auto-generated" stub text)

### npm ETARGET errors
```powershell
npm cache clean --force
rm -r node_modules package-lock.json
npm install --legacy-peer-deps
```

### hardhat not found
```powershell
# Reinstall hardhat
npm install hardhat --save-dev
# Then run:
npx hardhat compile
```

## Quick Verification Script

Save as `verify.ps1` and run with `./verify.ps1`:

```powershell
#!/usr/bin/env pwsh

Write-Host "=== Private DAO Voting System - Verification ===" -ForegroundColor Cyan
Write-Host ""

# 1. File check
Write-Host "1. Checking files..." -ForegroundColor Yellow
$files = @(
    "contracts/PrivateVoting.sol",
    "circuits/vote.circom",
    "frontend/src/pages/Vote.jsx",
    ".env"
)

$allExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "   ✓ $file"
    } else {
        Write-Host "   ✗ $file (MISSING!)" -ForegroundColor Red
        $allExist = $false
    }
}

# 2. Node check
Write-Host "`n2. Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✓ Node $nodeVersion"
} catch {
    Write-Host "   ✗ Node.js not found!" -ForegroundColor Red
    $allExist = $false
}

# 3. npm check
Write-Host "`n3. Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "   ✓ npm $npmVersion"
} catch {
    Write-Host "   ✗ npm not found!" -ForegroundColor Red
    $allExist = $false
}

# 4. .env check
Write-Host "`n4. Checking .env configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $env_content = Get-Content ".env"
    if ($env_content -match "DEPLOYER_PRIVATE_KEY") {
        Write-Host "   ✓ .env exists with config"
    } else {
        Write-Host "   ⚠ .env exists but may be empty" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ .env not found!" -ForegroundColor Red
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($allExist) {
    Write-Host "✅ System ready for deployment!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Good
    Write-Host "1. npm install --legacy-peer-deps"
    Write-Host "2. cd frontend && npm install --legacy-peer-deps"
    Write-Host "3. Follow SETUP_STATUS.md for full instructions"
} else {
    Write-Host "❌ Please resolve issues above before proceeding" -ForegroundColor Red
}
```

## Success Indicators

After each major step, you should see:

✅ **npm install** - Successfully installed X packages  
✅ **circom** - Circuit compiled to vote.r1cs  
✅ **snarkjs** - Verifier exported to contracts/Verifier.sol  
✅ **hardhat compile** - "Successfully compiled 3 Solidity files"  
✅ **hardhat deploy** - "Deployment addresses saved to deployments.json"  
✅ **npm run dev** - "Local: http://localhost:5173/"

---

**Ready to deploy? Start with Step 1 in SETUP_STATUS.md**
