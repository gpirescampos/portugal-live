# Security

Portugal Live is a local development project. It does not include a deployed
broker or a hosted production service. The local broker keeps Fogos.pt, NASA
FIRMS, and OpenSky credentials out of the frontend. Values with a `VITE_`
prefix are visible in the browser bundle; the optional Cesium ion token must
be restricted in its provider account.

## Report a vulnerability

Please use GitHub's private vulnerability reporting through the repository's
Security tab when available. If it is not enabled, contact the maintainer
privately through the GitHub profile first. Do not post exploit details,
credentials, or live provider responses in a public issue. Include reproduction
steps and potential impact, using synthetic data where possible.

Security fixes target the current `main` branch. There are no separately
maintained release versions yet.
