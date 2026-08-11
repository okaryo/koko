# Release

## Versioning

koko uses semantic versioning and Git tags in `vMAJOR.MINOR.PATCH` form.

The application version must remain synchronized in:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

## Required Checks

Run the checks that match the touched areas before release.

Frontend and shared repository checks:

```sh
pnpm run format:check
pnpm run lint
pnpm run check
pnpm test
pnpm run build
```

Rust checks:

```sh
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --locked -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

The same groups run in GitHub Actions for pull requests and pushes to `main`.

## Release Workflow

Pushing a tag matching `v*` starts the GitHub Actions release workflow. The
workflow builds these targets:

| Platform | Architecture  | Bundles             |
| -------- | ------------- | ------------------- |
| macOS    | Apple Silicon | `.app`, `.dmg`      |
| macOS    | Intel         | `.app`, `.dmg`      |
| Linux    | x64           | `.deb`, `.AppImage` |
| Windows  | x64           | NSIS `.exe`, `.msi` |

The workflow creates a draft GitHub Release with generated release notes. Drafts
must be reviewed and published explicitly.

Tauri updater artifacts are generated during bundling and signed with the
configured updater key. The release workflow requires
`TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets.

## Updater

Released applications read updater metadata from:

```text
https://github.com/okaryo/koko/releases/latest/download/latest.json
```

The published release must include `latest.json`, signatures, and the platform
artifacts needed by the updater. The app offers installation when it discovers a
new release and relaunches after a successful update.

## Manual Installation Notes

- macOS builds are not notarized with Apple Developer ID. The README documents
  removal of quarantine attributes when macOS reports the downloaded app as
  damaged.
- Windows installers are not currently code-signed and may trigger a SmartScreen
  warning.
- Updater metadata and signature files are not manual installer choices.

Keep the installation instructions in the README synchronized with release
targets and signing status.

## Related Documents

- [README](../README.md)
- [Feature Specification](feature-spec.md)
