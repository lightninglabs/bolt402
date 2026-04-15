//! Build script for l402-cln: compiles CLN proto files when the grpc feature is enabled.
//!
//! If `protoc` is not available (e.g. cross-compilation in manylinux containers),
//! falls back to pre-generated files in `src/gen/`.

fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::var_os("CARGO_FEATURE_GRPC").is_some() {
        let out_dir = std::path::PathBuf::from(std::env::var("OUT_DIR")?);
        match tonic_build::configure()
            .build_server(false)
            .compile_protos(&["proto/node.proto"], &["proto"])
        {
            Ok(()) => {}
            Err(e) => {
                eprintln!(
                    "cargo:warning=protoc not available ({e}), using pre-generated gRPC stubs"
                );
                std::fs::copy("src/gen/cln.rs", out_dir.join("cln.rs"))?;
            }
        }
    }

    Ok(())
}
