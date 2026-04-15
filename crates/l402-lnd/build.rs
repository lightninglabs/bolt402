//! Build script for l402-lnd: compiles LND proto files when the grpc feature is enabled.
//!
//! If `protoc` is not available (e.g. cross-compilation in manylinux containers),
//! falls back to pre-generated files in `src/gen/`.

fn main() -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(feature = "grpc")]
    {
        let out_dir = std::path::PathBuf::from(std::env::var("OUT_DIR")?);
        match tonic_build::configure()
            .build_server(false)
            .compile_protos(&["proto/lightning.proto", "proto/router.proto"], &["proto"])
        {
            Ok(()) => {}
            Err(e) => {
                eprintln!(
                    "cargo:warning=protoc not available ({e}), using pre-generated gRPC stubs"
                );
                std::fs::copy("src/gen/lnrpc.rs", out_dir.join("lnrpc.rs"))?;
                std::fs::copy("src/gen/routerrpc.rs", out_dir.join("routerrpc.rs"))?;
            }
        }
    }

    Ok(())
}
