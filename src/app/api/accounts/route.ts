import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Configuration, PlaidApi, PlaidEnvironments, AccountBase } from 'plaid';
import ccxt from 'ccxt';
import { ethers } from 'ethers';
import { Account, CEXConnection, WalletConnection } from '@/types/accounts';

// Initialize Plaid client
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

export async function GET() {
  try {
    const accounts: Account[] = [];

    // 1. Get all stored connection IDs
    const plaidConnections = await kv.keys('plaid_access_token:*');
    const cexConnections = await kv.keys('cex:*');
    const walletConnections = await kv.keys('wallet:*');

    // 2. Fetch Plaid accounts
    for (const key of plaidConnections) {
      try {
        const accessToken = await kv.get<string>(key);
        if (!accessToken) continue;

        const response = await plaidClient.accountsGet({ access_token: accessToken });
        
        accounts.push(...response.data.accounts.map((account: AccountBase) => ({
          id: account.account_id,
          name: account.name,
          type: account.type === 'investment' ? ('broker' as const) : ('bank' as const),
          balance: account.balances.current ? `$${account.balances.current.toFixed(2)}` : '$0.00',
          lastUpdated: new Date(),
          provider: 'plaid'
        })));
      } catch (error) {
        console.error('Error fetching Plaid account:', error);
      }
    }

    // 3. Fetch CEX accounts
    for (const key of cexConnections) {
      try {
        const connection = await kv.get<CEXConnection>(key);
        if (!connection) continue;

        const exchangeId = connection.provider.toLowerCase();
        if (!ccxt.exchanges.includes(exchangeId)) continue;

        const exchange = new (ccxt as any)[exchangeId]({
          apiKey: connection.apiKey,
          secret: connection.apiSecret,
        });

        const totalUsd = await exchange.fetchBalance(); // This includes USD equivalent

        accounts.push({
          id: key,
          name: `${connection.provider} Account`,
          type: 'cex' as const,
          balance: `$${totalUsd.total.USD.toFixed(2)}`,
          lastUpdated: new Date(),
          provider: connection.provider
        });
      } catch (error) {
        console.error('Error fetching CEX account:', error);
      }
    }

    // 4. Fetch wallet balances
    for (const key of walletConnections) {
      try {
        const wallet = await kv.get<WalletConnection>(key);
        if (!wallet) continue;

        const provider = new ethers.JsonRpcProvider(
          process.env[`${wallet.chain.toUpperCase()}_RPC_URL`] || 
          (wallet.chain === 'ethereum' ? 'https://eth.llamarpc.com' : 'https://polygon-rpc.com')
        );

        const balance = await provider.getBalance(wallet.address);
        const formattedBalance = ethers.formatEther(balance);
        
        accounts.push({
          id: key,
          name: `${wallet.chain} Wallet`,
          type: 'wallet' as const,
          balance: `${formattedBalance} ${wallet.chain === 'ethereum' ? 'ETH' : 'MATIC'}`,
          lastUpdated: new Date(),
          provider: wallet.chain
        });
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      }
    }

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'No accounts found or failed to fetch accounts' },
        { status: 404 }
      );
    }

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
} 