import { renderTemplate } from "../js/template.js";

const loginContainer = document.getElementById("login-container");
loginContainer.innerHTML = await renderTemplate("/admin/templates/login.hbs");

const submissionsContainer = document.getElementById("submissions-container");
submissionsContainer.innerHTML = await renderTemplate("/admin/templates/submissions.hbs");
const usersContainer = document.getElementById("users-container");
usersContainer.innerHTML = await renderTemplate("/admin/templates/users.hbs");
const deploymentsContainer = document.getElementById("deployments-section-container");
deploymentsContainer.innerHTML = await renderTemplate("/admin/templates/deployments.hbs");
const questionsSectionContainer = document.getElementById("questions-section-container");
questionsSectionContainer.innerHTML = await renderTemplate("/admin/templates/questions.hbs");
const questionDialogsContainer = document.getElementById("question-dialogs-container");
questionDialogsContainer.innerHTML = await renderTemplate("/admin/templates/question-dialogs.hbs");
await import("./admin.js");