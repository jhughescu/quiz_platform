const templateCache = {};

Handlebars.registerHelper('addOne', function (value) {
  return value + 1;
});

async function renderTemplate(templatePath, data = {}) {
  let template = templateCache[templatePath];

  if (!template) {
    const response = await fetch(templatePath);

    if (!response.ok) {
      throw new Error(`Failed to load template: ${templatePath}`);
    }

    const source = await response.text();

    template = Handlebars.compile(source);

    templateCache[templatePath] = template;
  }

  return template(data);
}

