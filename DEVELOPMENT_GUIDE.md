# Developing This App — A Plain-English Guide

This is a walkthrough for someone picking up this codebase and wanting to
make changes, written without jargon-heavy shorthand. For exact API/schema
details see [TECHNICAL_DOCS.md](./TECHNICAL_DOCS.md); for quick lookups see
[CHEATSHEET.md](./CHEATSHEET.md).

## What this app actually does

It's a quiz app with two front ends:

1. A plain public page where anyone can answer quiz questions and submit them
   (no login needed).
2. An admin dashboard where logged-in admins/superusers create and manage
   questions, group them into "question banks", and review submissions.

Behind both is one Express server talking to one MongoDB database.

## How a request flows through the code

Whenever you're changing behavior, you're almost always changing one (or
more) of these four things, in this order:

1. **Route** (`src/routes/*.js`) — decides which URL/method triggers which
   controller function, and which middleware (login check, role check, input
   validation) runs first.
2. **Controller** (`src/controllers/*.js`) — reads the request, calls into
   services/repositories, decides what HTTP status and JSON to send back.
   Controllers should stay thin — no business logic, just orchestration.
3. **Service** (`src/services/*.js`) — where actual logic lives: scoring a
   quiz, issuing a token, parsing bulk-import text, checking for duplicate
   users. If it's a rule about *how the app behaves*, it belongs here.
4. **Repository** (`src/repositories/*.js`) — the only place that talks to
   Mongoose models directly. Keeping DB queries here means if you ever swap
   databases or add caching, you only touch one layer.

Everything at the bottom is a **model** (`src/models/*.js`) — the shape of
the data as stored in MongoDB.

So: to add a new admin feature, you'll typically add/edit a route, a
controller function, maybe a service function, maybe a repository function,
and possibly a model field — in that order of "outermost to innermost."

## A worked example: how bulk import was added

This is a good template to copy for your next feature:

1. **Model** — no changes needed; bulk import reuses the existing `Question`
   schema.
2. **Service** — wrote `questionImport.service.js` as a standalone function
   that takes raw text and returns parsed questions + a list of errors. It
   doesn't know about Express, HTTP, or MongoDB at all — you could unit test
   it by just calling the function directly.
3. **Validator** — added a small Joi schema (`questionImportSchema`) so
   malformed request bodies (missing `text`, bad `questionBank` id) get
   rejected before the controller even runs.
4. **Controller** — added `bulkImportQuestions`, which: validates the target
   bank, calls the parser service, checks for duplicates against the
   database, and only then writes anything.
5. **Repository** — added one new function, `createMany`, since the existing
   `create` only handled a single question.
6. **Route** — wired `POST /api/admin/questions/import` to the new
   controller function, behind the same auth/role middleware as other admin
   question routes.
7. **Frontend** — added a button + dialog in the admin dashboard that POSTs
   to the new endpoint and shows errors if the import fails.

Notice the order: data shape → parsing logic → input validation → request
handling → data access → wiring → UI. Working in that order means each piece
is simple and testable on its own before you stitch it together.

## Rules of thumb this codebase already follows

- **Admins only see their own stuff.** Any list/edit/delete of questions or
  banks checks `createdBy` against the logged-in user, unless they're a
  superuser. If you add a new "ownable" thing, follow the same pattern
  (`canModify()` in `admin.controller.js` is the existing helper — reuse it
  or copy its approach).
- **All-or-nothing writes for bulk operations.** The bulk importer validates
  *everything* first and only writes to the database if the whole batch is
  clean. If you add another bulk operation, keep this behavior — partial
  imports are confusing for users to clean up.
- **Validation happens before the controller runs**, via
  `validateBody(schema)` middleware and Joi schemas in `src/validators/`.
  Don't re-validate the same fields by hand inside a controller — add to the
  schema instead.
- **New question types touch a specific set of files** — see the "Where to
  add things" list in the cheat sheet. Missing one (e.g. forgetting to
  update the bulk-import parser) means that one feature silently doesn't
  support the new type.
- **Auth is designed to be swappable.** The JWT payload
  (`{ sub, email, role }`) is the only contract that `authenticate`/
  `authorize` middleware and route code depend on. If you ever add company
  SSO, you add a new Passport strategy file and register it — you should not
  need to touch any route or middleware code.

## Day-to-day workflow

1. Run `npm run dev` (auto-restarts on file changes) and keep a MongoDB
   instance reachable via `MONGODB_URI`.
2. Use `npm run create-admin -- you@example.com yourpassword superuser` once,
   so you have an account to log into the admin dashboard
   (`/admin/index.html`).
3. Make your change following the layering above.
4. Manually verify: log into the admin dashboard, exercise the feature, and
   check the browser console/network tab and server terminal output for
   errors. There's no automated test suite yet (`npm test` runs an empty
   suite), so manual testing is currently the only safety net.
5. If you introduce a new pure-logic module (like the bulk-import parser),
   consider adding real test cases with `node --test` — it's a good
   candidate since it has no database dependency.

## Common mistakes to avoid

- **Don't put business logic in a controller.** If you find yourself writing
  an `if` statement that encodes a rule ("a question can only be deleted if…"),
  that belongs in a service or a well-named helper, not inline in the
  controller.
- **Don't bypass repositories.** If you need a new query, add a function to
  the relevant `repositories/*.js` file rather than calling
  `Model.find(...)` directly from a controller or service.
- **Don't forget the frontend is plain JavaScript with no build step.**
  There's no bundler, no framework, no JSX — just `<script src="admin.js">`.
  Keep changes to `public/` consistent with that (no imports of npm
  packages into browser code).
- **Don't run `npm run seed` against a database with real data** — it wipes
  the `Question` collection first.
- **Remember `/api/questions` and `/api/submit` are global** — they are not
  scoped to a particular question bank or user. If a feature assumes "the
  current quiz" is somehow scoped, that scoping doesn't exist yet and would
  need to be built.
