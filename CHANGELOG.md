# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **bolt402-cln**: Core Lightning (CLN) gRPC backend adapter implementing `LnBackend`. (#53)
- **bolt402-nwc**: Nostr Wallet Connect (NIP-47) backend adapter implementing `LnBackend`. (#51)
- **bolt402-sqlite**: SQLite persistent token store implementing `TokenStore`. (#48)
- **bolt402-ffi**: C-compatible FFI layer for cross-language bindings. (#44)
- **bolt402-python**: Python bindings via PyO3/maturin. (#23)
- **bolt402-wasm**: WebAssembly bindings via wasm-pack. (#46)
- **bolt402-go** (bindings): Go bindings via CGo + bolt402-ffi. (#44)
- **bolt402-langchain**: LangChain Python integration with L402FetchTool, L402BudgetTool, PaymentCallbackHandler. (#57)
- BOLT11 invoice amount decoding for budget enforcement. (#21)
- LocalStorage and File token stores in bolt402-ai-sdk. (#32)
- L402 Explorer interactive demo (Next.js). (#34)
- AI Research Agent demo. (#36)
- bolt402 vs lnget comparison page. (#37)
- 402index.io MCP server integration for dynamic service discovery. (#41)
- CONTRIBUTING.md with development setup, coding standards, and PR workflow.
- GitHub issue templates for bug reports and feature requests.
- This CHANGELOG.md file.

## [0.1.0] — 2026-03-16

Initial development release. Not yet published to crates.io or npm.

### Added

- **bolt402-proto**: L402 protocol types, challenge parsing from `WWW-Authenticate` headers, token construction for `Authorization` headers, typed error hierarchy.
- **bolt402-core**: `L402Client` engine with automatic L402 negotiation (challenge → pay → retry), `LnBackend` and `TokenStore` port traits, `InMemoryTokenStore` adapter, `BudgetTracker` with per-request and total spending limits, receipt logging.
- **bolt402-lnd**: LND gRPC backend adapter implementing `LnBackend` via `SendPaymentV2` (router service). Vendored proto files for self-contained builds.
- **bolt402-swissknife**: SwissKnife REST API backend adapter implementing `LnBackend`.
- **bolt402-mock**: Mock L402 server (Axum-based) for integration testing and development. Configurable challenges, payment simulation, token validation.
- **bolt402-ai-sdk** (TypeScript): Vercel AI SDK integration providing `createBolt402Tools()` for AI agents to make L402-authenticated HTTP requests. LND and SwissKnife backend support.
- CI/CD pipeline: GitHub Actions for formatting, clippy, tests, documentation, and TypeScript checks.
- Makefile with `check`, `ci`, `build`, `test`, `lint`, `fmt`, `doc` targets.
- Comprehensive design documents for each feature (`docs/design/001` through `006`).
- Dual license: MIT OR Apache-2.0.

[Unreleased]: https://github.com/bitcoin-numeraire/bolt402/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/bitcoin-numeraire/bolt402/releases/tag/v0.1.0
