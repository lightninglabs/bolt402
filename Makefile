.PHONY: build test lint fmt check doc clean ci

# Default target
all: check

# Build all crates
build:
	cargo build --workspace

# Run all tests
test:
	cargo test --workspace

# Run clippy lints
lint:
	cargo clippy --workspace --all-targets -- -D warnings

# Check formatting
fmt:
	cargo fmt --all -- --check

# Format code (fix in place)
fmt-fix:
	cargo fmt --all

# Full check: fmt + lint + test
check: fmt lint test

# Build documentation
doc:
	cargo doc --workspace --no-deps

# Open documentation in browser
doc-open:
	cargo doc --workspace --no-deps --open

# Clean build artifacts
clean:
	cargo clean

# CI pipeline (same as GitHub Actions)
ci: fmt lint test doc
	@echo "CI checks passed."
