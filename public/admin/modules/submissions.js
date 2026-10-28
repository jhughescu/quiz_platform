import { apiFetch } from "./api.js";
import { renderTemplate } from "../../js/template.js";
const submissionsTableBody = document.getElementById("submissions-table-body");
const submissionDetailReady = (async () => {
  const container = document.getElementById("submission-detail-container");
  container.innerHTML = await renderTemplate(
    "/admin/templates/submission-detail.hbs",
  );
  const submissionDetail = document.getElementById("submission-detail");
  document
    .getElementById("submission-detail-back")
    .addEventListener("click", () => {
      submissionDetail.close();
    });
})();
export async function loadSubmissions(userActivity = false) {
  await submissionDetailReady;
  const res = await apiFetch("/api/admin/submissions", {}, userActivity);
  const submissions = await res.json();
  console.log("SUBMISSIONS:", submissions);
  const displaySubmissions = submissions.map((s) => ({
    ...s,
    displayDate: new Date(s.completedAt || s.createdAt).toLocaleString(),
  }));
  submissionsTableBody.innerHTML = await renderTemplate(
    "/admin/templates/submission-rows.hbs",
    { submissions: displaySubmissions },
  );
  submissionsTableBody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", async () => {
      const submissionId = row.dataset.submissionId;
      const res = await apiFetch(
        `/api/admin/submissions/${submissionId}`,
        {},
        true,
      );
      const submission = await res.json();
      document.getElementById("submission-detail-title").textContent =
        "Submission Details";
      document.getElementById("submission-detail-deployment").textContent =
        submission.deployment.name;
      document.getElementById("submission-detail-status").textContent =
        submission.status;
      document.getElementById("submission-detail-started").textContent =
        new Date(submission.createdAt).toLocaleString();
      document.getElementById("submission-detail-completed").textContent =
        submission.completedAt
          ? new Date(submission.completedAt).toLocaleString()
          : "Not completed";
      document.getElementById("submission-detail-score").textContent =
        `${submission.score} / ${submission.total}`;
      document.getElementById("submission-detail").showModal();
    });
  });
}
