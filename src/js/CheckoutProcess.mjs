// src/js/CheckoutProcess.mjs
// ------------------------------------------------------
// Handles the "Order Summary" math + order submission.
//  - Reads cart from localStorage
//  - Computes item subtotal, tax, shipping, order total
//  - Prepares the payload the backend expects
//  - Submits the order to the /checkout endpoint
//
// Expects the following markup somewhere on the page
// (usually in <aside id="summary"> ... ):
//
//   #summary
//     #items-count
//     #subtotal
//     #tax
//     #shipping
//     #orderTotal
//
// Notes
//  - Tax is a flat 6% of the item subtotal
//  - Shipping is $10 for the first item + $2 for each additional
//  - Cart item shape (as used elsewhere in this project):
//      { Id, Name, Price, quantity, Image, Brand, ... }
// ------------------------------------------------------

import { getLocalStorage } from "./utils.mjs";

// Base URL pulled from Vite env; must be prefixed with VITE_ in .env
const BASE_URL = import.meta.env.VITE_SERVER_URL ?? "/";

// Tiny helper: turn a <form> into a plain object where keys = input[name]
function formDataToJSON(formElement) {
  const formData = new FormData(formElement);
  const out = {};
  formData.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export default class CheckoutProcess {
  /**
   * @param {string} key            LocalStorage key for cart (e.g., "so-cart")
   * @param {string} outputSelector CSS selector for the summary container (e.g., "#summary")
   */
  constructor(key, outputSelector) {
    this.key = key;
    this.outputSelector = outputSelector;

    // internal state
    this.list = [];
    this.itemTotal = 0;
    this.shipping = 0;
    this.tax = 0;
    this.orderTotal = 0;
  }

  /** Load cart, compute item subtotal immediately. */
  init() {
    this.list = getLocalStorage(this.key) ?? [];
    this.calculateItemSubTotal();
  }

  // ----------------------------------------------------
  // Calculations
  // ----------------------------------------------------

  /** Calculate and display the item subtotal + item count. */
  calculateItemSubTotal() {
    const items = this.list ?? [];

    // sum of (price * qty)
    this.itemTotal = items.reduce((sum, i) => {
      const price = Number(i?.Price ?? 0);
      const qty = Number(i?.quantity ?? 1);
      return sum + (isNaN(price * qty) ? 0 : price * qty);
    }, 0);

    // number of items (sum of quantities)
    const itemCount = items.reduce((n, i) => n + Number(i?.quantity ?? 1), 0);

    // write to DOM
    const root = document.querySelector(this.outputSelector);
    if (!root) return;

    const itemsCountEl = root.querySelector("#items-count");
    const subtotalEl = root.querySelector("#subtotal");

    if (itemsCountEl) itemsCountEl.textContent = itemCount;
    if (subtotalEl) subtotalEl.textContent = this.itemTotal.toFixed(2);
  }

  /** Calculate and display tax, shipping, and order total. */
  calculateOrderTotal() {
    const items = this.list ?? [];
    const itemCount = items.reduce((n, i) => n + Number(i?.quantity ?? 1), 0);

    // 6% tax on the subtotal
    this.tax = this.itemTotal * 0.06;

    // $10 for the first item + $2 for each additional (0 when no items)
    this.shipping = itemCount > 0 ? 10 + Math.max(0, itemCount - 1) * 2 : 0;

    // grand total
    this.orderTotal = this.itemTotal + this.tax + this.shipping;

    this.displayOrderTotals();
  }

  /** Push the calculated numbers into the DOM. */
  displayOrderTotals() {
    const root = document.querySelector(this.outputSelector);
    if (!root) return;

    const taxEl = root.querySelector("#tax");
    const shipEl = root.querySelector("#shipping");
    const totalEl = root.querySelector("#orderTotal");

    if (taxEl) taxEl.textContent = this.tax.toFixed(2);
    if (shipEl) shipEl.textContent = this.shipping.toFixed(2);
    if (totalEl) totalEl.textContent = this.orderTotal.toFixed(2);
  }

  // ----------------------------------------------------
  // Order packaging + submission
  // ----------------------------------------------------

  /**
   * Convert the cart items to the simplified array the backend expects.
   * Output shape for each item:
   *   { id, name, price, quantity }
   */
  packageItems(items = []) {
    return items.map((p) => ({
      id: String(p?.Id ?? ""),
      name: String(p?.Name ?? ""),
      price: Number(p?.Price ?? 0),
      quantity: Number(p?.quantity ?? 1),
    }));
  }

  /**
   * Build the order object from form + summary and POST it to /checkout.
   * Returns the parsed JSON response from the server.
   * @param {HTMLFormElement} formEl
   */
  async checkout(formEl) {
    // Convert form inputs (names MUST match backend keys)
    const order = formDataToJSON(formEl);

    // Add server-required fields
    order.orderDate = new Date().toISOString();
    order.items = this.packageItems(this.list);
    order.orderTotal = this.orderTotal.toFixed(2);
    order.shipping = this.shipping;
    order.tax = this.tax.toFixed(2);

    // Endpoint: <BASE_URL>/checkout
    const url = `${BASE_URL}checkout`;
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    };

    const res = await fetch(url, options);
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`Checkout failed: ${res.status} ${res.statusText}${msg ? ` — ${msg}` : ""}`);
    }
    return res.json();
  }
}