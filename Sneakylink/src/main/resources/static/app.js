const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const state = { products: [], catalog: [], cart: loadCart(), user: null, route: location.pathname, checkoutPending: false };
const fallbackImage = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80";

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("sneakylink-cart") || "[]");
    return Array.isArray(saved) ? saved.filter(line => Number.isInteger(line.productId) && Number.isInteger(line.quantity) && line.quantity > 0) : [];
  } catch {
    return [];
  }
}
function saveCart() {
  localStorage.setItem("sneakylink-cart", JSON.stringify(state.cart));
  $("#cart-count").textContent = state.cart.reduce((sum, line) => sum + line.quantity, 0);
}
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "Something went wrong. Please try again.");
  return data;
}
function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.add("hidden"), 2600);
}
function showModal(id) { $("#" + id).classList.remove("hidden"); document.body.style.overflow = "hidden"; }
function hideModal(id) {
  $("#" + id).classList.add("hidden");
  if (!$$(".overlay").some(element => !element.classList.contains("hidden"))) document.body.style.overflow = "";
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
async function loadProducts() {
  const params = new URLSearchParams();
  if ($("#search").value.trim()) params.set("q", $("#search").value.trim());
  if ($("#color-filter").value) params.set("color", $("#color-filter").value);
  if ($("#material-filter").value) params.set("material", $("#material-filter").value);
  if ($("#size-filter").value) params.set("size", $("#size-filter").value);
  state.products = await api("/api/products?" + params);
  $("#result-count").textContent = `${state.products.length} ${state.products.length === 1 ? "style" : "styles"} to find your form`;
  $("#empty-state").classList.toggle("hidden", state.products.length !== 0);
  $("#product-grid").innerHTML = state.products.map(product => `
    <article class="product-card">
      <div class="product-photo"><img loading="lazy" src="${escapeHtml(product.imageUrl || fallbackImage)}" alt="${escapeHtml(product.name)}" onerror="this.src='${fallbackImage}'">
        <span class="stock-tag ${product.stock < 6 ? "low" : ""}">${product.stock < 6 ? "FEW LEFT" : "IN THE ROTATION"}</span>
        <label class="size-picker-label"><span>SIZE</span><select class="size-picker" data-size-for="${product.id}" aria-label="Choose a size for ${escapeHtml(product.name)}"><option value="">Select</option>${product.sizes.split(",").map(size => `<option value="${escapeHtml(size)}">US ${escapeHtml(size)}</option>`).join("")}</select></label>
        <button class="quick-add" data-add="${product.id}" aria-label="Add ${escapeHtml(product.name)} to bag">+</button></div>
      <div class="product-meta"><div><h3 class="product-name">${escapeHtml(product.name)}</h3><p class="product-brand">${escapeHtml(product.brand)} · ${escapeHtml(product.category)}</p></div><span class="product-price">${money(product.price)}</span></div>
      <p class="product-color">${escapeHtml(product.colorway)} · ${escapeHtml(product.material)}</p>
    </article>`).join("");
}
function addToCart(id, size) {
  const product = state.catalog.find(item => item.id === id);
  if (!product || product.stock < 1) return toast("That style is currently out of stock.");
  if (!size) return toast("Choose your size first.");
  const productQuantity = state.cart.filter(item => item.productId === id).reduce((sum, item) => sum + item.quantity, 0);
  if (productQuantity >= product.stock) return toast("You've added all the available pairs.");
  const line = state.cart.find(item => item.productId === id && item.size === size);
  if (line && line.quantity >= 10) return toast("Maximum quantity per size is 10.");
  if (line) line.quantity++; else state.cart.push({ productId: id, quantity: 1, size });
  saveCart();
  toast(`${product.name} added to your bag.`);
}
function currentLines() {
  return state.cart.map(line => {
    const product = state.catalog.find(item => item.id === line.productId);
    return product ? { ...line, product, quantity: Math.min(line.quantity, product.stock) } : null;
  }).filter(Boolean);
}
function renderCart() {
  const lines = currentLines();
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  $("#cart-subtotal").textContent = money(subtotal);
  $("#checkout-total").textContent = money(subtotal);
  $("#cart-lines").innerHTML = lines.length ? lines.map(line => `<div class="cart-line">
    <img src="${escapeHtml(line.product.imageUrl || fallbackImage)}" alt="${escapeHtml(line.product.name)}" onerror="this.src='${fallbackImage}'">
    <div><h3>${escapeHtml(line.product.name)}</h3><p>${escapeHtml(line.product.colorway)}</p><label class="cart-size">US SIZE <select data-cart-size="${line.product.id}" data-current-size="${escapeHtml(line.size || "")}"><option value="">Choose</option>${line.product.sizes.split(",").map(size => `<option value="${escapeHtml(size)}" ${line.size === size ? "selected" : ""}>${escapeHtml(size)}</option>`).join("")}</select></label><div class="qty-controls"><button data-qty="${line.product.id}" data-size="${escapeHtml(line.size || "")}" data-change="-1" aria-label="Remove one">−</button><span>${line.quantity}</span><button data-qty="${line.product.id}" data-size="${escapeHtml(line.size || "")}" data-change="1" aria-label="Add one">+</button></div></div>
    <div><span class="line-price">${money(line.product.price * line.quantity)}</span><button class="remove-line" data-remove="${line.product.id}" data-size="${escapeHtml(line.size || "")}" aria-label="Remove item" style="display:block;margin:10px 0 0 auto">×</button></div>
    </div>`).join("") : `<div class="empty-state"><span>＋</span><h3>Your next pair is out there.</h3><p>Your bag is empty for now.</p></div>`;
  saveCart();
}
function updateFilterOptions() {
  for (const [selector, field, label] of [["#color-filter", "colorway", "All colorways"], ["#material-filter", "material", "All materials"]]) {
    const element = $(selector);
    const selected = element.value;
    const options = [...new Set(state.catalog.map(product => product[field]))].sort();
    element.innerHTML = `<option value="">${label}</option>` + options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
    element.value = options.includes(selected) ? selected : "";
  }
  const sizes = [...new Set(state.catalog.flatMap(product => product.sizes.split(",").map(size => Number(size))))]
    .filter(Number.isFinite).sort((a, b) => a - b);
  const sizeFilter = $("#size-filter");
  const selectedSize = sizeFilter.value;
  sizeFilter.innerHTML = `<option value="">All sizes</option>` + sizes.map(size => `<option value="${size}">${size}</option>`).join("");
  sizeFilter.value = sizes.includes(Number(selectedSize)) ? selectedSize : "";
}
async function openCheckout() {
  if (!state.cart.length) return toast("Add a pair to your bag first.");
  if (!state.user || state.user.role !== "customer") {
    state.checkoutPending = true;
    hideModal("cart-modal");
    $("#role-select").value = "customer";
    syncAuthFields();
    showModal("auth-modal");
    $("#auth-error").textContent = "Sign in as a customer to check out.";
    return;
  }
  try {
    const schedule = await api("/api/schedule");
    const fulfillment = $('input[name="fulfillment"]:checked').value;
    fillSchedule(schedule, fulfillment);
    $("#checkout-content").classList.remove("hidden");
    renderCart();
    hideModal("cart-modal");
    showModal("checkout-modal");
    state.checkoutPending = false;
  } catch (error) { toast(error.message); }
}
function fillSchedule(schedule, fulfillment) {
  const choices = schedule[fulfillment] || [];
  $("#schedule-select").innerHTML = choices.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  $("#address-fields").classList.toggle("hidden", fulfillment === "pickup");
  for (const field of $$("#address-fields input")) field.required = fulfillment === "delivery";
}
function syncAuthFields() {
  const isManager = $("#role-select").value === "manager";
  $(".password-field").classList.toggle("hidden", !isManager);
  $('.password-field input').required = isManager;
}
async function showManager() {
  if (!state.user || state.user.role !== "manager") {
    hideModal("auth-modal");
    $("#role-select").value = "manager";
    syncAuthFields();
    showModal("auth-modal");
    return;
  }
  history.pushState({}, "", "/manager");
  showModal("manager-modal");
  await loadInventory();
}
async function loadInventory() {
  const products = await api("/api/products");
  $("#inventory-body").innerHTML = products.map(product => `<tr data-product="${product.id}">
    <td><input class="name-input" data-field="name" aria-label="Product name" value="${escapeHtml(product.name)}"></td>
    <td><input data-field="brand" aria-label="Brand" value="${escapeHtml(product.brand)}"></td>
    <td><input data-field="category" aria-label="Category" value="${escapeHtml(product.category)}"></td>
    <td><input data-field="colorway" aria-label="Colorway" value="${escapeHtml(product.colorway)}"></td>
    <td><input data-field="material" aria-label="Material" value="${escapeHtml(product.material)}"></td>
    <td><input data-field="sizes" aria-label="Available sizes" value="${escapeHtml(product.sizes)}"></td>
    <td><input class="price-input" type="number" min="0" step="0.01" data-field="price" aria-label="Price" value="${product.price}"></td>
    <td><input class="stock-input" type="number" min="0" data-field="stock" aria-label="Stock" value="${product.stock}"></td>
    <td><input data-field="imageUrl" aria-label="Image URL" value="${escapeHtml(product.imageUrl)}"></td>
    <td><input data-field="description" aria-label="Description" value="${escapeHtml(product.description)}"></td>
    <td><button data-save="${product.id}">SAVE</button></td></tr>`).join("");
  const orders = await api("/api/orders");
  $("#manager-orders").innerHTML = orders.length ? orders.slice(-8).reverse().map(order => `<div class="order-chip"><strong>${escapeHtml(order.orderNumber)} · ${money(order.total)}</strong>${escapeHtml(order.customerName)} · ${escapeHtml(order.fulfillment)} · ${escapeHtml(order.scheduledFor)}<br>${escapeHtml(order.items)}</div>`).join("") : `<div class="order-chip">No orders yet. New customer orders will show here.</div>`;
}
async function boot() {
  saveCart();
  const [user, catalog] = await Promise.all([api("/api/auth/me"), api("/api/products"), loadProducts()]);
  state.user = user.role === "guest" ? null : user;
  state.catalog = catalog;
  updateFilterOptions();
  if (location.pathname === "/manager") await showManager();
  $("#account-btn").textContent = state.user ? `Hi, ${state.user.name.split(" ")[0]}` : "Sign in";
}

document.addEventListener("click", async event => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.close) hideModal(target.dataset.close);
  if (target.id === "open-cart") { renderCart(); showModal("cart-modal"); }
  if (target.id === "account-btn") {
    if (state.user?.role === "manager") showManager();
    else if (state.user) { await api("/api/auth/logout", { method: "POST" }); state.user = null; $("#account-btn").textContent = "Sign in"; toast("You've signed out."); }
    else showModal("auth-modal");
  }
  if (target.id === "manager-link") showManager();
  if (target.id === "manager-signout") {
    await api("/api/auth/logout", { method: "POST" }); state.user = null; hideModal("manager-modal"); history.pushState({}, "", "/"); $("#account-btn").textContent = "Sign in";
  }
  if (target.dataset.add) {
    const card = target.closest(".product-card");
    addToCart(Number(target.dataset.add), $('[data-size-for]', card).value);
  }
  if (target.dataset.qty) {
    const line = state.cart.find(item => item.productId === Number(target.dataset.qty) && item.size === target.dataset.size);
    if (line) {
      line.quantity += Number(target.dataset.change);
      const product = state.catalog.find(item => item.id === line.productId);
      const productQuantity = state.cart.filter(item => item.productId === line.productId).reduce((sum, item) => sum + item.quantity, 0);
      if (line.quantity > 10 || productQuantity > (product?.stock || 0)) { line.quantity--; toast("You've added all the available pairs."); }
      if (line.quantity < 1) state.cart = state.cart.filter(item => item !== line);
    }
    saveCart(); renderCart();
  }
  if (target.dataset.remove) { state.cart = state.cart.filter(line => line.productId !== Number(target.dataset.remove) || line.size !== target.dataset.size); saveCart(); renderCart(); }
  if (target.id === "checkout-button") await openCheckout();
  if (target.dataset.save) {
    const row = target.closest("tr");
    const original = state.products.find(item => item.id === Number(target.dataset.save));
    const update = Object.fromEntries($$("[data-field]", row).map(input => [input.dataset.field, input.value]));
    const payload = { ...original, ...update, price: Number(update.price), stock: Number(update.stock) };
    try { await api(`/api/products/${target.dataset.save}`, { method: "PATCH", body: JSON.stringify(payload) }); toast("Product updated."); await loadProducts(); state.catalog = await api("/api/products"); updateFilterOptions(); }
    catch (error) { toast(error.message); }
  }
  if (target.id === "clear-filters") { $("#search").value = ""; $("#color-filter").value = ""; $("#material-filter").value = ""; $("#size-filter").value = ""; loadProducts(); }
});
$("#role-select").addEventListener("change", syncAuthFields);
for (const selector of ["#search", "#color-filter", "#material-filter", "#size-filter"]) {
  $(selector).addEventListener(selector === "#search" ? "input" : "change", () => loadProducts().then(updateFilterOptions).catch(error => toast(error.message)));
}
document.addEventListener("change", event => {
  const cartSize = event.target.closest("[data-cart-size]");
  if (!cartSize) return;
  const productId = Number(cartSize.dataset.cartSize);
  const line = state.cart.find(item => item.productId === productId && item.size === cartSize.dataset.currentSize);
  if (line && cartSize.value) {
    const duplicate = state.cart.find(item => item !== line && item.productId === productId && item.size === cartSize.value);
    if (duplicate) {
      const product = state.catalog.find(item => item.id === productId);
      const total = state.cart.filter(item => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0);
      if (duplicate.quantity + line.quantity > 10 || total > (product?.stock || 0)) {
        toast("You've added all the available pairs.");
        renderCart();
        return;
      }
      duplicate.quantity += line.quantity;
      state.cart = state.cart.filter(item => item !== line);
    } else line.size = cartSize.value;
    saveCart();
    renderCart();
  }
});
$("#auth-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    state.user = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ name: form.get("name"), role: form.get("role"), password: form.get("password") }) });
    hideModal("auth-modal");
    $("#account-btn").textContent = `Hi, ${state.user.name.split(" ")[0]}`;
    if (state.user.role === "manager") { await showManager(); }
    else if (state.checkoutPending) await openCheckout();
    else toast(`Welcome in, ${state.user.name.split(" ")[0]}.`);
  } catch (error) { $("#auth-error").textContent = error.message; }
});
$$('input[name="fulfillment"]').forEach(input => input.addEventListener("change", async () => {
  try { fillSchedule(await api("/api/schedule"), input.value); } catch (error) { toast(error.message); }
}));
$("#checkout-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const cardNumber = String(form.get("cardNumber")).replace(/\D/g, "");
  const expiry = String(form.get("expiry"));
  if (cardNumber.length < 12 || !/^\d{2}\s*\/\s*\d{2,4}$/.test(expiry) || !/^\d{3,4}$/.test(String(form.get("cvv")))) {
    return toast("Enter valid payment details.");
  }
  const payload = Object.fromEntries(["customerName", "email", "phone", "address", "city", "region", "postalCode", "fulfillment"].map(key => [key, form.get(key)]));
  payload.scheduledFor = $("#schedule-select").value;
  payload.paymentLastFour = cardNumber.slice(-4);
  if (state.cart.some(line => !line.size)) return toast("Choose a size for every pair in your bag.");
  payload.lines = state.cart.map(line => ({ productId: line.productId, quantity: line.quantity, size: line.size }));
  try {
    const order = await api("/api/orders", { method: "POST", body: JSON.stringify(payload) });
    state.cart = [];
    saveCart();
    $("#checkout-content").innerHTML = `<div class="success-view"><span>✓</span><p class="eyebrow">ORDER PLACED</p><h3>That's a good choice.</h3><p>Your demo order <strong>${escapeHtml(order.orderNumber)}</strong> is set for<br><strong>${escapeHtml(order.scheduledFor)}</strong>.<br>Total ${money(order.total)} · Demo only, no payment was processed.</p><button class="button button-blue full-width" type="button" data-close="checkout-modal">Back to the collection <span>↗</span></button></div>`;
    await loadProducts();
  } catch (error) { toast(error.message); }
});
document.addEventListener("keydown", event => { if (event.key === "Escape") $$(".overlay").forEach(modal => hideModal(modal.id)); });
window.addEventListener("popstate", () => { if (location.pathname !== "/manager") hideModal("manager-modal"); });
boot().catch(error => { $("#result-count").textContent = error.message; toast(error.message); });
