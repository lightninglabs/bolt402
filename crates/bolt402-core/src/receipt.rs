//! Payment receipts for audit and cost analysis.

use serde::{Deserialize, Serialize};

/// A structured receipt for an L402 payment.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Receipt {
    /// ISO 8601 timestamp of the payment.
    pub timestamp: String,

    /// The endpoint that was accessed.
    pub endpoint: String,

    /// Amount paid in satoshis (excluding routing fees).
    pub amount_sats: u64,

    /// Routing fee paid in satoshis.
    pub fee_sats: u64,

    /// Hex-encoded payment hash.
    pub payment_hash: String,

    /// Hex-encoded preimage (proof of payment).
    pub preimage: String,

    /// HTTP response status code after presenting the L402 token.
    pub response_status: u16,

    /// Total latency from initial request to final response (milliseconds).
    pub latency_ms: u64,
}

impl Receipt {
    /// Create a new receipt.
    pub fn new(
        endpoint: String,
        amount_sats: u64,
        fee_sats: u64,
        payment_hash: String,
        preimage: String,
        response_status: u16,
        latency_ms: u64,
    ) -> Self {
        let timestamp = chrono::Utc::now().to_rfc3339();

        Self {
            timestamp,
            endpoint,
            amount_sats,
            fee_sats,
            payment_hash,
            preimage,
            response_status,
            latency_ms,
        }
    }

    /// Get the total cost (amount + routing fee) in satoshis.
    pub fn total_cost_sats(&self) -> u64 {
        self.amount_sats + self.fee_sats
    }
}
