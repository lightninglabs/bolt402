//! Build script for bolt402-cln: compiles CLN proto files.

fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .build_server(false)
        .compile_protos(&["proto/node.proto"], &["proto"])?;

    Ok(())
}
