
(function () {
  const RECENT_DAYS = 4;
  const NZ_CPI_MULTIPLIER = 1.035;
  const NZ_CPI_LABEL = "Stats NZ CPI, December 2025 quarter";
  const RECIPE_SCAN_SKIP_WORDS = ["ingredients", "method", "directions", "instructions", "prep", "cook", "serves", "nutrition", "notes", "tip", "tips", "for the", "to serve", "heat", "oven", "bake", "fry", "stir", "mix", "minutes", "minute", "hours", "hour", "temperature"];
  const RECIPE_SCAN_UNITS = ["g", "kg", "ml", "l", "cup", "cups", "tbsp", "tsp", "teaspoon", "teaspoons", "tablespoon", "tablespoons", "clove", "cloves", "can", "cans", "tin", "tins", "packet", "packets", "bunch", "bunches", "slice", "slices", "pinch", "pinches", "sprig", "sprigs", "handful", "handfuls", "dash", "dashes"];

  const state = {
    client: null,
    session: null,
    profile: null,
    household: null,
    members: [],
    items: [],
    notifications: [],
    view: "active",
    listMode: "groups",
    channels: [],
    recipeScan: {
      items: [],
      mealName: "",
      imageName: "",
      rawText: ""
    },
    tempLists: []
  };

  const categoryMatcher = window.ShoppingCategoryMatcher || {
    CATEGORY_ORDER: ["Other"],
    categorizeItem: () => "Other"
  };
  const CATEGORY_BASE_PRICES = {
    "Fruit": 3.9,
    "Vegetables": 4.2,
    "Meat": 11.8,
    "Seafood": 12.9,
    "Deli & Chilled": 7.4,
    "Dairy & Eggs": 5.8,
    "Bakery": 4.7,
    "Sauces & Condiments": 5.4,
    "Herbs, Spices & Seasoning": 3.8,
    "Pasta, Rice & Grains": 3.6,
    "Pantry": 4.6,
    "Frozen": 6.4,
    "Drinks": 4.9,
    "Snacks & Treats": 4.4,
    "Household": 7.9,
    "Health & Body": 7.2,
    "Baby": 13.5,
    "Pets": 10.8,
    "Other": 5.5
  };

  const EXACT_PRICE_ESTIMATES = {
    "milk": 4.2,
    "bread": 3.8,
    "eggs": 8.2,
    "bananas": 3.6,
    "coffee": 8.8,
    "chicken breast": 12.9,
    "beef mince": 11.5,
    "cheese": 8.5,
    "butter": 6.7,
    "yoghurt": 5.4,
    "rice": 3.5,
    "pasta": 2.6,
    "sriracha": 6.2,
    "tomato sauce": 3.7,
    "olive oil": 10.9,
    "apples": 4.5,
    "potatoes": 5.6,
    "kumara": 5.2,
    "onions": 3.3,
    "toilet paper": 9.9,
    "dishwashing liquid": 4.8,
    "cat food": 6.9,
    "dog food": 8.9,
    "feijoa": 4.4,
    "feijoas": 4.4
  };

  const KEYWORD_PRICE_ESTIMATES = [
    ["chicken", 11.9],
    ["beef", 12.4],
    ["lamb", 14.8],
    ["pork", 11.7],
    ["fish", 11.2],
    ["salmon", 14.5],
    ["berries", 5.6],
    ["apple", 4.2],
    ["banana", 3.6],
    ["orange", 4.1],
    ["lettuce", 3.9],
    ["broccoli", 3.8],
    ["tomato", 4.3],
    ["capsicum", 4.6],
    ["cheese", 8.5],
    ["milk", 4.2],
    ["egg", 8.2],
    ["bread", 3.8],
    ["wrap", 4.4],
    ["bagel", 5.1],
    ["sauce", 4.8],
    ["oil", 9.4],
    ["rice", 3.5],
    ["pasta", 2.6],
    ["coffee", 8.8],
    ["tea", 4.7],
    ["juice", 4.5],
    ["chips", 3.4],
    ["chocolate", 4.2],
    ["detergent", 8.5],
    ["toilet paper", 9.9],
    ["shampoo", 7.4],
    ["nappy", 16.2],
    ["formula", 24.0],
    ["cat", 6.9],
    ["dog", 8.9]
  ];

  const appConfig = window.SHOPPING_CLOUD_CONFIG || {};

  const elements = {
    householdSummary: document.getElementById("householdSummary"),
    householdPanel: document.getElementById("householdPanel"),
    listPanel: document.getElementById("listPanel"),
    sidebarPanel: document.getElementById("sidebarPanel"),
    householdMessage: document.getElementById("householdMessage"),
    createHouseholdForm: document.getElementById("createHouseholdForm"),
    joinHouseholdForm: document.getElementById("joinHouseholdForm"),
    signOutButton: document.getElementById("signOutButton"),
    composerCard: document.getElementById("composerCard"),
    addEntryForm: document.getElementById("addEntryForm"),
    toggleAddPanelButton: document.getElementById("toggleAddPanelButton"),
    scanRecipeButton: document.getElementById("scanRecipeButton"),
    mobileComposerButton: document.getElementById("mobileComposerButton"),
    composerBackdrop: document.getElementById("composerBackdrop"),
    toggleWoolworthsExportButton: document.getElementById("toggleWoolworthsExportButton"),
    woolworthsExportPanel: document.getElementById("woolworthsExportPanel"),
    woolworthsExportList: document.getElementById("woolworthsExportList"),
    woolworthsPriceStatus: document.getElementById("woolworthsPriceStatus"),
    estimatePill: document.getElementById("estimatePill"),
    isMealGroup: document.getElementById("isMealGroup"),
    mealFields: document.getElementById("mealFields"),
    recipeImageInput: document.getElementById("recipeImageInput"),
    takeRecipePhotoButton: document.getElementById("takeRecipePhotoButton"),
    chooseRecipeImageButton: document.getElementById("chooseRecipeImageButton"),
    recipeScanStatus: document.getElementById("recipeScanStatus"),
    recipeScanResults: document.getElementById("recipeScanResults"),
    recipeScanList: document.getElementById("recipeScanList"),
    scannedMealName: document.getElementById("scannedMealName"),
    addScannedRecipeButton: document.getElementById("addScannedRecipeButton"),
    clearRecipeScanButton: document.getElementById("clearRecipeScanButton"),
    shoppingList: document.getElementById("shoppingList"),
    emptyState: document.getElementById("emptyState"),
    emptyMessage: document.getElementById("emptyMessage"),
    toggleRecentButton: document.getElementById("toggleRecentButton"),
    recentPanel: document.getElementById("recentPanel"),
    recentShoppingList: document.getElementById("recentShoppingList"),
    recentEmptyState: document.getElementById("recentEmptyState"),
    recentEmptyMessage: document.getElementById("recentEmptyMessage"),
    tempListForm: document.getElementById("tempListForm"),
    tempListTitle: document.getElementById("tempListTitle"),
    tempListsBoard: document.getElementById("tempListsBoard"),
    tempListsEmptyState: document.getElementById("tempListsEmptyState"),
    groupViewButton: document.getElementById("groupViewButton"),
    categoryViewButton: document.getElementById("categoryViewButton"),
    memberPill: document.getElementById("memberPill"),
    urgentPill: document.getElementById("urgentPill"),
    householdNameHeading: document.getElementById("householdNameHeading"),
    inviteCodeMessage: document.getElementById("inviteCodeMessage"),
    inviteCodeValue: document.getElementById("inviteCodeValue"),
    copyInviteButton: document.getElementById("copyInviteButton"),
    toggleInviteButton: document.getElementById("toggleInviteButton"),
    invitePanel: document.getElementById("invitePanel"),
    membersList: document.getElementById("membersList"),
    activityList: document.getElementById("activityList"),
    toastStack: document.getElementById("toastStack"),
    notepadHint: document.getElementById("notepadHint")
  };

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const safeBase64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(safeBase64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  async function getServiceWorkerRegistration() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers are not supported on this device.");
    }

    const registration = await navigator.serviceWorker.register("shopping-sw.js");
    await navigator.serviceWorker.ready;
    return registration;
  }

  function createInviteCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function recentCutoff() {
    return Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  }

  function isRecentPurchase(item) {
    return Boolean(item.purchased_at) && new Date(item.purchased_at).getTime() >= recentCutoff();
  }

  function getDisplayNameForUser(userId) {
    const member = state.members.find((entry) => entry.user_id === userId);
    return member?.display_name || "Someone";
  }

  function getCategoryForItem(item) {
    return categoryMatcher.categorizeItem(item.name);
  }

  function sortItems(items, viewMode = "active") {
    return [...items].sort((a, b) => {
      if (a.is_urgent !== b.is_urgent) {
        return a.is_urgent ? -1 : 1;
      }

      const aTime = viewMode === "recent" && a.purchased_at ? new Date(a.purchased_at).getTime() : new Date(a.created_at).getTime();
      const bTime = viewMode === "recent" && b.purchased_at ? new Date(b.purchased_at).getTime() : new Date(b.created_at).getTime();
      return bTime - aTime;
    });
  }

  function getActiveItems() {
    return state.items.filter((item) => !item.is_purchased);
  }

  function getRecentItems() {
    return state.items.filter((item) => item.is_purchased && isRecentPurchase(item));
  }
  function formatCurrency(value) {
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD"
    }).format(value);
  }

  function normalizeEstimateName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }


  function getBaseEstimate(item) {
    const normalized = normalizeEstimateName(item.name);
    if (EXACT_PRICE_ESTIMATES[normalized]) {
      return EXACT_PRICE_ESTIMATES[normalized];
    }

    const keywordMatch = KEYWORD_PRICE_ESTIMATES.find(([keyword]) => normalized.includes(keyword));
    if (keywordMatch) {
      return keywordMatch[1];
    }

    return CATEGORY_BASE_PRICES[getCategoryForItem(item)] || CATEGORY_BASE_PRICES.Other;
  }

  function getQuantityMultiplier(item) {
    const source = `${item.name} ${item.note || ""}`.toLowerCase();
    let multiplier = 1;

    if (/2\s?l|2 litre|2 liter/.test(source)) {
      multiplier *= 1.35;
    } else if (/1\.5\s?l|1\.5 litre|1\.5 liter/.test(source)) {
      multiplier *= 1.2;
    } else if (/1\s?kg|1000g/.test(source)) {
      multiplier *= 1.45;
    } else if (/750g/.test(source)) {
      multiplier *= 1.2;
    } else if (/500g/.test(source)) {
      multiplier *= 1.05;
    } else if (/250g/.test(source)) {
      multiplier *= 0.78;
    }

    if (/dozen|12 pack|12pk/.test(source)) {
      multiplier *= 1.25;
    } else if (/6 pack|6pk/.test(source)) {
      multiplier *= 0.85;
    }

    if (/family pack|value pack|bulk/.test(source)) {
      multiplier *= 1.35;
    }

    if (/small|mini/.test(source)) {
      multiplier *= 0.9;
    }

    if (/large|extra large|xl/.test(source)) {
      multiplier *= 1.2;
    }

    if (/organic|free range|premium|artisan/.test(source)) {
      multiplier *= 1.18;
    }

    return multiplier;
  }

  function estimateItemPrice(item) {
    const baseEstimate = getBaseEstimate(item);
    const adjusted = baseEstimate * getQuantityMultiplier(item) * NZ_CPI_MULTIPLIER;
    return Math.max(1, Number(adjusted.toFixed(2)));
  }

  function getVisibleEstimateTotal() {
    return sortItems(getActiveItems()).reduce((sum, item) => sum + estimateItemPrice(item), 0);
  }

  function updateWoolworthsPriceStatus() {
    if (!elements.woolworthsPriceStatus) {
      return;
    }

    const visibleItems = sortItems(getActiveItems());
    const totalEstimate = getVisibleEstimateTotal();
    elements.woolworthsPriceStatus.textContent = `${visibleItems.length} visible items. Estimated total ${formatCurrency(totalEstimate)} using ${NZ_CPI_LABEL} as the inflation baseline.`;
  }

  function showMessage(text, isError) {
    elements.householdMessage.textContent = text;
    elements.householdMessage.style.color = isError ? "#b14f41" : "#3f7751";
  }

  function showToast(text) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = text;
    elements.toastStack.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 4200);
  }

  function updateInvitePanel() {
    const isOpen = !elements.invitePanel.classList.contains("hidden");
    elements.toggleInviteButton.textContent = isOpen ? "Hide invite info" : "Invite member";
  }

  function isPhoneLayout() {
    return window.innerWidth <= 760;
  }

  function closeAddComposer() {
    elements.addEntryForm.classList.add("hidden");
    elements.composerCard.classList.remove("mobile-sheet-open");
    elements.composerBackdrop.classList.add("hidden");
    elements.composerBackdrop.classList.remove("is-visible");
    document.body.classList.remove("composer-sheet-open");
    updateAddPanel();
  }

  function openAddComposer() {
    elements.addEntryForm.classList.remove("hidden");

    if (isPhoneLayout()) {
      elements.composerCard.classList.add("mobile-sheet-open");
      elements.composerBackdrop.classList.remove("hidden");
      window.requestAnimationFrame(() => {
        elements.composerBackdrop.classList.add("is-visible");
      });
      document.body.classList.add("composer-sheet-open");
    }

    updateAddPanel();
  }

  function updateAddPanel() {
    const isOpen = !elements.addEntryForm.classList.contains("hidden");
    elements.toggleAddPanelButton.textContent = isOpen ? "Hide add item" : "Add item";

    if (elements.mobileComposerButton) {
      elements.mobileComposerButton.textContent = isOpen && isPhoneLayout() ? "Close" : "+ Item";
    }

    if (!isPhoneLayout()) {
      elements.composerCard.classList.remove("mobile-sheet-open");
      elements.composerBackdrop.classList.add("hidden");
      elements.composerBackdrop.classList.remove("is-visible");
      document.body.classList.remove("composer-sheet-open");
    }
  }

  function updateWoolworthsPanel() {
    const isOpen = !elements.woolworthsExportPanel.classList.contains("hidden");
    elements.toggleWoolworthsExportButton.textContent = isOpen ? "Hide price guide" : "Show price guide";
    elements.woolworthsExportPanel.classList.toggle("woolworths-export-panel-open", isOpen);
  }

  function updateMealFields() {
    const enabled = elements.isMealGroup.checked;
    elements.mealFields.classList.toggle("hidden", !enabled);
    document.getElementById("mealName").required = enabled;
    document.getElementById("mealItems").required = enabled;
    document.getElementById("itemName").required = !enabled;
  }
  function setRecipeScanStatus(message) {
    if (elements.recipeScanStatus) {
      elements.recipeScanStatus.textContent = message;
    }
  }

  function clearRecipeScanResults() {
    state.recipeScan.items = [];
    state.recipeScan.mealName = "";
    state.recipeScan.rawText = "";

    if (elements.scannedMealName) {
      elements.scannedMealName.value = "";
    }

    if (elements.recipeScanList) {
      elements.recipeScanList.innerHTML = "";
    }

    if (elements.recipeScanResults) {
      elements.recipeScanResults.classList.add("hidden");
    }
  }

  function resetRecipeScan() {
    state.recipeScan = {
      items: [],
      mealName: "",
      imageName: "",
      rawText: ""
    };

    if (elements.recipeImageInput) {
      elements.recipeImageInput.value = "";
    }

    if (elements.scannedMealName) {
      elements.scannedMealName.value = "";
    }

    if (elements.recipeScanList) {
      elements.recipeScanList.innerHTML = "";
    }

    if (elements.recipeScanResults) {
      elements.recipeScanResults.classList.add("hidden");
    }

    setRecipeScanStatus("No recipe image selected yet.");
  }


  function normalizeIngredientLine(value) {
    const cleaned = String(value || "")
      .replace(/[|ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦]/g, " ")
      .replace(/[_*~`]+/g, " ")
      .replace(/^[\d\s().,/:;-]+/, "")
      .replace(/\s+/g, " ")
      .trim();

    const alphaOnly = cleaned.replace(/[^a-z]/gi, "");
    if (!cleaned || cleaned.length < 2 || alphaOnly.length < 2) {
      return "";
    }

    if (cleaned.length > 64) {
      return "";
    }

    return cleaned;
  }
  async function prepareRecipeImageForUpload(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        const maxDimension = 1800;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("This device could not prepare the image for scanning."));
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, width, height);

        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("That image could not be opened for scanning."));
      };

      image.src = objectUrl;
    });
  }

  function sanitizeRecipeScanItems(items) {
    const seen = new Set();

    return (items || [])
      .map((item, index) => {
        const normalized = normalizeIngredientLine(item?.name || item?.ingredient || item?.text || "");
        return {
          id: `scan-${index + 1}`,
          name: normalized,
          source: String(item?.source || item?.original || item?.name || item?.ingredient || item?.text || normalized),
          selected: true
        };
      })
      .filter((item) => {
        const key = item.name.toLowerCase();
        const hasUnit = RECIPE_SCAN_UNITS.some((unit) => key.includes(` ${unit}`) || key.startsWith(`${unit} `));
        const skipBecauseWord = RECIPE_SCAN_SKIP_WORDS.some((word) => key.includes(word));
        const looksLikeInstruction = /\b(add|stir|mix|cook|bake|boil|simmer|serve|preheat|heat|place|combine)\b/i.test(item.source);
        const looksLikeNoise = !/[a-z]{2,}/i.test(key) || /[^a-z\s,'&()-]/i.test(key);
        const tooManyWords = key.split(/\s+/).length > 6;

        if (!item.name || seen.has(key) || skipBecauseWord) {
          return false;
        }

        if ((looksLikeInstruction && !hasUnit) || looksLikeNoise || tooManyWords) {
          return false;
        }

        seen.add(key);
        return true;
      });
  }

  function renderRecipeScanResults() {
    const hasItems = state.recipeScan.items.length > 0;
    elements.recipeScanResults.classList.toggle("hidden", !hasItems);
    elements.recipeScanList.innerHTML = "";
    elements.scannedMealName.value = state.recipeScan.mealName || "";

    if (!hasItems) {
      return;
    }

    state.recipeScan.items.forEach((item) => {
      const label = document.createElement("label");
      label.className = "recipe-scan-option";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.selected;
      checkbox.addEventListener("change", () => {
        item.selected = checkbox.checked;
      });

      const copy = document.createElement("div");
      copy.className = "recipe-scan-copy";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "recipe-scan-input";
      input.value = item.name;
      input.addEventListener("input", () => {
        item.name = input.value;
      });

      const source = document.createElement("span");
      source.className = "helper-text recipe-scan-source";
      source.textContent = item.source;

      copy.appendChild(input);
      copy.appendChild(source);
      label.appendChild(checkbox);
      label.appendChild(copy);
      elements.recipeScanList.appendChild(label);
    });
  }

  async function scanRecipeImage(file) {
    if (!file) {
      return;
    }

    if (!appConfig.recipeScanFunctionUrl || appConfig.recipeScanFunctionUrl.includes("YOUR_PROJECT")) {
      throw new Error("Recipe scan still needs the cloud function URL in shopping-cloud-config.js.");
    }

    state.recipeScan.imageName = file.name || "recipe image";
    setRecipeScanStatus(`Scanning ${state.recipeScan.imageName}...`);
    elements.recipeScanResults.classList.add("hidden");

    const imageDataUrl = await prepareRecipeImageForUpload(file);
    let response;

    try {
      response = await fetch(appConfig.recipeScanFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: appConfig.supabaseAnonKey || "",
          Authorization: `Bearer ${state.session.access_token}`
        },
        body: JSON.stringify({
          imageDataUrl,
          imageName: state.recipeScan.imageName
        })
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error("The recipe scan request could not reach the cloud function. This is usually a CORS, deployment, or network issue.");
      }

      throw error;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("The recipe scan cloud function is not deployed yet.");
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error("The recipe scan function is blocked. The function may require auth or your session may need refreshing.");
      }

      throw new Error(payload.error || "The recipe scan service could not read that image.");
    }

    const items = sanitizeRecipeScanItems(payload.items || []);
    if (!items.length) {
      throw new Error("The scan did not find a clean ingredient list. Try a straighter photo with the ingredients section filling most of the frame.");
    }

    state.recipeScan.items = items;
    state.recipeScan.mealName = String(payload.mealName || "").trim();
    state.recipeScan.rawText = String(payload.rawText || "");
    renderRecipeScanResults();
    setRecipeScanStatus(`Found ${items.length} possible ingredients from ${state.recipeScan.imageName}. Edit anything that looks wrong, then untick what you do not need.`);
  }

  async function addScannedRecipeSelection() {
    const selectedItems = state.recipeScan.items.filter((item) => item.selected && String(item.name || "").trim()).map((item) => ({ ...item, name: String(item.name || "").trim() }));
    const mealName = elements.scannedMealName.value.trim();
    const isUrgent = document.getElementById("itemUrgent").checked;

    if (!selectedItems.length) {
      throw new Error("Choose at least one scanned ingredient to add.");
    }

    if (!mealName) {
      throw new Error("Add the meal name before saving scanned ingredients.");
    }

    await addMeal(mealName, selectedItems.map((item) => item.name).join("\n"), isUrgent);
    showToast(`${mealName} added from recipe scan.`);
    resetRecipeScan();
  }

  function updateRecentToggle() {
    if (!elements.toggleRecentButton) {
      return;
    }

    const recentCount = getRecentItems().length;
    const isOpen = !elements.recentPanel.classList.contains("hidden");
    elements.toggleRecentButton.textContent = isOpen
      ? `Hide recently purchased (${recentCount})`
      : `Recently purchased (${recentCount})`;
  }

  function updateListModeButtons() {
    elements.groupViewButton.classList.toggle("active", state.listMode === "groups");
    elements.categoryViewButton.classList.toggle("active", state.listMode === "categories");

    if (state.listMode === "categories") {
      elements.notepadHint.textContent = "Items are grouped into New Zealand-style shopping categories automatically.";
      return;
    }

    elements.notepadHint.textContent = "Items are grouped by meal when you add them together.";
  }
  function renderMembers() {
    elements.memberPill.textContent = `${state.members.length} member${state.members.length === 1 ? "" : "s"}`;
    elements.membersList.innerHTML = "";

    state.members.forEach((member) => {
      const card = document.createElement("div");
      card.className = "notice";
      const you = member.user_id === state.session.user.id ? " (you)" : "";
      card.textContent = `${member.display_name}${you}`;
      elements.membersList.appendChild(card);
    });
  }

  function renderActivity() {
    elements.activityList.innerHTML = "";
    const activity = state.notifications.slice(0, 6);

    if (!activity.length) {
      const card = document.createElement("div");
      card.className = "notice";
      card.textContent = "Newly added items and list updates will appear here.";
      elements.activityList.appendChild(card);
      return;
    }

    activity.forEach((entry) => {
      const actor = getDisplayNameForUser(entry.actor_id);
      const card = document.createElement("div");
      card.className = "notice";
      const itemName = entry.payload?.item_name || "an item";
      const verb = entry.event_type === "item_purchased" ? "bought" : "added";
      card.textContent = `${actor} ${verb} ${itemName}`;
      elements.activityList.appendChild(card);
    });
  }

  function renderWoolworthsExport() {
    if (!elements.woolworthsExportList) {
      return;
    }

    elements.woolworthsExportList.innerHTML = "";
    const items = sortItems(getActiveItems());

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "notice";
      empty.textContent = "No items visible right now.";
      elements.woolworthsExportList.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "woolworths-export-item";

      const copy = document.createElement("div");
      copy.className = "woolworths-export-copy";

      const title = document.createElement("p");
      title.className = "woolworths-export-title";
      title.textContent = item.name;

      const estimate = document.createElement("p");
      estimate.className = "woolworths-price-match";
      estimate.textContent = `Estimated: ${formatCurrency(estimateItemPrice(item))}`;

      const note = document.createElement("p");
      note.className = "woolworths-export-note";
      note.textContent = item.note ? `Note: ${item.note}` : `Category: ${getCategoryForItem(item)}`;

      const category = document.createElement("span");
      category.className = "woolworths-price-badge";
      category.textContent = getCategoryForItem(item);

      copy.appendChild(title);
      copy.appendChild(estimate);
      copy.appendChild(note);
      row.appendChild(copy);
      row.appendChild(category);
      elements.woolworthsExportList.appendChild(row);
    });
  }

  function buildItemCard(item) {
    const card = document.createElement("article");
    card.className = `item-card${item.is_urgent ? " urgent" : ""}`;

    const wrapper = document.createElement("div");
    wrapper.className = "item-main";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(item.is_purchased);
    checkbox.addEventListener("change", () => togglePurchased(item, checkbox.checked));

    const copy = document.createElement("div");
    copy.className = "item-copy";

    const titleRow = document.createElement("div");
    titleRow.className = "item-title-row";

    const title = document.createElement("h3");
    title.className = "item-title";
    title.textContent = item.name;
    titleRow.appendChild(title);

    if (item.is_urgent) {
      const urgentTag = document.createElement("span");
      urgentTag.className = "tag urgent";
      urgentTag.textContent = "Urgent";
      titleRow.appendChild(urgentTag);
    }

    if (item.is_purchased && isRecentPurchase(item)) {
      const recentTag = document.createElement("span");
      recentTag.className = "tag recent";
      recentTag.textContent = "Recent";
      titleRow.appendChild(recentTag);
    }

    const categoryTag = document.createElement("span");
    categoryTag.className = "tag";
    categoryTag.textContent = getCategoryForItem(item);
    titleRow.appendChild(categoryTag);

    const priceTag = document.createElement("span");
    priceTag.className = "tag recent";
    priceTag.textContent = `Est. ${formatCurrency(estimateItemPrice(item))}`;
    titleRow.appendChild(priceTag);

    const note = document.createElement("p");
    note.className = `item-note${item.note ? "" : " hidden"}`;
    note.textContent = item.note || "";

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.style.flexWrap = "wrap";

    const creator = document.createElement("span");
    creator.className = "helper-text";
    creator.textContent = `Added by ${getDisplayNameForUser(item.created_by)}`;
    meta.appendChild(creator);

    if (item.purchased_at) {
      const purchased = document.createElement("span");
      purchased.className = "helper-text";
      purchased.textContent = `Bought ${new Date(item.purchased_at).toLocaleString([], {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit"
      })}`;
      meta.appendChild(purchased);
    }

    copy.appendChild(titleRow);
    copy.appendChild(note);
    copy.appendChild(meta);
    wrapper.appendChild(checkbox);
    wrapper.appendChild(copy);
    card.appendChild(wrapper);

    return card;
  }

  function buildGroupedEntries(items, viewMode = "active") {
    const entries = [];
    const mealGroups = new Map();

    sortItems(items, viewMode).forEach((item) => {
      if (item.meal_group) {
        if (!mealGroups.has(item.meal_group)) {
          mealGroups.set(item.meal_group, {
            title: item.meal_group,
            items: []
          });
          entries.push({ type: "meal", group: mealGroups.get(item.meal_group) });
        }

        mealGroups.get(item.meal_group).items.push(item);
        return;
      }

      entries.push({ type: "item", item });
    });

    return entries;
  }

  function buildCategoryEntries(items, viewMode = "active") {
    const grouped = new Map();

    sortItems(items, viewMode).forEach((item) => {
      const category = getCategoryForItem(item);
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category).push(item);
    });

    const orderedCategories = categoryMatcher.CATEGORY_ORDER.filter((category) => grouped.has(category));
    return orderedCategories.map((category) => ({
      type: "category",
      category,
      items: grouped.get(category)
    }));
  }
  function buildMealGroupCard(group, viewMode = "active") {
    const card = document.createElement("article");
    card.className = "meal-group-card";

    const header = document.createElement("div");
    header.className = "meal-group-header";

    const title = document.createElement("h3");
    title.className = "meal-group-title";
    title.textContent = group.title;
    header.appendChild(title);

    if (group.items.some((item) => item.is_urgent)) {
      const urgentTag = document.createElement("span");
      urgentTag.className = "tag urgent";
      urgentTag.textContent = "Urgent meal";
      header.appendChild(urgentTag);
    }

    const itemsWrap = document.createElement("div");
    itemsWrap.className = "meal-group-items";
    sortItems(group.items, viewMode).forEach((item) => {
      itemsWrap.appendChild(buildItemCard(item));
    });

    card.appendChild(header);
    card.appendChild(itemsWrap);
    return card;
  }

  function buildCategoryCard(category, items) {
    const card = document.createElement("article");
    card.className = "meal-group-card";

    const header = document.createElement("div");
    header.className = "meal-group-header";

    const title = document.createElement("h3");
    title.className = "meal-group-title";
    title.textContent = category;
    header.appendChild(title);

    const count = document.createElement("span");
    count.className = "tag";
    count.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
    header.appendChild(count);

    const itemsWrap = document.createElement("div");
    itemsWrap.className = "meal-group-items";
    items.forEach((item) => {
      itemsWrap.appendChild(buildItemCard(item));
    });

    card.appendChild(header);
    card.appendChild(itemsWrap);
    return card;
  }

  function renderItemCollection(container, emptyState, emptyMessage, items, viewMode) {
    container.innerHTML = "";

    if (!items.length) {
      emptyState.classList.remove("hidden");
      emptyMessage.textContent = viewMode === "recent"
        ? `No purchases in the last ${RECENT_DAYS} days.`
        : "Nothing to buy right now.";
      return;
    }

    emptyState.classList.add("hidden");

    if (state.listMode === "categories") {
      buildCategoryEntries(items, viewMode).forEach((entry) => {
        container.appendChild(buildCategoryCard(entry.category, entry.items));
      });
      return;
    }

    buildGroupedEntries(items, viewMode).forEach((entry) => {
      if (entry.type === "meal") {
        container.appendChild(buildMealGroupCard(entry.group, viewMode));
        return;
      }

      container.appendChild(buildItemCard(entry.item));
    });
  }

  function renderItems() {
    const activeItems = getActiveItems();
    const recentItems = getRecentItems();

    elements.urgentPill.textContent = `${activeItems.filter((item) => item.is_urgent).length} urgent`;
    if (elements.estimatePill) {
      elements.estimatePill.textContent = `Est. ${formatCurrency(getVisibleEstimateTotal())}`;
    }

    renderItemCollection(
      elements.shoppingList,
      elements.emptyState,
      elements.emptyMessage,
      activeItems,
      "active"
    );
    renderItemCollection(
      elements.recentShoppingList,
      elements.recentEmptyState,
      elements.recentEmptyMessage,
      recentItems,
      "recent"
    );

    updateRecentToggle();
    updateWoolworthsPriceStatus();
    renderWoolworthsExport();
  }

  async function loadTempLists() {
    if (!state.household) {
      state.tempLists = [];
      return;
    }

    const { data: lists, error: listsError } = await state.client
      .from("shopping_temp_lists")
      .select("id, household_id, title, created_by, created_at, updated_at")
      .eq("household_id", state.household.id)
      .order("created_at", { ascending: false });

    if (listsError) {
      throw listsError;
    }

    const { data: items, error: itemsError } = await state.client
      .from("shopping_temp_list_items")
      .select("id, list_id, household_id, text, is_done, created_by, created_at")
      .eq("household_id", state.household.id)
      .order("created_at", { ascending: true });

    if (itemsError) {
      throw itemsError;
    }

    const itemsByList = new Map();
    (items || []).forEach((item) => {
      if (!itemsByList.has(item.list_id)) {
        itemsByList.set(item.list_id, []);
      }
      itemsByList.get(item.list_id).push({
        id: item.id,
        text: item.text,
        done: Boolean(item.is_done),
        createdBy: item.created_by,
        createdAt: item.created_at
      });
    });

    state.tempLists = (lists || []).map((list) => ({
      id: list.id,
      title: list.title,
      createdBy: list.created_by,
      createdAt: list.created_at,
      updatedAt: list.updated_at,
      items: itemsByList.get(list.id) || []
    }));
  }

  async function createTempList(title) {
    const trimmedTitle = String(title || "").trim();
    if (!trimmedTitle) {
      throw new Error("Give the temporary list a name first.");
    }

    const { error } = await state.client
      .from("shopping_temp_lists")
      .insert({
        household_id: state.household.id,
        title: trimmedTitle,
        created_by: state.session.user.id
      });

    if (error) {
      throw error;
    }

    await loadTempLists();
    renderTempLists();
  }

  async function addTempListItem(listId, text) {
    const trimmedText = String(text || "").trim();
    if (!trimmedText) {
      throw new Error("Add something to the temporary list first.");
    }

    const { error } = await state.client
      .from("shopping_temp_list_items")
      .insert({
        list_id: listId,
        household_id: state.household.id,
        text: trimmedText,
        is_done: false,
        created_by: state.session.user.id
      });

    if (error) {
      throw error;
    }

    await loadTempLists();
    renderTempLists();
  }

  async function toggleTempListItem(listId, itemId, checked) {
    const { error } = await state.client
      .from("shopping_temp_list_items")
      .update({ is_done: Boolean(checked) })
      .eq("id", itemId)
      .eq("list_id", listId);

    if (error) {
      showToast(error.message || "Unable to update temporary item.");
      return;
    }

    await loadTempLists();
    renderTempLists();
  }

  async function removeTempListItem(listId, itemId) {
    const { error } = await state.client
      .from("shopping_temp_list_items")
      .delete()
      .eq("id", itemId)
      .eq("list_id", listId);

    if (error) {
      showToast(error.message || "Unable to remove temporary item.");
      return;
    }

    await loadTempLists();
    renderTempLists();
  }

  async function deleteTempList(listId) {
    const { error } = await state.client
      .from("shopping_temp_lists")
      .delete()
      .eq("id", listId);

    if (error) {
      showToast(error.message || "Unable to delete temporary list.");
      return;
    }

    await loadTempLists();
    renderTempLists();
  }

  function renderTempLists() {
    if (!elements.tempListsBoard || !elements.tempListsEmptyState) {
      return;
    }

    elements.tempListsBoard.innerHTML = "";
    const hasLists = state.tempLists.length > 0;
    elements.tempListsEmptyState.classList.toggle("hidden", hasLists);

    state.tempLists.forEach((list) => {
      const card = document.createElement("section");
      card.className = "temp-list-card";

      const header = document.createElement("div");
      header.className = "temp-list-head";

      const titleWrap = document.createElement("div");
      titleWrap.className = "temp-list-title-wrap";

      const title = document.createElement("h4");
      title.className = "temp-list-title";
      title.textContent = list.title;

      const meta = document.createElement("span");
      meta.className = "temp-list-meta";
      const owner = getDisplayNameForUser(list.createdBy);
      meta.textContent = `${list.items.length} item${list.items.length === 1 ? "" : "s"} · Added by ${owner}`;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "secondary temp-list-delete";
      deleteButton.textContent = "Delete list";
      deleteButton.addEventListener("click", async () => {
        await deleteTempList(list.id);
      });

      titleWrap.appendChild(title);
      titleWrap.appendChild(meta);
      header.appendChild(titleWrap);
      header.appendChild(deleteButton);

      const addForm = document.createElement("form");
      addForm.className = "temp-list-inline-form";

      const addInput = document.createElement("input");
      addInput.type = "text";
      addInput.placeholder = "Add a temporary note or checklist item";
      addInput.setAttribute("aria-label", `Add item to ${list.title}`);

      const addButton = document.createElement("button");
      addButton.type = "submit";
      addButton.textContent = "Add";

      addForm.appendChild(addInput);
      addForm.appendChild(addButton);
      addForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          await addTempListItem(list.id, addInput.value);
        } catch (error) {
          showToast(error.message || "Unable to add temporary item.");
          return;
        }
        addInput.value = "";
      });

      const itemsWrap = document.createElement("div");
      itemsWrap.className = "temp-list-items";

      if (!list.items.length) {
        const empty = document.createElement("p");
        empty.className = "helper-text";
        empty.textContent = "Nothing in this temporary list yet.";
        itemsWrap.appendChild(empty);
      } else {
        list.items.forEach((item) => {
          const row = document.createElement("label");
          row.className = `temp-list-item${item.done ? " done" : ""}`;

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = Boolean(item.done);
          checkbox.addEventListener("change", async () => {
            await toggleTempListItem(list.id, item.id, checkbox.checked);
          });

          const text = document.createElement("span");
          text.className = "temp-list-item-text";
          text.textContent = item.text;

          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "secondary temp-list-remove";
          removeButton.textContent = "Remove";
          removeButton.addEventListener("click", async () => {
            await removeTempListItem(list.id, item.id);
          });

          row.appendChild(checkbox);
          row.appendChild(text);
          row.appendChild(removeButton);
          itemsWrap.appendChild(row);
        });
      }

      card.appendChild(header);
      card.appendChild(addForm);
      card.appendChild(itemsWrap);
      elements.tempListsBoard.appendChild(card);
    });
  }

  function renderHouseholdState() {
  }  function renderHouseholdState() {
    const hasHousehold = Boolean(state.household);
    elements.householdPanel.classList.toggle("hidden", hasHousehold);
    elements.listPanel.classList.toggle("hidden", !hasHousehold);
    elements.sidebarPanel.classList.toggle("hidden", !hasHousehold);

    if (!hasHousehold) {
      elements.householdSummary.textContent = "Create a household or join one with an invite code.";
      return;
    }

    elements.householdSummary.textContent = `${state.profile.displayName} is shopping with ${state.household.name}.`;
    elements.householdNameHeading.textContent = state.household.name;
    elements.inviteCodeValue.textContent = state.household.invite_code;
    elements.inviteCodeMessage.textContent = "Share this code with another user. They can sign in and join with it.";
    renderMembers();
    renderActivity();
    renderItems();
    renderTempLists();

  async function loadMembership() {
    const { data, error } = await state.client
      .from("shopping_household_members")
      .select("display_name, household_id, created_at, shopping_households(id, name, invite_code)")
      .eq("user_id", state.session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const memberships = data || [];
    const activeMembership = memberships[0] || null;

    state.profile = {
      displayName: activeMembership?.display_name || state.session.user.user_metadata?.display_name || state.session.user.email || "You"
    };

    if (!activeMembership) {
      state.household = null;
      return;
    }

    state.household = activeMembership.shopping_households;

    if (memberships.length > 1) {
      showToast("Multiple household memberships were found, so the newest one is being used.");
    }
  }

  async function loadMembers() {
    if (!state.household) {
      state.members = [];
      return;
    }

    const { data, error } = await state.client
      .from("shopping_household_members")
      .select("user_id, display_name")
      .eq("household_id", state.household.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    state.members = data || [];
  }

  async function loadItems() {
    if (!state.household) {
      state.items = [];
      return;
    }

    const { data, error } = await state.client
      .from("shopping_items")
      .select("*")
      .eq("household_id", state.household.id)
      .order("created_at", { ascending: false });

    if (error && String(error.message || "").includes("meal_group")) {
      const fallback = await state.client
        .from("shopping_items")
        .select("id, household_id, name, note, is_urgent, is_purchased, purchased_at, created_by, purchased_by, created_at, updated_at")
        .eq("household_id", state.household.id)
        .order("created_at", { ascending: false });

      if (fallback.error) {
        throw fallback.error;
      }

      state.items = (fallback.data || []).map((item) => ({
        ...item,
        meal_group: null,
        meal_item_order: null
      }));
      return;
    }

    if (error) {
      throw error;
    }

    state.items = data || [];
  }
  async function loadNotifications() {
    if (!state.household) {
      state.notifications = [];
      return;
    }

    const { data, error } = await state.client
      .from("shopping_notifications")
      .select("*")
      .eq("household_id", state.household.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    state.notifications = data || [];
  }

  async function savePushSubscription(subscription) {
    if (!state.household) {
      return;
    }

    const payload = {
      household_id: state.household.id,
      user_id: state.session.user.id,
      endpoint: subscription.endpoint,
      subscription,
      user_agent: navigator.userAgent || null
    };

    const { error } = await state.client
      .from("shopping_push_subscriptions")
      .upsert(payload, { onConflict: "endpoint" });

    if (error) {
      throw error;
    }
  }

  async function enablePushNotifications() {
    if (!("Notification" in window)) {
      throw new Error("Notifications are not supported on this device.");
    }

    if (!("PushManager" in window)) {
      throw new Error("Push notifications are not supported on this browser.");
    }

    if (!appConfig.vapidPublicKey || appConfig.vapidPublicKey.includes("YOUR_VAPID")) {
      throw new Error("Add your VAPID public key to shopping-cloud-config.js first.");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission was not granted.");
    }

    const registration = await getServiceWorkerRegistration();
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(appConfig.vapidPublicKey)
      });
    }

    await savePushSubscription(subscription.toJSON());
    return subscription;
  }

  async function sendPushEvent(itemName, eventType, urgent) {
    if (!appConfig.pushFunctionUrl || appConfig.pushFunctionUrl.includes("YOUR_PROJECT")) {
      return;
    }

    try {
      await fetch(appConfig.pushFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.session.access_token}`
        },
        body: JSON.stringify({
          householdId: state.household.id,
          actorId: state.session.user.id,
          title: eventType === "item_purchased" ? "Item purchased" : "Item added",
          body: eventType === "item_purchased"
            ? `${state.profile.displayName} bought ${itemName}`
            : `${state.profile.displayName} added ${itemName}`,
          url: "shopping-app.html",
          urgent: Boolean(urgent)
        })
      });
    } catch (error) {
      // Push delivery should not block the core shopping flow.
    }
  }

  async function emitNotification(eventType, itemName, urgent) {
    await state.client.from("shopping_notifications").insert({
      household_id: state.household.id,
      actor_id: state.session.user.id,
      event_type: eventType,
      payload: {
        item_name: itemName,
        urgent: Boolean(urgent)
      }
    });
  }

  function removeChannels() {
    if (!state.client) {
      return;
    }

    state.channels.forEach((channel) => {
      state.client.removeChannel(channel);
    });
    state.channels = [];
  }

  async function subscribeRealtime() {
    removeChannels();

    if (!state.household) {
      return;
    }

    const itemsChannel = state.client
      .channel(`shopping-items-${state.household.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_items",
          filter: `household_id=eq.${state.household.id}`
        },
        async () => {
          await loadItems();
          renderItems();
        }
      )
      .subscribe();

    const notificationsChannel = state.client
      .channel(`shopping-notifications-${state.household.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shopping_notifications",
          filter: `household_id=eq.${state.household.id}`
        },
        async (payload) => {
          const itemName = payload.new?.payload?.item_name || "an item";
          const actorName = getDisplayNameForUser(payload.new.actor_id);
          const actionText = payload.new?.event_type === "item_purchased"
            ? `${actorName} bought ${itemName}`
            : `${actorName} added ${itemName}`;

          if (payload.new?.actor_id !== state.session.user.id) {
            showToast(actionText);

            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Shopping list updated", {
                body: actionText
              });
            }
          }

          await loadNotifications();
          renderActivity();
        }
      )
      .subscribe();


    const tempListsChannel = state.client
      .channel(`shopping-temp-lists-${state.household.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_temp_lists",
          filter: `household_id=eq.${state.household.id}`
        },
        async () => {
          await loadTempLists();
          renderTempLists();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_temp_list_items",
          filter: `household_id=eq.${state.household.id}`
        },
        async () => {
          await loadTempLists();
          renderTempLists();
        }
      )
      .subscribe();
    state.channels.push(itemsChannel, notificationsChannel, tempListsChannel);
  }

  async function createHousehold(name) {
    if (state.household) {
      throw new Error("You already belong to a household. Sign in with another account if you want to create a separate one.");
    }

    const inviteCode = createInviteCode();
    const { data, error } = await state.client
      .from("shopping_households")
      .insert({
        name,
        invite_code: inviteCode,
        created_by: state.session.user.id
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const { error: memberError } = await state.client
      .from("shopping_household_members")
      .insert({
        household_id: data.id,
        user_id: state.session.user.id,
        display_name: state.session.user.user_metadata?.display_name || state.session.user.email || "You"
      });

    if (memberError) {
      throw memberError;
    }
  }
  async function joinHousehold(inviteCode, displayName) {
    if (state.household) {
      throw new Error("You already belong to a household.");
    }

    const { data: household, error: lookupError } = await state.client
      .from("shopping_households")
      .select("*")
      .eq("invite_code", inviteCode.toUpperCase())
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (!household) {
      throw new Error("That invite code was not found.");
    }

    const { error } = await state.client
      .from("shopping_household_members")
      .insert({
        household_id: household.id,
        user_id: state.session.user.id,
        display_name: displayName
      });

    if (error) {
      throw error;
    }
  }

  async function addItem(name, note, isUrgent) {
    const payload = {
      household_id: state.household.id,
      name,
      note,
      is_urgent: isUrgent,
      created_by: state.session.user.id
    };

    const { error } = await state.client
      .from("shopping_items")
      .insert(payload);

    if (error) {
      throw error;
    }

    await emitNotification("item_added", name, isUrgent);
    await sendPushEvent(name, "item_added", isUrgent);
  }

  async function addMeal(mealName, rawItems, isUrgent) {
    const parsedItems = rawItems
      .split(/\r?\n|,/) 
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!parsedItems.length) {
      throw new Error("Add at least one meal item.");
    }

    const payload = parsedItems.map((name, index) => ({
      household_id: state.household.id,
      name,
      note: "",
      is_urgent: isUrgent,
      created_by: state.session.user.id,
      meal_group: mealName,
      meal_item_order: index
    }));

    const { error } = await state.client
      .from("shopping_items")
      .insert(payload);

    if (error && String(error.message || "").includes("meal_group")) {
      throw new Error("Meal groups need the latest database update. Please re-run supabase-shopping-schema.sql in Supabase first.");
    }

    if (error) {
      throw error;
    }

    await emitNotification("item_added", `${mealName} meal`, isUrgent);
    await sendPushEvent(`${mealName} meal`, "item_added", isUrgent);
  }

  async function togglePurchased(item, checked) {
    const payload = checked
      ? {
          is_purchased: true,
          purchased_at: new Date().toISOString(),
          purchased_by: state.session.user.id
        }
      : {
          is_purchased: false,
          purchased_at: null,
          purchased_by: null
        };

    const { error } = await state.client
      .from("shopping_items")
      .update(payload)
      .eq("id", item.id);

    if (error) {
      showToast(error.message || "Unable to update item.");
      return;
    }

    if (checked) {
      const purchasedLabel = item.meal_group ? `${item.name} for ${item.meal_group}` : item.name;
      await emitNotification("item_purchased", purchasedLabel, item.is_urgent);
      await sendPushEvent(purchasedLabel, "item_purchased", item.is_urgent);
    }

    await loadItems();
    await loadNotifications();
    renderItems();
    renderActivity();
  }

  async function refreshApp() {
    await loadMembership();
    await loadMembers();
    await loadItems();
    await loadNotifications();
    loadTempLists();
    renderHouseholdState();
    await subscribeRealtime();
  }

  function wireQuickAddButtons() {
    document.querySelectorAll("[data-quick-item]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const name = button.getAttribute("data-quick-item") || "";
          await addItem(name, "", false);
          await loadItems();
          await loadNotifications();
          renderItems();
          renderActivity();
          showToast(`${name} added.`);
        } catch (error) {
          showToast(error.message || "Unable to add quick item.");
        }
      });
    });
  }

  function handleComposerOutsidePointer(event) {
    if (!isPhoneLayout()) {
      return;
    }

    const isOpen = !elements.addEntryForm.classList.contains("hidden");
    if (!isOpen) {
      return;
    }

    const target = event.target;
    if (elements.composerCard.contains(target) || elements.mobileComposerButton.contains(target)) {
      return;
    }

    closeAddComposer();
  }
  function wireEvents() {
    elements.signOutButton.addEventListener("click", () => {
      removeChannels();
      window.ShoppingAuth.signOut("shopping-login.html");
    });

    elements.toggleInviteButton.addEventListener("click", () => {
      elements.invitePanel.classList.toggle("hidden");
      updateInvitePanel();
    });

    elements.copyInviteButton.addEventListener("click", async () => {
      if (!state.household) {
        return;
      }

      try {
        await navigator.clipboard.writeText(state.household.invite_code);
        showToast("Invite code copied.");
      } catch (error) {
        showToast(`Copy this invite code: ${state.household.invite_code}`);
      }
    });

    elements.toggleAddPanelButton.addEventListener("click", () => {
      if (elements.addEntryForm.classList.contains("hidden")) {
        openAddComposer();
      } else {
        closeAddComposer();
      }
    });

    if (elements.scanRecipeButton) {
      elements.scanRecipeButton.addEventListener("click", () => {
        if (elements.addEntryForm.classList.contains("hidden")) {
          openAddComposer();
        }
        elements.chooseRecipeImageButton.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    elements.mobileComposerButton.addEventListener("click", () => {
      if (elements.addEntryForm.classList.contains("hidden")) {
        openAddComposer();
      } else {
        closeAddComposer();
      }
    });

    elements.composerBackdrop.addEventListener("click", () => {
      closeAddComposer();
    });

    elements.toggleWoolworthsExportButton.addEventListener("click", () => {
      const shouldShow = elements.woolworthsExportPanel.classList.contains("hidden");
      elements.woolworthsExportPanel.classList.toggle("hidden", !shouldShow);
      updateWoolworthsPanel();
      renderWoolworthsExport();
      if (shouldShow) {
        elements.woolworthsExportPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });



    elements.isMealGroup.addEventListener("change", () => {
      updateMealFields();
    });

    function openRecipeImagePicker(options = {}) {
      elements.recipeImageInput.value = "";
      if (options.captureCamera) {
        elements.recipeImageInput.setAttribute("capture", "environment");
      } else {
        elements.recipeImageInput.removeAttribute("capture");
      }
      elements.recipeImageInput.click();
    }

    if (elements.takeRecipePhotoButton) {
      elements.takeRecipePhotoButton.addEventListener("click", () => {
        openRecipeImagePicker({ captureCamera: true });
      });
    }

    elements.chooseRecipeImageButton.addEventListener("click", () => {
      openRecipeImagePicker();
    });

    elements.recipeImageInput.addEventListener("change", async (event) => {
      elements.recipeImageInput.removeAttribute("capture");
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }

      try {
        await scanRecipeImage(file);
      } catch (error) {
        clearRecipeScanResults();
        state.recipeScan.imageName = file.name || "recipe image";
        setRecipeScanStatus(error.message || "Unable to scan recipe image.");
        showToast(error.message || "Unable to scan recipe image.");
      }
    });

    elements.scannedMealName.addEventListener("input", () => {
      state.recipeScan.mealName = elements.scannedMealName.value;
    });

    elements.addScannedRecipeButton.addEventListener("click", async () => {
      try {
        await addScannedRecipeSelection();
        await loadItems();
        await loadNotifications();
        renderItems();
        renderActivity();
      } catch (error) {
        showToast(error.message || "Unable to save scanned ingredients.");
      }
    });

    elements.clearRecipeScanButton.addEventListener("click", () => {
      resetRecipeScan();
    });

    elements.toggleRecentButton.addEventListener("click", () => {
      elements.recentPanel.classList.toggle("hidden");
      updateRecentToggle();
    });

    elements.tempListForm.addEventListener("submit", (event) => {
      event.preventDefault();

      try {
        createTempList(elements.tempListTitle.value);
        elements.tempListForm.reset();
        showToast("Temporary list created.");
      } catch (error) {
        showToast(error.message || "Unable to create temporary list.");
      }
    });
    elements.createHouseholdForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const name = document.getElementById("householdName").value.trim();
        await createHousehold(name);
        await refreshApp();
        showMessage("Household created. Share the invite code with the other users.", false);
      } catch (error) {
        showMessage(error.message || "Unable to create household.", true);
      }
    });
    elements.joinHouseholdForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const inviteCode = document.getElementById("inviteCode").value.trim();
        const displayName = document.getElementById("displayName").value.trim();
        await joinHousehold(inviteCode, displayName);
        await refreshApp();
        showMessage("You have joined the household.", false);
      } catch (error) {
        showMessage(error.message || "Unable to join household.", true);
      }
    });

    elements.addEntryForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const isMealGroup = elements.isMealGroup.checked;
        const isUrgent = document.getElementById("itemUrgent").checked;

        if (isMealGroup) {
          const mealName = document.getElementById("mealName").value.trim();
          const mealItems = document.getElementById("mealItems").value.trim();
          await addMeal(mealName, mealItems, isUrgent);
          showToast(`${mealName} added as a meal group.`);
        } else {
          const name = document.getElementById("itemName").value.trim();
          const note = document.getElementById("itemNote").value.trim();
          await addItem(name, note, isUrgent);
        }

        elements.addEntryForm.reset();
        updateMealFields();
        if (isPhoneLayout()) {
          closeAddComposer();
        } else {
          updateAddPanel();
        }
        await loadItems();
        await loadNotifications();
        renderItems();
        renderActivity();
      } catch (error) {
        showToast(error.message || "Unable to save item.");
      }
    });

    elements.groupViewButton.addEventListener("click", () => {
      state.listMode = "groups";
      updateListModeButtons();
      renderItems();
    });

    elements.categoryViewButton.addEventListener("click", () => {
      state.listMode = "categories";
      updateListModeButtons();
      renderItems();
    });

    wireQuickAddButtons();
  }

  async function init() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("shopping-sw.js").catch(() => {});
    }

    if (!window.ShoppingAuth?.hasConfig()) {
      elements.householdSummary.textContent = "Add your Supabase settings to shopping-cloud-config.js to continue.";
      return;
    }

    state.client = window.ShoppingAuth.getClient();
    state.session = await window.ShoppingAuth.requireSession("shopping-login.html");

    if (!state.session) {
      return;
    }

    wireEvents();
    updateInvitePanel();
    updateAddPanel();
    updateWoolworthsPanel();
    updateWoolworthsPriceStatus();
    updateMealFields();
    resetRecipeScan();
    updateRecentToggle();
    updateListModeButtons();
    await refreshApp();
  }

  window.addEventListener("resize", updateAddPanel);
  window.addEventListener("pointerdown", handleComposerOutsidePointer);
  window.addEventListener("beforeunload", removeChannels);
  init().catch((error) => {
    showToast(error.message || "Unable to load the app.");
  });
})();





































