Quiz Platform – Development Handover
1. Project overview
Project: jhughescu/quiz_platform

A Node.js quiz application using:
- Node.js / Express
- MongoDB / Mongoose
- Handlebars
- HTML, CSS and JavaScript
- JWT authentication
- GitHub for version control
The project is developed locally in VS Code, with GitHub used for backup and version control.

Important working preferences:
- The user makes all code changes locally. ChatGPT should advise and provide instructions, not modify the repository.
- Work one step at a time. Give a specific change, wait for confirmation, then proceed.
- Avoid unrelated refactoring or cleanup while working on a particular feature.
- Preserve the existing architecture unless there is a good reason to change it.
- Keep HTML, CSS and JavaScript separate.
- Use Handlebars wherever appropriate.
- Avoid generating HTML markup strings in JavaScript.
- Use British English spelling, e.g. randomise.
- When providing code snippets, avoid blank lines between consecutive lines of code.
- Ask to see existing code before recommending changes to it.
2. Recent architectural work
Template registry
Templates are registered in:

src/config/templates.js

Currently:
const templates = {
  default: {
    name: "Default",
    version: "1.0"
  },
  test: {
    name: "Test",
    version: "1.0"
  }
};
module.exports = templates;


The registry is explicit. Template IDs and versions are validated when deployments are created.
Presentation registry – recently changed to automatic discovery
Previously, presentations were manually registered in:

src/config/presentations.js

This has now been changed to discover presentation directories automatically.

Presentation implementations are located under:

public/quiz/presentations/

Each presentation directory must contain:
- presentation.js
- presentation.json
Example directory structure:
public/quiz/presentations/
├── default/
│   ├── presentation.js
│   └── presentation.json
└── one-at-a-time/
    ├── presentation.js
    └── presentation.json


Example presentation.json:
{
  "name": "One at a time",
  "version": "1.0",
  "mode": "single",
  "navigation": true,
  "progress": true
}


The current src/config/presentations.js:
- Uses Node's built-in fs and path modules.
- Scans public/quiz/presentations/.
- Uses each directory name as the presentation ID.
- Reads the directory's presentation.json.
- Builds and exports an object keyed by presentation ID.
- Throws an error if a directory has no presentation.json.
- Throws a descriptive error if JSON parsing fails.
- Validates the metadata structure.
Metadata validation rules:
Property	Requirement
name	Non-empty string
version	Non-empty string
mode	"all" or "single"
navigation	Boolean
progress	Boolean

The validation function is called validatePresentation(id, presentation).

The application deliberately fails at startup if presentation metadata is invalid. This is intentional fail-fast behaviour.

The rest of the application continues to import the presentations object as before, so the existing validator and quiz service did not need modification.
Presentation discovery testing
Successfully tested:
- Existing presentations are discovered.
- A new presentation directory appears in the admin dropdown without editing a registry.
- Deployment validation accepts the new presentation.
- Quiz retrieval accepts it.
- Browser successfully loads its presentation.js.
- Missing metadata causes a descriptive startup error.
- Malformed JSON causes a descriptive startup error.
- Invalid metadata properties cause descriptive startup errors.
A temporary test-presentation directory was created for testing. It should be removed if it has not already been removed.

Any temporary diagnostic console.log() statements should also be removed.

GitHub Issue: Avoid manually maintaining the presentation registry when new presentation directories are added. Functionality has been implemented and tested; ready to commit and close the Issue if not already done.
3. Deployment restriction – recently implemented
A question bank can theoretically contain only one question.

A potentially confusing combination was identified:
- A question bank containing exactly one question.
- A deployment using the one-at-a-time presentation.
In that scenario, the Previous and Next buttons would be redundant.

Decision: prevent deployment creation when both conditions are met.
Implementation
File:

src/services/deployment.service.js

Inside createDeployment(), immediately after retrieving the questions:
const questions = await questionRepository.findByQuestionBank(questionBankId);
if (presentation.id === "one-at-a-time" && questions.length === 1) {
  throw new Error(
    "A one-at-a-time deployment must contain at least two questions",
  );
}
const questionSnapshot = createQuestionSnapshot(questions);


The check occurs before the question snapshot and before Deployment.create().

Other combinations remain permitted:
- One question + default presentation: allowed.
- Two or more questions + default presentation: allowed.
- Two or more questions + one-at-a-time presentation: allowed.
- One question + one-at-a-time presentation: rejected.
Error handling
File:

src/controllers/deployment.controller.js

The createDeployment() controller has its own try/catch, so the new error needed to be explicitly handled there.

Added:
if (err.message === "A one-at-a-time deployment must contain at least two questions") {
  return res.status(400).json({
    error: err.message
  });
}


This is placed after the existing permission check and before the generic HTTP 500 response.

The global error handler is in:

src/middleware/errorHandler.js

It was initially modified to include the new error, but that is no longer necessary because the controller handles it directly. The extra global handler entry was not needed and should be checked/removed if still present.
Testing
Tested successfully:
- Attempting to create a one-question, one-at-a-time deployment is rejected.
- API returns HTTP 400.
- No deployment is created.
- Admin modal displays the meaningful message:
A one-at-a-time deployment must contain at least two questions

The UI already supported displaying server-provided error messages, so no frontend change was needed.

GitHub Issue: Prevent one-question deployments using the one-at-a-time presentation. Functionality is complete and tested; ready to commit and close the Issue if not already done.
4. Other important application architecture
Deployment model
Deployment stores:
- name
- createdBy
- status
- template: { id, version }
- presentation: { id, version }
- randomiseOptions
- randomiseQuestions
- Question-bank snapshot
The deployment snapshot is the scoring authority. Presentation and template configuration control display, not scoring.
Templates and presentations are separate
- Templates determine question markup.
- Presentations determine quiz layout/navigation/progress/mode.
The two are independently configured on deployments.
Presentation loading
public/quiz/presentation.js dynamically loads presentation modules:
async function loadPresentation(id) {
  const presentationId = id || "default";
  return import(`/quiz/presentations/${encodeURIComponent(presentationId)}/presentation.js`);
}


The default presentation displays all questions on one page.

The one-at-a-time presentation displays one question at a time, with Previous/Next navigation and per-question submission.
Quiz service validation
src/services/quiz.service.js checks that a deployment references a registered template and presentation, including matching versions.

Invalid references return HTTP 409.
5. Admin dashboard and authentication
Admin dashboard is under:

public/admin/

Relevant files include:
- index.html
- admin-bootstrap.js
- admin.js
- modules/
- templates/
The admin dashboard uses Handlebars templates and a shared template-rendering utility.

Authentication:
- JWT authentication.
- Roles: superuser, admin, user.
- Tokens stored in localStorage as quizAdminToken.
- User information stored as quizAdminUser.
- apiFetch() attaches the Bearer token.
An earlier token-renewal/login issue was resolved and parked.
Submissions
The admin Submissions view has been developed.

Non-superusers see submissions only for deployments they created. This filtering is implemented by following:

Submission.deploymentId -> Deployment.createdBy

No createdBy field was added to Submission.

This was tested successfully with admin and superuser accounts.
6. Known outstanding issues / areas for future work
Previously identified:
- Multi-select review bug: review mode checks only the final correct option rather than all correctOptionIds.
- Potential presentation.js issue involving submittedQuestions was investigated. The current implementation is correctly scoped inside the one-at-a-time presentation; the reported issue could not be reproduced.
- Presentation auto-discovery has now been implemented as described above.
- One-question/one-at-a-time deployment restriction has now been implemented as described above.
Other possible future development:
- Submission statistics and reporting.
- Admin charts and performance summaries.
- Further improvements to admin Handlebars templates.
- Any other open GitHub Issues the user chooses to address.
7. Current development status
The two most recent Issues have been implemented and tested:
1. Automatic presentation discovery and metadata validation.
2. Prevent one-question deployments using the one-at-a-time presentation.
The next steps are likely:
- Check temporary test files/logging have been removed.
- Check the global error handler for any redundant entry.
- Commit and push the changes if not already done.
- Close the corresponding GitHub Issues.
- Continue with the next development task.