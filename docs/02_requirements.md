# 2. Requirements

## Functional requirements

### Public site

| # | Requirement |
| --- | --- |
| F1 | Visitors browse approved restaurants without an account. Nothing in any other state is ever visible publicly. |
| F2 | Listings are searchable by name, description and address, across all three languages at once. |
| F3 | Filtering by cuisine, neighbourhood, price tier and amenities; several amenities together require all of them. |
| F4 | An "open now" filter, evaluated against the current time in Ashgabat. |
| F5 | A detail page with menu and prices, opening hours, contact details, amenities, photos and map location. |
| F6 | Interface and content in Turkmen, English and Russian, switchable at any time. |
| F7 | Favourites, kept in the browser, requiring no account. |
| F8 | An interactive map of located restaurants. |
| F9 | Platform statistics computed from live data. |

### Registration and the owner portal

| # | Requirement |
| --- | --- |
| F10 | Anyone can register a restaurant with a phone number and password. |
| F11 | Registration produces a draft, visible to nobody, so photos and menu can be prepared first. |
| F12 | Owners edit name, description and address in three languages, with the primary one required. |
| F13 | Location is set by placing a pin on the map. |
| F14 | Opening hours per weekday, supporting more than one period per day and closing after midnight. |
| F15 | Date-specific hours for holidays and one-off changes. |
| F16 | Menus of owner-ordered sections containing dishes with name, description, price, photo and availability. |
| F17 | Photo upload for cover, gallery, dishes and verification, within per-restaurant limits. |
| F18 | Submission is refused until the listing is complete, and the response names what is missing. |
| F19 | After approval, edits publish immediately without further review. |
| F20 | Owners see their status and, when rejected, the reason. |

### Administration

| # | Requirement |
| --- | --- |
| F21 | A queue of submitted listings showing verification photos and owner contact together. |
| F22 | Approve, or reject with a reason the owner can read. |
| F23 | Suspend a published listing with a reason, and reinstate it. |
| F24 | Administrators can edit any listing. |
| F25 | Manage the cuisine taxonomy in three languages. |
| F26 | Administrator accounts with owner and moderator roles. |
| F27 | Issue a temporary password for an owner who cannot sign in. |
| F28 | View the owner portal as a given restaurant, for support. |
| F29 | An audit log of who changed what, when. |
| F30 | Delete a restaurant and everything belonging to it (owner role only). |

## Non-functional requirements

### Security

| # | Requirement | How it is met |
| --- | --- | --- |
| N1 | Passwords are never recoverable from the database | scrypt with a per-account salt; parameters stored with each hash so they can be raised later |
| N2 | A database leak does not yield live sessions | Only the SHA-256 of a session token is stored |
| N3 | No restaurant can reach another's data | One guard decides access; every store-scoped query filters on the store id, so a guessed identifier resolves to "not found" |
| N4 | Revocation takes effect immediately | Sessions are server-side; suspension, password reset and account deactivation delete them at once |
| N5 | Credential guessing is impractical | Failed attempts are counted per account and per address in the database, so a lockout survives a restart |
| N6 | Account enumeration is prevented | An unknown account is verified against a real dummy hash, so the response and its timing match a wrong password |
| N7 | Verification photos are not public | Stored outside the served directory and delivered only to the reviewing administrator or the owner who submitted them |
| N8 | Uploads cannot smuggle in other content | Files are validated by decoding them, then re-encoded; the original bytes are never stored |
| N9 | Administrative actions are attributable | Audit log records the actor, and both parties when impersonating |

### Operation

| # | Requirement | How it is met |
| --- | --- | --- |
| N10 | Installs with no internet access | One tarball with all three images; no package or asset is fetched at deploy time |
| N11 | The map works with no internet access | Vector tiles, glyphs, sprites and style are served by the application |
| N12 | Nothing loads from a third-party host | Fonts are bundled, including Cyrillic; no CDN, no remote tiles |
| N13 | Data survives redeployment | Database and uploads are on named volumes; nothing persistent lives inside the image |
| N14 | Schema changes apply automatically and safely | Migrations run at startup and are idempotent |
| N15 | A misconfiguration fails immediately and legibly | The environment is validated at boot and names the offending variable |
| N16 | Data loss is recoverable | Nightly database and upload backups with retention, and a one-command restore |
| N17 | Failure is visible | Healthchecks on every service; a failed component is reported rather than silently degraded |

### Usability and performance

| # | Requirement | How it is met |
| --- | --- | --- |
| N18 | Usable on a phone over a slow connection | Initial bundle ~175 KB compressed; images served as WebP with a JPEG fallback at two sizes; the map library is a separate chunk loaded only where needed |
| N19 | An untranslated field never renders blank | Reads fall back to the store's primary language, then to any language with content |
| N20 | Owners can see what is left to do | Per-field language indicators, and a submission checklist that links to each unfinished item |
| N21 | Money is never wrong through rounding | Prices are stored and transported as integer minor units; no floating-point arithmetic touches them |
| N22 | Colour is never the only signal | Status carries a text label; chart values are labelled directly; fills meet the 3:1 contrast floor in both light and dark themes |

## Out of scope

Reviews and ratings, visitor accounts, online ordering, reservations, payments,
SMS and email delivery, multi-city launch, and a public API for third parties.

Each is a project in its own right. Listing them explicitly is part of the
requirements: it records that they were considered and set aside, rather than
overlooked.
