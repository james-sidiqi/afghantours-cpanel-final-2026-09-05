// Site-wide switch for visible photo credits (James, 20 Oct 2026: "remove credits site-wide for now").
// false hides every rendered credit: <PhotoCredits> captions, activity hero credit lines and the
// post-build "Photos on this page" block (scripts/inject-photo-credits.mjs).
// Credit data stays intact in src/data/photoCredits.ts, content front matter and docs/*CREDITS*.md.
// Set back to true and rebuild to restore credits exactly as before.
export const SHOW_PHOTO_CREDITS = false;
