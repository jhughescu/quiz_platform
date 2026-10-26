import { apiFetch } from "./api.js";
const submissionsTableBody = document.getElementById("submissions-table-body");
export async function loadSubmissions(userActivity = false) {
  const res = await apiFetch("/api/admin/submissions", {}, userActivity);
  const submissions = await res.json();
  console.log("SUBMISSIONS:", submissions);
  submissionsTableBody.innerHTML = submissions
    .map(
      (s) =>
        `<tr><td>${new Date(s.completedAt || s.createdAt).toLocaleString()}</td><td>${s.score} / ${s.total}</td></tr>`,
    )
    .join("");
}