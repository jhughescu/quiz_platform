const templateCache = {};
let questionFormPartialPromise;
Handlebars.registerHelper('addOne', function (value) {
  return value + 1;
});
Handlebars.registerHelper('equals', function (value, expected) {
  return value === expected;
});
Handlebars.registerHelper('includes', function (array, value) {
  return Array.isArray(array) && array.includes(value);
});

async function registerQuestionFormPartial() {
  if (!questionFormPartialPromise) {
    questionFormPartialPromise = fetch(
      "/quiz/templates/partials/question-form.hbs",
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          "Failed to load template partial: /quiz/templates/partials/question-form.hbs",
        );
      }
      Handlebars.registerPartial("question-form", await response.text());
    }).catch((error) => {
      questionFormPartialPromise = undefined;
      throw error;
    });
  }
  await questionFormPartialPromise;
}

export async function renderTemplate(templatePath, data = {}) {
  let template = templateCache[templatePath];
  if (!template) {
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${templatePath}`);
    }
    const source = await response.text();
    if (source.includes("{{> question-form}}")) {
      await registerQuestionFormPartial();
    }
    template = Handlebars.compile(source);
    templateCache[templatePath] = template;
  }
  return template(data);
}
