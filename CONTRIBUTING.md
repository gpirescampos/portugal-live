# Contributing to Portugal Live

Thanks for helping improve Portugal Live. Open an issue to discuss a new data
source or a substantial change before implementing it. Small fixes can go
straight to a pull request.

## Development

Use Node.js `>=24 <27`. Follow the setup in [README.md](README.md) and the
checks in [docs/operations.md](docs/operations.md). Before opening a pull
request, run the checks relevant to your change:

```bash
npm run typecheck
npm test
npm run build
npm run check:client-secrets
git diff --check
```

## Open a pull request

1. On GitHub, fork Portugal Live into your account, then clone your fork using
   the URL under its **Code** button. If you have write access to this
   repository, you can clone it directly instead.
2. Create a branch from `main` for one focused change:

   ```bash
   git switch -c fix/short-description
   ```

3. Make your changes and run the relevant checks above. Stage only the files
   you intend to submit, commit them, and push your branch to your fork:

   ```bash
   git add path/to/changed-file
   git commit -m "Describe the change"
   git push -u origin fix/short-description
   ```

4. On the original Portugal Live repository, choose **Compare & pull request**
   for your pushed branch (or **Pull requests → New pull request**). Set the
   base to this repository's `main` and the compare branch to your branch.
   Explain the change, link any related issue, and list the checks you ran.
   Include screenshots for visible interface changes, especially on narrow
   screens. For provider changes, link the source and update the provenance
   notes.
5. Submit the pull request. If a reviewer requests changes, push another
   commit to the same branch; the pull request updates automatically.

## Provider and security boundaries

- Read [DATA_SOURCES.md](DATA_SOURCES.md) and
  [docs/providers/provenance.md](docs/providers/provenance.md) before adding or
  changing a provider. Document its source, terms, attribution, freshness,
  and failure behavior. Public access to a feed does not by itself establish
  permission to redistribute its data or media.
- Keep live provider responses out of fixtures. Use synthetic, sanitized test
  data. Never commit credentials, private configuration, or secrets.
- Keep provider credentials in the broker. A `VITE_*` value is visible in the
  browser bundle.
- Preserve the difference between an empty result and provider failure, stale
  data, or rate limiting. Keep source and observation times visible.

Report credential exposures and other security issues through the private
channel in [SECURITY.md](SECURITY.md), rather than a public issue.
