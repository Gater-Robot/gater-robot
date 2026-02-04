# ADR-001: ETH Identity Stack Decision

**Status:** Accepted
**Date:** 2026-02-04
**Issue:** #11 (Evaluate ETH Identity Kit for ENS/SIWE)

## Context

Sprint 1 required evaluating `ethereum-identity-kit` versus RainbowKit/wagmi for wallet connection, ENS resolution, and SIWE (Sign-In With Ethereum) authentication.

### Options Considered

1. **ethereum-identity-kit only** - Use their SIWE + ENS components exclusively
2. **Hybrid: RainbowKit + eth-identity-kit** - RainbowKit for wallet connect, eth-identity-kit for ENS
3. **RainbowKit/wagmi only** - Drop eth-identity-kit, use RainbowKit for everything

## Decision

**Option 2: Hybrid approach**

| Concern | Library | Rationale |
|---------|---------|-----------|
| Wallet Connection | RainbowKit | Best UX, widest wallet support, familiar UI |
| Transaction Signing | wagmi | Already a RainbowKit dependency, robust hooks |
| SIWE Authentication | wagmi + `siwe` package | Clean separation, works with Convex backend |
| ENS Profile Display | ethereum-identity-kit | Beautiful ProfileCard, pre-built hooks |

## SIWE Implementation

### Why not RainbowKit's auth adapter?
- Designed for NextAuth.js integration
- We use Convex, not NextAuth
- More opinionated than needed

### Chosen approach: wagmi + `siwe` package

**Frontend:**
```typescript
import { useSignMessage, useAccount } from 'wagmi'
import { SiweMessage } from 'siwe'

function useSiweAuth() {
  const { address, chainId } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const signIn = async () => {
    // 1. Get nonce from Convex
    const nonce = await convex.query(api.auth.getNonce, { address })

    // 2. Construct SIWE message
    const message = new SiweMessage({
      domain: window.location.host,
      address,
      statement: 'Sign in to Gater Robot',
      uri: window.location.origin,
      version: '1',
      chainId,
      nonce,
    })

    // 3. Sign with wagmi
    const signature = await signMessageAsync({
      message: message.prepareMessage()
    })

    // 4. Verify with Convex
    return convex.mutation(api.auth.verifySiwe, {
      message: message.prepareMessage(),
      signature,
    })
  }

  return { signIn }
}
```

**Backend (Convex):**
```typescript
import { SiweMessage } from 'siwe'

export const verifySiwe = action({
  args: { message: v.string(), signature: v.string() },
  handler: async (ctx, { message, signature }) => {
    const siweMessage = new SiweMessage(message)
    const { success, data } = await siweMessage.verify({ signature })

    if (!success) throw new Error('Invalid signature')

    // Mark address as verified in database
    await ctx.runMutation(internal.addresses.markVerified, {
      address: data.address,
      siweMessage: message,
      siweSignature: signature,
    })

    return { verified: true, address: data.address }
  },
})
```

## Package Dependencies

```json
{
  "dependencies": {
    "@rainbow-me/rainbowkit": "^2.x",
    "wagmi": "^2.x",
    "viem": "^2.x",
    "siwe": "^2.x",
    "ethereum-identity-kit": "^0.x"
  }
}
```

## Verification Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  RainbowKit │────>│    wagmi    │────>│   Convex    │
│  (connect)  │     │   (sign)    │     │  (verify)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │ siwe package │
                    │ (construct + │
                    │   verify)    │
                    └─────────────┘
```

## ENS Integration

ethereum-identity-kit provides:
- `ProfileCard` component for displaying ENS profiles
- `useENSProfile` hook for fetching ENS data
- `TransactionProvider` for transaction status UI

These complement RainbowKit without overlap - RainbowKit handles connection, eth-identity-kit handles ENS display.

## Consequences

### Positive
- Best-in-class UX for each concern
- RainbowKit's wallet support (WalletConnect, Coinbase, injected, etc.)
- Beautiful ENS profile cards from eth-identity-kit
- Clean SIWE that works with Convex backend
- No vendor lock-in to a single library

### Negative
- More dependencies to maintain
- Slightly larger bundle size
- Need to ensure wagmi config is shared correctly

## References

- [RainbowKit Docs](https://rainbowkit.com/docs)
- [wagmi Docs](https://wagmi.sh)
- [SIWE Specification](https://eips.ethereum.org/EIPS/eip-4361)
- [ethereum-identity-kit](https://github.com/ethereumidentitykit/ethereum-identity-kit)
