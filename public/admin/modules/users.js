
import { apiFetch } from "./api.js";
import { renderTemplate } from "../../js/template.js";
const usersTableContainer = document.getElementById("users-table-container");
const userDialog = document.getElementById("user-dialog");
const userForm = document.getElementById("user-form");
const userFormError = document.getElementById("user-form-error");
export function initUsers() {
  document.getElementById("new-user-btn").addEventListener("click", () => {
    userForm.reset();
    userFormError.textContent = "";
    userDialog.showModal();
  });
  document.getElementById("user-cancel-btn").addEventListener("click", () => {
    userDialog.close();
  });
  userForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    userFormError.textContent = "";
    const payload = {
      email: document.getElementById("u-email").value,
      password: document.getElementById("u-password").value,
      role: document.getElementById("u-role").value,
    };
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(payload),
      }, true);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.details
            ? data.details.join("; ")
            : data.error || "Failed to create user",
        );
      }
      userDialog.close();
      loadUsers();
    } catch (err) {
      userFormError.textContent = err.message;
    }
  });
}
export async function loadUsers(userActivity = false) {
  const res = await apiFetch("/api/admin/users", {}, userActivity);
  const users = await res.json();
  const currentUser = JSON.parse(
    localStorage.getItem("quizAdminUser") || "null",
  );
  const userData = users.map((user) => ({
    ...user,
    isCurrentUser: user._id === currentUser?.id,
  }));
  const html = await renderTemplate("/admin/templates/users-table.hbs", {
    users: userData,
  });
  usersTableContainer.innerHTML = html;
  usersTableContainer.querySelectorAll(".delete-user-btn").forEach((button) => {
    const id = button.closest("tr").dataset.id;
    button.addEventListener("click", () => {
      deleteUser(id);
    });
  });
}
async function deleteUser(id) {
  if (!confirm("Delete this user?")) return;
  await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" }, true);
  loadUsers();
}