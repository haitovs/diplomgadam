# 6. Thesis outline

A chapter plan for the written work, mapped onto the system that was actually
built. Each entry names what to argue and which artefacts support it.

## Chapter 1 — Introduction

The problem: restaurant information in Ashgabat exists but is not published
anywhere searchable. Menus live on social media posts that scroll away; prices
are hearsay.

State the central design decision early, because everything follows from it: the
restaurants maintain their own entries rather than an editor maintaining a
directory. Then draw out the consequences — multi-tenancy, moderation, and the
tension between reviewing content and letting owners keep prices current.

Set out the three environmental constraints that shaped the work more than any
feature: three working languages, unreliable access to the wider internet, and
no dependable email or SMS.

Source: `docs/01_project_overview.md`.

## Chapter 2 — Background and comparable systems

Review directory sites and self-service listing platforms. The useful axis is
who owns the data: editorially maintained directories go stale, self-service
platforms stay current but need moderation.

Justify the exclusions here rather than in passing. Ratings are the interesting
one: they are the feature a reviewer will ask about, and the argument against
them at launch — that a handful of listings and no traffic produce numbers that
look authoritative and mean nothing — is worth making properly.

Cover the multilingual question: per-language storage with fallback, versus
machine translation, versus requiring every language. Requiring all three is the
option that fails in practice, because owners abandon the form.

## Chapter 3 — Requirements

Functional requirements by actor; non-functional requirements with the mechanism
that satisfies each, not just an assertion. The tables in
`docs/02_requirements.md` are written to be reproduced.

Include the out-of-scope list. Recording what was considered and set aside is
part of the analysis.

## Chapter 4 — Design

System topology and why the API and the single-page application share a process:
same-site cookies and no cross-origin configuration.

Then the parts worth defending at length:

- **Tenancy in two independent layers** — a single guard for authority, and
  store-scoped predicates in every query so a guessed identifier is useless.
  Explain why one layer would not be enough.
- **Sessions rather than self-contained tokens**, decided by revocation:
  suspending a restaurant must sign its owners out immediately.
- **The status machine**, including why `draft` exists at all.
- **Data modelling choices**: JSONB per language, money as an integer, opening
  hours as interval rows so split days and past-midnight closing are ordinary
  data rather than parsing special cases.

Source: `docs/03_architecture.md`.

## Chapter 5 — Implementation

Select depth over breadth. Four topics carry a chapter:

1. **Tenancy** — the guard and a representative service query, with the
   reasoning that the store id is never read from a request body.
2. **Offline maps** — converting MBTiles to a flat blob and binary index, the
   key packing and its 53-bit limit, and the fact that this was forced by a
   native binding that crashed in the container. A design driven by a real
   failure is more interesting than one driven by preference.
3. **The image pipeline** — validating by decoding, metadata stripping, and the
   public/private split for verification photos.
4. **Opening hours** — the fixed UTC+5 offset and past-midnight evaluation.

Source: `docs/04_implementation.md`.

## Chapter 6 — Validation

Testing strategy and why the suite runs against a real database rather than a
mock. Summarise the tenancy matrix — it is the most persuasive table in the
work.

Include the defects found during verification. A validation chapter that reports
only successes reads as though little was verified; the table in
`docs/05_validation.md` shows the process doing its job, including the case that
changed the architecture and the several faults that only appeared when the
thing was built for release and restored from a backup rather than read.

The browser tests are worth a paragraph of their own, because the argument for
adding them is more interesting than the tests. The project deliberately
verified the interface by hand, on the grounds that a rendering mistake is
obvious. It then shipped a blank map that requested every tile successfully and
logged nothing — a rendering mistake that was not obvious at all. That is a
specific, defensible reason for automating a specific kind of check, which is a
better answer than "tests are good".

Be explicit about what was not tested: no load testing, no penetration testing,
browser coverage on one engine at two viewport sizes, and one architecture
actually run rather than two.

Source: `docs/05_validation.md`.

## Chapter 7 — Deployment

The offline installation requirement and how it is met: one tarball, three
images, no downloads at any point. Cover the operational surface — migrations at
startup, healthchecks, backups and a tested restore — and the switchable TLS
arrangement that anticipates hosting without outbound access.

Source: `docs/deployment.md`.

## Chapter 8 — Evaluation and further work

Evaluate against the requirements table honestly. Where a requirement is met by
a mechanism with a known limitation, say so: "open now" is computed in
application code and assumes a city-sized dataset; verification rests on an
administrator making a phone call; the platform launches empty and is only as
useful as the restaurants that join.

Further work, in the order it would matter: reviews with the moderation they
require, visitor accounts, additional cities, and an ordering or reservation
integration. Each is a project, which is why each was excluded.

## Appendices

- Entity-relationship diagram, from the schema in `server/src/db/schema.ts`
- API endpoint summary
- Screenshots: public listing, owner portal with the completeness checklist,
  admin review queue showing verification photos beside owner contact
- Test output
- Deployment bundle contents and installation transcript

## A note on writing it

The strongest material is where a decision was forced by something concrete: the
native SQLite binding that crashed, the environment variable Compose renders as
an empty string, the price formatter whose output its own parser rejected. These
are more convincing than a list of features, because they show the system was
built and run rather than described.
