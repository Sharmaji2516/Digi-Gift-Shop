import './style.css'

// Mock Data for API integration
const products = [
  {
    id: 1,
    name: "Golden Eternal Rose",
    price: "$129.00",
    image: "/images/rose.jpg",
    category: "Anniversary"
  },
  {
    id: 2,
    name: "Luxury Watch Set",
    price: "$450.00",
    image: "/images/watch.jpg",
    category: "Premium"
  },
  {
    id: 3,
    name: "Customized Leather Journal",
    price: "$59.00",
    image: "/images/journal.jpg",
    category: "Customized"
  },
  {
    id: 4,
    name: "Artisan Chocolate Box",
    price: "$85.00",
    image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?q=80&w=1935&auto=format&fit=crop",
    category: "Gourmet"
  },
  {
    id: 5,
    name: "Diamond Stud Earrings",
    price: "$899.00",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1974&auto=format&fit=crop",
    category: "Luxury"
  },
  {
    id: 6,
    name: "Crystal Scented Candle",
    price: "$45.00",
    image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?q=80&w=1974&auto=format&fit=crop",
    category: "Home"
  }
];

// Render Products
const renderProducts = (filteredProducts = products) => {
  const container = document.getElementById('product-container');
  if (!container) return;

  if (filteredProducts.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-muted);">
        <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 20px;"></i>
        <h3>No treasures found matching your search.</h3>
        <p>Try searching for categories like "Premium", "Anniversary", or "Customized".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredProducts.map(product => `
    <div class="product-card" style="animation: fadeInUp 0.5s ease forwards">
      <div class="product-img">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="product-info">
        <p style="color: var(--primary); font-size: 0.8rem; text-transform: uppercase;">${product.category}</p>
        <h3>${product.name}</h3>
        <p class="product-price">${product.price}</p>
        <div class="add-btn">
          <i class="fa-solid fa-plus"></i>
        </div>
      </div>
    </div>
  `).join('');
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
      p.category.toLowerCase().includes(term)
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

  // Close on Escape key
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
      <p>${product.price}</p>
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  initSearch();
  
  // Smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });
});
