"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Wallet,
  Building2,
  CreditCard,
  Briefcase,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import type { AccountType, ChainType } from "./types";
import { memo, useCallback, useState } from "react";
import {
  CHAIN_ICONS as CHAIN_ICON_PATHS,
  PLATFORM_ICONS as PLATFORM_ICON_PATHS,
} from "./constants";

// Unified icon registry with improved type safety
export const ACCOUNT_ICONS: Readonly<Record<AccountType, LucideIcon>> = {
  wallet: Wallet,
  cex: Building2,
  broker: Briefcase,
  bank: Building2,
  credit: CreditCard,
  debit: CreditCard,
} as const;

interface IconProps {
  readonly type: "account" | "image";
  readonly icon?: AccountType | string;
  readonly src?: string;
  readonly alt?: string;
  readonly opacity?: number;
  readonly className?: string;
}

// Image loading error cache to prevent repeated attempts
const failedImages = new Set<string>();

// Optimized Icon component with improved error handling and performance
export const Icon = memo(function IconComponent({
  type,
  icon,
  src,
  alt = "Icon",
  opacity = 100,
  className,
}: IconProps) {
  const [hasError, setHasError] = useState(false);
  const baseClassName = "h-5 w-5";
  const finalClassName = cn(baseClassName, className);

  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const target = e.target as HTMLImageElement;
      if (!target || !target.parentNode) return;

      // Add to failed images cache
      if (src) {
        failedImages.add(src);
      }

      // Hide the errored image
      target.style.display = "none";

      // Create fallback container
      const fallbackContainer = document.createElement("div");
      fallbackContainer.className = finalClassName;

      // Determine and render fallback icon
      const FallbackIcon = icon
        ? ACCOUNT_ICONS[icon as AccountType] || AlertCircle
        : AlertCircle;
      const fallbackElement = document.createElement("div");
      fallbackElement.className = finalClassName;
      fallbackElement.innerHTML = `<svg class="${finalClassName}">${FallbackIcon}</svg>`;

      // Replace errored image with fallback
      target.parentNode.appendChild(fallbackElement);
      setHasError(true);
    },
    [finalClassName, icon, src],
  );

  // Handle image type icons
  if (type === "image" && src) {
    // Check if image previously failed
    if (failedImages.has(src) || hasError) {
      const FallbackIcon = icon
        ? ACCOUNT_ICONS[icon as AccountType] || AlertCircle
        : AlertCircle;
      return <FallbackIcon className={finalClassName} aria-label={alt} />;
    }

    return (
      <div className={finalClassName}>
        <Image
          src={src}
          alt={alt}
          width={20}
          height={20}
          className={cn(
            "w-full h-auto",
            src.includes("chain-icons") ? "dark:invert dark:brightness-0" : "",
            src.includes("kraken.webp") ? "brightness-0 invert" : "",
            opacity !== 100 && `opacity-${opacity}`,
          )}
          priority={false}
          loading="lazy"
          onError={handleImageError}
        />
      </div>
    );
  }

  // Handle account type icons
  if (type === "account" && icon) {
    const IconComponent = ACCOUNT_ICONS[icon as AccountType] || Wallet;
    return <IconComponent className={finalClassName} aria-label={alt} />;
  }

  // Fallback to wallet icon
  return <Wallet className={finalClassName} aria-label="Default wallet icon" />;
});

Icon.displayName = "Icon";

// Memoized helper functions for getting icons
export const getAccountIcon = (type: AccountType): LucideIcon =>
  ACCOUNT_ICONS[type];
export const getChainIconPath = (chain: ChainType) => CHAIN_ICON_PATHS[chain];
export const getPlatformIconPath = (platform: string) =>
  PLATFORM_ICON_PATHS[platform];
