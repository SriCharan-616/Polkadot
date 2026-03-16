param(
    [switch]$SkipCompile
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  ZK Voting Circuit Compiler" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$circuits = Get-Location

if (-not $SkipCompile) {
    Write-Host "Step 1: Compiling Vote.circom..." -ForegroundColor Yellow
    circom Vote.circom --r1cs --wasm --sym
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Circuit compilation failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Circuit compiled" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Step 2: Creating Powers of Tau..." -ForegroundColor Yellow
if (Test-Path "pot12_0000.ptau") {
    Write-Host "  (already exists, skipping)" -ForegroundColor Gray
} else {
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    Write-Host "✓ Powers of Tau created" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 3: Contributing to Ceremony..." -ForegroundColor Yellow
if (Test-Path "pot12_0001.ptau") {
    Write-Host "  (already exists, skipping)" -ForegroundColor Gray
} else {
    Write-Host "  Paste any random text and press Enter when prompted:"
    snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First Contribution" -v
    Write-Host "✓ Contribution added" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 4: Preparing Phase 2..." -ForegroundColor Yellow
if (Test-Path "pot12_final.ptau") {
    Write-Host "  (already exists, skipping)" -ForegroundColor Gray
} else {
    snarkjs powersoftau prepare-phase2 pot12_0001.ptau pot12_final.ptau -v
    Write-Host "✓ Phase 2 prepared" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 5: Setting up Groth16..." -ForegroundColor Yellow
if (Test-Path "Vote_0000.zkey") {
    Write-Host "  (already exists, skipping)" -ForegroundColor Gray
} else {
    snarkjs groth16 setup Vote.r1cs pot12_final.ptau Vote_0000.zkey
    Write-Host "✓ Groth16 setup complete" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 6: Contributing to zkey..." -ForegroundColor Yellow
if (Test-Path "Vote_0001.zkey") {
    Write-Host "  (already exists, skipping)" -ForegroundColor Gray
} else {
    Write-Host "  Paste any random text and press Enter when prompted:"
    snarkjs zkey contribute Vote_0000.zkey Vote_0001.zkey --name="First Contribution" -v
    Write-Host "✓ Zkey contribution added" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 7: Verifying zkey..." -ForegroundColor Yellow
snarkjs zkey verify Vote.r1cs pot12_final.ptau Vote_0001.zkey
Write-Host "✓ Zkey verified" -ForegroundColor Green
Write-Host ""

Write-Host "Step 8: Exporting verification key..." -ForegroundColor Yellow
snarkjs zkey export verificationkey Vote_0001.zkey verification_key.json
Write-Host "✓ Verification key exported" -ForegroundColor Green
Write-Host ""

Write-Host "Step 9: Exporting Solidity verifier..." -ForegroundColor Yellow
snarkjs zkey export solidityverifier Vote_0001.zkey Verifier.sol
Write-Host "✓ Solidity verifier exported" -ForegroundColor Green
Write-Host ""

Write-Host "Step 10: Exporting JSON zkey..." -ForegroundColor Yellow
snarkjs zkey export json Vote_0001.zkey Vote_js/zkey.json
Write-Host "✓ JSON zkey exported" -ForegroundColor Green
Write-Host ""

Write-Host "================================" -ForegroundColor Green
Write-Host "  Compilation Complete! ✓" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Generated files:" -ForegroundColor Cyan
Write-Host "  • Vote.r1cs              (Constraints)" -ForegroundColor White
Write-Host "  • Vote_js/               (JavaScript tools)" -ForegroundColor White
Write-Host "  • Vote_0001.zkey         (Proving key)" -ForegroundColor White
Write-Host "  • verification_key.json  (Verification key)" -ForegroundColor White
Write-Host "  • Verifier.sol           (Smart contract)" -ForegroundColor White
Write-Host ""
Write-Host "Next: Copy Vote_js/ to frontend/public/circuits/" -ForegroundColor Yellow
Write-Host ""
