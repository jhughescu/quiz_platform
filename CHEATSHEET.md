# Quiz App — Cheat Sheet

Quick reference. Full details in [TECHNICAL_DOCS.md](./TECHNICAL_DOCS.md).

## Run it

```bash
npm install
npm run dev                 # auto-reload dev server (http://localhost:3000)
npm run seed                 # WIPES Question collection, inserts 5 samples
npm run create-admin -- me@example.com pass1234 superuser
```

`.env` needs: `MONGODB_URI`, `JWT_SECRET`, optional `JWT_EXPIRES_IN` (`1h`), `PORT` (`3000`).
`MONGODB_URI` has no db name → data lives in the `test` database.

## Layers

`routes/` → `controllers/` → `services/` + `repositories/` → `models/`
Middleware: `authenticate` (JWT → `req.user`), `authorize(...roles)`, `validateBody(schema)`, `validateObjectId('id')`.

## Roles

| role | can do |
|---|---|
| `superuser` | everything; all questions/banks; manage users |
| `admin` | only questions/banks with matching `createdBy` |
| `user` | no admin API; only public `/api/questions`, `/api/submit` |

## Routes at a glance

| Method & path | Auth | Notes |
|---|---|---|
| `GET /api/questions` | none | rate-limited, all questions, answers stripped |
| `POST /api/submit` | none | rate-limited, scores against ALL questions, saves `Submission` |
| `POST /api/auth/login` | none | → `{ token, user }` |
| `GET /api/auth/me` | bearer | decoded JWT payload |
| `GET/POST /api/admin/questions` | admin/superuser | list scoped by owner unless superuser |
| `PUT/DELETE /api/admin/questions/:id` | admin/superuser | 403 if not owner (unless superuser) |
| `POST /api/admin/questions/import` | admin/superuser | bulk import, see below |
| `GET/POST/PUT/DELETE /api/admin/question-banks[/:id]` | admin/superuser | delete unbanks questions first |
| `GET /api/admin/submissions[/:id]` | admin/superuser | read-only, not owner-scoped |
| `GET/POST/DELETE /api/admin/users[/:id]` | superuser only | can't delete yourself |

## Question types (`src/models/Question.js`)

| type | fields |
|---|---|
| `multiple-choice` | `options[]` (≥2), `correctIndex` |
| `true-false` | `correctAnswer: Boolean` |
| `multi-select` | `options[]` (≥2), `correctIndexes[]` (≥1) |
| `short-answer` | `correctAnswer: String`, `caseSensitive: Boolean` |

## Bulk import format

```
[MultipleChoice]
Question text?
*Correct option
Wrong option

[TrueFalse]
Statement.
*True

[MultiSelect]
Question?
*Correct 1
*Correct 2
Wrong

[ShortAnswer]
Question?
*Answer
```

- `*` = correct. MultipleChoice needs exactly 1, MultiSelect needs ≥1.
- Blank line = new block. One question line per block, then answer/option lines.
- Optional `@QuestionBank: bank name` — on its own line before a `[Type]`
  header (or after a block's answers with a blank line before it) applies to
  that block and every following block, until a new `@QuestionBank:` line
  appears. Placed directly after a block's answers with **no** blank line in
  between, it overrides the batch/dropdown for just that one question. Bank
  names that don't exist yet are created automatically for the importing user.
- All-or-nothing: any parse error or duplicate-in-batch → `422`; any question
  already existing for that user → `409`. Nothing is saved unless the whole
  batch is clean (bank auto-creation only happens after those checks pass).
- Logic: `src/services/questionImport.service.js` (pure parser) +
  `bulkImportQuestions` in `src/controllers/admin.controller.js` (DB
  resolution/writes).

## Gotchas

- Stale `node` process → `EADDRINUSE` on port 3000; check `Get-Process node`.
- `npm run seed` wipes existing questions — don't run against real data.
- `/api/questions` + `/api/submit` are global, not scoped by bank or owner.
- `Submission` has no user reference — no per-user history.

## Where to add things

- New question type → `models/Question.js` discriminator + `QUESTION_TYPES`,
  `validators/question.validators.js`, `services/quiz.service.js`,
  `services/questionImport.service.js` (`buildQuestion`), `public/app.js`,
  `public/admin/admin.js`.
- New auth strategy (SSO) → new file in `src/auth/`, register in
  `src/auth/passport.js`. Don't touch `authenticate`/`authorize`.
- New bulk-import metadata key → read `block.metadata.<lowercasekey>` in
  `buildQuestion()`, consume it in `bulkImportQuestions`.
