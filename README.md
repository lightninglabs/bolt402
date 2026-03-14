# bolt402

**L402 client SDK for AI agent frameworks** — pay for APIs with Lightning.

> ⚠️ **Work in progress.** bolt402 is under active development. APIs will change.

## What is this?

bolt402 is a Rust-native L402 client SDK that gives AI agent frameworks (LangChain, Vercel AI SDK, CrewAI, etc.) native Lightning payment capabilities. Built once in Rust, distributed everywhere via language bindings.

**The gap today:** Lightning Labs' [agent-kit](https://github.com/lightninglabs/agent-kit) provides `lnget` — a CLI tool for L402 payments. Great for shell-based agents, but the AI agent ecosystem is library-based. LangChain has 200M+ monthly PyPI downloads. None of these frameworks can shell out to `lnget`. They need a native library.

bolt402 fills that gap.

## Architecture

```
┌─────────────────────────────────────┐
│        Agent Framework              │
│  (LangChain / Vercel AI / CrewAI)   │
└───────────────┬─────────────────────┘
                │ function call
┌───────────────▼─────────────────────┐
│           bolt402 SDK               │
│                                     │
│  L402 Engine ─── Token Cache        │
│       │                             │
│  Budget Tracker ── Receipt Logger   │
│       │                             │
│  Lightning Backend (pluggable)      │
│  ├── LND (gRPC)                     │
│  ├── CLN                            │
│  ├── LDK (embedded)                 │
│  └── NWC (Nostr Wallet Connect)     │
└─────────────────────────────────────┘
```

### Design

- **Hexagonal architecture**: Core logic has zero external dependencies. Lightning backends and token stores are traits (ports) with pluggable implementations (adapters).
- **Protocol types shared**: `bolt402-proto` can be used by both client and server implementations.
- **Rust-first, bind everywhere**: Core in Rust, with planned FFI bindings via PyO3 (Python), napi-rs (Node.js), cgo (Go), and wasm-pack (WASM).

## Crates

| Crate | Description | Status |
|-------|-------------|--------|
| `bolt402-proto` | L402 protocol types, challenge parsing, token construction | 🟡 In progress |
| `bolt402-core` | Client engine, ports, budget tracker, token cache, receipts | 🟡 In progress |
| `bolt402-lnd` | LND gRPC backend adapter | 🔴 Not started |
| `bolt402-mock` | Mock L402 server for testing | 🔴 Not started |

## Quick Start

```rust
use bolt402_core::{L402Client, L402ClientConfig};

#[tokio::main]
async fn main() {
    let client = L402Client::builder()
        .backend(lnd_backend)
        .build();

    // L402 negotiation happens automatically
    let response = client.get("https://api.example.com/paid-resource").await.unwrap();
}
```

## Development

```bash
# Build
cargo build

# Test
cargo test

# Lint
cargo clippy

# Format
cargo fmt

# Docs
cargo doc --no-deps --open
```

See [AGENTS.md](AGENTS.md) for architecture details and [CLAUDE.md](CLAUDE.md) for AI agent coding instructions.

## Roadmap

- [ ] Core L402 client engine (`bolt402-core`)
- [ ] LND gRPC backend (`bolt402-lnd`)
- [ ] Mock L402 server (`bolt402-mock`)
- [ ] CI/CD pipeline
- [ ] Python bindings (PyO3)
- [ ] TypeScript bindings (napi-rs)
- [ ] LangChain integration
- [ ] Vercel AI SDK integration
- [ ] MCP server mode
- [ ] Documentation site

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE))
- MIT License ([LICENSE-MIT](LICENSE-MIT))

at your option.

## Contributing

This project is maintained by [@darioAnongba](https://github.com/darioAnongba). Contributions welcome — please open an issue first to discuss.
