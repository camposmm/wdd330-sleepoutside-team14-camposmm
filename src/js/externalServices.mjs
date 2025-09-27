// src/js/externalServices.mjs
// Renamed from ProductData in earlier weeks. Now also holds 'checkout' POST.
// It still supports product endpoints if you already rely on them elsewhere.

import { convertToJson } from "./externalServicesHelpers.mjs"; // tiny helper (optional)
const BASE = (import.meta?.env?.VITE_SERVER_URL ?? "https://wdd330-backend.onrender.com/").replace(/\/+$/, "") + "/";

export default class ExternalServices {
  // ---- Product APIs (kept for compatibility with prior weeks) ----------------
  async getData(category) {
    const res = await fetch(`${BASE}products/search/${encodeURIComponent(category)}`);
    const data = await convertToJson(res);
    return data.Result; // API returns { Result: [...] }
  }

  async findProductById(id) {
    const res = await fetch(`${BASE}product/${encodeURIComponent(id)}`);
    const data = await convertToJson(res);
    return data.Result ?? data; // some servers return the product directly
  }

  // ---- Checkout API ----------------------------------------------------------
  /**
   * POST order payload to /checkout
   * @param {object} payload order object (keys per assignment spec)
   */
  async checkout(payload) {
    const url = `${BASE}checkout`;
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
    const res = await fetch(url, options);
    return convertToJson(res);
  }
}