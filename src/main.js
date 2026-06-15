import './style.css'
import { db } from './firebase.js'
import { 
  collection, 
  doc, 
  onSnapshot, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc 
} from 'firebase/firestore'

let products = [];
let orders = [];
let wishlist = JSON.parse(localStorage.getItem('digisoft_wishlist')) || [];
let appliedCoupon = null;
let couponDiscountValue = 0;
let redeemedPoints = 0;
let loyaltyPointsBalance = 0;

// CONFIGURATION: Replace with your actual Razorpay Test Key ID from the Razorpay Dashboard (e.g. "rzp_test_...")
const RAZORPAY_KEY_ID = "YOUR_RAZORPAY_TEST_KEY_ID";

class ConfettiEngine {
  constructor() {
    this.canvas = document.getElementById('confetti-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.colors = ['#C5A059', '#D4AF37', '#ffffff', '#E2E8F0', '#A68445'];
    this.active = false;
    
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  start(durationMs = 2500, amount = 100) {
    if (!this.canvas) return;
    this.active = true;
    this.resizeCanvas();
    
    // Spawn initial particles
    for (let i = 0; i < amount; i++) {
      this.particles.push(this.createParticle());
    }

    const startTime = Date.now();
    const tick = () => {
      if (!this.active) return;
      
      const elapsed = Date.now() - startTime;
      if (elapsed > durationMs && this.particles.length === 0) {
        this.stop();
        return;
      }

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.y += p.vy;
        p.x += p.vx;
        p.rotation += p.rotationSpeed;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation * Math.PI / 180);
        this.ctx.fillStyle = p.color;
        
        if (p.shape === 'circle') {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.r, 0, 2 * Math.PI);
          this.ctx.fill();
        } else {
          this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        this.ctx.restore();

        if (p.y > this.canvas.height) {
          if (Date.now() - startTime < durationMs) {
            this.particles[i] = this.createParticle(true);
          } else {
            this.particles.splice(i, 1);
          }
        }
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  stop() {
    this.active = false;
    this.particles = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  createParticle(atTop = false) {
    const shape = Math.random() > 0.5 ? 'rect' : 'circle';
    return {
      x: Math.random() * this.canvas.width,
      y: atTop ? -20 : Math.random() * -this.canvas.height,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 3,
      r: Math.random() * 4 + 3,
      w: Math.random() * 8 + 4,
      h: Math.random() * 12 + 6,
      shape: shape,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8
    };
  }
}

let confetti = null;
document.addEventListener('DOMContentLoaded', () => {
  confetti = new ConfettiEngine();
});

const injectJSONLD = (productList) => {
  let existing = document.getElementById('seo-jsonld');
  if (existing) existing.remove();

  const schema = {
    "@context": "https://schema.org",
    "@type": "GiftStore",
    "name": "Digisoft Gift Shop",
    "description": "Discover the world's best collection of premium and customized gifts at Digisoft Gift Shop.",
    "url": window.location.origin,
    "telephone": "+1-555-123-4567",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "101, Luxury Boulevard, Suite A",
      "addressLocality": "New York",
      "addressRegion": "NY",
      "postalCode": "10001",
      "addressCountry": "US"
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "09:00",
        "closes": "20:00"
      }
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Luxury Gifting Catalogue",
      "itemListElement": productList.slice(0, 5).map((p, idx) => ({
        "@type": "OfferCatalogItem",
        "position": idx + 1,
        "item": {
          "@type": "Product",
          "name": p.name,
          "image": (p.image.startsWith('http') ? p.image : window.location.origin + p.image),
          "offers": {
            "@type": "Offer",
            "priceCurrency": "INR",
            "price": p.price,
            "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
          }
        }
      }))
    }
  };

  const script = document.createElement('script');
  script.id = 'seo-jsonld';
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
};

const showFirebaseError = (err) => {
  console.error("Firebase/Firestore Error Details:", err);
  const existing = document.getElementById('firebase-error-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'firebase-error-banner';
  banner.style.cssText = 'position:fixed; top:0; left:0; width:100%; background:#ff4a4a; color:white; padding:12px; text-align:center; z-index:999999; font-weight:bold; font-family:sans-serif; box-shadow:0 2px 10px rgba(0,0,0,0.5);';
  banner.innerHTML = `⚠️ Cloud Database (Firestore) Connection Issue: <span style="text-decoration:underline;">${err.message}</span>. Please verify your Firestore Database security rules.`;
  document.body.prepend(banner);
};

const seedDatabaseIfEmpty = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const needsReseed = querySnapshot.empty || querySnapshot.docs.some(d => !d.data().department);
    if (needsReseed) {
      const initialProducts = [
        { id: 1, name: "Golden Eternal Rose", price: 129.00, image: "/images/rose.jpg", department: "Gifting", category: "Festival Gifts", subCategory: "Diwali Gifts", stock: 12, fragile: true, microwave: false },
        { id: 2, name: "Luxury Watch Set", price: 450.00, image: "/images/watch.jpg", department: "Gifting", category: "Gift Sets", subCategory: "Home Décor Gift Packs", stock: 6, fragile: true, microwave: false },
        { id: 3, name: "Customized Leather Journal", price: 59.00, image: "/images/journal.jpg", department: "Gifting", category: "Wedding Gifts", subCategory: "Executive Gifts", stock: 20, fragile: false, microwave: false },
        { id: 4, name: "Artisan Chocolate Box", price: 85.00, image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?q=80&w=1935&auto=format&fit=crop", department: "Gifting", category: "Wedding Gifts", subCategory: "Gift Hampers", stock: 15, fragile: false, microwave: false },
        { id: 5, name: "Diamond Stud Earrings", price: 899.00, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1974&auto=format&fit=crop", department: "Gifting", category: "Wedding Gifts", subCategory: "Wedding Gifts", stock: 3, fragile: true, microwave: false },
        { id: 6, name: "Crystal Scented Candle", price: 45.00, image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?q=80&w=1974&auto=format&fit=crop", department: "Home Décor", category: "Decorative Items", subCategory: "Showpieces", stock: 25, fragile: true, microwave: false },
        { id: 7, name: "Premium Bone China Set", price: 299.00, image: "/images/crockery_dinner_set.png", department: "Crockery & Dining", category: "Dinnerware", subCategory: "Dinner Sets", stock: 8, fragile: true, microwave: true },
        { id: 8, name: "Artisan Ceramic Teapot", price: 75.00, image: "/images/crockery_teapot.png", department: "Crockery & Dining", category: "Drinkware", subCategory: "Tea Cups & Saucers", stock: 10, fragile: true, microwave: true },
        { id: 9, name: "Crystal Wine Glass Set", price: 120.00, image: "/images/crockery_wine_glasses.png", department: "Crockery & Dining", category: "Drinkware", subCategory: "Wine Glasses", stock: 14, fragile: true, microwave: false },
        { id: 10, name: "Matte Ceramic Plates", price: 85.00, image: "/images/crockery_plates.png", department: "Crockery & Dining", category: "Dinnerware", subCategory: "Dinner Plates", stock: 18, fragile: true, microwave: true }
      ];
      for (const prod of initialProducts) {
        await setDoc(doc(db, 'products', prod.id.toString()), prod);
      }
    }
  } catch (err) {
    showFirebaseError(err);
  }
};

seedDatabaseIfEmpty();

// Subscribe to products real-time changes
onSnapshot(collection(db, 'products'), (snapshot) => {
  products = snapshot.docs.map(doc => doc.data());
  products.sort((a, b) => a.id - b.id);
  renderProducts();
  injectJSONLD(products);
}, (err) => {
  showFirebaseError(err);
});

// Subscribe to orders real-time changes
onSnapshot(collection(db, 'orders'), (snapshot) => {
  orders = snapshot.docs.map(doc => doc.data());
  orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}, (err) => {
  showFirebaseError(err);
});

const getProducts = () => products;
const getOrders = () => orders;

// Render Products
const renderProducts = (filteredProducts = null) => {
  products = getProducts();
  const listToRender = filteredProducts || products;
  
  const container = document.getElementById('product-container');
  if (!container) return;

  if (listToRender.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 20px;">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <h3>No treasures found matching your search.</h3>
        <p>Try searching for categories like "Premium", "Anniversary", or "Customized".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = listToRender.map(product => {
    const isOutOfStock = product.stock <= 0;
    const isWishlisted = wishlist.some(item => item.id === product.id);
    return `
      <div class="product-card" style="animation: fadeInUp 0.5s ease forwards">
        <div class="product-img" style="position:relative;">
          <img src="${product.image}" alt="${product.name}">
          ${isOutOfStock ? `<div style="position:absolute; top:10px; left:10px; background:#ff4a4a; color:white; font-size:0.7rem; font-weight:800; padding:4px 8px; border-radius:4px;">OUT OF STOCK</div>` : ''}
          <div class="wishlist-heart-btn ${isWishlisted ? 'active' : ''}" data-id="${product.id}" style="position:absolute; top:10px; right:10px; width:36px; height:36px; border-radius:50%; background:rgba(10,10,10,0.6); backdrop-filter:blur(5px); border:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; cursor:pointer; color:#fff; transition:all 0.3s ease;">
            <svg class="heart-icon" width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? 'var(--primary)' : 'none'}" stroke="${isWishlisted ? 'var(--primary)' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </div>
        </div>
        <div class="product-info">
          <p style="color: var(--primary); font-size: 0.72rem; text-transform: uppercase; margin-bottom: 4px; font-weight: 600;">
            ${product.department ? `${product.department} &gt; ` : ''}${product.category || 'Gifts'}
          </p>
          <h3 style="margin-bottom: 12px; height: 42px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${product.name}</h3>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <p class="product-price" style="margin: 0; font-weight: 700; font-size: 1.15rem; color: var(--primary);">₹${product.price.toLocaleString('en-IN')}</p>
              <span style="font-size:0.75rem; color:${product.stock < 3 ? '#ff4a4a' : 'var(--text-muted)'}; font-weight:600; display:block; margin-top:2px;">
                ${isOutOfStock ? 'Sold Out' : `${product.stock} available`}
              </span>
            </div>
            <div class="add-btn ${isOutOfStock ? 'disabled' : ''}" data-id="${product.id}" style="${isOutOfStock ? 'pointer-events:none; opacity:0.4; background:#444;' : 'cursor:pointer;'} display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach click listeners
  container.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = parseInt(btn.getAttribute('data-id'));
      addToCart(productId);
    });
  });

  container.querySelectorAll('.wishlist-heart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = parseInt(btn.getAttribute('data-id'));
      toggleWishlist(productId);
    });
  });
};

// Cart Logic
let cart = JSON.parse(localStorage.getItem('digisoft_cart')) || [];

const addToCart = (productId) => {
  products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product || product.stock <= 0) return;

  const cartItem = cart.find(item => item.product.id === productId);
  if (cartItem) {
    if (cartItem.quantity >= product.stock) {
      showToast("Inventory Limit Reached", "We only have " + product.stock + " items of this product left in stock.", "warning");
      return;
    }
    cartItem.quantity++;
  } else {
    cart.push({ product, quantity: 1 });
  }

  showToast("Added to Cart", product.name + " has been added to your shopping cart.", "success");
  updateCartUI();
};

const toggleWishlist = (productId) => {
  products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const index = wishlist.findIndex(item => item.id === productId);
  if (index > -1) {
    wishlist.splice(index, 1);
    showToast("Removed from Wishlist", product.name + " has been removed from your wishlist.", "success");
  } else {
    wishlist.push(product);
    showToast("Added to Wishlist", product.name + " has been added to your wishlist.", "success");
  }
  
  localStorage.setItem('digisoft_wishlist', JSON.stringify(wishlist));
  renderProducts();
  updateWishlistUI();
};

const updateWishlistUI = () => {
  const wishlistCount = document.getElementById('wishlist-count');
  const wishlistBody = document.getElementById('wishlist-body-items');
  
  if (wishlistCount) {
    wishlistCount.textContent = wishlist.length;
  }
  
  if (!wishlistBody) return;
  
  if (wishlist.length === 0) {
    wishlistBody.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px;">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <p>Your wishlist is empty</p>
      </div>
    `;
    return;
  }
  
  wishlistBody.innerHTML = wishlist.map(product => {
    const isOutOfStock = product.stock <= 0;
    return `
      <div class="cart-item-row" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding: 12px 0;">
        <img src="${product.image}" alt="${product.name}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
        <div style="flex-grow:1; margin-left: 12px;">
          <h4 style="font-size:0.9rem; margin-bottom:4px; font-weight:600;">${product.name}</h4>
          <p style="color:var(--primary); font-size:0.85rem; font-weight:700;">₹${product.price.toLocaleString('en-IN')}</p>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn btn-primary add-from-wishlist-btn" data-id="${product.id}" style="${isOutOfStock ? 'opacity:0.5; pointer-events:none;' : ''} padding: 4px 8px; font-size: 0.75rem; border-radius: 6px; display:flex; align-items:center;" ${isOutOfStock ? 'disabled' : ''}>
            Add to Cart
          </button>
          <button class="remove-from-wishlist-btn" data-id="${product.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; padding: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Bind events
  wishlistBody.querySelectorAll('.add-from-wishlist-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      addToCart(id);
      const index = wishlist.findIndex(item => item.id === id);
      if (index > -1) {
        wishlist.splice(index, 1);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        renderProducts();
        updateWishlistUI();
      }
    });
  });
  
  wishlistBody.querySelectorAll('.remove-from-wishlist-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      const index = wishlist.findIndex(item => item.id === id);
      if (index > -1) {
        wishlist.splice(index, 1);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        renderProducts();
        updateWishlistUI();
      }
    });
  });
};

const updateCartUI = () => {
  // Save cart to local storage
  localStorage.setItem('digisoft_cart', JSON.stringify(cart));

  const cartBody = document.getElementById('cart-body-items');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const cartTax = document.getElementById('cart-tax');
  const cartTotal = document.getElementById('cart-total');
  const cartCount = document.getElementById('cart-count');

  if (!cartBody) return;

  if (cart.length === 0) {
    cartBody.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px;">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <p>Your shopping cart is empty</p>
      </div>
    `;
    cartSubtotal.textContent = "₹0.00";
    cartTax.textContent = "₹0.00";
    cartTotal.textContent = "₹0.00";
    cartCount.textContent = "0";
    return;
  }

  let subtotal = 0;
  cartBody.innerHTML = cart.map(item => {
    const totalItemPrice = item.product.price * item.quantity;
    subtotal += totalItemPrice;
    return `
      <div class="cart-item-row" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding: 12px 0;">
        <img src="${item.product.image}" alt="${item.product.name}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
        <div style="flex-grow:1; margin-left: 12px;">
          <h4 style="font-size:0.9rem; margin-bottom:4px; font-weight:600;">${item.product.name}</h4>
          <p style="color:var(--primary); font-size:0.85rem; font-weight:700;">₹${item.product.price.toLocaleString('en-IN')}</p>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="cart-qty-btn decrease-qty" data-id="${item.product.id}" style="width:24px; height:24px; border-radius:50%; border:1px solid var(--glass-border); background:none; color:white; cursor:pointer;">-</button>
          <span style="font-size:0.9rem; font-weight:600; min-width:15px; text-align:center;">${item.quantity}</span>
          <button class="cart-qty-btn increase-qty" data-id="${item.product.id}" style="width:24px; height:24px; border-radius:50%; border:1px solid var(--glass-border); background:none; color:white; cursor:pointer;">+</button>
        </div>
      </div>
    `;
  }).join('');

  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  cartSubtotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  cartTax.textContent = `₹${tax.toLocaleString('en-IN')}`;
  cartTotal.textContent = `₹${total.toLocaleString('en-IN')}`;
  cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Bind cart events
  cartBody.querySelectorAll('.decrease-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      const item = cart.find(item => item.product.id === id);
      if (item.quantity > 1) {
        item.quantity--;
      } else {
        cart = cart.filter(item => item.product.id !== id);
      }
      updateCartUI();
    });
  });

  cartBody.querySelectorAll('.increase-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      const item = cart.find(item => item.product.id === id);
      const product = products.find(p => p.id === id);
      if (item.quantity < product.stock) {
        item.quantity++;
      } else {
        showToast("Inventory Limit", `We only have ${product.stock} items in stock.`, "warning");
      }
      updateCartUI();
    });
  });
};

// Toast helper
const showToast = (title, message, type = "success") => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === "warning") {
    toast.style.borderColor = "#ffaa00";
    toast.style.borderLeftColor = "#ffaa00";
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
  }, 5000);
};

const calculateCheckoutTotals = () => {
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  
  // Calculate coupon discount
  couponDiscountValue = 0;
  if (appliedCoupon) {
    if (appliedCoupon === 'WELCOME10') {
      couponDiscountValue = subtotal * 0.10;
    } else if (appliedCoupon === 'GIFT15') {
      couponDiscountValue = subtotal * 0.15;
    } else if (appliedCoupon === 'FESTIVE25') {
      couponDiscountValue = subtotal * 0.25;
    } else if (appliedCoupon === 'DIGI500') {
      if (subtotal >= 1500) {
        couponDiscountValue = 500;
      } else {
        appliedCoupon = null;
        couponDiscountValue = 0;
        const couponMsg = document.getElementById('coupon-message');
        if (couponMsg) {
          couponMsg.textContent = "Coupon DIGI500 requires minimum subtotal of ₹1,500.";
          couponMsg.className = "error";
        }
      }
    }
  }

  const taxableValue = Math.max(0, subtotal - couponDiscountValue);
  const tax = taxableValue * 0.18;
  const totalBeforeLoyalty = taxableValue + tax;

  // Calculate loyalty points discount
  redeemedPoints = 0;
  const redeemCheckbox = document.getElementById('redeem-points-checkbox');
  if (redeemCheckbox && redeemCheckbox.checked) {
    const pointsToRedeem = Math.min(loyaltyPointsBalance, Math.floor(totalBeforeLoyalty));
    redeemedPoints = pointsToRedeem;
  }

  const finalTotal = Math.max(0, totalBeforeLoyalty - redeemedPoints);
  const pointsEarned = Math.floor(finalTotal / 100);

  // Update checkout modal totals UI
  const subtotalEl = document.getElementById('checkout-subtotal');
  const discountEl = document.getElementById('checkout-discount');
  const discountRow = document.getElementById('checkout-discount-row');
  const taxEl = document.getElementById('checkout-tax');
  const loyaltyEl = document.getElementById('checkout-loyalty-discount');
  const loyaltyRow = document.getElementById('checkout-loyalty-row');
  const grandTotalEl = document.getElementById('checkout-grand-total');

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  if (discountRow) {
    if (couponDiscountValue > 0) {
      discountRow.style.display = 'flex';
      discountEl.textContent = `-₹${couponDiscountValue.toLocaleString('en-IN')}`;
    } else {
      discountRow.style.display = 'none';
    }
  }
  if (taxEl) taxEl.textContent = `₹${tax.toLocaleString('en-IN')}`;
  if (loyaltyRow) {
    if (redeemedPoints > 0) {
      loyaltyRow.style.display = 'flex';
      loyaltyEl.textContent = `-₹${redeemedPoints.toLocaleString('en-IN')}`;
    } else {
      loyaltyRow.style.display = 'none';
    }
  }
  if (grandTotalEl) grandTotalEl.textContent = `₹${finalTotal.toLocaleString('en-IN')}`;

  return {
    subtotal,
    couponApplied: appliedCoupon,
    couponDiscount: couponDiscountValue,
    tax,
    loyaltyPointsRedeemed: redeemedPoints,
    loyaltyPointsEarned: pointsEarned,
    total: finalTotal
  };
};

// Helper to update body scroll lock based on active overlays
const updateBodyScrollState = () => {
  const activeOverlays = document.querySelectorAll('.checkout-overlay.active');
  if (activeOverlays.length > 0) {
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
  }
};

// UI Drawer Triggers
const initStoreUI = () => {
  const cartTrigger = document.getElementById('cart-trigger-btn');
  const closeCart = document.getElementById('close-cart-btn');
  const cartDrawer = document.getElementById('cart-drawer');
  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutOverlay = document.getElementById('checkout-overlay');
  const closeCheckout = document.getElementById('close-checkout-btn');
  const checkoutForm = document.getElementById('checkout-form-modal');

  const wishlistTrigger = document.getElementById('wishlist-trigger-btn');
  const closeWishlist = document.getElementById('close-wishlist-btn');
  const wishlistDrawer = document.getElementById('wishlist-drawer');

  // Checkout inputs
  const nameInput = document.getElementById('cust-name');
  const emailInput = document.getElementById('cust-email');
  const phoneInput = document.getElementById('cust-phone');
  const addressInput = document.getElementById('cust-address');

  // Load saved checkout details
  if (nameInput) nameInput.value = localStorage.getItem('digisoft_checkout_name') || '';
  if (emailInput) emailInput.value = localStorage.getItem('digisoft_checkout_email') || '';
  if (phoneInput) phoneInput.value = localStorage.getItem('digisoft_checkout_phone') || '';
  if (addressInput) addressInput.value = localStorage.getItem('digisoft_checkout_address') || '';

  // Listen to input changes to save
  nameInput?.addEventListener('input', (e) => localStorage.setItem('digisoft_checkout_name', e.target.value));
  emailInput?.addEventListener('input', (e) => localStorage.setItem('digisoft_checkout_email', e.target.value));
  phoneInput?.addEventListener('input', (e) => {
    localStorage.setItem('digisoft_checkout_phone', e.target.value);
  });
  addressInput?.addEventListener('input', (e) => localStorage.setItem('digisoft_checkout_address', e.target.value));

  if (cartTrigger && cartDrawer) {
    cartTrigger.addEventListener('click', () => cartDrawer.classList.add('active'));
  }
  if (closeCart && cartDrawer) {
    closeCart.addEventListener('click', () => cartDrawer.classList.remove('active'));
  }
  if (wishlistTrigger && wishlistDrawer) {
    wishlistTrigger.addEventListener('click', () => {
      updateWishlistUI();
      wishlistDrawer.classList.add('active');
    });
  }
  if (closeWishlist && wishlistDrawer) {
    closeWishlist.addEventListener('click', () => wishlistDrawer.classList.remove('active'));
  }

  if (checkoutBtn && checkoutOverlay) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        showToast("Cart Empty", "Add products to your cart before checking out.", "warning");
        return;
      }
      cartDrawer.classList.remove('active');
      checkoutOverlay.classList.add('active');
      localStorage.setItem('digisoft_checkout_active', 'true');
      updateBodyScrollState();
      
      // Reset coupon and loyalty point selections
      appliedCoupon = null;
      couponDiscountValue = 0;
      redeemedPoints = 0;
      const couponInput = document.getElementById('coupon-code-input');
      const couponMsg = document.getElementById('coupon-message');
      const pointsCheckbox = document.getElementById('redeem-points-checkbox');
      const loyaltyContainer = document.getElementById('loyalty-redeem-container');
      const phoneInput = document.getElementById('cust-phone');
      
      if (couponInput) couponInput.value = "";
      if (couponMsg) {
        couponMsg.textContent = "";
        couponMsg.className = "";
      }
      if (pointsCheckbox) pointsCheckbox.checked = false;
      if (loyaltyContainer) loyaltyContainer.style.display = 'none';

      // Load checkout summary items
      const summaryItemsEl = document.getElementById('checkout-summary-items');
      if (summaryItemsEl) {
        summaryItemsEl.innerHTML = cart.map(item => `
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>${item.product.name} (x${item.quantity})</span>
            <span>₹${(item.product.price * item.quantity).toLocaleString('en-IN')}</span>
          </div>
        `).join('');
      }

      // Check if phone number is pre-filled, and fetch points
      if (phoneInput && phoneInput.value.trim().length >= 10) {
        phoneInput.dispatchEvent(new Event('change'));
      }

      calculateCheckoutTotals();
      
      // Setup mock abandoned cart timer: trigger nudge if closed/idle
      sessionStorage.setItem('digisoft_abandoned_cart', JSON.stringify(cart));
      sessionStorage.setItem('digisoft_checkout_entered', 'true');
    });
  }
  if (closeCheckout && checkoutOverlay) {
    closeCheckout.addEventListener('click', () => {
      checkoutOverlay.classList.remove('active');
      localStorage.removeItem('digisoft_checkout_active');
      updateBodyScrollState();
    });
  }

  // Restore active checkout state on load if cart is not empty
  const savedCheckoutActive = localStorage.getItem('digisoft_checkout_active') === 'true';
  if (savedCheckoutActive && checkoutOverlay && cart.length > 0) {
    checkoutOverlay.classList.add('active');
    updateBodyScrollState();
  }

  // Hook up Coupon Code listener
  const applyCouponBtn = document.getElementById('apply-coupon-btn');
  const couponInput = document.getElementById('coupon-code-input');
  const couponMsg = document.getElementById('coupon-message');

  if (applyCouponBtn && couponInput && couponMsg) {
    applyCouponBtn.addEventListener('click', () => {
      const code = couponInput.value.trim().toUpperCase();
      const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      
      if (!code) {
        appliedCoupon = null;
        calculateCheckoutTotals();
        couponMsg.textContent = "";
        couponMsg.className = "";
        return;
      }

      const validCodes = ['WELCOME10', 'GIFT15', 'FESTIVE25', 'DIGI500'];
      if (!validCodes.includes(code)) {
        couponMsg.textContent = "Invalid Coupon Code.";
        couponMsg.className = "error";
        appliedCoupon = null;
        calculateCheckoutTotals();
        return;
      }

      if (code === 'DIGI500' && subtotal < 1500) {
        couponMsg.textContent = "Flat ₹500 off requires minimum subtotal of ₹1,500.";
        couponMsg.className = "error";
        appliedCoupon = null;
        calculateCheckoutTotals();
        return;
      }

      appliedCoupon = code;
      calculateCheckoutTotals();
      couponMsg.textContent = `Coupon ${code} applied successfully!`;
      couponMsg.className = "success";
      
      // Trigger satisfying confetti blast
      if (confetti) {
        confetti.start(1500, 60);
      }
    });
  }

  // Hook up Loyalty points check box listener
  const redeemCheckbox = document.getElementById('redeem-points-checkbox');
  if (redeemCheckbox) {
    redeemCheckbox.addEventListener('change', () => {
      calculateCheckoutTotals();
    });
  }

  // Fetch Loyalty points when phone number is input
  if (phoneInput) {
    phoneInput.addEventListener('change', async (e) => {
      const phone = e.target.value.trim();
      if (phone.length >= 10) {
        try {
          const customerDoc = await getDoc(doc(db, 'customers', phone));
          let points = 0;
          if (customerDoc.exists()) {
            points = customerDoc.data().loyaltyPoints || 0;
          }
          loyaltyPointsBalance = points;
          
          const pointsBalEl = document.getElementById('loyalty-points-balance');
          if (pointsBalEl) pointsBalEl.textContent = points;

          const redeemContainer = document.getElementById('loyalty-redeem-container');
          if (points > 0 && redeemContainer) {
            redeemContainer.style.display = 'block';
          } else if (redeemContainer) {
            redeemContainer.style.display = 'none';
            if (redeemCheckbox) redeemCheckbox.checked = false;
          }
          calculateCheckoutTotals();
        } catch (err) {
          console.error("Error fetching loyalty points:", err);
        }
      }
    });
  }

  // Hook up custom Clickable Payment Selector Cards
  const payCardCod = document.getElementById('pay-card-cod');
  const payCardOnline = document.getElementById('pay-card-online');
  const payModeCodInput = document.getElementById('pay-mode-cod');
  const payModeOnlineInput = document.getElementById('pay-mode-online');

  if (payCardCod && payCardOnline && payModeCodInput && payModeOnlineInput) {
    payCardCod.addEventListener('click', () => {
      payCardCod.classList.add('active');
      payCardOnline.classList.remove('active');
      payModeCodInput.checked = true;
      payCardCod.style.borderColor = 'var(--primary)';
      payCardCod.style.background = 'rgba(197, 160, 89, 0.08)';
      payCardOnline.style.borderColor = 'var(--glass-border)';
      payCardOnline.style.background = 'rgba(255, 255, 255, 0.02)';
      
      // Update checkout totals in case payment mode selection affects calculations later
      calculateCheckoutTotals();
    });

    payCardOnline.addEventListener('click', () => {
      payCardOnline.classList.add('active');
      payCardCod.classList.remove('active');
      payModeOnlineInput.checked = true;
      payCardOnline.style.borderColor = 'var(--primary)';
      payCardOnline.style.background = 'rgba(197, 160, 89, 0.08)';
      payCardCod.style.borderColor = 'var(--glass-border)';
      payCardCod.style.background = 'rgba(255, 255, 255, 0.02)';
      
      calculateCheckoutTotals();
    });
  }

  const saveOrderAndCompleteCheckout = async (newOrder) => {
    // Deduct Stock levels in Firestore
    products = getProducts();
    for (const cartItem of newOrder.items) {
      const p = products.find(prod => prod.id === cartItem.product.id);
      if (p) {
        const newStock = Math.max(0, p.stock - cartItem.quantity);
        await updateDoc(doc(db, 'products', p.id.toString()), { stock: newStock });
      }
    }

    await setDoc(doc(db, 'orders', newOrder.id), newOrder);

    // Update Loyalty Points in Firestore
    if (newOrder.customer.phone) {
      const customerRef = doc(db, 'customers', newOrder.customer.phone);
      try {
        const customerDoc = await getDoc(customerRef);
        let currentPoints = 0;
        if (customerDoc.exists()) {
          currentPoints = customerDoc.data().loyaltyPoints || 0;
        }
        
        const newBalance = Math.max(0, currentPoints - (newOrder.loyaltyPointsRedeemed || 0) + (newOrder.loyaltyPointsEarned || 0));
        
        await setDoc(customerRef, {
          name: newOrder.customer.name,
          email: newOrder.customer.email,
          phone: newOrder.customer.phone,
          loyaltyPoints: newBalance,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
        
        console.log(`Loyalty points updated for ${newOrder.customer.phone}: ${newBalance} points`);
      } catch (err) {
        console.error("Error updating customer loyalty points in Firestore:", err);
      }
    }

    // Compile Invoice HTML
    const successInvoiceContent = document.getElementById('success-invoice-content');
    if (successInvoiceContent) {
      const dateStr = new Date(newOrder.timestamp).toLocaleDateString('en-IN');
      successInvoiceContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid var(--primary); padding-bottom:12px; margin-bottom:15px;">
          <div>
            <h3 style="margin:0; font-size:1.4rem; font-weight:800; color:var(--text-main); letter-spacing:-0.5px;">DIGISOFT</h3>
            <p style="margin:0; font-size:0.75rem; color:var(--text-muted);">Premium Gifts & Dinnerware</p>
          </div>
          <div style="text-align:right;">
            <span style="background:var(--primary); color:#000; font-size:0.7rem; font-weight:800; padding:3px 8px; border-radius:50px; text-transform:uppercase; letter-spacing:0.5px;">
              ${newOrder.paymentMode === 'COD' ? 'COD Pending' : 'Paid'}
            </span>
            <p style="margin:3px 0 0 0; font-size:0.75rem; color:var(--text-muted);">INV-${newOrder.id.substring(3)}</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:20px; font-size:0.82rem; line-height:1.4; border-bottom:1px solid var(--glass-border); padding-bottom:12px; margin-bottom:15px; color:var(--text-muted);">
          <div>
            <h5 style="color:var(--primary); font-size:0.75rem; text-transform:uppercase; margin:0 0 5px 0; letter-spacing:0.5px;">Shipping To:</h5>
            <p style="margin:0 0 2px 0; color:var(--text-main); font-weight:600;">${newOrder.customer.name}</p>
            <p style="margin:0 0 2px 0;">Phone: ${newOrder.customer.phone}</p>
            <p style="margin:0;">Address: ${newOrder.customer.address}</p>
          </div>
          <div>
            <h5 style="color:var(--primary); font-size:0.75rem; text-transform:uppercase; margin:0 0 5px 0; letter-spacing:0.5px;">Order Info:</h5>
            <p style="margin:0 0 2px 0;">Date: ${dateStr}</p>
            <p style="margin:0 0 2px 0;">Method: ${newOrder.paymentMode}</p>
            <p style="margin:0;">AWB: BD-AWB-${newOrder.id.substring(3)}</p>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:15px; font-size:0.82rem; color:var(--text-main);">
          <thead>
            <tr style="border-bottom:1px solid var(--glass-border); text-align:left; color:var(--primary); font-size:0.75rem; text-transform:uppercase;">
              <th style="padding:6px 0;">Item Description</th>
              <th style="padding:6px 0; text-align:center; width:50px;">Qty</th>
              <th style="padding:6px 0; text-align:right; width:80px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${newOrder.items.map(item => `
              <tr style="border-bottom:1px dashed var(--glass-border);">
                <td style="padding:8px 0; color:var(--text-main); font-weight:600;">${item.product.name}</td>
                <td style="padding:8px 0; text-align:center; color:var(--text-muted);">${item.quantity}</td>
                <td style="padding:8px 0; text-align:right; color:var(--text-main);">₹${(item.product.price * item.quantity).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="text-align:right; font-size:0.82rem; display:flex; flex-direction:column; gap:5px; border-top:1px solid var(--glass-border); padding-top:10px; color:var(--text-muted);">
          <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span> <span style="font-weight:600; color:var(--text-main);">₹${newOrder.subtotal.toLocaleString('en-IN')}</span></div>
          
          ${newOrder.couponApplied ? `
            <div style="display:flex; justify-content:space-between; color:var(--primary);">
              <span>Discount (${newOrder.couponApplied}):</span> 
              <span>-₹${newOrder.couponDiscount.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}

          <div style="display:flex; justify-content:space-between;"><span>GST (18%):</span> <span style="color:var(--text-main);">₹${newOrder.tax.toLocaleString('en-IN')}</span></div>
          
          ${newOrder.loyaltyPointsRedeemed ? `
            <div style="display:flex; justify-content:space-between; color:#38a169;">
              <span>Points Redeemed:</span> 
              <span>-₹${newOrder.loyaltyPointsRedeemed.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}

          <div style="display:flex; justify-content:space-between; font-size:1.15rem; font-weight:800; color:var(--primary); border-top:2px double var(--primary); padding-top:8px; margin-top:5px;">
            <span>Grand Total:</span> 
            <span>₹${newOrder.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
        
        <div style="margin-top:15px; background:rgba(197, 160, 89, 0.05); border:1.5px dashed rgba(197, 160, 89, 0.2); padding:10px; border-radius:8px; text-align:center; font-size:0.75rem; color:var(--text-main);">
          🎉 You earned <b>${newOrder.loyaltyPointsEarned} Loyalty Points</b> on this purchase!
        </div>
      `;
    }

    // Clear Cart states
    cart = [];
    updateCartUI();
    sessionStorage.removeItem('digisoft_abandoned_cart');
    sessionStorage.removeItem('digisoft_checkout_entered');
    localStorage.removeItem('digisoft_checkout_active');

    // Clear saved checkout inputs
    localStorage.removeItem('digisoft_checkout_name');
    localStorage.removeItem('digisoft_checkout_email');
    localStorage.removeItem('digisoft_checkout_phone');
    localStorage.removeItem('digisoft_checkout_address');
    
    const nameInput = document.getElementById('cust-name');
    const emailInput = document.getElementById('cust-email');
    const phoneInput = document.getElementById('cust-phone');
    const addressInput = document.getElementById('cust-address');
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (addressInput) addressInput.value = '';
    
    checkoutOverlay.classList.remove('active');
    renderProducts();
    
    // Open Order Success Modal (Invoice Display)
    const successOverlay = document.getElementById('order-success-overlay');
    if (successOverlay) {
      successOverlay.classList.add('active');
    }
    updateBodyScrollState();

    showToast("Order Confirmed!", `Your order ${newOrder.id} has been placed.`, "success");
    
    // Trigger full screen checkout confetti celebration
    if (confetti) {
      confetti.start(4000, 150);
    }
  };

  // Handle Checkout submission
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('cust-name').value;
      const email = document.getElementById('cust-email').value;
      const phone = document.getElementById('cust-phone').value;
      const address = document.getElementById('cust-address').value;
      const paymentMode = document.querySelector('input[name="payment-mode"]:checked').value;

      // Calculate totals dynamically
      const calculations = calculateCheckoutTotals();
      const orderId = "OD-" + Math.floor(100000 + Math.random() * 900000);

      const newOrder = {
        id: orderId,
        customer: { name, email, phone, address },
        items: [...cart],
        subtotal: calculations.subtotal,
        couponApplied: calculations.couponApplied,
        couponDiscount: calculations.couponDiscount,
        tax: calculations.tax,
        loyaltyPointsRedeemed: calculations.loyaltyPointsRedeemed,
        loyaltyPointsEarned: calculations.loyaltyPointsEarned,
        total: calculations.total,
        paymentMode,
        paymentStatus: paymentMode === "ONLINE" ? "Paid" : "COD Pending",
        status: "Pending",
        courierStatus: "Pending",
        timestamp: new Date().toISOString()
      };

      if (paymentMode === "ONLINE") {
        if (RAZORPAY_KEY_ID === "YOUR_RAZORPAY_TEST_KEY_ID") {
          // If the user hasn't configured their key, show a friendly warning and use the simulated modal as a fallback
          const simOverlay = document.getElementById('razorpay-sim-overlay');
          const simOrderId = document.getElementById('razorpay-sim-order-id');
          const simAmount = document.getElementById('razorpay-sim-amount');
          
          showToast("Demo Mode", "Please configure your Razorpay Key ID at the top of src/main.js to see the real UPI & QR screen. Opening demo simulator.", "warning");
          
          if (simOverlay && simOrderId && simAmount) {
            simOrderId.textContent = newOrder.id;
            simAmount.textContent = `₹${newOrder.total.toLocaleString('en-IN')}`;
            simOverlay.classList.add('active');
            updateBodyScrollState();
            
            // Bind button events
            const successBtn = document.getElementById('razorpay-sim-success-btn');
            const failBtn = document.getElementById('razorpay-sim-fail-btn');
            const cancelBtn = document.getElementById('razorpay-sim-cancel-btn');
            
            const cleanup = () => {
              simOverlay.classList.remove('active');
              updateBodyScrollState();
            };
            
            successBtn.onclick = async () => {
              cleanup();
              newOrder.paymentStatus = "Paid";
              newOrder.transactionId = "pay_mock_" + Math.floor(10000000 + Math.random() * 90000000);
              await saveOrderAndCompleteCheckout(newOrder);
            };
            
            failBtn.onclick = () => {
              cleanup();
              showToast("Payment Failed", "The simulated transaction was rejected by Razorpay.", "warning");
            };
            
            cancelBtn.onclick = () => {
              cleanup();
              showToast("Payment Cancelled", "You cancelled the simulated payment transaction.", "warning");
            };
          } else {
            // Fallback if overlay element is missing
            showToast("Simulation Error", "Mock payment interface not found. Placing order via COD.", "warning");
            newOrder.paymentMode = "COD";
            newOrder.paymentStatus = "COD Pending";
            await saveOrderAndCompleteCheckout(newOrder);
          }
          return;
        }

        // Open the official Razorpay Checkout window
        if (typeof Razorpay === "undefined") {
          showToast("Razorpay SDK not loaded", "Razorpay script failed to load. Placing order via COD.", "warning");
          newOrder.paymentMode = "COD";
          newOrder.paymentStatus = "COD Pending";
          await saveOrderAndCompleteCheckout(newOrder);
          return;
        }

        const options = {
          "key": RAZORPAY_KEY_ID,
          "amount": Math.round(newOrder.total * 100), // amount in paise
          "currency": "INR",
          "name": "Digisoft Gift Shop",
          "description": `Payment for Order ${newOrder.id}`,
          "image": "https://img.icons8.com/color/96/gift.png",
          "handler": async function (response) {
            newOrder.paymentStatus = "Paid";
            newOrder.transactionId = response.razorpay_payment_id;
            await saveOrderAndCompleteCheckout(newOrder);
          },
          "prefill": {
            "name": name,
            "email": email,
            "contact": phone
          },
          "theme": {
            "color": "#C5A059"
          },
          "modal": {
            "ondismiss": function() {
              showToast("Payment Cancelled", "You closed the payment popup.", "warning");
            }
          }
        };

        const rzp = new Razorpay(options);
        rzp.open();
      } else {
        await saveOrderAndCompleteCheckout(newOrder);
      }
    });
  }

  // Bind Order Success Modal buttons
  const successOverlay = document.getElementById('order-success-overlay');
  const closeSuccess = document.getElementById('close-success-modal-btn');
  const continueShopping = document.getElementById('continue-shopping-btn');
  const printSuccessInvoice = document.getElementById('print-success-invoice-btn');

  if (closeSuccess && successOverlay) {
    closeSuccess.addEventListener('click', () => {
      successOverlay.classList.remove('active');
      updateBodyScrollState();
    });
  }
  if (continueShopping && successOverlay) {
    continueShopping.addEventListener('click', () => {
      successOverlay.classList.remove('active');
      updateBodyScrollState();
    });
  }
  if (printSuccessInvoice) {
    printSuccessInvoice.addEventListener('click', () => {
      const printContents = document.getElementById('success-invoice-content').innerHTML;
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Tax Invoice - Digisoft</title>
            <style>
              body { font-family: 'Outfit', 'Segoe UI', sans-serif; color: #2d3748; padding: 40px; line-height: 1.5; background: #fff !important; }
              table { width: 100%; border-collapse: collapse; margin: 25px 0; }
              th { background: #f7fafc; border-bottom: 2px solid #2d3748; padding: 12px; text-align: left; color: #1a202c !important; font-size: 0.8rem; text-transform: uppercase; }
              td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748 !important; font-size: 0.85rem; }
              h3, h4, h5, p, span, b { color: #1a202c !important; }
              .header { border-bottom: 3px solid #1a202c; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
              .title { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.5px; color: #1a202c; }
              .meta-right { text-align: right; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="header">
              <div>
                <div class="title">DIGISOFT GIFT SHOP</div>
                <p style="font-size:0.9rem; margin-top:5px; color:#555;">Omnichannel Commerce Solutions</p>
              </div>
              <div class="meta-right">
                <h3 style="margin:0; font-size:1.3rem;">TAX INVOICE</h3>
              </div>
            </div>
            ${printContents}
          </body>
        </html>
      `);
      printWindow.document.close();
    });
  }
};


// Conversational AI Bot Logic on storefront
const initStoreChatbot = () => {
  const trigger = document.getElementById('chat-trigger');
  const windowEl = document.getElementById('chat-window');
  const closeBtn = document.getElementById('close-chat-widget');
  const sendBtn = document.getElementById('chat-widget-send');
  const inputEl = document.getElementById('chat-widget-input');
  const chatBody = document.getElementById('chat-widget-messages');

  if (!trigger || !windowEl || !closeBtn || !sendBtn || !inputEl || !chatBody) return;

  let chatCheckoutState = null;

  trigger.addEventListener('click', () => {
    windowEl.classList.toggle('active');
  });

  closeBtn.addEventListener('click', () => {
    windowEl.classList.remove('active');
  });

  const appendMsg = (sender, text) => {
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.innerHTML = text.replace(/\n/g, '<br>');
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    return div;
  };

  const getAIResponse = (text) => {
    const typing = appendMsg('typing', 'typing...');
    const normText = text.toLowerCase().trim();

    let reply = "";

    // A. Check if we are waiting for user details to complete chat checkout
    if (chatCheckoutState) {
      const nameMatch = text.match(/name:\s*([^\n]+)/i);
      const emailMatch = text.match(/email:\s*([^\n]+)/i);
      const phoneMatch = text.match(/phone:\s*([^\n]+)/i);
      const addressMatch = text.match(/address:\s*([^\n]+)/i);

      if (nameMatch && emailMatch && phoneMatch && addressMatch) {
        if (cart.length === 0) {
          setTimeout(() => {
            typing.remove();
            appendMsg('bot', "Oops! Your shopping cart is empty. Please select a product first by typing 'buy [product name]'.");
            chatCheckoutState = null;
          }, 1000);
          return;
        }

        const orderId = "OD-" + Math.floor(100000 + Math.random() * 900000);
        let subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        let tax = subtotal * 0.18;
        let total = subtotal + tax;

        const newOrder = {
          id: orderId,
          customer: {
            name: nameMatch[1].trim(),
            email: emailMatch[1].trim(),
            phone: phoneMatch[1].trim(),
            address: addressMatch[1].trim()
          },
          items: [...cart],
          subtotal,
          tax,
          total,
          paymentMode: "COD",
          paymentStatus: "COD Pending",
          status: "Pending",
          courierStatus: "Pending",
          timestamp: new Date().toISOString()
        };

        setTimeout(async () => {
          typing.remove();
          await saveOrderAndCompleteCheckout(newOrder);
          appendMsg('bot', `🎉 **Order Placed Successfully via Chat!**\n\n*Order ID:* **${orderId}**\n*Total:* ₹${total.toLocaleString('en-IN')}\n*Payment:* Cash on Delivery\n\nWe have registered your details in the ERP. A confirmation invoice alert has been sent to your WhatsApp number: **${newOrder.customer.phone}**! 🚚`);
          chatCheckoutState = null;
        }, 1500);
        return;
      } else {
        // Some details missing
        setTimeout(() => {
          typing.remove();
          appendMsg('bot', `I received your input, but I need all delivery details in the exact format to confirm your order. Please reply with:\n\n**Name: [Your Name]**\n**Email: [Your Email]**\n**Phone: [WhatsApp Number]**\n**Address: [Delivery Address]**`);
        }, 1000);
        return;
      }
    }
    
    // 1. Order Tracking
    if (normText.includes("track") || normText.match(/od-\d{6}/)) {
      orders = getOrders();
      // Find order ID matches
      const match = normText.match(/od-\d{6}/);
      if (match) {
        const orderId = match[0].toUpperCase();
        const o = orders.find(ord => ord.id === orderId);
        if (o) {
          reply = `🔍 *Order Found!*
          *ID:* ${o.id}
          *Customer:* ${o.customer.name}
          *Total Amount:* ₹${o.total.toLocaleString('en-IN')}
          *Payment Mode:* ${o.paymentMode} (${o.paymentStatus})
          *Courier Status:* ${o.courierStatus} (Internal Status: ${o.status})
          
          Our ERP is showing your package is currently in the *${o.courierStatus}* stage. 🚚`;
        } else {
          reply = `I couldn't find any order with ID *${orderId}* in our database. Can you please double check your order receipt?`;
        }
      } else {
        reply = `To track your shipment, please provide your Order ID in the format *OD-XXXXXX*. (For example: "Track order OD-726481")`;
      }
    }
    // 2. Conversational Sales - Placing Orders via Chat
    else if (normText.includes("buy") || normText.includes("order") || normText.includes("purchase") || normText.includes("checkout")) {
      products = getProducts();
      let matchedProd = null;
      products.forEach(p => {
        const cleanedQuery = normText.replace(/(buy|order|purchase|checkout|item|product|set|box|journal|rose|glass|teapot|plates)/g, "").trim();
        if (cleanedQuery.length >= 2 && (p.name.toLowerCase().includes(cleanedQuery) || cleanedQuery.includes(p.name.toLowerCase()))) {
          matchedProd = p;
        }
      });

      if (matchedProd) {
        addToCart(matchedProd.id);
        chatCheckoutState = { product: matchedProd };
        reply = `🛍️ I've added **${matchedProd.name}** (₹${matchedProd.price.toLocaleString('en-IN')}) to your shopping cart!\n\nTo place your order immediately via chat, please reply with your details in this format:\n\n**Name: [Your Name]**\n**Email: [Your Email]**\n**Phone: [WhatsApp Number]**\n**Address: [Delivery Address]**`;
      } else if (normText.includes("checkout") || normText.includes("cart") || normText.includes("place")) {
        if (cart.length > 0) {
          chatCheckoutState = { checkoutCart: true };
          const itemsStr = cart.map(item => `• ${item.product.name} (x${item.quantity})`).join('\n');
          reply = `Sure! Let's place your order for the items currently in your cart:\n${itemsStr}\n\nPlease reply with your delivery details in this format to complete the checkout:\n\n**Name: [Your Name]**\n**Email: [Your Email]**\n**Phone: [WhatsApp Number]**\n**Address: [Delivery Address]**`;
        } else {
          reply = `Your cart is currently empty! Tell me what product you would like to buy (e.g. *"buy watch set"* or *"order rose"*).`;
        }
      } else {
        reply = `Which item would you like to buy? We have:\n• *Premium Bone China Set* (₹299)\n• *Golden Eternal Rose* (₹129)\n• *Luxury Watch Set* (₹450)\n• *Customized Leather Journal* (₹59)\n\nType *"buy [item name]"* to order!`;
      }
    }
    // 3. Product stock inquiry
    else if (normText.includes("stock") || normText.includes("price") || normText.includes("available") || normText.includes("cost") || normText.includes("have")) {
      products = getProducts();
      let matchedProd = null;
      products.forEach(p => {
        if (
          normText.includes(p.name.toLowerCase()) || 
          p.name.toLowerCase().includes(normText) ||
          (p.department && normText.includes(p.department.toLowerCase())) ||
          (p.category && normText.includes(p.category.toLowerCase())) ||
          (p.subCategory && normText.includes(p.subCategory.toLowerCase()))
        ) {
          matchedProd = p;
        }
      });

      if (matchedProd) {
        const stockStatus = matchedProd.stock > 0 
          ? `We currently have *${matchedProd.stock} units* available in our ERP inventory.`
          : `We are currently *Out of Stock* for this item.`;

        reply = `📦 *Product Inquiry:*
        *Name:* ${matchedProd.name}
        *Price:* ₹${matchedProd.price.toLocaleString('en-IN')}
        *Hierarchy:* ${matchedProd.department || '-'} > ${matchedProd.category || '-'} > ${matchedProd.subCategory || '-'}
        *Tags:* ${matchedProd.fragile ? 'Fragile' : ''} ${matchedProd.microwave ? 'Microwave-Safe' : ''}
        
        ${stockStatus}
        
        👉 *Want to buy this?* Reply with *"buy ${matchedProd.name}"* or *"order ${matchedProd.name}"* to place your order directly via chat!`;
      } else {
        reply = `We carry a wide range of crockery, customized journals, watches, and hampers. What specific item are you looking for? You can ask about "ceramic plates" or "Bone China Set"!`;
      }
    }
    // 4. Microwave safe
    else if (normText.includes("microwave") || normText.includes("safe") || normText.includes("oven")) {
      reply = `🥣 *Microwave & Dishwasher Safety:*
      
      All our *Premium Bone China Sets* and *Matte Ceramic Plates* are certified 100% Microwave and Oven safe. 
      
      Our luxury watch boxes and eternal gold roses are *NOT* safe for microwave use.`;
    }
    // 5. Hindi
    else if (normText.includes("hindi") || normText.includes("हिंदी") || normText.includes("नमस्ते")) {
      reply = `नमस्ते! 🌸 मैं आपकी सहायता हिंदी में भी कर सकता हूँ। 
      आप मुझसे हमारे उपहारों की कीमत, स्टॉक स्तर, या आपके आर्डर के tracking status के बारे में पूछ सकते हैं।`;
    }
    // 6. Default FAQ
    else {
      reply = `I can help you shop and track orders:
      👉 Ask: *"Track order OD-XXXXXX"*
      👉 Ask: *"Do you have crockery in stock?"*
      👉 Ask: *"Show pricing for watch box"*
      👉 Type: *"buy watch set"* or *"order eternal rose"* to order directly via chat!`;
    }

    setTimeout(() => {
      typing.remove();
      appendMsg('bot', reply);
    }, 1000);
  };

  const submitWidgetChat = () => {
    const text = inputEl.value.trim();
    if (!text) return;

    appendMsg('user', text);
    inputEl.value = '';
    getAIResponse(text);
  };

  sendBtn.addEventListener('click', submitWidgetChat);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitWidgetChat();
  });
};

// Search Logic
const initSearch = () => {
  const searchBtn = document.getElementById('search-btn');
  const closeBtn = document.getElementById('close-search');
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const productSection = document.getElementById('featured');

  searchBtn.addEventListener('click', () => {
    overlay.classList.add('active');
    setTimeout(() => input.focus(), 500);
  });

  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('active');
  });

  input.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.department && p.department.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term)) ||
      (p.subCategory && p.subCategory.toLowerCase().includes(term))
    );
    renderProducts(filtered);
    renderSearchPreviews(filtered, term);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      overlay.classList.remove('active');
      productSection.scrollIntoView({ behavior: 'smooth' });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
    }
  });
};

// Render Search Previews in Overlay
const renderSearchPreviews = (filteredProducts, term) => {
  const previewContainer = document.getElementById('search-results-preview');
  if (!previewContainer) return;

  if (!term) {
    previewContainer.innerHTML = '';
    return;
  }

  if (filteredProducts.length === 0) {
    previewContainer.innerHTML = `
      <div style="grid-column: 1/-1; padding: 20px; color: var(--text-muted);">
        <p>No results found for "${term}"</p>
      </div>
    `;
    return;
  }

  previewContainer.innerHTML = filteredProducts.slice(0, 4).map(product => `
    <div class="preview-item" onclick="document.getElementById('search-input').value = '${product.name}'; document.getElementById('search-input').dispatchEvent(new Event('keydown', {key: 'Enter'})); ">
      <img src="${product.image}" alt="${product.name}">
      <h4>${product.name}</h4>
      <p>₹${product.price.toLocaleString('en-IN')}</p>
    </div>
  `).join('');
};

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (window.scrollY > 50) {
    nav.style.padding = '1rem 5%';
    nav.style.background = 'rgba(10, 10, 10, 0.95)';
  } else {
    nav.style.padding = '1.5rem 5%';
    nav.style.background = 'rgba(10, 10, 10, 0.8)';
  }
});

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

const initHierarchyFilter = () => {
  const deptSelect = document.getElementById('filter-department');
  const catSelect = document.getElementById('filter-category');
  const subSelect = document.getElementById('filter-subcategory');
  const resetBtn = document.getElementById('reset-filters-btn');
  const categoryCards = document.querySelectorAll('.category-card');
  const productSection = document.getElementById('featured');

  if (!deptSelect || !catSelect || !subSelect) return;

  // Populate departments
  deptSelect.innerHTML = '<option value="">All Departments</option>' + 
    Object.keys(erpHierarchy).map(dept => `<option value="${dept}">${dept}</option>`).join('');

  const updateCategoryOptions = () => {
    const dept = deptSelect.value;
    if (!dept) {
      catSelect.innerHTML = '<option value="">All Categories</option>';
      catSelect.disabled = true;
      subSelect.innerHTML = '<option value="">All Sub Categories</option>';
      subSelect.disabled = true;
    } else {
      catSelect.innerHTML = '<option value="">All Categories</option>' + 
        Object.keys(erpHierarchy[dept]).map(cat => `<option value="${cat}">${cat}</option>`).join('');
      catSelect.disabled = false;
      subSelect.innerHTML = '<option value="">All Sub Categories</option>';
      subSelect.disabled = true;
    }
  };

  const updateSubCategoryOptions = () => {
    const dept = deptSelect.value;
    const cat = catSelect.value;
    if (!dept || !cat) {
      subSelect.innerHTML = '<option value="">All Sub Categories</option>';
      subSelect.disabled = true;
    } else {
      subSelect.innerHTML = '<option value="">All Sub Categories</option>' + 
        erpHierarchy[dept][cat].map(sub => `<option value="${sub}">${sub}</option>`).join('');
      subSelect.disabled = false;
    }
  };

  const applyFilters = () => {
    const dept = deptSelect.value;
    const cat = catSelect.value;
    const sub = subSelect.value;

    let filtered = products;

    if (dept) {
      filtered = filtered.filter(p => p.department === dept);
    }
    if (cat) {
      filtered = filtered.filter(p => p.category === cat);
    }
    if (sub) {
      filtered = filtered.filter(p => p.subCategory === sub);
    }

    renderProducts(filtered);

    // Update dynamic breadcrumbs in UI
    const breadcrumbs = document.querySelector('.breadcrumbs-container');
    if (breadcrumbs) {
      let html = `<a href="#home" style="transition: color 0.3s;">Home</a> &nbsp;/&nbsp; <a href="#categories" style="transition: color 0.3s;">Shop</a>`;
      if (dept) {
        html += ` &nbsp;/&nbsp; <span style="font-weight: 500;">${dept}</span>`;
      }
      if (cat) {
        html += ` &nbsp;/&nbsp; <span style="font-weight: 500;">${cat}</span>`;
      }
      if (sub) {
        html += ` &nbsp;/&nbsp; <span style="color: var(--primary); font-weight: 600;">${sub}</span>`;
      } else {
        html += ` &nbsp;/&nbsp; <span style="color: var(--primary); font-weight: 600;">Featured Treasures</span>`;
      }
      breadcrumbs.innerHTML = html;
    }
  };

  deptSelect.addEventListener('change', () => {
    updateCategoryOptions();
    applyFilters();
  });

  catSelect.addEventListener('change', () => {
    updateSubCategoryOptions();
    applyFilters();
  });

  subSelect.addEventListener('change', applyFilters);

  resetBtn?.addEventListener('click', () => {
    deptSelect.value = "";
    updateCategoryOptions();
    applyFilters();
  });

  // Connect visual Category Cards to the hierarchical filter bar
  categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      const categoryTitle = card.querySelector('h3').textContent.trim();
      
      if (categoryTitle.includes("Customized")) {
        deptSelect.value = "Gifting";
        updateCategoryOptions();
        catSelect.value = "Wedding Gifts";
        updateSubCategoryOptions();
        subSelect.value = "Executive Gifts";
      } else if (categoryTitle.includes("Dinner Sets")) {
        deptSelect.value = "Crockery & Dining";
        updateCategoryOptions();
        catSelect.value = "Dinnerware";
        updateSubCategoryOptions();
        subSelect.value = "Dinner Sets";
      } else if (categoryTitle.includes("Serveware")) {
        deptSelect.value = "Crockery & Dining";
        updateCategoryOptions();
        catSelect.value = "Serveware";
        updateSubCategoryOptions();
        subSelect.value = "";
      } else if (categoryTitle.includes("Hampers") || categoryTitle.includes("Combo")) {
        deptSelect.value = "Gifting";
        updateCategoryOptions();
        catSelect.value = "Wedding Gifts";
        updateSubCategoryOptions();
        subSelect.value = "Gift Hampers";
      }

      applyFilters();
      productSection?.scrollIntoView({ behavior: 'smooth' });
    });
  });
};

// Contact Form Submission & Toast Notifications
const initContactForm = () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;

    showToast("Message Sent!", `Thank you, ${name}. We have received your query and will reply to ${email} within 24 hours.`, "success");
    form.reset();
  });
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  updateCartUI();
  updateWishlistUI();
  initSearch();
  initHierarchyFilter();
  initContactForm();
  initStoreUI();
  initStoreChatbot();
  
  // Mobile Hamburger Menu Toggle
  const menuToggle = document.getElementById('menu-toggle-btn');
  const navMenu = document.getElementById('nav-links-menu');
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('active');
      if (navMenu.classList.contains('active')) {
        menuToggle.classList.add('open');
      } else {
        menuToggle.classList.remove('open');
      }
    });

    document.addEventListener('click', () => {
      if (navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        menuToggle.classList.remove('open');
      }
    });
  }
  
  // Smooth scroll for nav links (fixed navigation error on invalid/missing selectors)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      
      // Close mobile menu on click
      if (navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        if (menuToggle) menuToggle.classList.remove('open');
      }
      
      if (href === '#') {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        return;
      }
      
      try {
        const targetElement = document.querySelector(href);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({
            behavior: 'smooth'
          });
        }
      } catch (err) {
        console.warn(`Could not select target element for smooth scrolling: ${href}`, err);
      }
    });
  });
});

