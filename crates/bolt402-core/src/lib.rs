//! # bolt402-core
//!
//! L402 client SDK core providing the protocol engine, token cache,
//! budget tracker, and Lightning backend abstraction.
//!
//! ## Architecture
//!
//! This crate follows hexagonal (ports & adapters) architecture:
//!
//! - **Domain**: Core types and business logic ([`budget::Budget`], [`receipt::Receipt`])
//! - **Ports**: Trait definitions for external dependencies ([`LnBackend`], [`port::TokenStore`])
//! - **Adapters**: In-memory implementations (see [`cache`] and [`budget`] modules)
//!
//! External adapters (LND, CLN, etc.) live in separate crates.

/// Budget tracking for L402 payments with per-request, hourly, daily, and total limits.
pub mod budget;

/// In-memory LRU token cache.
pub mod cache;

/// Client error types.
pub mod error;

/// Port definitions (traits) for Lightning backends and token stores.
pub mod port;

/// Payment receipt types for audit and cost analysis.
pub mod receipt;

pub use error::ClientError;
pub use port::LnBackend;
