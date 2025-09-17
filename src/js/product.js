// src/js/product.js
import { getParam, qs, getLocalStorage, setLocalStorage } from "./utils.mjs";
import ProductData from "./ProductData.mjs";

// Normalize "../images/..." => "/images/..."
function normalizeImagePath(p = "") {
  return p.replace(/^(\.\.\/)+/, "/");
}

// Format a price from possible fields
function formatPrice(product) {
  const n =
    product?.FinalPrice ??
    product?.ListPrice ??
    product?.SuggestedRetailPrice ??
    null;
  return n != null ? Number(n).toFixed(2) : "";
}

let currentProduct = null;

async function renderProduct() {
  const id = getParam("product"); // e.g., 985RF
  if (!id) return;

  // Our product data source (tents.json under /public/json/)
  const dataSource = new ProductData("tents");
  const product = await dataSource.findProductById(id);
  if (!product) return;

  currentProduct = product;

  // Populate DOM
  const brand = product.Brand?.Name ?? "";
  const name = product.Name ?? product.NameWithoutBrand ?? "";
  const price = formatPrice(product);
  const color = product.Colors?.[0]?.ColorName ?? "";

  const imgEl = qs(".product__image");
  if (imgEl) {
    imgEl.src = normalizeImagePath(product.Image ?? "");
    imgEl.alt = `Product image`;
    // Graceful fallback if specific image file is missing
    imgEl.onerror = () => {
      imgEl.onerror = null;
      imgEl.src = "/images/noun_Tent_2517.svg";
      imgEl.style.objectFit = "contain";
    };
  }

  const brandEl = qs(".product__brand");
  const nameEl = qs(".product__name");
  const priceEl = qs(".product__price");
  const colorEl = qs(".product__color");
  const descEl = qs(".product__desc");

  if (brandEl) brandEl.textContent = brand;
  if (nameEl) nameEl.textContent = name;
  if (priceEl) priceEl.textContent = price ? `$${price}` : "";
  if (colorEl) colorEl.textContent = color;

  // Description from HTML-safe string in JSON
  if (descEl) descEl.innerHTML = product.DescriptionHtmlSimple ?? "";

  // Hook up Add to Cart
  const btn = qs("#addToCart");
  if (btn) {
    btn.addEventListener("click", () => addToCart(currentProduct));
  }
}

// Add the selected product to localStorage cart ("so-cart")
function addToCart(product) {
  if (!product) return;
  const cart = getLocalStorage("so-cart") ?? [];

  // If product already in cart, bump quantity
  const idx = cart.findIndex((p) => p.Id === product.Id || p.Id === product.Id?.toString());
  if (idx !== -1) {
    cart[idx].quantity = (cart[idx].quantity ?? 1) + 1;
  } else {
    cart.push({
      Id: product.Id,
      Name: product.Name ?? product.NameWithoutBrand ?? "",
      Brand: product.Brand?.Name ?? "",
      Image: product.Image ?? "",
      Price:
        product.FinalPrice ??
        product.ListPrice ??
        product.SuggestedRetailPrice ??
        0,
      quantity: 1,
    });
  }

  setLocalStorage("so-cart", cart);

  // Basic UX hint
  const btn = qs("#addToCart");
  if (btn) {
    const original = btn.textContent;
    btn.textContent = "Added!";
    setTimeout(() => (btn.textContent = original), 900);
  }
}

// boot
renderProduct();