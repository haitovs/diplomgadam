# Browser tests

These run against a **deployment that is already up**, because what they check
only exists once the application is built and served: the map, the route split,
and how pages actually lay out.

```bash
docker compose up -d
npm run db:seed                      # they need restaurants to look at
BASE_URL=http://localhost:4080 npm run test:e2e
```

They use the Chrome already on the machine rather than downloading Playwright's
own build, which is a 150 MB fetch and a poor fit for a project whose premise is
that it installs where large downloads are unreliable. To use the bundled
Chromium instead, run `npx playwright install chromium` and set
`PLAYWRIGHT_CHANNEL=`.

## Why these tests and not others

The server suite covers the logic, against a real PostgreSQL. It cannot see a
map that renders nothing while every tile returns 200, a lazily loaded route
that never resolves, or a panel that is transparent over satellite imagery.
Each of those has happened here, and each reached a browser before anyone
noticed. Every test in this directory corresponds to one of them.
