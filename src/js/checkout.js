// src/js/checkout.js
// ------------------------------------------------------
// Page controller for Checkout:
//  - Inject header/footer
//  - Initialize CheckoutProcess (subtotal, etc.)
//  - Recalculate tax/shipping on ZIP input/change
//  - Handle form submission and call checkout()
//  - Show success/failure feedback
// ------------------------------------------------------

import { loadHeaderFooter } from "./utils.mjs";
import CheckoutProcess from "./CheckoutProcess.mjs";

loadHeaderFooter();

// Create the process object that reads from "so-cart"
// and outputs into the "#summary" block in the HTML.
const process = new CheckoutProcess("so-cart", "#summary");

// 1) Compute item subtotal + count on load
process.init();

// 2) If you want totals visible immediately even before ZIP:
process.calculateOrderTotal();

// 3) Recalculate tax + shipping when ZIP changes (as per spec)
const zipEl = document.querySelector("#zip");
if (zipEl) {
  const recalc = () => process.calculateOrderTotal();
  zipEl.addEventListener("input", recalc);
  zipEl.addEventListener("change", recalc);
}

// 4) Handle form submit
const formEl = document.querySelector("#checkout-form");
if (formEl) {
  formEl.addEventListener("submit", async (evt) => {
    evt.preventDefault();

    // Native HTML validation first
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }

    try {
      // Ensure totals are up to date
      process.calculateOrderTotal();

      const result = await process.checkout(formEl);

      // Simple success UX
      alert("Order placed! Confirmation id: " + (result?.id ?? "N/A"));

      // Optional: clear the cart and redirect
      // localStorage.removeItem("so-cart");
      // window.location.href = "/index.html";
    } catch (err) {
      console.error(err);
      alert("Sorry, we could not place your order. Please try again.");
    }
  });
}