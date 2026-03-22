# Architecture Guide

bolt402 follows **hexagonal architecture** (ports and adapters), inspired by domain-driven design. The core protocol logic has zero external dependencies. Lightning backends and token stores are interchangeable through trait boundaries.

## Crate Dependency Graph

```
                    bolt402-proto
                  (protocol types)
                   ↑      ↑     ↑
                   │      │     │
          ┌────────┘      │     └────────┐
          │               │              │
    bolt402-core     bolt402-mock   bolt402-swissknife
    (L402 engine)    (test server)   (SwissKnife adapter)
       ↑    ↑
       │    │
       │    └──────────────┐
       │                   │
  bolt402-lnd        bolt402-ai-sdk
  (LND adapter)      (Vercel AI SDK)
```

| Crate | Role |
|-------|------|
| `bolt402-proto` | Shared protocol types: `L402Challenge`, `L402Token`, `L402Error`. No internal dependencies. |
| `bolt402-core` | The L402 client engine. Defines ports (`LnBackend`, `TokenStore`) and contains the `L402Client`, `BudgetTracker`, `InMemoryTokenStore`, and `Receipt` types. |
| `bolt402-lnd` | Implements `LnBackend` for LND via gRPC (using vendored proto definitions). |
| `bolt402-cln` | Implements `LnBackend` for Core Lightning (CLN) via gRPC with mTLS authentication. |
| `bolt402-swissknife` | Implements `LnBackend` for Numeraire SwissKnife via REST API. |
| `bolt402-mock` | A mock L402 server and mock Lightning backend for testing. No real Lightning infrastructure needed. |
| `bolt402-ai-sdk` | TypeScript package providing Vercel AI SDK tools. Ports the hexagonal architecture to TypeScript. |

## Ports and Adapters

The hexagonal architecture separates what the system does (core logic) from how it connects to the outside world (adapters).

### Ports (Trait Definitions)

Ports live in `bolt402-core` and define the contracts:

```rust
// Lightning payment port
#[async_trait]
pub trait LnBackend: Send + Sync {
    async fn pay_invoice(&self, bolt11: &str, max_fee_sats: u64)
        -> Result<PaymentResult, ClientError>;
    async fn get_balance(&self) -> Result<u64, ClientError>;
    async fn get_info(&self) -> Result<NodeInfo, ClientError>;
}

// Token caching port
#[async_trait]
pub trait TokenStore: Send + Sync {
    async fn put(&self, endpoint: &str, macaroon: &str, preimage: &str)
        -> Result<(), ClientError>;
    async fn get(&self, endpoint: &str)
        -> Result<Option<(String, String)>, ClientError>;
    async fn remove(&self, endpoint: &str) -> Result<(), ClientError>;
    async fn clear(&self) -> Result<(), ClientError>;
}
```

### Adapters (Implementations)

Each adapter lives in its own crate:

| Port | Adapter | Crate |
|------|---------|-------|
| `LnBackend` | LND gRPC | `bolt402-lnd` |
| `LnBackend` | SwissKnife REST | `bolt402-swissknife` |
| `LnBackend` | Mock (for testing) | `bolt402-mock` |
| `TokenStore` | In-memory LRU cache | `bolt402-core` (built-in) |

You can implement your own adapters for CLN, LDK, Nostr Wallet Connect, or any other Lightning implementation. See the [Custom Backend Tutorial](tutorials/custom-backend.md).

## The L402 Protocol Flow

When `L402Client.get(url)` is called, the following happens:

```
Client                     Server                     Lightning
  │                          │                           │
  │── GET /api/data ────────▶│                           │
  │                          │                           │
  │◀── 402 Payment Required ─│                           │
  │    WWW-Authenticate:     │                           │
  │    L402 macaroon="..",   │                           │
  │         invoice=".."     │                           │
  │                          │                           │
  │  [Parse L402 challenge]  │                           │
  │  [Check budget limits]   │                           │
  │                          │                           │
  │── pay_invoice(bolt11) ──────────────────────────────▶│
  │◀── PaymentResult(preimage, hash, amount) ───────────│
  │                          │                           │
  │  [Cache token]           │                           │
  │                          │                           │
  │── GET /api/data ────────▶│                           │
  │   Authorization:         │                           │
  │   L402 <macaroon>:<preimage>                         │
  │                          │                           │
  │◀── 200 OK ──────────────│                           │
  │    {"result": "..."}     │                           │
  │                          │                           │
  │  [Record receipt]        │                           │
```

On subsequent requests to the same URL, the cached token is used directly (no payment needed).

## Budget System

The `BudgetTracker` enforces spending limits at multiple granularities:

- **Per-request**: Maximum satoshis for a single payment
- **Hourly**: Rolling hourly cap
- **Daily**: Rolling daily cap
- **Total**: Lifetime cap for the client instance
- **Domain-specific**: Override budgets for specific API domains

Budget checks happen before payment. If a limit would be exceeded, `ClientError::BudgetExceeded` is returned and no payment is attempted.

## Rust ↔ TypeScript Symmetry

The TypeScript `bolt402-ai-sdk` package mirrors the Rust architecture:

| Rust (`bolt402-core`) | TypeScript (`bolt402-ai-sdk`) |
|------------------------|-------------------------------|
| `LnBackend` trait | `LnBackend` interface |
| `TokenStore` trait | `TokenStore` interface |
| `L402Client` struct | `L402Client` class |
| `Budget` struct | `Budget` interface |
| `BudgetTracker` struct | `BudgetTracker` class |
| `Receipt` struct | `Receipt` interface |
| `InMemoryTokenStore` | `InMemoryTokenStore` |

The TypeScript package adds Vercel AI SDK integration via `createBolt402Tools()`, which wraps the `L402Client` into tools that any AI model can call.

## Design Principles

1. **Zero-dependency core.** `bolt402-core` depends only on `bolt402-proto` and standard async/HTTP libraries. No Lightning-specific dependencies leak into the core.

2. **Swap anything.** Need a different Lightning backend? Implement `LnBackend`. Need persistent token storage? Implement `TokenStore`. The core doesn't care.

3. **Test without infrastructure.** `bolt402-mock` provides a complete L402 server and mock Lightning backend. You can test the full payment flow without running a real Lightning node.

4. **Receipts by default.** Every payment is recorded as a `Receipt` with amount, fees, latency, and payment hash. This makes cost analysis and auditing trivial.

5. **Safety first for agents.** AI agents spending real money need guardrails. The budget system is not optional decoration; it's a first-class concern built into the protocol flow.
