import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import ccxt from 'ccxt';

export async function POST(request: Request) {
  try {
    const { provider, credentials } = await request.json();
    
    if (!provider || !credentials?.apiKey || !credentials?.apiSecret) {
      return NextResponse.json(
        { error: 'Missing required credentials' },
        { status: 400 }
      );
    }

    // Initialize exchange
    const exchangeClass = ccxt[provider.toLowerCase()];
    if (!exchangeClass) {
      return NextResponse.json(
        { error: 'Unsupported exchange' },
        { status: 400 }
      );
    }

    const exchange = new exchangeClass({
      apiKey: credentials.apiKey,
      secret: credentials.apiSecret,
    });

    // Test API connection by fetching balance
    await exchange.fetchBalance();

    // Store API credentials securely
    const connectionId = `cex:${provider}:${Date.now()}`;
    await kv.set(connectionId, {
      provider,
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
    });

    // Fetch initial account data
    const balance = await exchange.fetchTotalBalance();
    
    return NextResponse.json({
      connectionId,
      provider,
      balance,
    });
  } catch (error) {
    console.error('Error connecting to exchange:', error);
    return NextResponse.json(
      { error: 'Failed to connect to exchange' },
      { status: 500 }
    );
  }
} 