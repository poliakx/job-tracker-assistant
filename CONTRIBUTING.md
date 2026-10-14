# Contributing

Thanks for helping out. Most contributions are welcome as ordinary pull
requests. The one area with extra rules is **job sources**: code that
reads other people's websites.

## Before you write an adapter: can it be added from the UI?

Most companies publish their openings through a public job-board API
(Greenhouse, Lever, Ashby), an RSS/Atom feed, or schema.org `JobPosting`
data on their careers page. All of these can be added on `/sources`
without code. Check that first. A code adapter is only for a site that
offers its own API or structured data in some other format.

If a generic format is missing (another applicant tracking system's
public API, say), add it as a new kind in `backend/vacancies/sources/configured.ts`
rather than as a one-off adapter. That way everyone can use it.

## Rules for any source

A pull request that adds or changes a source is only merged if all of
these hold:

1. **The site allows it.** Its `robots.txt` allows the URLs you fetch for
   our User-Agent, *and* its terms of service don't forbid automated
   access. `robots.txt` alone is not enough. Prefer an official API or
   feed. If the terms are unclear, don't add the source.
2. **No working around protection.** No login walls, no captchas, no
   rotating IPs or faked User-Agents, no ignoring rate limits. A 403 or a
   captcha page means the source is dropped, not worked around. Sites that
   forbid scraping (LinkedIn, for example) are out.
3. **The legal basis is recorded in code.** Every `VacancySource` has a
   required `legal` field:
   ```ts
   legal: {
     access: 'official-api' | 'feed' | 'structured-data',
     termsUrl: 'https://…',     // the terms / API docs page you read
     termsNote: '…',            // what in it allows automated access
     reviewedAt: 'YYYY-MM-DD',  // when you checked
   }
   ```
   It is shown on `/sources`, so whoever runs the app can see why each
   source is there.
4. **All requests go through `createPoliteClient`** (`backend/vacancies/sources/http.ts`).
   It enforces `robots.txt`, an honest User-Agent with a contact address,
   rate limits and bounded retries. Calling `fetch` directly under
   `backend/vacancies/sources/` fails lint.
5. **Fixtures contain made-up content.** Test fixtures in
   `backend/vacancies/sources/__fixtures__/` copy the *shape* of real responses but
   never a site's actual listings or anyone's personal data.
6. **Only job postings.** Don't collect personal data about recruiters or
   applicants beyond what the posting itself contains.

## Adding a code adapter

Follow the checklist at the top of `backend/vacancies/sources/index.ts`. In short:

1. Inspect the real responses and prefer structured data (a public API,
   `__NEXT_DATA__`, JSON-LD). See `backend/vacancies/sources/html.ts`.
2. Create `backend/vacancies/sources/<name>.ts` implementing `VacancySource`,
   including `legal`. Parse responses with zod.
3. Put pure normalizers in `backend/vacancies/sources/parsing/` and test them against
   made-up fixtures.
4. Append the adapter to `allSources` in `backend/vacancies/sources/index.ts`.

## Checks

Run these before opening a pull request:

```
npm test
npm run lint
npx tsc --noEmit
```
