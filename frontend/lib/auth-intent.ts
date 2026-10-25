// "The customer just chose to sign out" — lets the pages that need an account stay quiet
// (no sign-in modal, no card) while the sign-out is still taking them to the home page.
let until = 0;

export function markLeaving(ms = 4000) {
  until = Date.now() + ms;
}

export function isLeaving() {
  return Date.now() < until;
}
