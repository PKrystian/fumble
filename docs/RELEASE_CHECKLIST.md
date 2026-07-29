# Release checklist

## Ownership and content

- Confirm the public owner and contact links are current.
- Review new third-party data and assets and update `THIRD_PARTY_NOTICES.md`.
- Check open content, attribution, removal, privacy, accessibility, and security reports.
- Confirm legal pages show the current effective date.

## Quality

- Run `npm ci`.
- Run `npm run security:audit`.
- Run `npm run lint`.
- Run `npm run format:check`.
- Run `npm run typecheck`.
- Run `npm run test`.
- Run `npm run test:e2e`.
- Run `npm run build`.
- Test keyboard navigation, focus, zoom, mobile reflow, and a screen reader.
- Run Lighthouse on representative mobile and desktop pages.

## Generated discovery files

- Confirm `robots.txt`, `sitemap.xml`, `llms.txt`, and `llms-full.txt` return HTTP 200.
- Confirm `/.well-known/security.txt` returns plain text over HTTPS.
- Confirm canonical, hreflang, Open Graph, JSON-LD, and manifest links use the production
  domain.
- Check the sitemap for duplicate, empty, private, or broken URLs.
- Check representative English and Polish pages without JavaScript.

## Deployment

- Confirm the `fumble.krystianpinczak.com` CNAME points to the GitHub Pages site.
- Confirm HTTPS is enforced in GitHub Pages settings.
- Confirm the previous deployment can be restored.
- Test a direct route, a Polish route, and a missing route after deployment.

## GitHub

- Update `CHANGELOG.md` and the package version.
- Create a signed or annotated release tag.
- Publish release notes with known limitations and migration notes.
- Confirm branch protection, required CI, Dependabot, secret scanning, push protection,
  private vulnerability reporting, and CodeQL are enabled.
- Confirm the repository description, website, topics, and social preview are current.

## Search

- Submit `https://fumble.krystianpinczak.com/sitemap.xml` to Google Search Console.
- Submit the same sitemap to Bing Webmaster Tools.
- Inspect representative URLs and review indexing, duplicate, and soft 404 reports.
- Review Core Web Vitals after real traffic is available.
