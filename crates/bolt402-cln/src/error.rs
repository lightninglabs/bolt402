//! Error types for the CLN backend.

use bolt402_core::ClientError;

/// Error type specific to the CLN backend.
#[derive(Debug, thiserror::Error)]
pub enum ClnError {
    /// gRPC connection or transport error.
    #[error("CLN transport error: {0}")]
    Transport(#[from] tonic::transport::Error),

    /// gRPC call returned an error status.
    #[error("CLN gRPC error: {0}")]
    Rpc(#[from] tonic::Status),

    /// Failed to read TLS certificate or key file.
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    /// Payment failed with a specific reason.
    #[error("payment failed: {0}")]
    Payment(String),
}

impl From<ClnError> for ClientError {
    fn from(err: ClnError) -> Self {
        match err {
            ClnError::Payment(reason) => ClientError::PaymentFailed { reason },
            other => ClientError::Backend {
                reason: other.to_string(),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_display() {
        let err = ClnError::Payment("no route found".to_string());
        assert_eq!(err.to_string(), "payment failed: no route found");

        let err = ClnError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "file not found",
        ));
        assert_eq!(err.to_string(), "IO error: file not found");

        let err = ClnError::Rpc(tonic::Status::unavailable("node offline"));
        assert_eq!(
            err.to_string(),
            "CLN gRPC error: status: Unavailable, message: \"node offline\", details: [], metadata: MetadataMap { headers: {} }"
        );
    }

    #[test]
    fn error_conversion_payment() {
        let cln_err = ClnError::Payment("timeout".to_string());
        let client_err: ClientError = cln_err.into();
        match client_err {
            ClientError::PaymentFailed { reason } => assert_eq!(reason, "timeout"),
            _ => panic!("expected PaymentFailed"),
        }
    }

    #[test]
    fn error_conversion_backend() {
        let cln_err = ClnError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "cert not found",
        ));
        let client_err: ClientError = cln_err.into();
        match client_err {
            ClientError::Backend { reason } => assert!(reason.contains("cert not found")),
            _ => panic!("expected Backend"),
        }
    }
}
