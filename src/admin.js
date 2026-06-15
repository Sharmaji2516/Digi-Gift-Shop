// JavaScript Operations for Digisoft ERP Dashboard (Admin Portal)
import { db, auth } from './firebase.js';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

let products = [];
let orders = [];
let currentOrderFilter = "All";
let currentOrderSearch = "";

const erpHierarchy = {
  "Crockery & Dining": {
    "Dinnerware": ["Dinner Sets", "Dinner Plates", "Quarter Plates", "Side Plates", "Bowls", "Soup Bowls", "Serving Bowls"],
    "Drinkware": ["Tea Cups & Saucers", "Coffee Mugs", "Glasses", "Wine Glasses", "Beer Mugs", "Water Tumblers", "Shot Glasses"],
    "Serveware": ["Serving Trays", "Platters", "Cake Stands", "Serving Dishes", "Dip Bowls", "Snack Sets"],
    "Kitchen Containers": ["Storage Jars", "Spice Containers", "Oil Bottles", "Lunch Boxes", "Airtight Containers"]
  },
  "Kitchen & Cooking": {
    "Cookware": ["Kadhai", "Frying Pan", "Sauce Pan", "Casserole", "Pressure Cooker"],
    "Kitchen Tools": ["Knives", "Peelers", "Choppers", "Graters", "Measuring Cups"],
    "Baking": ["Cake Moulds", "Baking Trays", "Rolling Pins", "Cookie Cutters"]
  },
  "Home Décor": {
    "Decorative Items": ["Showpieces", "Figurines", "Decorative Bowls", "Decorative Trays"],
    "Wall Décor": ["Wall Clocks", "Wall Art", "Paintings", "Mirrors", "Wall Shelves"]
  },
  "Gifting": {
    "Gift Sets": ["Tea Set Gifts", "Dinner Set Gifts", "Home Décor Gift Packs"],
    "Festival Gifts": ["Diwali Gifts", "Rakhi Gifts"],
    "Wedding Gifts": ["Wedding Gifts", "Anniversary Gifts", "Corporate Gifts", "Customized Mugs", "Gift Hampers", "Executive Gifts"]
  },
  "Religious & Spiritual": {
    "Pooja Items": ["Diyas", "Agarbatti Stands", "Pooja Thalis"],
    "Idols": ["Ganesh Idols", "Lakshmi Idols", "Buddha Statues"]
  },
  "Seasonal Collection": {
    "Festive Collection": ["Diwali Décor", "Christmas Décor", "New Year Décor"],
    "Wedding Collection": ["Return Gifts", "Decorative Trays", "Gift Packing Items"]
  }
};

const setupHierarchicalSelects = (deptSelectEl, catSelectEl, subSelectEl, initialDept = "", initialCat = "", initialSub = "") => {
  if (!deptSelectEl || !catSelectEl || !subSelectEl) return;

  // Populate departments
  deptSelectEl.innerHTML = Object.keys(erpHierarchy).map(dept => `<option value="${dept}">${dept}</option>`).join('');

  const updateCategoryOptions = (selectedDept) => {
    const dept = selectedDept || deptSelectEl.value;
    if (erpHierarchy[dept]) {
      catSelectEl.innerHTML = Object.keys(erpHierarchy[dept]).map(cat => `<option value="${cat}">${cat}</option>`).join('');
    } else {
      catSelectEl.innerHTML = '';
    }
  };

  const updateSubCategoryOptions = (selectedDept, selectedCat) => {
    const dept = selectedDept || deptSelectEl.value;
    const cat = selectedCat || catSelectEl.value;
    if (erpHierarchy[dept] && erpHierarchy[dept][cat]) {
      subSelectEl.innerHTML = erpHierarchy[dept][cat].map(sub => `<option value="${sub}">${sub}</option>`).join('');
    } else {
      subSelectEl.innerHTML = '';
    }
  };

  deptSelectEl.onchange = () => {
    updateCategoryOptions();
    updateSubCategoryOptions();
  };

  catSelectEl.onchange = () => {
    updateSubCategoryOptions();
  };

  // Set initial values if provided
  if (initialDept) {
    deptSelectEl.value = initialDept;
  }
  updateCategoryOptions(initialDept);
  if (initialCat) {
    catSelectEl.value = initialCat;
  }
  updateSubCategoryOptions(initialDept, initialCat);
  if (initialSub) {
    subSelectEl.value = initialSub;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initERP();
});

// Subscribe to products real-time changes
onSnapshot(collection(db, 'products'), (snapshot) => {
  products = snapshot.docs.map(doc => doc.data());
  products.sort((a, b) => a.id - b.id);
  renderMetrics();
  renderInventoryTable();
});

// Subscribe to orders real-time changes
onSnapshot(collection(db, 'orders'), (snapshot) => {
  orders = snapshot.docs.map(doc => doc.data());
  orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  renderMetrics();
  renderOrdersTable();
});

const getProducts = () => products;
const getOrders = () => orders;

const showToast = (title, message, type = "success") => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === "warning") {
    toast.style.borderColor = "#ff4a4a";
    toast.style.borderLeftColor = "#ff4a4a";
  } else if (type === "info") {
    toast.style.borderColor = "#00aaff";
    toast.style.borderLeftColor = "#00aaff";
  }

  toast.innerHTML = `
    <div class="toast-icon" style="display: flex; align-items: center; justify-content: center;">
      ${type === "success" 
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>` 
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
      }
    </div>
    <div class="toast-body">
      <h5>${title}</h5>
      <p>${message}</p>
    </div>
    <div class="toast-close" style="display: flex; align-items: center; justify-content: center;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 500);
  });

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 500);
    }
  }, 4000);
};

const initERP = () => {
  // Check if session was active to prevent auth panel flashing
  const wasLoggedIn = localStorage.getItem('isErpAdmin') === 'true';
  const authPanel = document.getElementById('auth-panel');
  if (wasLoggedIn && authPanel) {
    authPanel.classList.remove('active');
  }

  // Navigation tabs
  const tabOrdersBtn = document.getElementById('tab-orders-btn');
  const tabInventoryBtn = document.getElementById('tab-inventory-btn');
  const panelOrders = document.getElementById('erp-orders-panel');
  const panelInventory = document.getElementById('erp-inventory-panel');

  const setTab = (tabId) => {
    if (tabId === 'inventory') {
      tabInventoryBtn?.classList.add('active');
      tabOrdersBtn?.classList.remove('active');
      panelInventory?.classList.add('active');
      panelOrders?.classList.remove('active');
    } else {
      tabOrdersBtn?.classList.add('active');
      tabInventoryBtn?.classList.remove('active');
      panelOrders?.classList.add('active');
      panelInventory?.classList.remove('active');
    }
  };

  if (tabOrdersBtn && tabInventoryBtn && panelOrders && panelInventory) {
    tabOrdersBtn.addEventListener('click', () => {
      setTab('orders');
      localStorage.setItem('activeErpTab', 'orders');
    });

    tabInventoryBtn.addEventListener('click', () => {
      setTab('inventory');
      localStorage.setItem('activeErpTab', 'inventory');
    });

    // Restore saved tab
    const savedTab = localStorage.getItem('activeErpTab');
    if (savedTab) {
      setTab(savedTab);
    }
  }

  // Auth Panel flow configurations using Firebase Authentication
  const loginForm = document.getElementById('login-form');

  // Monitor Authentication state real-time using Firebase Auth
  onAuthStateChanged(auth, (user) => {
    const welcomeTag = document.getElementById('welcome-user-tag');
    if (user) {
      localStorage.setItem('isErpAdmin', 'true');
      if (authPanel) authPanel.classList.remove('active');
      if (welcomeTag) {
        welcomeTag.textContent = `Welcome back, ${user.email}! (Internal DB Portal)`;
      }
    } else {
      localStorage.removeItem('isErpAdmin');
      if (authPanel) authPanel.classList.add('active');
    }
  });

  // Handle Login Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const password = document.getElementById('login-password').value;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Signed in successfully!");
      } catch (err) {
        alert("Authentication Failed: " + err.message);
      }
    });
  }

  // Handle Logout Button
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        alert("Logged out successfully.");
      } catch (err) {
        alert("Error during logout: " + err.message);
      }
    });
  }

  // Load Data
  renderMetrics();
  renderOrdersTable();
  renderInventoryTable();

  // Modals close triggers
  const stockModal = document.getElementById('edit-stock-modal');
  document.getElementById('close-stock-modal-btn')?.addEventListener('click', () => {
    stockModal.classList.remove('active');
  });

  const comboModal = document.getElementById('add-combo-modal');
  document.getElementById('add-combo-btn')?.addEventListener('click', () => {
    comboModal.classList.add('active');
    setupHierarchicalSelects(
      document.getElementById('combo-department'),
      document.getElementById('combo-category'),
      document.getElementById('combo-subcategory')
    );
  });
  document.getElementById('close-combo-modal-btn')?.addEventListener('click', () => {
    comboModal.classList.remove('active');
  });

  // Invoice Close Trigger
  const invoiceModal = document.getElementById('invoice-modal');
  document.getElementById('close-invoice-modal')?.addEventListener('click', () => {
    invoiceModal.classList.remove('active');
  });

  // Handle SKU update submit
  document.getElementById('edit-stock-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('edit-sku-id').value);
    const name = document.getElementById('edit-sku-name').value;
    const image = document.getElementById('edit-sku-image').value;
    const price = parseFloat(document.getElementById('edit-sku-price').value);
    const stock = parseInt(document.getElementById('edit-sku-stock').value);
    const fragile = document.getElementById('edit-sku-fragile').checked;
    const microwave = document.getElementById('edit-sku-microwave').checked;
    const department = document.getElementById('edit-sku-department').value;
    const category = document.getElementById('edit-sku-category').value;
    const subCategory = document.getElementById('edit-sku-subcategory').value;

    try {
      await updateDoc(doc(db, 'products', id.toString()), {
        name,
        image,
        price,
        stock,
        fragile,
        microwave,
        department,
        category,
        subCategory
      });
      showToast("SKU Updated", `Product "${name}" details updated successfully.`, "success");
      stockModal.classList.remove('active');
    } catch (err) {
      showToast("Update Failed", err.message, "warning");
    }
  });

  // Handle Combo submit
  document.getElementById('add-combo-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('combo-name').value;
    const price = parseFloat(document.getElementById('combo-price').value);
    const stock = parseInt(document.getElementById('combo-stock').value);
    const image = document.getElementById('combo-image').value;
    const department = document.getElementById('combo-department').value;
    const category = document.getElementById('combo-category').value;
    const subCategory = document.getElementById('combo-subcategory').value;

    let products = getProducts();
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newCombo = {
      id: newId,
      name,
      price,
      image,
      department,
      category,
      subCategory,
      stock,
      fragile: true,
      microwave: false
    };
    
    try {
      await setDoc(doc(db, 'products', newId.toString()), newCombo);
      showToast("Combo Registered", `Hamper "${name}" registered in registry.`, "success");
      document.getElementById('add-combo-form').reset();
      comboModal.classList.remove('active');
    } catch (err) {
      showToast("Registration Failed", err.message, "warning");
    }
  });

  // Search and Filter logic for orders queue
  const searchInput = document.getElementById('order-search-input');
  if (searchInput) {
    // Restore saved search term
    const savedSearch = localStorage.getItem('activeErpSearch');
    if (savedSearch) {
      currentOrderSearch = savedSearch;
      searchInput.value = savedSearch;
    }

    searchInput.addEventListener('input', (e) => {
      currentOrderSearch = e.target.value;
      localStorage.setItem('activeErpSearch', currentOrderSearch);
      renderOrdersTable();
    });
  }

  const filterButtons = document.querySelectorAll('.filter-status-btn');

  // Restore saved filter
  const savedFilter = localStorage.getItem('activeErpFilter');
  if (savedFilter) {
    currentOrderFilter = savedFilter;
    filterButtons.forEach(btn => {
      if (btn.getAttribute('data-filter') === savedFilter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentOrderFilter = btn.getAttribute('data-filter');
      localStorage.setItem('activeErpFilter', currentOrderFilter);
      renderOrdersTable();
    });
  });
};

// Render Summary Metrics
const renderMetrics = () => {
  const products = getProducts();
  const orders = getOrders();

  const revEl = document.getElementById('metric-revenue');
  const ordEl = document.getElementById('metric-orders');
  const stockEl = document.getElementById('metric-lowstock');
  const badgeEl = document.getElementById('orders-count-badge');

  // Sum total
  let totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  if (revEl) revEl.textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
  if (ordEl) ordEl.textContent = orders.length.toString();
  if (badgeEl) badgeEl.textContent = orders.filter(o => o.status !== "Delivered").length.toString();

  // Low Stock Items (Stock < 5)
  let lowStockCount = products.filter(p => p.stock < 5).length;
  if (stockEl) {
    stockEl.textContent = lowStockCount.toString();
    const cardParent = stockEl.closest('.metric-card');
    if (lowStockCount > 0) {
      cardParent?.classList.add('font-danger');
    } else {
      cardParent?.classList.remove('font-danger');
    }
  }
};

// Render Inventory Table
const renderInventoryTable = () => {
  const products = getProducts();
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No inventory registered.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    return `
      <tr>
        <td>#SKU-${1000 + p.id}</td>
        <td><img src="${p.image}" alt="${p.name}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; border:1px solid var(--glass-border);"></td>
        <td style="font-weight:600; color:var(--text-main);">${p.name}</td>
        <td>${p.department || '-'}</td>
        <td>${p.category || '-'}</td>
        <td>${p.subCategory || '-'}</td>
        <td>₹${p.price.toLocaleString('en-IN')}</td>
        <td style="color:${p.stock < 5 ? '#ff4a4a' : 'inherit'}; font-weight:${p.stock < 5 ? '700' : 'normal'};">
          ${p.stock === 0 ? 'Out of Stock' : `${p.stock} units`}
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            ${p.fragile ? '<span style="background:rgba(255,74,74,0.1); color:#ff4a4a; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:700;">FRAGILE</span>' : ''}
            ${p.microwave ? '<span style="background:rgba(0,170,255,0.1); color:#00aaff; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:700;">MICROWAVE</span>' : ''}
          </div>
        </td>
        <td>
          <button class="btn btn-outline edit-sku-btn" data-id="${p.id}" style="padding:6px 12px; font-size:0.8rem; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            Edit
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Bind edit stock trigger
  tbody.querySelectorAll('.edit-sku-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      const product = products.find(p => p.id === id);
      if (product) {
        document.getElementById('edit-sku-id').value = product.id;
        document.getElementById('edit-sku-name').value = product.name;
        document.getElementById('edit-sku-image').value = product.image;
        document.getElementById('edit-sku-price').value = product.price;
        document.getElementById('edit-sku-stock').value = product.stock;
        document.getElementById('edit-sku-fragile').checked = product.fragile;
        document.getElementById('edit-sku-microwave').checked = product.microwave;

        const deptSelect = document.getElementById('edit-sku-department');
        const catSelect = document.getElementById('edit-sku-category');
        const subSelect = document.getElementById('edit-sku-subcategory');
        setupHierarchicalSelects(deptSelect, catSelect, subSelect, product.department || 'Gifting', product.category || 'Festival Gifts', product.subCategory || 'Diwali Gifts');

        document.getElementById('edit-stock-modal').classList.add('active');
      }
    });
  });
};

// Render Orders Table
const renderOrdersTable = () => {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;

  // Filter orders based on status tab and search term
  let filtered = [...orders];

  // 1. Status Filter
  if (currentOrderFilter === "Active") {
    filtered = filtered.filter(o => o.status !== "Delivered");
  } else if (currentOrderFilter === "Delivered") {
    filtered = filtered.filter(o => o.status === "Delivered");
  }

  // 2. Search Term Filter (Customer Name, Order ID, Status)
  if (currentOrderSearch) {
    const term = currentOrderSearch.toLowerCase().trim();
    filtered = filtered.filter(o => 
      o.id.toLowerCase().includes(term) ||
      o.customer.name.toLowerCase().includes(term) ||
      o.status.toLowerCase().includes(term) ||
      o.courierStatus.toLowerCase().includes(term)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px 0;">No matching orders found in this view.</td></tr>`;
    return;
  }

  // Sort orders descending by date
  filtered.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

  tbody.innerHTML = filtered.map(o => {
    let nextActionBtn = "";
    if (o.status === "Pending") {
      nextActionBtn = `<button class="btn btn-outline process-order-btn" data-id="${o.id}" data-action="Packed" style="padding:6px 10px; font-size:0.75rem; background:#00aaff; color:black; border:none; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> Pack Order</button>`;
    } else if (o.status === "Packed") {
      nextActionBtn = `<button class="btn btn-outline process-order-btn" data-id="${o.id}" data-action="Shipped" style="padding:6px 10px; font-size:0.75rem; background:var(--primary); color:black; border:none; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg> Ship Order</button>`;
    } else if (o.status === "Shipped") {
      nextActionBtn = `<button class="btn btn-outline process-order-btn" data-id="${o.id}" data-action="Delivered" style="padding:6px 10px; font-size:0.75rem; background:#25d366; color:black; border:none; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Complete</button>`;
    } else {
      nextActionBtn = `<span style="font-size:0.8rem; color:#25d366; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Finished</span>`;
    }

    const dateStr = new Date(o.timestamp).toLocaleString('en-IN', { hour12: true });

    return `
      <tr>
        <td style="font-weight:700; color:var(--text-main);">${o.id}</td>
        <td style="color:var(--text-main); font-weight:600;">${o.customer.name}</td>
        <td>${o.customer.phone}</td>
        <td>${dateStr}</td>
        <td>₹${o.total.toLocaleString('en-IN')}</td>
        <td>
          <span style="font-size:0.8rem; font-weight:600;">${o.paymentMode}</span><br>
          <span style="font-size:0.7rem; color:${o.paymentStatus === 'Paid' ? '#25d366' : '#ffaa00'}">${o.paymentStatus}</span>
        </td>
        <td>
          <span class="status-pill ${o.status.toLowerCase()}">${o.status}</span>
        </td>
        <td>
          <div style="display:flex; gap:8px; align-items:center;">
            ${nextActionBtn}
            <button class="btn btn-outline print-inv-btn" data-id="${o.id}" style="padding:6px 10px; font-size:0.75rem; display:flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              Invoice
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind Process Action Trigger
  tbody.querySelectorAll('.process-order-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      updateOrderStatus(id, action);
    });
  });

  // Bind Print Trigger
  tbody.querySelectorAll('.print-inv-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openInvoiceModal(id);
    });
  });
};

// Update order state and dispatch simulator event signals
const updateOrderStatus = async (orderId, newStatus) => {
  let orders = getOrders();
  const o = orders.find(ord => ord.id === orderId);
  if (o) {
    const courierStatus = newStatus === "Packed" ? "In Warehouse" : (newStatus === "Shipped" ? "In Transit" : "Delivered");
    const paymentStatus = newStatus === "Delivered" ? "Paid" : o.paymentStatus;
    
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        courierStatus: courierStatus,
        paymentStatus: paymentStatus
      });
      
      if (newStatus === "Packed") {
        showToast("Order Packed", `Order ${orderId} has been successfully packed.`, "success");
      } else if (newStatus === "Shipped") {
        showToast("Order Shipped", `Order ${orderId} has been dispatched via BlueDart.`, "success");
      } else if (newStatus === "Delivered") {
        showToast("Order Delivered", `Order ${orderId} has been marked as delivered.`, "success");
      }
    } catch (err) {
      showToast("Update Failed", err.message, "warning");
    }
  }
};

// Invoice Modal Rendering
const openInvoiceModal = (orderId) => {
  const orders = getOrders();
  const o = orders.find(ord => ord.id === orderId);
  if (!o) return;

  const invArea = document.getElementById('invoice-print-area');
  if (!invArea) return;

  // Check if any product is fragile
  const containsFragile = o.items.some(item => item.product.fragile);
  const dateStr = new Date(o.timestamp).toLocaleDateString('en-IN');

  const getHSN = (category) => {
    const cat = category ? category.toLowerCase() : "";
    if (cat.includes("dinner") || cat.includes("crockery")) return "6911";
    if (cat.includes("serveware")) return "6912";
    if (cat.includes("customized") || cat.includes("journal")) return "4820";
    if (cat.includes("watch") || cat.includes("premium")) return "9102";
    if (cat.includes("hamper") || cat.includes("combo")) return "9505";
    return "9506"; 
  };

  const priceToWords = (price) => {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    
    let num = Math.round(price);
    if (num === 0) return "Zero Rupees Only";
    
    const convert = (n) => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
      if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
      if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
      return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
    };
    
    return "Rupees " + convert(num) + " Only";
  };

  // Tax calculations
  const discount = o.couponDiscount || 0;
  const pointsRedeemed = o.loyaltyPointsRedeemed || 0;
  const pointsEarned = o.loyaltyPointsEarned || 0;
  
  const subtotal = o.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const taxableSubtotal = Math.max(0, subtotal - discount);
  const baseTaxableValue = taxableSubtotal / 1.18;
  const totalCGST = baseTaxableValue * 0.09;
  const totalSGST = baseTaxableValue * 0.09;

  const itemRows = o.items.map((item, index) => {
    const inclusivePrice = item.product.price;
    const taxableValue = inclusivePrice / 1.18; // Base value without 18% GST
    const rowTaxableValue = taxableValue * item.quantity;
    const rowCGST = rowTaxableValue * 0.09;
    const rowSGST = rowTaxableValue * 0.09;
    const rowTotal = inclusivePrice * item.quantity;

    return `
      <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="text-align: center; border: 1px solid #e2e8f0; padding: 10px;">${index + 1}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px;">
          <b style="color: #1a202c;">${item.product.name}</b><br>
          <span style="font-size: 0.72rem; color: #718096;">Category: ${item.product.category} | ${item.product.fragile ? 'Fragile' : 'Standard'}</span>
        </td>
        <td style="text-align: center; border: 1px solid #e2e8f0; padding: 10px;">${getHSN(item.product.category)}</td>
        <td style="text-align: center; border: 1px solid #e2e8f0; padding: 10px;">${item.quantity}</td>
        <td style="text-align: right; border: 1px solid #e2e8f0; padding: 10px;">₹${taxableValue.toFixed(2)}</td>
        <td style="text-align: right; border: 1px solid #e2e8f0; padding: 10px;">₹${rowTaxableValue.toFixed(2)}</td>
        <td style="text-align: center; border: 1px solid #e2e8f0; padding: 10px;">9%</td>
        <td style="text-align: center; border: 1px solid #e2e8f0; padding: 10px;">9%</td>
        <td style="text-align: right; font-weight: 700; border: 1px solid #e2e8f0; padding: 10px; color: #1a202c;">₹${rowTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  invArea.innerHTML = `
    <div style="position: relative; font-family: 'Outfit', 'Segoe UI', sans-serif; color: #2d3748; padding: 10px 0; background: #fff;">
      
      <!-- Rotated Stamp -->
      <div style="position: absolute; top: 110px; right: 30px; width: 130px; height: 130px; border: 4px double ${o.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b'}; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-15deg); opacity: 0.85; pointer-events: none; font-family: 'Outfit', sans-serif; background: rgba(255, 255, 255, 0.9);">
        <span style="font-size: 0.8rem; font-weight: 800; color: ${o.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b'}; letter-spacing: 1.5px; text-transform: uppercase;">DIGISOFT</span>
        <span style="font-size: 1.35rem; font-weight: 950; color: ${o.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b'}; text-transform: uppercase; margin: 1px 0;">${o.paymentStatus === 'Paid' ? 'PAID' : 'COD'}</span>
        <span style="font-size: 0.65rem; font-weight: 700; color: ${o.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b'};">${o.paymentStatus === 'Paid' ? 'ONLINE TRx' : 'UNPAID'}</span>
      </div>

      <div class="invoice-header" style="border-bottom: 3px solid #1a202c; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="inv-logo" style="font-size: 2.4rem; font-weight: 900; letter-spacing: -1.5px; color: #0f172a; line-height: 1.0; font-family: 'Outfit', sans-serif;">DIGISOFT</div>
          <p style="font-size: 0.85rem; color: #475569; font-weight: 600; margin-top: 5px; margin-bottom: 5px;">Digisoft Gift Shop Private Limited</p>
          <p style="font-size: 0.78rem; color: #64748b; line-height: 1.5; margin: 0;">
            101, Luxury Boulevard, Suite A, New York, NY 10001<br>
            Email: support@digisoftgiftshop.com | Helpline: +1 (555) 123-4567<br>
            <b>GSTIN: 36AAAAA1111A1Z0</b> (State Code: 36 - Telengana)
          </p>
        </div>
        <div class="invoice-meta" style="text-align: right; min-width: 250px; line-height: 1.6;">
          <h2 style="font-size: 2.0rem; font-weight: 950; color: #0f172a; letter-spacing: -0.5px; margin: 0 0 10px 0; border-bottom: 2px solid #C5A059; padding-bottom: 5px; text-transform: uppercase;">TAX INVOICE</h2>
          <p style="margin: 0; font-size: 0.85rem;"><b>Invoice ID:</b> INV-${o.id.substring(3)}</p>
          <p style="margin: 0; font-size: 0.85rem;"><b>Invoice Date:</b> ${dateStr}</p>
          <p style="margin: 0; font-size: 0.85rem;"><b>Purchase Order Ref:</b> ${o.id}</p>
          <p style="margin: 0; font-size: 0.85rem;"><b>Courier AWB:</b> BD-AWB-${o.id.substring(3)}</p>
        </div>
      </div>

      ${containsFragile ? `
        <div class="fragile-sticker" style="display:inline-flex; align-items:center; gap:8px; background: #fff1f0; border: 1px solid #ffa39e; color: #f5222d; padding: 6px 14px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg> Handle With Care: Fragile Crockery / Dinnerware included
        </div>
      ` : ''}

      <div class="invoice-details-grid" style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px; margin-bottom: 25px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; line-height: 1.5;">
          <h4 style="border-bottom: 1.5px solid #C5A059; padding-bottom: 4px; margin-top: 0; margin-bottom: 10px; font-size: 0.85rem; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; font-weight: 700;">Billed & Shipped To:</h4>
          <p style="font-size: 0.95rem; margin: 0 0 4px 0; color: #0f172a;"><b>Customer Name:</b> ${o.customer.name}</p>
          <p style="font-size: 0.9rem; margin: 0 0 4px 0; color: #334155;"><b>Contact Phone:</b> ${o.customer.phone}</p>
          <p style="font-size: 0.9rem; margin: 0; color: #334155;"><b>Shipping Address:</b> ${o.customer.address}</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; line-height: 1.5;">
          <h4 style="border-bottom: 1.5px solid #C5A059; padding-bottom: 4px; margin-top: 0; margin-bottom: 10px; font-size: 0.85rem; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; font-weight: 700;">Transaction Details:</h4>
          <p style="font-size: 0.9rem; margin: 0 0 4px 0; color: #334155;"><b>Payment Method:</b> ${o.paymentMode} (${o.paymentMode === 'COD' ? 'Cash on Delivery' : 'Prepaid Gateway'})</p>
          <p style="font-size: 0.9rem; margin: 0 0 4px 0; color: #334155;"><b>Transaction Status:</b> <span style="font-weight: 700; color: ${o.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b'}">${o.paymentStatus}</span></p>
          <p style="font-size: 0.9rem; margin: 0; color: #334155;"><b>Shipping Status:</b> ${o.courierStatus} (BlueDart Express)</p>
        </div>
      </div>

      <table class="invoice-items-table" style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 0.85rem;">
        <thead>
          <tr style="background: #1e293b; color: #fff;">
            <th style="padding: 10px; font-weight: 700; text-align: center; width: 40px; border: 1px solid #e2e8f0;">S.No</th>
            <th style="padding: 10px; font-weight: 700; text-align: left; border: 1px solid #e2e8f0;">Product Description</th>
            <th style="padding: 10px; font-weight: 700; text-align: center; width: 80px; border: 1px solid #e2e8f0;">HSN Code</th>
            <th style="padding: 10px; font-weight: 700; text-align: center; width: 50px; border: 1px solid #e2e8f0;">Qty</th>
            <th style="padding: 10px; font-weight: 700; text-align: right; width: 90px; border: 1px solid #e2e8f0;">Rate (Base)</th>
            <th style="padding: 10px; font-weight: 700; text-align: right; width: 100px; border: 1px solid #e2e8f0;">Taxable Amt</th>
            <th style="padding: 10px; font-weight: 700; text-align: center; width: 60px; border: 1px solid #e2e8f0;">CGST</th>
            <th style="padding: 10px; font-weight: 700; text-align: center; width: 60px; border: 1px solid #e2e8f0;">SGST</th>
            <th style="padding: 10px; font-weight: 700; text-align: right; width: 100px; border: 1px solid #e2e8f0;">Total Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 20px; margin-bottom: 25px;">
        <div style="font-size: 0.82rem; color: #475569; line-height: 1.6;">
          <p style="margin: 0 0 10px 0;"><b>Amount Chargeable in Words:</b><br><span style="font-size: 0.9rem; font-weight: 700; color: #0f172a;">${priceToWords(o.total)}</span></p>
          
          ${pointsEarned > 0 ? `
            <p style="margin: 0 0 10px 0; color: #10b981; font-weight: 700; font-size: 0.85rem;">
              💚 Loyalty points earned on this order: ${pointsEarned} Points
            </p>
          ` : ''}

          <p style="font-size: 0.75rem; color: #64748b; margin-top: 15px; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
            <b>Tax Declarations:</b><br>
            We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Intrastate supply triggers split CGST 9% & SGST 9%.
          </p>
        </div>
        <div class="invoice-summary-block" style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px; font-size: 0.88rem; color: #334155; width: 100%;">
          <div style="display:flex; justify-content:space-between; width:100%;"><span>Gross Subtotal:</span> <b style="text-align: right; width: 120px;">₹${subtotal.toFixed(2)}</b></div>
          
          ${discount > 0 ? `
            <div style="display:flex; justify-content:space-between; width:100%; color: #C5A059;">
              <span>Coupon Discount:</span> 
              <span style="text-align: right; width: 120px;">-₹${discount.toFixed(2)}</span>
            </div>
          ` : ''}

          <div style="display:flex; justify-content:space-between; width:100%;"><span>Taxable Subtotal:</span> <b style="text-align: right; width: 120px;">₹${baseTaxableValue.toFixed(2)}</b></div>
          <div style="display:flex; justify-content:space-between; width:100%;"><span>Add CGST (9%):</span> <span style="text-align: right; width: 120px;">₹${totalCGST.toFixed(2)}</span></div>
          <div style="display:flex; justify-content:space-between; width:100%;"><span>Add SGST (9%):</span> <span style="text-align: right; width: 120px;">₹${totalSGST.toFixed(2)}</span></div>
          <div style="display:flex; justify-content:space-between; width:100%;"><span>Integrated GST (IGST):</span> <span style="text-align: right; width: 120px;">₹0.00 (0%)</span></div>
          
          ${pointsRedeemed > 0 ? `
            <div style="display:flex; justify-content:space-between; width:100%; color: #10b981;">
              <span>Loyalty Points Redeemed:</span> 
              <span style="text-align: right; width: 120px;">-₹${pointsRedeemed.toFixed(2)}</span>
            </div>
          ` : ''}

          <div class="total" style="font-size: 1.35rem; font-weight: 950; color: #0f172a; border-top: 3px double #0f172a; padding-top: 8px; margin-top: 5px; width: 100%; display:flex; justify-content:space-between;">
            <span>Grand Total:</span> <span style="color: #C5A059; text-align: right; width: 120px;">₹${o.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 15px; font-size: 0.85rem; color: #333;">
        <div class="invoice-notes" style="width: 60%; margin: 0; padding: 0; border: none;">
          <p style="font-weight: 700; color: #000; margin-bottom: 5px;">Invoice Terms:</p>
          <p style="margin: 0; line-height: 1.4;">
            1. Goods once sold are packed securely under warehouse surveillance.<br>
            2. Intrastate CGST & SGST mapped as per State Code 36 rules.<br>
            3. Computer-generated Tax Invoice - Requires no physical signature.
          </p>
        </div>
        <div style="text-align: right; min-width: 200px;">
          <p style="font-size: 0.82rem; margin-bottom: 45px; font-weight: 700; color: #000;">For DIGISOFT GIFT SHOP PVT. LTD.</p>
          <p style="border-top: 1px solid #888; padding-top: 5px; font-size: 0.8rem; display: inline-block; width: 180px; text-align: center;">Authorised Signatory</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('invoice-modal').classList.add('active');
};
