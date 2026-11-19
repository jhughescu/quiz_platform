import { renderTemplate } from "../js/template.js";
import { apiFetch } from "./modules/api.js";

const loginContainer = document.getElementById("login-container");
loginContainer.innerHTML = await renderTemplate("/admin/templates/login.hbs");

const submissionsContainer = document.getElementById("submissions-container");
submissionsContainer.innerHTML = await renderTemplate("/admin/templates/submissions.hbs");
const usersContainer = document.getElementById("users-container");
usersContainer.innerHTML = await renderTemplate("/admin/templates/users.hbs");
const languagesResponse = await apiFetch("/api/admin/languages");
if (!languagesResponse.ok) {
  throw new Error("Failed to load languages");
}
const languages = await languagesResponse.json();
const deploymentsContainer = document.getElementById("deployments-section-container");
deploymentsContainer.innerHTML = await renderTemplate(
  "/admin/templates/deployments.hbs",
  { languages },
);
const questionsSectionContainer = document.getElementById("questions-section-container");
questionsSectionContainer.innerHTML = await renderTemplate("/admin/templates/questions.hbs");
const questionDialogsContainer = document.getElementById("question-dialogs-container");
questionDialogsContainer.innerHTML = await renderTemplate("/admin/templates/question-dialogs.hbs");
await import("./admin.js");