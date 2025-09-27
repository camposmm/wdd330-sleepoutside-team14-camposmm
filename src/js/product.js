// src/js/product.js
// ------------------------------------------------------
// Product Detail page (robust for dev & preview builds)
// - Fetch product by ?product=ID
// - Render details
// - Add to Cart via event delegation
// - Defensive localStorage (with fallback) + verbose logging
// ------------------------------------------------------

import {
  loadHeaderFooter,
  qs,
  getParam,
  getLocalStorage,
  setLocalStorage,
} from "./utils.mjs";
import ProductData from "./ProductData.mjs";

const CART_KEY = "so-cart";
let currentProduct = null;

// ---------- storage helpers (robust) -----------------------------------------

function safeGetCart() {
  try {
    return getLocalStorage(CART_KEY) ?? [];
  } catch (e) {
    console.warn("[product] localStorage read failed, using memory fallback.", e);
    window.__cart_fallback__ = window.__cart_fallback__ || [];
    return window.__cart_fallback__;
  }
}

function safeSetCart(cart) {
  try {
    setLocalStorage(CART_KEY, cart);
  } catch (e) {
    console.warn("[product] localStorage write failed, using memory fallback.", e);
    window.__cart_fallback__ = cart;
  }
}

// ---------- product helpers --------------------------------------------------

function normalizeImagePath(p = "") {
  return p.replace(/^(\.\.\/)+/, "/");
}

function getPrimaryImage(product) {
  return (
    product?.Images?.PrimaryLarge ||
    product?.Images?.PrimaryMedium ||
    product?.PrimaryLarge ||
    product?.PrimaryMedium ||
    product?.Image ||
    "/images/noun_Tent_2517.svg"
  );
}

function getPrice(product) {
  const n = product?.Price ?? product?.FinalPrice ?? product?.ListPrice ?? 0;
  const asNum = Number(n);
  return Number.isFinite(asNum) ? asNum : 0;
}

// ---------- render -----------------------------------------------------------

function ensureDetailContainer() {
  let el = qs(".product-detail");
  if (!el) {
    const main = qs("main") || document.body;
    el = document.createElement("section");
    el.className = "product-detail";
    main.appendChild(el);
  }
  return el;
}

function renderProductDetail(product) {
  const el = ensureDetailContainer();
  const price = getPrice(product).toFixed(2);
  const img = normalizeImagePath(getPrimaryImage(product));
  const brand = product.Brand ?? "";
  const name = product.Name ?? product.name ?? "";

  el.innerHTML = `
    <img src="${img}" alt="${name}"
         onerror="this.onerror=null;this.src='/images/noun_Tent_2517.svg';this.style.objectFit='contain';" />
    <p class="divider"></p>
    <h2>${brand}</h2>
    <h1>${name}</h1>
    <p class="product-card__price">$${price}</p>
    <p class="product__description">${product.Description ?? product.description ?? ""}</p>
    <button id="addToCart" data-action="add-to-cart" type="button">Add to Cart</button>
  `;
  console.log("[product] detail rendered.");
}

// ---------- cart logic -------------------------------------------------------

function addToCart(product) {
  const cart = safeGetCart();
  const id = String(product.Id ?? product.id ?? "");
  const idx = cart.findIndex((p) => String(p.Id ?? p.id ?? "") === id);

  if (idx > -1) {
    cart[idx].quantity = (cart[idx].quantity ?? 1) + 1;
  } else {
    cart.push({
      Id: product.Id ?? product.id,
      Brand: product.Brand ?? "",
      Name: product.Name ?? product.name ?? "Product",
      Price: getPrice(product),
      Image: getPrimaryImage(product),
      quantity: 1,
    });
  }
  safeSetCart(cart);
  return cart;
}

// ---------- event delegation (always works in preview) -----------------------

function attachGlobalClickHandler() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="add-to-cart"], #addToCart');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    if (!currentProduct) {
      console.warn("[product] add-to-cart clicked but product not loaded yet.");
      return;
    }

    const cart = addToCart(currentProduct);

    // Visual feedback
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Added!";
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
    }, 600);

    console.log("[product] added to cart:", { id: currentProduct.Id, cart });
  });
}

// ---------- boot -------------------------------------------------------------

async function init() {
  try {
    loadHeaderFooter();
  } catch (e) {
    console.warn("[product] header/footer load failed:", e);
  }

  const id = getParam("product");
  if (!id) {
    console.warn("[product] Missing ?product=ID in URL.");
    ensureDetailContainer().insertAdjacentHTML(
      "beforeend",
      `<p style="color:#a00;margin-top:.5rem">No product id supplied.</p>`
    );
    return;
  }

  console.log("[product] loading product:", id);

  try {
    const dataSource = new ProductData();
    currentProduct = await dataSource.findProductById(id);
    if (!currentProduct) throw new Error("Product not found");
    console.log("[product] loaded:", currentProduct.Id);
    renderProductDetail(currentProduct);
  } catch (err) {
    console.error("[product] load error:", err);
    ensureDetailContainer().innerHTML =
      `<p style="color:#900">Sorry, we could not load this product.</p>`;
  }
}

attachGlobalClickHandler();
init();