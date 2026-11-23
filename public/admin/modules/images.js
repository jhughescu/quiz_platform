import { apiFetch } from "./api.js";
import { renderTemplate } from "../../js/template.js";
const imagesGallery = document.getElementById("images-gallery");
export async function loadImages(userActivity = false) {
  const res = await apiFetch("/api/admin/images", {}, userActivity);
  if (!res.ok) {
    throw new Error("Failed to load images");
  }
  const images = await res.json();
  const displayImages = images.map((image) => ({
    ...image,
    displayDate: new Date(image.createdAt).toLocaleDateString(),
  }));
  imagesGallery.innerHTML = await renderTemplate(
    "/admin/templates/image-gallery.hbs",
    { images: displayImages, allowDelete: true },
  );
}
imagesGallery.addEventListener("click", async (event) => {
  const button = event.target.closest(".image-delete-btn");
  if (!button) return;
  const imageId = button.dataset.imageId;
  if (!window.confirm("Are you sure you want to delete this image?")) {
    return;
  }
  button.disabled = true;
  try {
    const res = await apiFetch(
      `/api/admin/images/${imageId}`,
      { method: "DELETE" },
      true,
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Image deletion failed");
    }
    button.closest(".image-gallery-item").remove();
    if (!imagesGallery.querySelector(".image-gallery-item")) {
      imagesGallery.querySelector(".image-gallery").innerHTML =
        "<p>No images have been uploaded.</p>";
    }
  } catch (err) {
    const error = document.createElement("p");
    error.className = "image-delete-error";
    error.textContent = err.message;
    button.insertAdjacentElement("afterend", error);
    button.disabled = false;
  }
});