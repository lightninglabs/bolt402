//! # bolt402-core
//!
//! L402 client SDK core providing the protocol engine, token cache,
//! budget tracker, and Lightning backend abstraction.
//!
//! ## Architecture
//!
//! This crate follows hexagonal (ports & adapters) architecture:
//!
//! - **Domain**: Core types and business logic ([`L402Client`], [`Budget`], [`Receipt`])
//! - **Ports**: Trait definitions for external dependencies ([`LnBackend`], [`TokenStore`])
//! - **Adapters**: In-memory implementations (see [`cache`] and [`budget`] modules)
//!
//! External adapters (LND, CLN, etc.) live in separate crates.
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use bolt402_core::{L402Client, L402ClientConfig};
//!
//! # async fn example(backend: impl bolt402_core::port::LnBackend) {
//! let client = L402Client::builder()
//!     .backend(backend)
//!     .build();
//!
//! let response = client.get("https://api.example.com/paid-resource").await.unwrap();
//! # }
//! ```

pub mod budget;
pub mod cache;
pub mod client;
pub mod error;
pub mod port;
pub mod receipt;

pub use client::{L402Client, L402ClientBuilder, L402ClientConfig};
pub use error::ClientError;
pub use port::LnBackend;
