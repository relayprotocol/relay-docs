#!/usr/bin/env python3
"""
Cross-chain swap quote fetcher
Swap: 1 ETH (Ethereum mainnet) → USDC (Base)
Providers: Across, Aori, Relay.link, deBridge, 1inch Fusion+

Requirements:
    pip install aiohttp

Optional env vars:
    INCH_API_KEY  – 1inch dev-portal API key (https://portal.1inch.dev)
                    Without it the 1inch request will likely return 401.
"""

import asyncio
import os
from dataclasses import dataclass
from typing import Optional

import aiohttp

# ─── Constants ────────────────────────────────────────────────────────────────

AMOUNT_WEI      = 10 ** 18                                          # 1 ETH
ETH_CHAIN_ID    = 1
BASE_CHAIN_ID   = 8453
ETH_TOKEN       = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"   # native ETH
USDC_BASE_TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"   # USDC on Base
WALLET          = "0x000000000000000000000000000000000000dEaD"
USDC_DECIMALS   = 6

INCH_API_KEY    = os.environ.get("INCH_API_KEY", "")
TIMEOUT         = aiohttp.ClientTimeout(total=20)


# ─── Data model ───────────────────────────────────────────────────────────────

@dataclass
class Quote:
    provider: str
    output_raw: Optional[int]    = None   # USDC in base units (1e6)
    output_usdc: Optional[float] = None   # human-readable USDC
    fee_info: Optional[str]      = None
    gas_info: Optional[str]      = None
    error: Optional[str]         = None


# ─── Fetchers ─────────────────────────────────────────────────────────────────

async def fetch_across(session: aiohttp.ClientSession) -> Quote:
    """
    Across Protocol suggested-fees endpoint.
    Docs: https://docs.across.to/reference/api
    Supports cross-asset bridge+swap via inputToken / outputToken params.
    """
    try:
        async with session.get(
            "https://app.across.to/api/suggested-fees",
            params={
                "inputToken":          ETH_TOKEN,
                "outputToken":         USDC_BASE_TOKEN,
                "originChainId":       ETH_CHAIN_ID,
                "destinationChainId":  BASE_CHAIN_ID,
                "amount":              str(AMOUNT_WEI),
                "recipient":           WALLET,
            },
        ) as resp:
            resp.raise_for_status()
            data = await resp.json()

        output_raw = int(data.get("outputAmount") or 0)

        relay_fee  = data.get("totalRelayFee", {})
        lp_fee     = data.get("lpFee", {})
        relay_eth  = int(relay_fee.get("total") or 0) / 1e18
        lp_eth     = int(lp_fee.get("total") or 0) / 1e18

        return Quote(
            provider    = "Across",
            output_raw  = output_raw or None,
            output_usdc = output_raw / 10**USDC_DECIMALS if output_raw else None,
            fee_info    = f"relay {relay_eth:.5f} ETH, lp {lp_eth:.5f} ETH",
            gas_info    = f"~{data.get('estimatedFillTimeSec', '?')}s fill time",
        )
    except Exception as exc:
        return Quote(provider="Across", error=str(exc))


async def fetch_relay(session: aiohttp.ClientSession) -> Quote:
    """
    Relay.link cross-chain quote endpoint.
    Docs: https://docs.relay.link/references/api/get-quote
    """
    try:
        async with session.get(
            "https://api.relay.link/quote",
            params={
                "user":                WALLET,
                "originChainId":       ETH_CHAIN_ID,
                "destinationChainId":  BASE_CHAIN_ID,
                "originCurrency":      ETH_TOKEN,
                "destinationCurrency": USDC_BASE_TOKEN,
                "amount":              str(AMOUNT_WEI),
                "recipient":           WALLET,
                "tradeType":           "EXACT_INPUT",
            },
        ) as resp:
            resp.raise_for_status()
            data = await resp.json()

        details    = data.get("details", {})
        curr_out   = details.get("currencyOut", {})
        output_raw = int(curr_out.get("amount") or 0)

        fees         = data.get("fees", {})
        relayer_usd  = fees.get("relayer", {}).get("amountUsd", "?")
        gas_usd      = fees.get("gas", {}).get("amountUsd", "?")

        return Quote(
            provider    = "Relay.link",
            output_raw  = output_raw or None,
            output_usdc = output_raw / 10**USDC_DECIMALS if output_raw else None,
            fee_info    = f"relayer ~${relayer_usd}, gas ~${gas_usd}",
            gas_info    = f"~{details.get('timeEstimate', '?')}s",
        )
    except Exception as exc:
        return Quote(provider="Relay.link", error=str(exc))


async def fetch_debridge(session: aiohttp.ClientSession) -> Quote:
    """
    deBridge DLN (Decentalized Liquidity Network) order quote.
    Docs: https://api.dln.trade/v1.0/swagger
    """
    try:
        async with session.get(
            "https://api.dln.trade/v1.0/dln/order/quote",
            params={
                "srcChainId":              ETH_CHAIN_ID,
                "srcChainTokenIn":         ETH_TOKEN,
                "srcChainTokenInAmount":   str(AMOUNT_WEI),
                "dstChainId":              BASE_CHAIN_ID,
                "dstChainTokenOut":        USDC_BASE_TOKEN,
                "prependOperatingExpenses": "true",
                "affiliateFeePercent":     "0",
            },
        ) as resp:
            resp.raise_for_status()
            data = await resp.json()

        est        = data.get("estimation", {})
        dst_out    = est.get("dstChainTokenOut", {})
        # recommendedAmount deducts operating expenses; prefer over raw "amount"
        output_raw = int(dst_out.get("recommendedAmount") or dst_out.get("amount") or 0)

        costs     = est.get("costsDetails", [])
        fee_parts = []
        for c in costs[:3]:
            ctype   = c.get("type", "?")
            payload = c.get("payload", {})
            amount  = payload.get("feeAmount", payload.get("amount", "?"))
            fee_parts.append(f"{ctype}={amount}")

        return Quote(
            provider    = "deBridge",
            output_raw  = output_raw or None,
            output_usdc = output_raw / 10**USDC_DECIMALS if output_raw else None,
            fee_info    = "; ".join(fee_parts) if fee_parts else "n/a",
            gas_info    = "intent-based (no fixed gas)",
        )
    except Exception as exc:
        return Quote(provider="deBridge", error=str(exc))


async def fetch_aori(session: aiohttp.ClientSession) -> Quote:
    """
    Aori cross-chain RFQ quote endpoint.
    Docs: https://docs.aori.io
    """
    try:
        async with session.post(
            "https://api.aori.io/quote",
            json={
                "inputToken":    ETH_TOKEN,
                "outputToken":   USDC_BASE_TOKEN,
                "inputAmount":   str(AMOUNT_WEI),
                "inputChainId":  ETH_CHAIN_ID,
                "outputChainId": BASE_CHAIN_ID,
                "address":       WALLET,
            },
        ) as resp:
            resp.raise_for_status()
            data = await resp.json()

        output_raw = int(data.get("outputAmount") or data.get("output") or 0)

        return Quote(
            provider    = "Aori",
            output_raw  = output_raw or None,
            output_usdc = output_raw / 10**USDC_DECIMALS if output_raw else None,
            fee_info    = str(data.get("fee") or data.get("fees") or "n/a"),
            gas_info    = str(data.get("gasEstimate") or "n/a"),
        )
    except Exception as exc:
        return Quote(provider="Aori", error=str(exc))


async def fetch_1inch_fusion_plus(session: aiohttp.ClientSession) -> Quote:
    """
    1inch Fusion+ cross-chain quote.
    Docs: https://portal.1inch.dev/documentation/fusion-plus
    Requires INCH_API_KEY environment variable.
    """
    try:
        headers = {"Accept": "application/json"}
        if INCH_API_KEY:
            headers["Authorization"] = f"Bearer {INCH_API_KEY}"

        async with session.get(
            "https://api.1inch.dev/fusion-plus/quoter/v1.0/quote/receive",
            params={
                "srcChain":        ETH_CHAIN_ID,
                "dstChain":        BASE_CHAIN_ID,
                "srcTokenAddress": ETH_TOKEN,
                "dstTokenAddress": USDC_BASE_TOKEN,
                "amount":          str(AMOUNT_WEI),
                "walletAddress":   WALLET,
                "enableEstimate":  "true",
            },
            headers=headers,
        ) as resp:
            resp.raise_for_status()
            data = await resp.json()

        # Use the recommended preset; fall back to "fast"
        presets         = data.get("presets", {})
        recommended_key = data.get("recommendedPreset", "fast")
        preset          = presets.get(recommended_key, presets.get("fast", {}))

        # auctionEndAmount is the guaranteed minimum; auctionStartAmount is optimistic
        output_raw = int(
            preset.get("auctionEndAmount")
            or preset.get("auctionStartAmount")
            or data.get("dstTokenAmount")
            or 0
        )

        return Quote(
            provider    = "1inch Fusion+",
            output_raw  = output_raw or None,
            output_usdc = output_raw / 10**USDC_DECIMALS if output_raw else None,
            fee_info    = f"preset={recommended_key}, bankFee={preset.get('bankFee', '?')}",
            gas_info    = "gasless (intent / resolver network)",
        )
    except Exception as exc:
        return Quote(provider="1inch Fusion+", error=str(exc))


# ─── Display ──────────────────────────────────────────────────────────────────

def display_results(quotes: list[Quote]) -> None:
    ok   = sorted(
        [q for q in quotes if q.output_usdc is not None],
        key=lambda q: q.output_raw or 0,
        reverse=True,
    )
    fail = [q for q in quotes if q.output_usdc is None]

    W = 108
    print()
    print("═" * W)
    print(f"  Cross-chain swap quote  ·  1 ETH (Ethereum mainnet) → USDC (Base)")
    print(f"  Wallet: {WALLET}")
    print("═" * W)

    if ok:
        print(f"  {'#':<4} {'Provider':<18} {'USDC received':>15}   {'Fees':<38} Gas / time")
        print("─" * W)
        for rank, q in enumerate(ok, 1):
            tag = "  ← best" if rank == 1 else ""
            print(
                f"  {rank:<4} {q.provider:<18} {q.output_usdc:>14,.2f}   "
                f"{(q.fee_info or 'n/a'):<38} {q.gas_info or 'n/a'}"
                f"{tag}"
            )
    else:
        print("  No successful quotes returned.")

    if fail:
        print("─" * W)
        print("  Errors:")
        for q in fail:
            print(f"    {q.provider:<20} {q.error or 'no output amount in response'}")

    print("═" * W)
    print()


# ─── Entry point ──────────────────────────────────────────────────────────────

async def main() -> None:
    providers = ["Across", "Aori", "Relay.link", "deBridge", "1inch Fusion+"]
    print(f"Fetching quotes from {', '.join(providers)} …")

    async with aiohttp.ClientSession(timeout=TIMEOUT) as session:
        quotes = await asyncio.gather(
            fetch_across(session),
            fetch_relay(session),
            fetch_debridge(session),
            fetch_aori(session),
            fetch_1inch_fusion_plus(session),
        )

    display_results(list(quotes))


if __name__ == "__main__":
    asyncio.run(main())
