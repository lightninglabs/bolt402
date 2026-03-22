# bolt402 Project Brief

## Origin

Renamed from `lnpay` (name already taken by other projects). Full original proposal at `../lnpay-proposal.md`.

## Initial Request (Dario, 2026-03-13 21:48 UTC)

> We discussed a 20% project with Lightning labs and you created a document (markdown) called "projects/lnpay-proposal.md". We are going to start this project. You are to be the maintainer of the project and be mostly autonomous. A bit differently than the bdk-wasm project where I supervise everything, the goal of the lnpay project is for you to be as autonomous as possible such that you are able to come to a point where you have something released and available to use, at least on GH (you don't have permissions for cargo or npm yet).
>
> - manage the project in your projects directory like the bdk-wasm project but more autonomous
> - create a repository in GH that you maintain, ask me for the permissions you need if something is missing
> - rename the project, lnpay is not a suitable name as already used by other projects
> - implement your vision with the functionalities expected like lnget has but in a programmatic SDK fashion
> - implement it in Rust with the goal of translating it in Go, Python, NPM, etc. using FFI
> - have a heartbeat or cron job dedicated to this project
> - since you can have all the toolchain and languages in your env, use the CI to test, integrate, verify, etc. your code and iterate until the CI is green.
> - create subagents if necessary
> - create a CLAUDE.MD or AGENTS.md or other at the root of the repo
> - add comprehensive documentation, demos and tutorials
> - create PRs as the unit of granularity, squash commits such that we have 1 per PR ideally and use conventional commits (fix, feat, chore, test, etc...)
> - take inspiration from my coding style from swissknife if needed
> - always think of the system design in clean architecture, ideally hexagonal and domain driven like swissknife.
> - I see that you have bdk-wasm and node_modules at the root with package.json, etc. Please maintain a very clean folder structure and environment, please clean the environment before starting, I will verify (like bdk-wasm folder at the root of workspace + duplicate under "projects")
>
> Update your documents, such as IDENTITY, USER or any other to take this into account and be clear that you are a maintainer and responsible for this, your attachment to clean code and practices, thorough testing and documentation. Remember to do all of this in a manner that I can verify, as if I was your manager, in the form of design docs, reports and demos.

## Architecture

- **Rust workspace** with hexagonal/clean architecture
- Crates: `bolt402-proto`, `bolt402-core`, `bolt402-lnd`, `bolt402-cln`, `bolt402-nwc`, `bolt402-swissknife`, `bolt402-mock`, `bolt402-sqlite`, `bolt402-ffi`, `bolt402-python`, `bolt402-wasm`
- Bindings: `bolt402-go` (CGo), Python (PyO3), WASM (wasm-pack)
- Packages: `bolt402-ai-sdk` (Vercel AI SDK, TS), `bolt402-langchain` (LangChain, Python)
- Autonomous project. Toshi as maintainer, Dario as manager/reviewer

## Workflow

- Use GitHub Issues as the backlog. Create issues for upcoming work.
- Pick issues from the backlog, implement on feature branches, open PRs.
- PRs require CI green + review. Squash merge only.
- Track progress here and in GitHub Issues/Projects.
- Maintain: CONTRIBUTING.md, issue templates, CHANGELOG.md (eventually).

## Status

- [x] Project renamed to bolt402
- [x] Workspace scaffold created
- [x] bolt402-proto: L402 challenge parsing, token construction, error types
- [x] bolt402-core: LnBackend/TokenStore ports, budget tracker, in-memory cache, receipt logger, error types
- [x] GitHub repository created (github.com/bitcoin-numeraire/bolt402)
- [x] AGENTS.md, CLAUDE.md, README.md at repo root
- [x] Daily cron job (bolt402-development, 14:00 UTC)
- [x] CI/CD pipeline (GitHub Actions: fmt, clippy, test, doc) — PR #1
- [x] bolt402-core: L402Client (client.rs, the core engine) — PR #6
- [x] bolt402-lnd: LND gRPC backend adapter — Issue #4
- [x] bolt402-mock: Mock L402 server for testing — PR #9
- [x] Integration tests using bolt402-mock — Issue #5 / PR #12
- [x] bolt402-swissknife: SwissKnife REST API backend adapter — Issue #7 / PR #13
- [x] Vercel AI SDK integration — Issue #8 / PR #15
- [x] CONTRIBUTING.md, issue templates, CHANGELOG.md — PR #18
- [x] Comprehensive documentation and tutorials — Issue #17 / PR #19
- [x] MCP server for universal AI agent integration — Issue #26 / PR #33
- [x] L402 Explorer demo — Issue #29 / PR #34
- [x] AI Research Agent demo — Issue #30 / PR #35
- [x] bolt402-ai-sdk: LocalStorage + File token stores — Issue #27, #28 / PR #32
- [x] bolt402-mcp: MCP server for universal AI agent integration — Issue #26 / PR #33
- [x] L402 Explorer: AI chat panel integration — PR #36
- [x] bolt402 vs lnget comparison page — Issue #31 / PR #37
- [x] bolt402-ffi + bolt402-go: Go bindings via CGo FFI — Issue #42 / PR #44
- [x] bolt402-wasm: WebAssembly bindings via wasm-pack — Issue #45 / PR #46
- [x] bolt402-sqlite: SQLite persistent token store — Issue #47 / PR #48
- [x] bolt402-nwc: Nostr Wallet Connect (NIP-47) backend — Issue #50 / PR #51
- [x] bolt402-cln: Core Lightning (CLN) gRPC backend adapter — Issue #52 / PR #53
- [x] README roadmap updated to reflect all completed features — Issue #54 / PR #56

- [x] bolt402-langchain: LangChain Python integration package — Issue #55 / PR #57

### Next Up
- [ ] (Backlog empty — create new issues for next features)

**Note on signed commits**: Repo ruleset requires signed commits on `main`. Workaround: push unsigned commits to feature branches, create PRs, squash-merge via GitHub (GitHub signs the merge commit automatically).
