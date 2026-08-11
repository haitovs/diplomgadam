# 1. Project overview

## The problem

Finding out what a restaurant in Ashgabat actually serves, and for how much, is
harder than it should be. Menus live on Instagram posts that scroll away, on
photographs of printed cards, or nowhere at all. Opening hours are folklore.
Prices are whatever they were when somebody last mentioned them.

The information exists — every restaurant knows its own menu — but there is
nowhere for it to be published in a form that can be searched, filtered and
compared.

## The approach

Rather than a directory maintained by one editor, this is a platform where the
restaurants maintain their own entries. The people who know the prices are the
people who change them.

That decision shapes everything else:

- Restaurants need accounts, so the system is multi-tenant, and a restaurant
  must never be able to reach another restaurant's data.
- Anyone can register, so listings need moderating before they go public.
- Owners must be able to edit freely afterwards, because a menu that waits in a
  review queue is out of date before it is published.

## Users

**Visitors** browse without an account. They search by cuisine, neighbourhood,
price and amenities, or filter to what is open right now, and read menus with
prices. Favourites are kept in the browser. No visitor data is collected.

**Restaurant owners** register with a phone number, describe their venue in up
to three languages, build a menu, upload photos and submit for review. After
approval they maintain the listing themselves.

**Administrators** review applications, publish or reject them with a reason,
suspend listings that become a problem, and manage the cuisine taxonomy and
administrator accounts. Moderators review; owners additionally manage accounts.

## Setting

Three things about the deployment context drove the design more than any feature
request.

**Three languages.** Turkmen, Russian and English are all in daily use. Content
is stored per language rather than translated on the fly, and requiring all
three would have stopped owners from finishing registration — so one is required
and the others fall back to it.

**Unreliable access to the wider internet.** The platform may run on hosting
inside Turkmenistan with no dependable outbound access, and visitors may not
reach foreign CDNs. Every asset is therefore served from the application itself:
fonts, icons, and the map, which is the usual reason a site like this degrades
to a grey rectangle.

**No email or SMS.** Neither can be relied on. The phone number is the account
identifier, verification is an administrator telephoning the applicant, and
password resets are performed by an administrator reading out a temporary
password.

## Scope

Included: multilingual listings, self-service registration with moderation,
menus with sections and prices, opening hours with split days and past-midnight
closing, photo management with per-restaurant quotas, an offline map, search and
filtering, platform statistics, an audit trail, and a deployment that installs
with no internet access.

Deliberately excluded: reviews and star ratings, visitor accounts, online
ordering, table reservations, payments, and multi-city launch. Each is a
substantial subsystem. Ratings in particular need enough traffic to be
meaningful and enough moderation to stay honest; a platform with a handful of
listings and no users would produce numbers that look authoritative and mean
nothing.

The database ships empty. Every restaurant on the site is there because its
owner put it there and an administrator approved it.

## Outcome

A running platform: a public site in three languages, an owner portal, an
administration panel, and a deployment bundle that installs from a single file
onto a machine with no internet access. Correctness of the parts where failure
would be expensive — authentication, tenancy isolation, the moderation state
machine — is covered by an automated test suite.
