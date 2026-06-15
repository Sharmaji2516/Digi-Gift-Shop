// JavaScript Operations for Digisoft WhatsApp Simulator
import { db } from './firebase.js';
import { 
  collection, 
  onSnapshot 
} from 'firebase/firestore';

let orders = [];
const getOrders = () => orders;

document.addEventListener('DOMContentLoaded', () => {
  initWhatsAppSim();
});

const initWhatsAppSim = () => {
  const chatArea = document.getElementById('sim-chat-area');
  const inputEl = document.getElementById('sim-input');
  const sendBtn = document.getElementById('sim-send-btn');
  const timeEl = document.getElementById('mock-time');
  const clearBtn = document.getElementById('clear-chats-btn');

  // Set mock time on phone status bar
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false });
  }

  if (!chatArea || !inputEl || !sendBtn) return;

  // Append WhatsApp Chat Message bubble
  const appendMsg = (sender, text, hasPdf = false, pdfName = "", pdfSize = "", orderId = "") => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${sender}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

    let pdfHtml = "";
    if (hasPdf) {
      pdfHtml = `
        <div class="pdf-doc-attachment" id="pdf-doc-${orderId}" title="Download GST Invoice PDF" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.06); border-radius: 8px; padding: 10px; margin-top: 8px; cursor: pointer; border: 1px solid var(--glass-border);">
          <div class="doc-info" style="display: flex; align-items: center; gap: 10px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff4a4a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <div class="doc-name">
              <h5 style="margin: 0; font-size: 0.85rem; color: white;">${pdfName}</h5>
              <span style="font-size: 0.7rem; color: var(--text-muted);">${pdfSize} • PDF Document</span>
            </div>
          </div>
          <div class="doc-download-btn" style="color: var(--primary); display: flex; align-items: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="8 12 12 16 16 12"></polyline>
              <line x1="12" y1="8" x2="12" y2="16"></line>
            </svg>
          </div>
        </div>
      `;
    }

    msgDiv.innerHTML = `
      <div class="msg-content">${text.replace(/\n/g, '<br>')}</div>
      ${pdfHtml}
      <div style="text-align:right; font-size:0.6rem; color:rgba(255,255,255,0.4); margin-top:4px; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
        ${timeStr} 
        ${sender === 'sent' ? `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00aaff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block;">
            <polyline points="17 6 9 17 4 12"></polyline>
            <polyline points="22 6 14 17 9 12"></polyline>
          </svg>
        ` : ''}
      </div>
    `;

    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    // PDF attachment click simulation
    if (hasPdf) {
      document.getElementById(`pdf-doc-${orderId}`)?.addEventListener('click', () => {
        alert(`Simulating Invoice download for ${pdfName}.\nOpening print format...`);
        // Force-trigger invoice printer if ERP window exists locally
        let erpWin = window.open(`/admin.html`, '_blank');
        setTimeout(() => {
          if (erpWin && !erpWin.closed) {
            alert("Admin Dashboard opened. Go to 'Orders Queue' and click 'Invoice' to view and print the TAX receipt.");
          }
        }, 1500);
      });
    }

    return msgDiv;
  };

  const pageLoadTime = new Date();
  const orderStatusCache = {};

  // Event trigger listener loops via real-time Firestore database subscription
  onSnapshot(collection(db, 'orders'), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const o = change.doc.data();

      if (change.type === "added") {
        if (new Date(o.timestamp) > pageLoadTime) {
          // Render order confirmation WhatsApp notification
          const itemsList = o.items.map(item => `• ${item.product.name} (x${item.quantity}) [${item.product.department || item.product.category || 'Gifts'}]`).join('\n');
          const text = `*Order Confirmed!* 🎉
          
Namaste *${o.customer.name}*, we have received your order *${o.id}*.

🛍️ *Order Items:*
${itemsList}

💰 *Subtotal:* ₹${o.subtotal.toLocaleString('en-IN')}
🧾 *GST (18%):* ₹${o.tax.toLocaleString('en-IN')}
⭐ *Total Amount:* ₹${o.total.toLocaleString('en-IN')}
💳 *Payment Mode:* ${o.paymentMode} (${o.paymentStatus})

We have registered your details in our ERP database under State GST codes. We are currently bubble-wrapping your fragile treasures! 📦`;
          
          appendMsg('received', text);
          highlightGuide('guide-checkout');
        }
      }

      if (change.type === "modified") {
        const prevStatus = orderStatusCache[o.id];
        if (prevStatus && prevStatus !== o.status) {
          let msg = "";
          let hasPdf = false;
          let pdfName = "";
          let pdfSize = "";

          if (o.status === "Packed") {
            msg = `Hi *${o.customer.name}*! 📦
            
Your order *${o.id}* has been successfully packed by our warehouse team. 

Our logistics checklist verified all items, attached fragile protection labels, and scanned barcodes into the master registry database. Ready for dispatch! 🚚`;
          } 
          else if (o.status === "Shipped") {
            msg = `Good news! 🚚 Your order *${o.id}* has been dispatched.
            
*Courier Partner:* BlueDart Express
*Tracking Airway Bill:* AWB-BD-${o.id.substring(3)}
*Tracking URL:* [track.bluedart.com/query?id=${o.id}](http://localhost:5173/proposal.html)

Download your official TAX invoice PDF details attached below. 🧾`;
            hasPdf = true;
            pdfName = `TAX_INVOICE_${o.id}.pdf`;
            pdfSize = `${(120 + Math.random()*40).toFixed(1)} KB`;
          } 
          else if (o.status === "Delivered") {
            msg = `Delivered! 🎉
            
Hi *${o.customer.name}*, our logistics team confirmed package *${o.id}* has been successfully delivered to your address:
📍 _${o.customer.address}_

Thank you for shopping with *Digisoft Gift Shop*. Please let us know if you would like to order again! 🌸`;
          }

          if (msg) {
            appendMsg('received', msg, hasPdf, pdfName, pdfSize, o.id);
            highlightGuide('guide-erp');
          }
        }
      }

      // Cache the status for comparison
      orderStatusCache[o.id] = o.status;
    });

    orders = snapshot.docs.map(doc => doc.data());
    orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  });

  // 3. Abandoned Cart Nudge Simulator
  const checkAbandonedCart = () => {
    const hasEntered = sessionStorage.getItem('digisoft_checkout_entered');
    const abandonedCart = sessionStorage.getItem('digisoft_abandoned_cart');
    
    if (hasEntered === 'true' && abandonedCart) {
      // Simulate user closing checkout after 15 seconds
      setTimeout(() => {
        // Verify cart is still abandoned (orders list hasn't been submitted with latest items)
        const currentCart = sessionStorage.getItem('digisoft_abandoned_cart');
        if (currentCart) {
          const cartData = JSON.parse(currentCart);
          const firstItem = cartData[0]?.product.name || "premium gifts";
          
          const text = `Hi! 🛒 We noticed you left some premium items in your shopping cart, including *${firstItem}*.
          
Don't miss out! Use exclusive code *DIGI10* at checkout to get an extra *10% OFF* your entire order.

Click here to resume your checkout instantly:
👉 [Resume Checkout - Digisoft Gift Shop](http://localhost:5173/)`;
          
          appendMsg('received', text);
          highlightGuide('guide-abandoned');
          
          sessionStorage.removeItem('digisoft_abandoned_cart');
          sessionStorage.removeItem('digisoft_checkout_entered');
        }
      }, 15000);
    }
  };
  checkAbandonedCart();

  // Highlight active guide items
  const highlightGuide = (id) => {
    document.querySelectorAll('.trigger-guide-list li').forEach(li => li.classList.remove('highlight'));
    document.getElementById(id)?.classList.add('highlight');
  };

  // Reset Chat button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      chatArea.innerHTML = `
        <div class="date-header">TODAY</div>
        <div class="info-nudge">
          🔒 Messages are end-to-end encrypted. No one outside this chat can read them.
        </div>
        <div class="msg received">
          Namaste! Thank you for contacting *Digisoft Gift Shop*. 🙏
          
          We are here to assist you. You will receive updates about your order invoices, packaging checklist validations, and courier tracking details directly in this thread. 🌸
        </div>
      `;
      document.querySelectorAll('.trigger-guide-list li').forEach(li => li.classList.remove('highlight'));
      showToast("Logs Cleared", "WhatsApp simulation chat history was reset.");
    });
  };

  // WhatsApp Auto AI Response simulator
  const handleAutoReply = (text) => {
    const normText = text.toLowerCase().trim();
    let reply = "";

    if (normText.includes("track") || normText.includes("order")) {
      const orders = getOrders();
      const match = normText.match(/od-\d{6}/);
      if (match) {
        const orderId = match[0].toUpperCase();
        const o = orders.find(ord => ord.id === orderId);
        if (o) {
          reply = `🔍 *WhatsApp ERP Search:*
          
*Order ID:* ${o.id}
*Amount:* ₹${o.total.toLocaleString('en-IN')}
*Status:* ${o.status}
*Courier Status:* ${o.courierStatus} (BlueDart)

Our central database shows your shipment is *${o.courierStatus}*. 🚚`;
        } else {
          reply = `I couldn't find order *${orderId}* in our database. Can you please verify the number?`;
        }
      } else {
        reply = `To track your shipment, please type your Order ID (e.g. *"Track OD-372864"*).`;
      }
    }
    else if (normText.includes("pricing") || normText.includes("price") || normText.includes("rose") || normText.includes("watch")) {
      reply = `You can browse pricing and stock levels directly on our storefront:
      👉 [Browse Crockery & Gifts - Store](http://localhost:5173/)
      
      We currently have Golden Eternal Rose (₹129.00) and Luxury Watch Box Sets (₹450.00) in stock.`;
    }
    else {
      reply = `Thank you for messaging. This simulated WhatsApp Business API channel automates customer support:
      👉 Type: *"Track order OD-XXXXXX"*
      👉 Check out in the store to trigger order alerts.`;
    }

    setTimeout(() => {
      appendMsg('received', reply);
    }, 1200);
  };

  // Send message triggers
  const submitSimChat = () => {
    const text = inputEl.value.trim();
    if (!text) return;

    appendMsg('sent', text);
    inputEl.value = '';
    handleAutoReply(text);
  };

  sendBtn.addEventListener('click', submitSimChat);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitSimChat();
  });
};
