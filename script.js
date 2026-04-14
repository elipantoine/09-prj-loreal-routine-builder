/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutine = document.getElementById("generateRoutine");

/* Array to store conversation messages */
let messages = [];

/* Array to store product data */
let products = [];

/* Array to store selected products */
let selectedProducts = [];

/* Load product data and initialize chat */
(async function initializeApp() {
  products = await loadProducts();

  /* Initialize messages with system prompt and initial assistant message */
  messages = [
    {
      role: "system",
      content: `You are a skincare advisor for L'Oréal products. Guide the user through a short conversation by asking 2-3 questions about their skin type and main concerns. Then, recommend the best care routine based on their answers, using only products from the available list. Respond in a friendly, natural, conversational tone. Use line breaks, bullet points, and indentations to make recommendations clear and easy to read. When recommending products, use their exact name and brand. Keep responses helpful and concise.`
    },
    {
      role: "assistant",
      content: "Hi! Let's find the perfect skincare routine for you. What's your skin type? (normal, dry, oily, sensitive, or acne-prone)"
    }
  ];

  /* Render the initial chat */
  renderChat();
})();

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card">
      <input type="checkbox" data-id="${product.id}" onchange="toggleProductSelection(${product.id})">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");
}

/* Toggle product selection */
function toggleProductSelection(id) {
  const product = products.find(p => p.id === id);
  const index = selectedProducts.findIndex(p => p.id === id);
  if (index > -1) {
    selectedProducts.splice(index, 1);
  } else {
    selectedProducts.push(product);
  }
  displaySelectedProducts();
}

/* Display selected products */
function displaySelectedProducts() {
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
    <div class="selected-product">
      <h4>${product.name}</h4>
      <p>${product.brand}</p>
    </div>
  `
    )
    .join("");
}

/* Render the chat messages in the chat window */
function renderChat() {
  chatWindow.innerHTML = messages
    .filter(message => message.role !== 'system')
    .map(
      (message) => `
    <div class="message ${message.role}">
      ${message.role === 'assistant' ? formatProductMentions(message.content) : message.content}
    </div>
  `
    )
    .join("");
}

/* Format product mentions in assistant messages with images and descriptions */
function formatProductMentions(text) {
  let formatted = text;
  products.forEach(product => {
    const fullName = `${product.brand} ${product.name}`;
    if (formatted.includes(fullName)) {
      const cardHTML = `
        <div class="product-card">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h4>${product.name}</h4>
            <p>${product.brand}</p>
            <p>${product.description}</p>
          </div>
        </div>
      `;
      formatted = formatted.replace(new RegExp(fullName, 'g'), cardHTML);
    }
  });
  return formatted;
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const allProducts = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Generate routine based on selected products */
generateRoutine.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    alert("Please select some products first.");
    return;
  }

  const prompt = `Create a skincare routine using these selected products: ${selectedProducts.map(p => `${p.brand} ${p.name}`).join(', ')}. Suggest the order of application and how to use them for the best results.`;

  messages.push({ role: "user", content: prompt });
  renderChat();

  try {
    /* Send the conversation to OpenAI API */
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.7,
      }),
    });

    /* Parse the response */
    const data = await response.json();

    /* Check for errors */
    if (!response.ok) {
      throw new Error(`API Error: ${data.error.message}`);
    }

    /* Get the AI's response */
    const aiResponse = data.choices[0].message.content;

    /* Add AI response to conversation */
    messages.push({ role: "assistant", content: aiResponse });

    /* Render the updated chat */
    renderChat();
  } catch (error) {
    console.error("Error communicating with OpenAI:", error);
    /* Display error message in chat */
    messages.push({ role: "assistant", content: "Sorry, there was an error generating the routine. Please try again." });
    renderChat();
  }
});

/* Chat form submission handler - sends message to OpenAI API */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  /* Get the user's input */
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  /* Add user message to conversation */
  messages.push({ role: "user", content: userMessage });

  /* Clear the input field */
  userInput.value = "";

  /* Render the updated chat */
  renderChat();

  try {
    /* Send the conversation to OpenAI API */
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.7,
      }),
    });

    /* Parse the response */
    const data = await response.json();

    /* Check for errors */
    if (!response.ok) {
      throw new Error(`API Error: ${data.error.message}`);
    }

    /* Get the AI's response */
    const aiResponse = data?.choices?.[0]?.message.content;

    /* Add AI response to conversation */
    messages.push({ role: "assistant", content: aiResponse });

    /* Render the updated chat */
    renderChat();
  } catch (error) {
    console.error("Error communicating with OpenAI:", error);
    /* Display error message in chat */
    messages.push({ role: "assistant", content: "Sorry, there was an error. Please try again." });
    renderChat();
  }
});
