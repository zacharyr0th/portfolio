'use client';

import { useAccounts } from '@/hooks/useAccounts';
import { useState } from 'react';

export default function AccountsPage() {
  const { accounts, loading, error, connectAccount } = useAccounts();
  const [connectingType, setConnectingType] = useState<string | null>(null);

  const handleConnect = (type: 'bank' | 'broker' | 'cex' | 'wallet') => {
    setConnectingType(type);
    connectAccount({ type, provider: '' });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary">Loading accounts...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
        <div className="text-center py-12">
          <div className="text-error mb-4">Error loading accounts</div>
          <p className="text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  const ConnectButton = ({ type, label, icon, description }: { 
    type: 'bank' | 'broker' | 'cex' | 'wallet',
    label: string,
    icon: string,
    description: string 
  }) => (
    <button
      onClick={() => handleConnect(type)}
      disabled={connectingType === type}
      className="flex items-center space-x-4 w-full p-4 rounded-xl border border-custom bg-card hover:bg-opacity-80 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
    >
      <div className="w-12 h-12 rounded-xl bg-card border border-custom flex items-center justify-center text-primary">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div className="flex-1 text-left">
        <h3 className="font-medium text-primary">{label}</h3>
        <p className="text-sm text-secondary">{description}</p>
      </div>
      {connectingType === type ? (
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Account Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Banks Section */}
        <div className="p-6 rounded-xl border border-custom bg-card hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-primary">Banks</h2>
              <p className="text-sm text-secondary mt-1">Connect your bank accounts</p>
            </div>
            <button
              onClick={() => handleConnect('bank')}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-opacity-90 transition-colors"
            >
              Connect Bank
            </button>
          </div>
          {accounts.filter(a => a.type === 'bank').length > 0 ? (
            <div className="space-y-4">
              {accounts
                .filter(a => a.type === 'bank')
                .map(account => (
                  <div
                    key={account.id}
                    className="p-4 rounded-xl border border-custom bg-card hover:bg-opacity-60 transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-card border border-custom flex items-center justify-center text-primary">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6.5l9-3 9 3M3 6.5v13M21 6.5v13M6 19.5h12M6 10h.01M6 13h.01M6 16h.01M18 10h.01M18 13h.01M18 16h.01M12 10h.01M12 13h.01M12 16h.01" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-primary">{account.name}</h3>
                          <p className="text-sm text-secondary">Bank Account</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-secondary">Balance</p>
                        <p className="font-medium text-primary">{account.balance}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-secondary">
                <ConnectButton
                  type="bank"
                  label="Connect via Plaid"
                  icon="M3 6.5l9-3 9 3M3 6.5v13M21 6.5v13M6 19.5h12M6 10h.01M6 13h.01M6 16h.01M18 10h.01M18 13h.01M18 16h.01M12 10h.01M12 13h.01M12 16h.01"
                  description="Securely connect your bank accounts"
                />
              </div>
            </div>
          )}
        </div>

        {/* Brokers Section */}
        <div className="p-6 rounded-xl border border-custom bg-card hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-primary">Brokers</h2>
              <p className="text-sm text-secondary mt-1">Connect your investment accounts</p>
            </div>
            <button
              onClick={() => handleConnect('broker')}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-opacity-90 transition-colors"
            >
              Connect Broker
            </button>
          </div>
          {accounts.filter(a => a.type === 'broker').length > 0 ? (
            <div className="space-y-4">
              {accounts
                .filter(a => a.type === 'broker')
                .map(account => (
                  <div
                    key={account.id}
                    className="p-4 rounded-xl border border-custom bg-card hover:bg-opacity-60 transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-card border border-custom flex items-center justify-center text-primary">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-primary">{account.name}</h3>
                          <p className="text-sm text-secondary">Brokerage Account</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-secondary">Balance</p>
                        <p className="font-medium text-primary">{account.balance}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-secondary">
                <ConnectButton
                  type="broker"
                  label="Connect via Plaid"
                  icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  description="Securely connect your brokerage accounts"
                />
              </div>
            </div>
          )}
        </div>

        {/* CEX Section */}
        <div className="p-6 rounded-xl border border-custom bg-card hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-primary">Exchanges</h2>
              <p className="text-sm text-secondary mt-1">Connect your crypto exchanges</p>
            </div>
            <button
              onClick={() => handleConnect('cex')}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-opacity-90 transition-colors"
            >
              Connect Exchange
            </button>
          </div>
          {accounts.filter(a => a.type === 'cex').length > 0 ? (
            <div className="space-y-4">
              {accounts
                .filter(a => a.type === 'cex')
                .map(account => (
                  <div
                    key={account.id}
                    className="p-4 rounded-xl border border-custom bg-card hover:bg-opacity-60 transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-card border border-custom flex items-center justify-center text-primary">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-primary">{account.name}</h3>
                          <p className="text-sm text-secondary">Exchange Account</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-secondary">Balance</p>
                        <p className="font-medium text-primary">{account.balance}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-secondary">
                <ConnectButton
                  type="cex"
                  label="Connect via API"
                  icon="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  description="Securely connect your exchange accounts"
                />
              </div>
            </div>
          )}
        </div>

        {/* Wallets Section */}
        <div className="p-6 rounded-xl border border-custom bg-card hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-primary">Wallets</h2>
              <p className="text-sm text-secondary mt-1">Connect your crypto wallets</p>
            </div>
            <button
              onClick={() => handleConnect('wallet')}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-opacity-90 transition-colors"
            >
              Connect Wallet
            </button>
          </div>
          {accounts.filter(a => a.type === 'wallet').length > 0 ? (
            <div className="space-y-4">
              {accounts
                .filter(a => a.type === 'wallet')
                .map(account => (
                  <div
                    key={account.id}
                    className="p-4 rounded-xl border border-custom bg-card hover:bg-opacity-60 transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-card border border-custom flex items-center justify-center text-primary">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-primary">{account.name}</h3>
                          <p className="text-sm text-secondary">Wallet</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-secondary">Balance</p>
                        <p className="font-medium text-primary">{account.balance}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-secondary">
                <ConnectButton
                  type="wallet"
                  label="Connect Wallet"
                  icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  description="Connect your crypto wallets"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
