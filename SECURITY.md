# Security policy

## Supported version

Security fixes are applied to the current version on the `main` branch. Historical builds
and forks are not maintained by the Fumble project.

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could expose user data, execute
untrusted code, bypass wiki visibility controls, or compromise a deployment.

Use GitHub private vulnerability reporting from the repository Security tab. Include:

- affected version or commit
- reproduction steps
- affected browser and operating system
- expected impact
- suggested mitigation, if known

Do not include real campaign secrets, API keys, personal data, or copyrighted source files
in the report.

The maintainer will acknowledge a complete report when available, validate the issue, and
coordinate disclosure after a fix is ready. No bounty program is currently offered.

The project and public instance are maintained by Krystian Pińczak. Current contact
channels are available at https://github.com/PKrystian. The deployed site also publishes
`/.well-known/security.txt`.

## Security boundaries

Fumble stores state in the browser and treats imported JSON, wiki Markdown, and remote
media as untrusted input. A report is especially valuable when it demonstrates:

- script execution from imported or generated content
- exposure of pages or blocks marked as DM-only
- unsafe external navigation
- persistent denial of service through stored data
- a dependency vulnerability reachable in the production build

## Dependency audit exception

The automated audit allowlists `GHSA-qwww-vcr4-c8h2` for React Router. The advisory
affects React Server Components action handling. Fumble is a static client-side
application with no server actions or application backend, so that execution path is not
present. The exception should be removed when a non-breaking patched React Router release
is available.
