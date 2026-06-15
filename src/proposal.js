// JavaScript for Digisoft Proposal Landing Page

document.addEventListener('DOMContentLoaded', () => {
  initChatBot();
  initJourneyStepper();
  initChecklistTabs();
  initTimelineTabs();
});

// 1. WhatsApp & AI Bot Simulator Logic
const initChatBot = () => {
  const chatArea = document.getElementById('chat-area');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-chat-btn');
  const promptChips = document.querySelectorAll('.chip-btn');

  if (!chatArea || !chatInput || !sendBtn) return;

  // Bot response database matching use cases
  const botReplies = {
    "suggest a dinner set for 6 people under ₹5,000": 
      `Sure! I recommend our *Royal Gold Bone China Dinner Set (24-piece)*. 
      
      💰 *Price:* ₹4,599 (Originally ₹5,499)
      📦 *Contents:* 6 Dinner Plates, 6 Side Plates, 6 Veg Bowls, and 6 Soup Spoons.
      ✨ *Features:* Luxury gold border finish, lightweight, and durable.
      
      Would you like me to send a direct WhatsApp check-out link for this? 🛒`,

    "show gift ideas for housewarming": 
      `Here are our top 3 premium housewarming gifts:
      
      1. *Artisan Ceramic Teapot Set* (₹1,850) - Classic design with 4 matching cups.
      2. *Crystal Scented Candle Combo* (₹1,200) - Luxury Lavender & Amber jars.
      3. *Premium Glassware Set* (₹2,499) - 6 crystal wine glasses.
      
      I can customize any of these with a gold-embossed greeting tag! 🎁`,

    "do you have microwave-safe bowls?": 
      `Yes, absolutely! 🥣
      
      All our *Artisan Ceramic Bowls* and *Bone China Plates* are certified 100% microwave and dishwasher safe. 
      
      In our central ERP system, these are tag-marked as "Microwave-Safe" so you can buy with confidence!`,

    "can i order bulk return gifts for a wedding?": 
      `Congratulations! 🌸 Yes, we specialize in bulk orders for weddings and corporate events.
      
      We offer:
      ✅ Customized gift hampers (combos)
      ✅ Custom logo or name engraving
      ✅ Special volume discounts (up to 35% off)
      ✅ Fragile packaging tag protection
      
      I have recorded your request as a priority lead. Would you like me to arrange a callback from our bulk sales manager? 📞`,

    "क्या यह हिंदी में बात कर सकता है?": 
      `जी हाँ! मैं आपसे हिंदी में भी बात कर सकता हूँ। 🌸 
      
      मैं आपकी सहायता डिनर सेट, कस्टमाइज्ड गिफ्ट्स और बल्क आर्डर्स ढूँढने में कर सकता हूँ। 
      
      क्या आप आज कोई खास उपहार देखना पसंद करेंगे?`
  };

  // Append a message to the chat container
  const appendMessage = (sender, text) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${sender}`;
    msgDiv.innerHTML = text.replace(/\n/g, '<br>');
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
    return msgDiv;
  };

  // Bot response simulation with typing delay
  const handleBotResponse = (userText) => {
    // Show typing indicator
    const typingIndicator = appendMessage('typing', 'Digisoft AI is typing...');
    
    // Find matching answer or return default
    const normalizedText = userText.toLowerCase().trim().replace(/[?.,]/g, '');
    let reply = "I didn't quite catch that. You can test one of the prompt chips on the left, or ask me about 'dinner sets', 'microwave safe', or 'bulk orders'! 😊";
    
    // Check match
    for (const key in botReplies) {
      if (normalizedText.includes(key.toLowerCase().trim().replace(/[?.,]/g, '')) || key.toLowerCase().includes(normalizedText)) {
        reply = botReplies[key];
        break;
      }
    }

    setTimeout(() => {
      // Remove typing indicator
      typingIndicator.remove();
      // Add bot reply
      appendMessage('bot', reply);
    }, 1200);
  };

  // Submit user chat message
  const submitMessage = () => {
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage('user', text);
    chatInput.value = '';
    handleBotResponse(text);
  };

  // Event Listeners
  sendBtn.addEventListener('click', submitMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      submitMessage();
    }
  });

  // Prompt chips click listener
  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.getAttribute('data-query');
      appendMessage('user', query);
      handleBotResponse(query);
    });
  });
};

// 2. Journey Stepper Logic
const initJourneyStepper = () => {
  const steps = document.querySelectorAll('.journey-step');
  const detailsBox = document.getElementById('journey-details');
  if (steps.length === 0 || !detailsBox) return;

  const stepDetails = {
    "1": "<b>Step 1 - Discovery:</b> Customer lands on your e-commerce storefront looking for crockery or clicks a targeted Instagram/Facebook ad that triggers a Click-to-WhatsApp session.",
    "2": "<b>Step 2 - AI Nudge:</b> The AI bot starts an instant conversational sequence on WhatsApp, helping the user filter products by size, price, or occasion, qualifications, and answers FAQs instantly.",
    "3": "<b>Step 3 - Checkout:</b> The customer adds a 24-piece dinner set to their shopping cart and completes the payment directly inside WhatsApp using integrated payment links or selects Cash on Delivery (COD).",
    "4": "<b>Step 4 - ERP Log:</b> The order is instantly piped into your warehouse ERP database. Stock levels adjust in real-time on the website to prevent over-selling, and a GST-compliant invoice is raised.",
    "5": "<b>Step 5 - Delivery & Dispatch:</b> The courier integration schedules a pickup, prints the fragile-tagged shipping labels, and the system automatically sends the tracking link and PDF invoice directly to the customer's WhatsApp chat."
  };

  steps.forEach(step => {
    step.addEventListener('click', () => {
      // Remove active from all
      steps.forEach(s => s.classList.remove('active'));
      // Add active to current
      step.classList.add('active');
      
      const stepNum = step.getAttribute('data-step');
      detailsBox.innerHTML = stepDetails[stepNum] || "";
    });
  });
};

// 3. Checklist Tabs Toggle
const initChecklistTabs = () => {
  const tabErp = document.getElementById('tab-erp-btn');
  const tabBot = document.getElementById('tab-bot-btn');
  const contentErp = document.getElementById('content-erp');
  const contentBot = document.getElementById('content-bot');

  if (!tabErp || !tabBot || !contentErp || !contentBot) return;

  tabErp.addEventListener('click', () => {
    tabErp.classList.add('active');
    tabBot.classList.remove('active');
    contentErp.classList.add('active');
    contentBot.classList.remove('active');
  });

  tabBot.addEventListener('click', () => {
    tabBot.classList.add('active');
    tabErp.classList.remove('active');
    contentBot.classList.add('active');
    contentErp.classList.remove('active');
  });
};

// 4. Timeline Phase Tabs Toggle
const initTimelineTabs = () => {
  const tabs = document.querySelectorAll('.phase-tab-btn');
  const contents = document.querySelectorAll('.phase-content');
  if (tabs.length === 0 || contents.length === 0) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      // Remove active from all content panels
      contents.forEach(c => c.classList.remove('active'));

      // Add active to selected tab
      tab.classList.add('active');
      // Show corresponding content
      const phaseNum = tab.getAttribute('data-phase');
      const targetContent = document.getElementById(`phase-${phaseNum}-content`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
};
