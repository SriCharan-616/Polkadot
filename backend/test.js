const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Helper function to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: JSON.parse(data)
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test Suite
async function runTests() {
  console.log('🧪 Starting ZK Voting Test Suite\n');

  try {
    // Test 1: Create Proposal
    console.log('Test 1: Creating Proposal...');
    const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const createRes = await makeRequest('POST', '/proposal', {
      title: 'Test Proposal',
      description: 'Automated test proposal',
      endTime: endTime,
      creator: 'test-user'
    });
    
    if (createRes.status !== 201) {
      throw new Error(`Failed to create proposal: ${createRes.status}`);
    }
    
    const proposalId = createRes.data.proposalId;
    console.log(`✅ Proposal created: ${proposalId}\n`);

    // Test 2: Get Proposals
    console.log('Test 2: Fetching Proposals...');
    const proposalsRes = await makeRequest('GET', '/proposals');
    if (proposalsRes.status !== 200) {
      throw new Error(`Failed to fetch proposals: ${proposalsRes.status}`);
    }
    console.log(`✅ Found ${proposalsRes.data.length} proposals\n`);

    // Test 3: Get Specific Proposal
    console.log('Test 3: Fetching Specific Proposal...');
    const proposalRes = await makeRequest('GET', `/proposal/${proposalId}`);
    if (proposalRes.status !== 200) {
      throw new Error(`Failed to fetch proposal: ${proposalRes.status}`);
    }
    console.log(`✅ Proposal details retrieved: "${proposalRes.data.title}"\n`);

    // Test 4: Submit Vote with ZK Proof
    console.log('Test 4: Submitting Vote with ZK Proof...');
    const mockProof = {
      pi_a: ['123456', '789012', '1'],
      pi_b: [['123456', '789012'], ['345678', '901234'], ['1', '0']],
      pi_c: ['567890', '234567', '1'],
      protocol: 'groth16',
      curve: 'bn128'
    };

    const voteRes = await makeRequest('POST', '/vote', {
      proposalId: proposalId,
      proof: mockProof,
      nullifierHash: 'abc123def456' + Math.random().toString(36).substr(2),
      voteCommitment: 'xyz789abc123' + Math.random().toString(36).substr(2)
    });

    if (voteRes.status !== 201) {
      throw new Error(`Failed to submit vote: ${voteRes.status}`);
    }
    console.log('✅ Vote submitted successfully\n');

    // Test 5: Verify Double Voting Prevention
    console.log('Test 5: Testing Double Voting Prevention...');
    const nullifierHash = 'double-vote-test-' + Math.random().toString(36).substr(2);
    
    // First vote
    const firstVote = await makeRequest('POST', '/vote', {
      proposalId: proposalId,
      proof: mockProof,
      nullifierHash: nullifierHash,
      voteCommitment: 'commitment1' + Math.random().toString(36).substr(2)
    });

    if (firstVote.status !== 201) {
      throw new Error(`First vote failed: ${firstVote.status}`);
    }
    console.log('✓ First vote accepted');

    // Second vote with same nullifier (should fail)
    const secondVote = await makeRequest('POST', '/vote', {
      proposalId: proposalId,
      proof: mockProof,
      nullifierHash: nullifierHash,
      voteCommitment: 'commitment2' + Math.random().toString(36).substr(2)
    });

    if (secondVote.status === 400 && secondVote.data.error.includes('already voted')) {
      console.log('✓ Double voting correctly prevented\n');
    } else {
      throw new Error(`Double voting protection failed: ${secondVote.status}`);
    }

    // Test 6: Get Results
    console.log('Test 6: Fetching Vote Results...');
    const resultsRes = await makeRequest('GET', `/results/${proposalId}`);
    if (resultsRes.status !== 200) {
      throw new Error(`Failed to fetch results: ${resultsRes.status}`);
    }
    console.log(`✅ Results retrieved - Total votes: ${resultsRes.data.totalVotes}\n`);

    console.log('═══════════════════════════════════════');
    console.log('✅ All Tests Passed!');
    console.log('═══════════════════════════════════════');
    console.log('\n📊 Summary:');
    console.log('  ✓ Proposal creation works');
    console.log('  ✓ Proposal retrieval works');
    console.log('  ✓ ZK proof submission works');
    console.log('  ✓ Double voting prevention works');
    console.log('  ✓ Vote results retrieval works');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests().then(() => process.exit(0));
