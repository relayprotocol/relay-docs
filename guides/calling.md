---
title: "Calling"
description: "How to execute cross-chain transactions"
---

### Summary

<Steps>
  <Step title="Get a Quote">
    <a href="#get-a-quote" style={{ position:"absolute",top:10,left:10,right:10,bottom:10,borderBottom:0 }} />

    In this step we'll request a quote that includes all fees, transaction data, and execution steps required to call a contract on another chain.
  </Step>
  <Step title="Execute the Call">
    <a href="#execute-the-call" style={{ position:"absolute",top:10,left:10,right:10,bottom:10,borderBottom:0 }} />

    Once we have the quote, we'll execute the cross-chain call by submitting transactions and monitoring progress.
  </Step>
</Steps>

### Contract Compatibility

Before integrating cross-chain calls, ensure your contract is compatible with Relay. Review our [Contract Compatibility](/how-it-works/contract-compatibility) overview to make any necessary changes to your smart contracts.

## Get a Quote

To execute a cross-chain transaction, you need to specify the origin chain for payment, the destination chain where the contract is deployed, and the transaction data to execute. Use the `/quote` endpoint with specific parameters for cross-chain calling.

### Basic Cross-Chain Call Quote

<CodeGroup>

```bash cURL
curl -X POST "https://api.relay.link/quote" \
  -H "Content-Type: application/json" \
  -d '{
    "user": "0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3",
    "originChainId": 1,
    "destinationChainId": 8453,
    "originCurrency": "0x0000000000000000000000000000000000000000",
    "destinationCurrency": "0x0000000000000000000000000000000000000000",
    "amount": "100000000000000000",
    "tradeType": "EXACT_OUTPUT",
    "txs": [
      {
        "to": "0xContractAddress",
        "value": "100000000000000000",
        "data": "0x40c10f19000000000000000000000000742d35cc6634c0532925a3b8d9d4db0a2d7dd5b30000000000000000000000000000000000000000000000000000000000000001"
      }
    ]
  }'
```


```javascript JavaScript/Node.js
const response = await fetch('https://api.relay.link/quote', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    user: '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3',
    originChainId: 1,
    destinationChainId: 8453,
    originCurrency: '0x0000000000000000000000000000000000000000',
    destinationCurrency: '0x0000000000000000000000000000000000000000',
    amount: '100000000000000000', // Total value of all txs
    tradeType: 'EXACT_OUTPUT', // Required for cross-chain calls
    txs: [
      {
        to: '0xContractAddress',
        value: '100000000000000000', // Must match total amount
        data: '0x40c10f19...' // Contract call data
      }
    ]
  })
});

const quote = await response.json();
```


```python Python
import requests

response = requests.post('https://api.relay.link/quote', json={
    'user': '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3',
    'originChainId': 1,
    'destinationChainId': 8453,
    'originCurrency': '0x0000000000000000000000000000000000000000',
    'destinationCurrency': '0x0000000000000000000000000000000000000000',
    'amount': '100000000000000000',  # Total value of all txs
    'tradeType': 'EXACT_OUTPUT',  # Required for cross-chain calls
    'txs': [
        {
            'to': '0xContractAddress',
            'value': '100000000000000000',  # Must match total amount
            'data': '0x40c10f19...'  # Contract call data
        }
    ]
})

quote = response.json()
```

</CodeGroup>

### Contract Interaction with Web3

When calling smart contracts, you'll need to encode the function call data. Here's how to do it with popular libraries:

<Note>
  **Important for ERC20 transactions**: If your contract call involves spending ERC20 tokens, you must include an approval transaction in your `txs` array before the actual contract call. See the [ERC20 examples](#erc20-contract-calls) below.
</Note>

<CodeGroup>

```javascript JavaScript/ethers.js
import { ethers } from 'ethers';

// Contract ABI for the function you want to call
const contractABI = [
  "function mint(address to, uint256 amount) external payable"
];

// Create interface to encode function data
const iface = new ethers.Interface(contractABI);
const callData = iface.encodeFunctionData('mint', [
  '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3', // recipient
  1 // amount to mint
]);

// Use this callData in your quote request
const quoteRequest = {
  user: '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3',
  originChainId: 1,
  destinationChainId: 8453,
  originCurrency: 'eth',
  destinationCurrency: 'eth',
  amount: '100000000000000000',
  tradeType: 'EXACT_OUTPUT',
  txs: [{
    to: '0xContractAddress',
    value: '100000000000000000',
    data: callData
  }]
};
```


```javascript JavaScript/viem
import { encodeFunctionData, parseEther } from 'viem';

// Encode the function call
const callData = encodeFunctionData({
  abi: [
    {
      name: 'mint',
      type: 'function',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ]
    }
  ],
  functionName: 'mint',
  args: ['0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3', 1n]
});

const quoteRequest = {
  user: '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3',
  originChainId: 1,
  destinationChainId: 8453,
  originCurrency: 'eth',
  destinationCurrency: 'eth',
  amount: parseEther('0.1').toString(),
  tradeType: 'EXACT_OUTPUT',
  txs: [{
    to: '0xContractAddress',
    value: parseEther('0.1').toString(),
    data: callData
  }]
};
```


```python Python/web3.py
from web3 import Web3

# Initialize Web3 (you don't need a provider for encoding)
w3 = Web3()

# Contract ABI
contract_abi = [
    {
        'name': 'mint',
        'type': 'function',
        'inputs': [
            {'name': 'to', 'type': 'address'},
            {'name': 'amount', 'type': 'uint256'}
        ]
    }
]

# Create contract instance for encoding
contract = w3.eth.contract(abi=contract_abi)

# Encode function call
call_data = contract.encodeABI('mint', [
    '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3',
    1
])

quote_request = {
    'user': '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3',
    'originChainId': 1,
    'destinationChainId': 8453,
    'originCurrency': 'eth',
    'destinationCurrency': 'eth',
    'amount': '100000000000000000',
    'tradeType': 'EXACT_OUTPUT',
    'txs': [{
        'to': '0xContractAddress',
        'value': '100000000000000000',
        'data': call_data
    }]
}
```

</CodeGroup>

## ERC20 Contract Calls

**Critical**: When your contract call involves spending ERC20 tokens, you must include an approval transaction in your `txs` array. The approval must come before the actual contract call.

### ERC20 Approval \+ Contract Call Pattern

<CodeGroup>

```javascript JavaScript/ethers.js
import { ethers } from 'ethers';

// ERC20 ABI for approval
const erc20ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)"
];

// Contract ABI for the function you want to call
const contractABI = [
  "function purchaseWithUSDC(address to, uint256 usdcAmount) external"
];

// Encode approval transaction
const erc20Interface = new ethers.Interface(erc20ABI);
const approvalData = erc20Interface.encodeFunctionData('approve', [
  '0xContractAddress', // Contract that will spend tokens
  '1000000000' // Amount to approve (1000 USDC with 6 decimals)
]);

// Encode contract call transaction  
const contractInterface = new ethers.Interface(contractABI);
const contractCallData = contractInterface.encodeFunctionData('purchaseWithUSDC', [
  '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3', // recipient
  '1000000000' // 1000 USDC
]);

const quoteRequest = {
  user: '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3',
  originChainId: 1,
  destinationChainId: 8453,
  originCurrency: 'usdc',
  destinationCurrency: 'usdc', 
  amount: '0', // No ETH value needed for ERC20 calls
  tradeType: 'EXACT_OUTPUT',
  txs: [
    {
      to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC contract address
      value: '0',
      data: approvalData
    },
    {
      to: '0xContractAddress',
      value: '0',
      data: contractCallData
    }
  ]
};
```


```javascript JavaScript/viem
import { encodeFunctionData, parseUnits } from 'viem';

const usdcAmount = parseUnits('1000', 6); // 1000 USDC

// Encode approval transaction
const approvalData = encodeFunctionData({
  abi: [
    {
      name: 'approve',
      type: 'function',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ]
    }
  ],
  functionName: 'approve',
  args: ['0xContractAddress', usdcAmount]
});

// Encode contract call
const contractCallData = encodeFunctionData({
  abi: [
    {
      name: 'purchaseWithUSDC',
      type: 'function', 
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'usdcAmount', type: 'uint256' }
      ]
    }
  ],
  functionName: 'purchaseWithUSDC',
  args: ['0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3', usdcAmount]
});

const quoteRequest = {
  user: '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3',
  originChainId: 1,
  destinationChainId: 8453,
  originCurrency: 'usdc',
  destinationCurrency: 'usdc',
  amount: '0', // No ETH value for ERC20-only calls
  tradeType: 'EXACT_OUTPUT', 
  txs: [
    {
      to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC contract
      value: '0',
      data: approvalData
    },
    {
      to: '0xContractAddress',
      value: '0', 
      data: contractCallData
    }
  ]
};
```


```python Python/web3.py
from web3 import Web3

w3 = Web3()

# ERC20 ABI for approval
erc20_abi = [
    {
        'name': 'approve',
        'type': 'function',
        'inputs': [
            {'name': 'spender', 'type': 'address'},
            {'name': 'amount', 'type': 'uint256'}
        ]
    }
]

# Contract ABI
contract_abi = [
    {
        'name': 'purchaseWithUSDC',
        'type': 'function',
        'inputs': [
            {'name': 'to', 'type': 'address'},
            {'name': 'usdcAmount', 'type': 'uint256'}
        ]
    }
]

# Create contract instances for encoding
erc20_contract = w3.eth.contract(abi=erc20_abi)
target_contract = w3.eth.contract(abi=contract_abi)

usdc_amount = 1000 * 10**6  # 1000 USDC with 6 decimals

# Encode approval
approval_data = erc20_contract.encodeABI('approve', [
    '0xContractAddress',
    usdc_amount
])

# Encode contract call
contract_call_data = target_contract.encodeABI('purchaseWithUSDC', [
    '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3',
    usdc_amount
])

quote_request = {
    'user': '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3',
    'originChainId': 1,
    'destinationChainId': 8453,
    'originCurrency': 'usdc',
    'destinationCurrency': 'usdc',
    'amount': '0',  # No ETH value for ERC20-only calls
    'tradeType': 'EXACT_OUTPUT',
    'txs': [
        {
            'to': '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',  # USDC contract
            'value': '0',
            'data': approval_data
        },
        {
            'to': '0xContractAddress',
            'value': '0',
            'data': contract_call_data
        }
    ]
}
```

</CodeGroup>

### ERC20 Troubleshooting Guide

**Problem**: "ERC20: transfer amount exceeds allowance" error
**Solution**: Ensure you include the approval transaction before your contract call

**Problem**: Transaction reverts with "ERC20: insufficient allowance"\
**Solution**: Check that the approval amount is sufficient for your contract call

**Problem**: "amount parameter doesn't match txs values"
**Solution**: For ERC20-only calls, set `amount: "0"` since there's no ETH value

**Problem**: Approval transaction succeeds but contract call fails
**Solution**: Verify the contract address in the approval matches the contract you're calling

### ERC20 Best Practices

1. **Always approve before spending**: Include approval as the first transaction
2. **Use exact amounts**: Approve the exact amount your contract will spend
3. **Check token decimals**: USDC uses 6 decimals, most others use 18
4. **Verify contract addresses**: Use the correct token contract for each chain
5. **Handle allowances**: Some tokens require setting allowance to 0 before setting a new amount

### Quote Parameters for Cross-Chain Calls

| Parameter             | Type   | Required | Description                                                                                                                          |
| --------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `user`                | string | Yes      | Address that will pay for the transaction                                                                                            |
| `originChainId`       | number | Yes      | Chain ID where payment originates                                                                                                    |
| `destinationChainId`  | number | Yes      | Chain ID where contract calls execute                                                                                                |
| `originCurrency`      | string | Yes      | Currency contract on source chain (e.g., "0x0000000000000000000000000000000000000000", "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913") |
| `destinationCurrency` | string | Yes      | Currency contract on destination chain                                                                                               |
| `amount`              | string | Yes      | **Total value of all txs combined**                                                                                                  |
| `tradeType`           | string | Yes      | **Must be "EXACT_OUTPUT"**                                                                                                           |
| `txs`                 | array  | Yes      | Array of transaction objects                                                                                                         |
| `txs[].to`            | string | Yes      | Contract address to call                                                                                                             |
| `txs[].value`         | string | Yes      | ETH value to send with call                                                                                                          |
| `txs[].data`          | string | Yes      | Encoded function call data                                                                                                           |
| `recipient`           | string | No       | Alternative recipient for any surplus                                                                                                |
| `referrer`            | string | No       | Identifier that can be used to monitor transactions from a specific source.                                                          |
| `refundTo`            | string | No       | Address to send the refund to in the case of failure, if not specified the user address is used                                      |

## Execute the Call

After receiving a quote for your cross-chain call, execute it by processing each step. The execution flow is similar to bridging but includes contract execution on the destination chain.

### Process Execution Steps

<CodeGroup>

```javascript JavaScript/Node.js
async function executeCrossChainCall(quote, web3Provider) {
  console.log(`Executing cross-chain call to ${quote.details.currencyOut.currency.chainId}`);
  
  for (const step of quote.steps) {
    console.log(`Processing step: ${step.action}`);
    
    for (const item of step.items) {
      if (item.status === 'incomplete') {
        try {
          // Submit transaction
          const txHash = await submitTransaction(item.data, web3Provider);
          console.log(`Transaction submitted: ${txHash}`);
          
          // Wait for confirmation
          await waitForConfirmation(txHash, web3Provider);
          
          // Check step completion
          if (item.check) {
            await pollStepCompletion(item.check);
          }
          
          console.log(`Step ${step.id} completed`);
        } catch (error) {
          console.error(`Step ${step.id} failed:`, error);
          throw error;
        }
      }
    }
  }
  
  console.log('Cross-chain call completed successfully');
}

async function submitTransaction(txData, web3Provider) {
  const signer = web3Provider.getSigner();
  
  // Add gas estimation for safety
  const estimatedGas = await web3Provider.estimateGas(txData);
  
  const tx = await signer.sendTransaction({
    ...txData,
    gasLimit: estimatedGas.mul(120).div(100) // Add 20% buffer
  });
  
  return tx.hash;
}

async function pollStepCompletion(checkInfo) {
  const maxAttempts = 60; // 1 minute with 1-second intervals
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`https://api.relay.link${checkInfo.endpoint}`, {
        method: checkInfo.method
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const status = await response.json();
      
      if (status.status === 'success') {
        console.log('Cross-chain call executed successfully');
        return { success: true, data: status };
      } else if (status.status === 'failure') {
        throw new Error(`Cross-chain call failed: ${status.details || 'Unknown error'}`);
      }
      
      // Log progress for long-running operations
      if (attempt % 10 === 0) { // Every 10 seconds
        console.log(`Still processing... (${attempt}s elapsed)`);
      }
      
    } catch (error) {
      console.error(`Status check failed (attempt ${attempt + 1}):`, error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Cross-chain call timed out after 1 minute');
}
```


```python Python
import requests
import time
from web3 import Web3

def execute_cross_chain_call(quote, web3_instance):
    print(f"Executing cross-chain call to chain {quote['details']['currencyOut']['currency']['chainId']}")
    
    for step in quote['steps']:
        print(f"Processing step: {step['action']}")
        
        for item in step['items']:
            if item['status'] == 'incomplete':
                try:
                    # Submit transaction
                    tx_hash = submit_transaction(item['data'], web3_instance)
                    print(f"Transaction submitted: {tx_hash.hex()}")
                    
                    # Wait for confirmation
                    wait_for_confirmation(tx_hash, web3_instance)
                    
                    # Check step completion
                    if 'check' in item:
                        poll_step_completion(item['check'])
                    
                    print(f"Step {step['id']} completed")
                except Exception as error:
                    print(f"Step {step['id']} failed: {error}")
                    raise
    
    print('Cross-chain call completed successfully')

def submit_transaction(tx_data, web3_instance):
    # Estimate gas with buffer
    estimated_gas = web3_instance.eth.estimate_gas(tx_data)
    tx_data['gas'] = int(estimated_gas * 1.2)  # Add 20% buffer
    
    # Submit transaction
    tx_hash = web3_instance.eth.send_transaction(tx_data)
    return tx_hash

def poll_step_completion(check_info):
    max_attempts = 60  # 1 minute with 1-second intervals
    
    for attempt in range(max_attempts):
        try:
            response = requests.request(
                check_info['method'],
                f"https://api.relay.link{check_info['endpoint']}"
            )
            response.raise_for_status()
            status = response.json()
            
            if status['status'] == 'success':
                print('Cross-chain call executed successfully')
                return {'success': True, 'data': status}
            elif status['status'] == 'failure':
                raise Exception(f"Cross-chain call failed: {status.get('details', 'Unknown error')}")
            
            # Log progress for long-running operations
            if attempt % 10 == 0:  # Every 10 seconds
                print(f"Still processing... ({attempt}s elapsed)")
                
        except Exception as error:
            print(f"Status check failed (attempt {attempt + 1}): {error}")
        
        time.sleep(1)
    
    raise Exception('Cross-chain call timed out after 1 minute')
```

</CodeGroup>

### Monitor Cross-Chain Call Status

Track the progress of your cross-chain call using the status endpoint:

<CodeGroup>

```bash cURL
curl "https://api.relay.link/intents/status/v2?requestId=0x92b99e6e1ee1deeb9531b5ad7f87091b3d71254b3176de9e8b5f6c6d0bd3a331"
```


```javascript JavaScript
const checkCallStatus = async (requestId) => {
  const response = await fetch(
    `https://api.relay.link/intents/status/v2?requestId=${requestId}`
  );
  
  if (!response.ok) {
    throw new Error(`Status check failed: ${response.statusText}`);
  }
  
  return await response.json();
};

// Example response for successful cross-chain call
{
  "status": "success",
  "inTxHashes": ["0xe53021eaa..."], // Origin chain transaction
  "txHashes": ["0x9da7bc54df..."], // Destination chain transaction
  "time": 1713290386145,
  "originChainId": 1,
  "destinationChainId": 8453
}
```

</CodeGroup>

### Status Values

| Status    | Description                                     |
| :-------- | :---------------------------------------------- |
| `waiting` | Deposit tx for the request is yet to be indexed |
| `pending` | Deposit tx was indexed, now the fill is pending |
| `success` | Relay completed successfully                    |
| `failure` | Relay failed                                    |
| `refund`  | Funds were refunded due to failure              |

## Advanced  Features

### App Fees

You can include app fees in your call requests to monetize your integration:

```json
{
  "user": "0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3",
  "originChainId": 1,
  "destinationChainId": 8453,
  "originCurrency": "eth",
  "destinationCurrency": "eth",
  "amount": "100000000000000000",
  "tradeType": "EXACT_OUTPUT",
  "txs": [
    {
      "to": "0xContractAddress",
      "value": "100000000000000000",
      "data": "0x40c10f19..."
    }
  ],
  "appFees": [
    {
      "recipient": "0xYourFeeRecipient",
      "fee": "50"
    }
  ]
}
```

### Custom Slippage

Control slippage tolerance for your calls:

```json
{
  "user": "0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3",
  "originChainId": 1,
  "destinationChainId": 8453,
  "originCurrency": "eth",
  "destinationCurrency": "eth",
  "amount": "100000000000000000",
  "tradeType": "EXACT_OUTPUT",
  "txs": [
    {
      "to": "0xContractAddress",
      "value": "100000000000000000",
      "data": "0x40c10f19..."
    }
  ],
  "slippageTolerance": "50"  // 0.5% slippage tolerance
}
```

## Preflight Checklist

☐ **Contract compatibility** - Ensure your smart contract follows Relay compatibility guidelines

☐ **ERC20 approvals** - Include approval transactions before any ERC20 spending calls

☐ **Verify transaction data** - Confirm `amount` equals the sum of all `txs[].value` fields

☐ **Check tradeType** - Must be set to `"EXACT_OUTPUT"` for cross-chain calls

☐ **Validate call data** - Ensure contract function calls are properly encoded

☐ **Token addresses** - Use correct ERC20 contract addresses for each chain

☐ **Test contract calls** - Verify contract functions work as expected on destination chain

☐ **Balance verification** - Confirm user has sufficient funds for amount \+ fees

☐ **Error handling** - Implement proper error handling for failed contract executions

☐ **Monitor progress** - Use status endpoints to track execution progress

☐ **Gas estimation** - Account for potential gas usage variations in contract calls

## Common Use Cases

**NFT Minting with ETH**: Mint NFTs on L2s while paying from L1

```javascript
// Mint NFT cross-chain with ETH
const mintTx = {
  to: '0xNFTContract',
  value: '50000000000000000', // 0.05 ETH mint price
  data: encodeFunctionData({
    abi: nftABI,
    functionName: 'mint',
    args: [userAddress, tokenId]
  })
};
```

**NFT Minting with ERC20**: Mint NFTs using USDC

```javascript
// Mint NFT cross-chain with USDC (requires approval first)
const usdcAmount = parseUnits('50', 6); // 50 USDC

const txs = [
  {
    to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC contract
    value: '0',
    data: encodeFunctionData({
      abi: erc20ABI,
      functionName: 'approve',
      args: ['0xNFTContract', usdcAmount]
    })
  },
  {
    to: '0xNFTContract',
    value: '0',
    data: encodeFunctionData({
      abi: nftABI,
      functionName: 'mintWithUSDC',
      args: [userAddress, tokenId, usdcAmount]
    })
  }
];
```

**DeFi Operations**: Execute swaps, provide liquidity, or claim rewards on other chains

```javascript
// Provide liquidity cross-chain with ERC20 tokens
const tokenAmount = parseUnits('1000', 18); // 1000 tokens
const usdcAmount = parseUnits('1000', 6);   // 1000 USDC

const txs = [
  // Approve token A
  {
    to: '0xTokenAContract',
    value: '0',
    data: encodeFunctionData({
      abi: erc20ABI,
      functionName: 'approve',
      args: ['0xDEXContract', tokenAmount]
    })
  },
  // Approve token B (USDC)
  {
    to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    value: '0', 
    data: encodeFunctionData({
      abi: erc20ABI,
      functionName: 'approve',
      args: ['0xDEXContract', usdcAmount]
    })
  },
  // Add liquidity
  {
    to: '0xDEXContract',
    value: '0',
    data: encodeFunctionData({
      abi: dexABI,
      functionName: 'addLiquidity',
      args: [
        '0xTokenAContract',
        '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        tokenAmount,
        usdcAmount,
        tokenAmount * 95n / 100n, // 5% slippage
        usdcAmount * 95n / 100n,  // 5% slippage
        Math.floor(Date.now() / 1000) + 1800 // 30 min deadline
      ]
    })
  }
];
```

**Gaming**: Execute game actions, purchase items, or claim rewards across chains

```javascript
// Purchase game item with USDC cross-chain
const itemPrice = parseUnits('10', 6); // 10 USDC

const txs = [
  {
    to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC approval
    value: '0',
    data: encodeFunctionData({
      abi: erc20ABI,
      functionName: 'approve', 
      args: ['0xGameContract', itemPrice]
    })
  },
  {
    to: '0xGameContract',
    value: '0',
    data: encodeFunctionData({
      abi: gameABI,
      functionName: 'purchaseItemWithUSDC',
      args: [itemId, userAddress, itemPrice]
    })
  }
];
```