import { apiFetch } from "./api.js";
import { renderTemplate } from "../../js/template.js";
import { resetAdminTimeout } from "./session.js";

export function initDeployments({ renderDeploymentQuestionBanks }) {
  document
    .getElementById("new-deployment-btn")
    .addEventListener("click", async () => {
      document.getElementById("deployment-form").reset();
      document.getElementById("deployment-form-error").textContent = "";
      renderDeploymentQuestionBanks();
      await loadTemplates();
      await loadPresentations();
      document.getElementById("deployment-dialog").showModal();
    });
  document
    .getElementById("deployment-template")
    .addEventListener("change", () => {
      const templateSelect = document.getElementById("deployment-template");
      const versionSelect = document.getElementById(
        "deployment-template-version",
      );
      versionSelect.innerHTML = '<option value="">Select a version</option>';
      const selectedOption = templateSelect.selectedOptions[0];
      if (!selectedOption || !selectedOption.dataset.version) return;
      const option = document.createElement("option");
      option.value = selectedOption.dataset.version;
      option.textContent = selectedOption.dataset.version;
      versionSelect.appendChild(option);
      versionSelect.value = selectedOption.dataset.version;
    });
  document
    .getElementById("deployment-cancel-btn")
    .addEventListener("click", () => {
      document.getElementById("deployment-dialog").close();
    });
  document
    .getElementById("deployment-details-close-btn")
    .addEventListener("click", () => {
      document.getElementById("deployment-details-dialog").close();
    });
  document
    .getElementById("deployment-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorElement = document.getElementById("deployment-form-error");
      errorElement.textContent = "";

      const payload = {
        name: document.getElementById("deployment-name").value.trim(),
        questionBankId: document.getElementById("deployment-question-bank")
          .value,
        template: {
          id: document.getElementById("deployment-template").value.trim(),
          version: document
            .getElementById("deployment-template-version")
            .value.trim(),
        },
        presentation: {
          id: document.getElementById("deployment-presentation").value.trim(),
          version: "1.0",
        },
        randomiseOptions: document.getElementById(
          "deployment-randomise-options",
        ).checked,
        randomiseQuestions: document.getElementById(
          "deployment-randomise-questions",
        ).checked,
      };

      try {
        const response = await apiFetch(
          "/api/admin/deployments",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
          true,
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.details
              ? data.details.join("; ")
              : data.error || "Failed to create deployment",
          );
        }
        document.getElementById("deployment-dialog").close();
        resetAdminTimeout();
        loadDeployments();
      } catch (err) {
        errorElement.textContent = err.message;
      }
    });
}
export async function loadDeployments(userActivity = false) {
  const container = document.getElementById("deployments-container");
  if (!container) return;
  container.textContent = "Loading deployments...";
  try {
    const response = await apiFetch("/api/admin/deployments", {}, userActivity);
    const deployments = await response.json();
    if (!deployments.length) {
      container.textContent = "No deployments found.";
      return;
    }
    container.innerHTML = "";
    for (const deployment of deployments) {
      const html = await renderTemplate(
        "/admin/templates/deployment-item.hbs",
        {
          ...deployment,
          created: new Date(deployment.createdAt).toLocaleString(),
          url: `${window.location.origin}/quiz/?id=${deployment._id}`,
        },
      );
      const item = document.createRange().createContextualFragment(html);
      item
        .querySelector(".deployment-view-btn")
        .addEventListener("click", async () => {
          viewDeployment(deployment._id);
        });
      container.appendChild(item);
    }
  } catch (err) {
    console.error("Failed to load deployments:", err);
    container.textContent = "Failed to load deployments.";
  }
}
export async function viewDeployment(deploymentId) {
  const dialog = document.getElementById("deployment-details-dialog");
  const nameElement = document.getElementById("deployment-details-name");
  const contentElement = document.getElementById("deployment-details-content");
  nameElement.textContent = "";
  dialog.showModal();
  try {
    contentElement.innerHTML = await renderTemplate(
      "/admin/templates/deployment-loading.hbs",
    );
    const response = await apiFetch(`/api/admin/deployments/${deploymentId}`);
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "Failed to load deployment");
    }
    const deployment = await response.json();
    nameElement.textContent = deployment.name;
    contentElement.innerHTML = await renderTemplate(
      "/admin/templates/deployment-details.hbs",
      {
        ...deployment,
        created: new Date(deployment.createdAt).toLocaleString(),
      },
    );
  } catch (err) {
    console.error("Failed to load deployment details:", err);
    contentElement.innerHTML = await renderTemplate(
      "/admin/templates/deployment-error.hbs",
    );
  }
}
export async function loadTemplates() {
  const response = await apiFetch("/api/admin/templates");
  if (!response.ok) {
    throw new Error("Failed to load templates");
  }
  const templates = await response.json();
  const templateSelect = document.getElementById("deployment-template");
  const versionSelect = document.getElementById("deployment-template-version");
  templateSelect.innerHTML = '<option value="">Select a template</option>';
  versionSelect.innerHTML = '<option value="">Select a version</option>';
  templates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name;
    option.dataset.version = template.version;
    templateSelect.appendChild(option);
  });
}
export async function loadPresentations() {
  const response = await apiFetch("/api/admin/presentations");
  if (!response.ok) {
    throw new Error("Failed to load presentations");
  }
  const presentations = await response.json();
  const select = document.getElementById("deployment-presentation");
  select.innerHTML = '<option value="">Select a presentation</option>';
  presentations.forEach((presentation) => {
    const option = document.createElement("option");
    option.value = presentation.id;
    option.textContent = presentation.name;
    select.appendChild(option);
  });
}
