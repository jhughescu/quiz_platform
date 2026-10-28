import { renderTemplate } from "../js/template.js";
const questionDialogsContainer = document.getElementById("question-dialogs-container");
questionDialogsContainer.innerHTML = await renderTemplate("/admin/templates/question-dialogs.hbs");
const submissionsContainer = document.getElementById("submissions-container");
submissionsContainer.innerHTML = await renderTemplate("/admin/templates/submissions.hbs");
await import("./admin.js");