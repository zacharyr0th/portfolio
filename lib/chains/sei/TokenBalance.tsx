import { Eye, EyeOff } from "lucide-react";
import { formatLargeNumber, formatUSD } from "./utils";
import { EXPLORER_CONFIG } from "./constants";

interface Token {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
}

interface TokenBalanceProps {
  token: Token;
  quantity: number;
  price?: number;
  showPrice?: boolean;
  canHide?: boolean;
  onHide?: () => void;
  isHidden?: boolean;
  showHiddenTokens?: boolean;
  chainType?: string;
}

export function TokenBalance({
  token,
  quantity,
  price = 0,
  showPrice = true,
  canHide = false,
  onHide,
  isHidden = false,
  showHiddenTokens = false,
  chainType = "sei",
}: TokenBalanceProps) {
  const value = quantity * (price || 0);
  const formattedQuantity = formatLargeNumber(quantity);
  const formattedValue = formatUSD(value);
  const tokenUrl = `${EXPLORER_CONFIG.TOKEN_URL}/${token.address}`;

  if (isHidden && !showHiddenTokens) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
        isHidden ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <a
            href={tokenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline"
          >
            {token.symbol}
          </a>
          <span className="text-xs text-muted-foreground">{token.name}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium">{formattedQuantity}</span>
          {showPrice && price > 0 && (
            <span className="text-xs text-muted-foreground">
              {formattedValue}
            </span>
          )}
        </div>
        {canHide && onHide && (
          <button
            onClick={onHide}
            className="p-1 hover:bg-accent rounded-md transition-colors"
            aria-label={isHidden ? "Show token" : "Hide token"}
          >
            {isHidden ? (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
