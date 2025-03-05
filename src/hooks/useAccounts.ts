'use client';

import { useState, useEffect } from 'react';
import { accountService } from '../services/accounts';
import { Account } from '@/types/accounts';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Fetch all accounts
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/accounts');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch accounts');
      }

      setAccounts(data);
    } catch (error) {
      console.error('Fetch accounts error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // Connect a new account
  const connectAccount = async (config: {
    type: 'bank' | 'broker' | 'cex' | 'wallet';
    provider: string;
    credentials?: {
      apiKey?: string;
      apiSecret?: string;
    };
    walletAddress?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      switch (config.type) {
        case 'bank':
        case 'broker':
          const linkResponse = await fetch('/api/plaid/link');
          const { link_token, error } = await linkResponse.json();
          
          if (error || !link_token) {
            throw new Error('Failed to initialize Plaid connection');
          }
          
          // Open Plaid Link in a new window
          window.open(`/plaid/oauth?link_token=${link_token}`, '_blank');
          break;
          
        case 'cex':
          if (!config.credentials?.apiKey || !config.credentials?.apiSecret) {
            throw new Error('API credentials required for exchange connection');
          }
          await accountService.connectCEX(config);
          break;
          
        case 'wallet':
          if (!config.walletAddress) {
            throw new Error('Wallet address required');
          }
          await accountService.connectWallet(config.walletAddress, 'ethereum');
          break;
      }
      
      await fetchAccounts(); // Refresh the accounts list
    } catch (error) {
      console.error('Connect account error:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect account');
    } finally {
      setLoading(false);
    }
  };

  // Get total portfolio value
  const getTotalValue = () => {
    return accounts.reduce((total, account) => {
      const value = parseFloat(account.balance.replace(/[^0-9.-]+/g, ''));
      return isNaN(value) ? total : total + value;
    }, 0);
  };

  // Get asset allocation
  const getAssetAllocation = () => {
    const allocation: Record<string, number> = {};
    const total = getTotalValue();

    if (total === 0) return allocation;

    accounts.forEach(account => {
      const value = parseFloat(account.balance.replace(/[^0-9.-]+/g, ''));
      if (!isNaN(value)) {
        allocation[account.type] = (allocation[account.type] || 0) + (value / total * 100);
      }
    });

    return allocation;
  };

  return {
    accounts,
    loading,
    error,
    connectAccount,
    getTotalValue,
    getAssetAllocation,
    refreshAccounts: fetchAccounts,
  };
} 