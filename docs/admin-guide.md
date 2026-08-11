# Administrator guide

The admin panel is at `/admin/login`. There is no link to it from the public
site.

## Roles

**Owner** can do everything: manage administrator accounts, delete restaurants,
and everything a moderator can do.

**Moderator** reviews and publishes listings, edits them, and manages
categories, but cannot manage administrator accounts or delete a restaurant.

Give people moderator unless they genuinely need to manage accounts. The last
active owner account cannot be demoted, disabled or deleted, so you cannot lock
yourself out.

## Reviewing an application

The **Review queue** shows restaurants whose owners have submitted them. The
number beside it in the sidebar is the count waiting.

Opening one shows, side by side:

- **Verification photos** — pictures of the building and interior, uploaded by
  the applicant. These are never shown publicly and exist only for this
  decision.
- **Owner contact** — full name, role, and phone numbers, as tappable links.
- The listing itself: description in each language, address, map location,
  opening hours, menu and public photos.

**The most effective check is to phone the number.** A real restaurant answers
and knows about the application. There is no SMS or email verification in the
system, so the phone call is the verification.

Then either:

- **Approve** — the listing goes public immediately.
- **Reject** — requires a reason, which the owner sees on their dashboard. Be
  specific: "the address does not match the photos" is actionable, "rejected"
  is not. The owner can correct it and submit again.

## After publication

Approved restaurants edit their own listing freely, including prices and hours.
This is deliberate: a menu that waits in a queue is out of date by the time it
is published. Every edit is recorded in the audit log.

If a listing becomes a problem:

- **Suspend** — requires a reason. The listing disappears from the public site
  and the owners are signed out immediately. They can sign in again to read the
  reason but cannot edit until reinstated.
- **Reinstate** — republishes it.
- **Delete** (owner role only) — permanently removes the restaurant, its menu,
  its accounts and all of its photos. This cannot be undone.

Prefer suspension to deletion. Suspension is reversible and keeps the record.

## Helping an owner who cannot sign in

There is no password-reset email, by design — it would be one more thing that
must work on a restricted network.

1. Open the restaurant, find the owner under **Owner contact**.
2. **Reset password.** A temporary password appears **once**.
3. Read it to them over the phone. They must change it at next sign-in, and all
   their existing sessions are cancelled.

If someone has locked themselves out by guessing, the lockout clears by itself
after 15 minutes.

## View as store

**View as store** opens the owner portal as that restaurant, which is the fastest
way to see what someone is describing.

Your admin session stays active — a separate cookie is used, so you are not
signed out of the panel. A banner across the top shows you are impersonating,
with a button to return.

Everything you change while impersonating is recorded against **both** you and
the owner. Use it to look; be careful about changing things.

## Categories

Categories are the cuisine types owners choose from. They exist in all three
languages, and the count beside each shows how many restaurants use it.

A category still in use cannot be deleted — reassign those restaurants first.
Renaming is safe at any time; the identifier used in links does not change.

## Audit log

Every meaningful action: sign-ins, approvals, rejections, suspensions, listing
and menu edits, password resets, impersonation.

Each entry records who did it, when, and from which address. Actions taken while
impersonating carry a marker and name both parties.

This is what settles "somebody changed my prices" — check the log before
assuming a bug.

## Routine checks

**Daily** if applications are coming in: clear the review queue. Applicants are
waiting.

**Weekly:** skim the audit log for anything unexpected. Confirm backups are
being written — look at the timestamps in the backup directory rather than
assuming.

**Occasionally:** check disk usage. The dashboard shows total storage consumed
by photos.

**Once, soon:** practise a restore into a scratch deployment. An untested backup
is not a backup.
