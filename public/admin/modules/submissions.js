import { apiFetch } from "./api.js";
const submissionsTableBody = document.getElementById("submissions-table-body");
export async function loadSubmissions() {
  const res = await apiFetch("/api/admin/submissions");
  const submissions = await res.json();
  submissionsTableBody.innerHTML = submissions
    .map(
      (s) =>
        `<tr><td>${new Date(s.submittedAt).toLocaleString()}</td><td>${s.score} / ${s.total}</td></tr>`,
    )
    .join("");
}