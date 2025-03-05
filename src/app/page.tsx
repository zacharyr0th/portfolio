'use client';

import { useState } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import DashboardCharts from "@/components/DashboardCharts";

export default function Home() {
  const [activeTab, setActiveTab] = useState('Accounts');
  const { accounts, loading, error, connectAccount } = useAccounts();
  
  const tabs = [
    { name: 'Accounts', count: accounts.filter(a => a.type === 'bank' || a.type === 'broker').length },
    { name: 'Wallets', count: accounts.filter(a => a.type === 'wallet').length },
    { name: 'CEX', count: accounts.filter(a => a.type === 'cex').length },
    { name: 'Brokers', count: accounts.filter(a => a.type === 'broker').length },
    { name: 'Banks', count: accounts.filter(a => a.type === 'bank').length }
  ];

  const handleConnect = (type: 'bank' | 'broker' | 'cex' | 'wallet') => {
    connectAccount({ type, provider: '' });
  };

  // Filter accounts based on active tab
  const filteredAccounts = accounts.filter(account => {
    switch (activeTab) {
      case 'Accounts':
        return true; // Show all accounts
      case 'Wallets':
        return account.type === 'wallet';
      case 'CEX':
        return account.type === 'cex';
      case 'Brokers':
        return account.type === 'broker';
      case 'Banks':
        return account.type === 'bank';
      default:
        return true;
    }
  });

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Charts Section */}
      <DashboardCharts />

      {/* Tabs */}
      <div className="flex items-center space-x-1 mb-4 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.name
                ? 'bg-card text-primary font-medium'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {tab.name} {tab.count > 0 && <span className="ml-1.5 opacity-50">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-secondary">
            Loading accounts...
          </div>
        ) : error ? (
          <div className="col-span-full text-center py-12 text-error">
            {error}
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-secondary mb-4">No accounts connected</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => handleConnect('bank')}
                className="px-4 py-2 rounded-lg bg-card text-primary border border-custom hover:bg-opacity-80 transition-colors"
              >
                Connect Bank
              </button>
              <button
                onClick={() => handleConnect('cex')}
                className="px-4 py-2 rounded-lg bg-card text-primary border border-custom hover:bg-opacity-80 transition-colors"
              >
                Connect Exchange
              </button>
              <button
                onClick={() => handleConnect('wallet')}
                className="px-4 py-2 rounded-lg bg-card text-primary border border-custom hover:bg-opacity-80 transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        ) : (
          filteredAccounts.map((account) => (
            <div
              key={account.id}
              className="p-4 rounded-xl border border-custom bg-card hover:bg-opacity-60 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-custom flex items-center justify-center text-primary">
                    {/* Icon based on account type */}
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {account.type === 'bank' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l9-4 9 4v12l-9 4-9-4V6z" />
                      )}
                      {account.type === 'cex' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      )}
                      {account.type === 'wallet' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-primary font-medium">{account.name}</h3>
                    <p className="text-sm text-secondary">{account.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-secondary mb-1">Balance</p>
                  <p className="text-primary font-medium">{account.balance}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
