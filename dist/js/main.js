(function () {
  "use strict";

  const grid = document.getElementById("gallery-grid");
  const emptyMessage = document.getElementById("gallery-empty");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const closeBtn = lightbox.querySelector(".lightbox-close");
  const prevBtn = lightbox.querySelector(".lightbox-prev");
  const nextBtn = lightbox.querySelector(".lightbox-next");

  document.getElementById("year").textContent = new Date().getFullYear();

  let photos = [];
  let currentIndex = 0;

  function openLightbox(index) {
    currentIndex = index;
    const photo = photos[currentIndex];
    lightboxImage.src = photo.full;
    lightboxImage.alt = photo.alt || "";
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImage.src = "";
    document.body.style.overflow = "";
  }

  function showRelative(delta) {
    if (photos.length === 0) return;
    currentIndex = (currentIndex + delta + photos.length) % photos.length;
    const photo = photos[currentIndex];
    lightboxImage.src = photo.full;
    lightboxImage.alt = photo.alt || "";
  }

  closeBtn.addEventListener("click", closeLightbox);
  prevBtn.addEventListener("click", () => showRelative(-1));
  nextBtn.addEventListener("click", () => showRelative(1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showRelative(-1);
    if (e.key === "ArrowRight") showRelative(1);
  });

  function renderGrid() {
    const fragment = document.createDocumentFragment();

    photos.forEach((photo, index) => {
      const item = document.createElement("div");
      item.className = "gallery-item";

      const img = document.createElement("img");
      img.src = photo.thumb;
      img.alt = photo.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      if (photo.width && photo.height) {
        img.width = photo.width;
        img.height = photo.height;
      }
      img.addEventListener("load", () => img.classList.add("loaded"));

      item.appendChild(img);
      item.addEventListener("click", () => openLightbox(index));

      fragment.appendChild(item);
    });

    grid.appendChild(fragment);
  }

  fetch("gallery.json")
    .then((res) => res.json())
    .then((data) => {
      photos = Array.isArray(data) ? data : [];
      if (photos.length === 0) {
        emptyMessage.hidden = false;
        return;
      }
      renderGrid();
    })
    .catch((err) => {
      console.error("Failed to load gallery.json", err);
      emptyMessage.hidden = false;
      emptyMessage.textContent = "Couldn't load the gallery.";
    });
})();
