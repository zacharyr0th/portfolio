import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Loader2, Copy, Check } from "lucide-react";
import Image from "next/image";
import { NFTBalance } from "@/lib/data/simplehash";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

interface NftModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  chain: string;
}

export function NftModal({
  isOpen,
  onClose,
  walletAddress,
  chain,
}: NftModalProps) {
  const [nfts, setNfts] = useState<NFTBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  const fetchNFTs = useCallback(async () => {
    if (!walletAddress || !chain) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/simplehash?wallet=${encodeURIComponent(walletAddress)}&chain=${encodeURIComponent(chain)}`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch NFTs");
      }
      const data = await response.json();
      setNfts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NFTs");
      setNfts([]);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, chain]);

  useEffect(() => {
    if (isOpen) {
      fetchNFTs();
    } else {
      setNfts([]);
      setError(null);
    }
  }, [isOpen, fetchNFTs]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-48 gap-4">
          <p className="text-destructive">{error}</p>
          <button
            onClick={fetchNFTs}
            className="text-sm text-primary hover:underline"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (nfts.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          No NFTs found in this wallet
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {nfts.map((nft, index) => (
          <NFTCard
            key={`${nft.contract_address}-${nft.token_id}-${index}`}
            nft={nft}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl font-semibold">NFTs</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="font-mono">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? "Copied!" : "Click to copy"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-background hover:scrollbar-thumb-border/80 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:rounded-full">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface NFTCardProps {
  nft: NFTBalance;
}

function NFTCard({ nft }: NFTCardProps) {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border hover:border-border/80 transition-all hover:shadow-md">
      <div className="aspect-square relative">
        {nft.image_url ? (
          <Image
            src={nft.image_url}
            alt={nft.name || "NFT"}
            fill
            className="object-cover"
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={nft.image_url.toLowerCase().endsWith(".gif")}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
            No Image
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3
          className="font-medium truncate text-base"
          title={nft.name || "Unnamed NFT"}
        >
          {nft.name || "Unnamed NFT"}
        </h3>
        <p
          className="text-sm text-muted-foreground truncate"
          title={nft.collection.name}
        >
          {nft.collection.name}
        </p>
        {nft.floor_price && (
          <p className="text-sm font-medium">
            Floor: {nft.floor_price.value.toFixed(4)} {nft.floor_price.currency}
          </p>
        )}
      </div>
    </div>
  );
}
