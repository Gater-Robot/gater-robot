# Coupon Packet Diagram (Planned `hookData` Extension)

Coupons are not enabled in the current contracts, but the router/hook already pass `hookData`.
This document defines a clean packet format for future coupon support.

## Packet structure (ABI-encoded)

```mermaid
flowchart LR
    A[hookData bytes] --> B[abi.decode as CouponPacket]

    subgraph CouponPacket
      V[version: uint8]
      M[mode: uint8<br/>0=buy 1=refund]
      E[expiry: uint40]
      N[nonce: uint64]
      S[signer: address]
      D[discountBps: uint16]
      R[refundBoostBps: uint16]
      X[salt: bytes32]
      G[signature: bytes]
    end
```

## Logical payload to sign

```mermaid
classDiagram
    class CouponPayload {
      +uint256 chainId
      +address hook
      +address token
      +address user
      +uint8 mode
      +uint256 maxSubAmount
      +uint256 minSubAmount
      +uint40 expiry
      +uint64 nonce
      +uint16 discountBps
      +uint16 refundBoostBps
      +bytes32 salt
    }
```

## Validation/data flow in swap path

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Router
    participant Hook
    participant CouponSigner as Coupon Signer Service

    User->>CouponSigner: request coupon
    CouponSigner-->>User: CouponPacket (fields + signature)
    User->>Router: buy/refund(..., hookData=CouponPacket)
    Router->>Hook: swap(..., hookData)
    Hook->>Hook: decode packet
    Hook->>Hook: check version/mode/expiry/amount bounds
    Hook->>Hook: verify signer + signature
    Hook->>Hook: enforce nonce replay protection
    Hook->>Hook: apply discount or refund boost
```

## Notes for implementation
1. Keep packet versioned (`version`) for forwards compatibility.
2. Bind signatures to both `chainId` and `hook` to avoid cross-chain/cross-hook replay.
3. Nonce should be consumed on first use (on-chain mapping keyed by signer+user+nonce).
4. Cap `discountBps` and `refundBoostBps` to safe ranges (e.g., max 10_000 bps).
