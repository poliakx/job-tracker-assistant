## What this changes

<!-- A short description. -->

## If this adds or changes a job source

Delete this section if it doesn't. See CONTRIBUTING.md for the rules.

- Site / API:
- Terms or API documentation checked (link):
- What in them allows automated access:

- [ ] This can't be added from `/sources` (Greenhouse, Lever, Ashby, RSS/Atom, JobPosting page) instead
- [ ] `robots.txt` allows every URL the adapter fetches
- [ ] The terms don't forbid automated access
- [ ] No login, captcha or anti-bot workaround; rate limits are respected
- [ ] The adapter sets `legal` and makes every request through `createPoliteClient`
- [ ] Fixtures copy only the shape of real responses; the content is made up

## Checks

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
