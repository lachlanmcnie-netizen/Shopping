
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
    tempLists: [],
    activeTab: "shopping",
    memberships: [],
    membershipsError: "",
    selectedMembershipId: null,
    receipts: [],
    trackedLists: [],
    receiptScan: {
      items: [],
      storeName: "",
      receiptDate: "",
      totalAmount: null,
      imageName: "",
      imageFile: null
    },
    analyticsRange: "current-month",
    analyticsPanel: "scan",
    analyticsOpenReceiptIds: new Set(),
    analyticsOpenCategoryNames: new Set(),
    analyticsSelectedHistoryItemId: null,
    itemInfoSearch: "",
    trackedListRange: "current-financial-year",
    trackedReportOpenIds: new Set(),
    recipes: [],
    showNotes: false,
    recipeSearch: "",
    notesPanel: "notes",
    personalNotes: [],
    notesDueDateVisible: false,
    notesCalendarMonth: "",
    notesCalendarSelectedDate: ""
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
    backToLoginButton: document.getElementById("backToLoginButton"),
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
    toggleNotesButton: document.getElementById("toggleNotesButton"),
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
    notepadHint: document.getElementById("notepadHint"),
    appHeader: document.getElementById("appHeader"),
    tabBar: document.getElementById("tabBar"),
    membershipsPane: document.getElementById("membershipsPane"),
    membershipForm: document.getElementById("membershipForm"),
    membershipShopName: document.getElementById("membershipShopName"),
    membershipBarcodeInput: document.getElementById("membershipBarcodeInput"),
    membershipTextInput: document.getElementById("membershipTextInput"),
    addMembershipButton: document.getElementById("addMembershipButton"),
    membershipsList: document.getElementById("membershipsList"),
    membershipsEmptyState: document.getElementById("membershipsEmptyState"),
    membershipViewer: document.getElementById("membershipViewer"),
    membershipViewerTitle: document.getElementById("membershipViewerTitle"),
    membershipViewerImage: document.getElementById("membershipViewerImage"),
    membershipBarcodeFrame: document.getElementById("membershipBarcodeFrame"),
    membershipTextFrame: document.getElementById("membershipTextFrame"),
    membershipViewerText: document.getElementById("membershipViewerText"),
    closeMembershipViewerButton: document.getElementById("closeMembershipViewerButton"),
    deleteMembershipButton: document.getElementById("deleteMembershipButton"),
    notesPane: document.getElementById("notesPane"),
    notesModeButton: document.getElementById("notesModeButton"),
    notesListsModeButton: document.getElementById("notesListsModeButton"),
    notesCalendarModeButton: document.getElementById("notesCalendarModeButton"),
    notesListsSubpane: document.getElementById("notesListsSubpane"),
    notesForm: document.getElementById("notesForm"),
    noteInput: document.getElementById("noteInput"),
    noteDueDateToggle: document.getElementById("noteDueDateToggle"),
    noteDueDateWrap: document.getElementById("noteDueDateWrap"),
    noteDueDateInput: document.getElementById("noteDueDateInput"),
    addNoteButton: document.getElementById("addNoteButton"),
    notesList: document.getElementById("notesList"),
    notesEmptyState: document.getElementById("notesEmptyState"),
    notesCalendarTitle: document.getElementById("notesCalendarTitle"),
    notesCalendarGrid: document.getElementById("notesCalendarGrid"),
    notesCalendarPrev: document.getElementById("notesCalendarPrev"),
    notesCalendarNext: document.getElementById("notesCalendarNext"),
    notesCalendarSelectedDate: document.getElementById("notesCalendarSelectedDate"),
    notesCalendarForm: document.getElementById("notesCalendarForm"),
    notesCalendarNoteInput: document.getElementById("notesCalendarNoteInput"),
    receiptImageInput: document.getElementById("receiptImageInput"),
    takeReceiptPhotoButton: document.getElementById("takeReceiptPhotoButton"),
    chooseReceiptImageButton: document.getElementById("chooseReceiptImageButton"),
    receiptScanStatus: document.getElementById("receiptScanStatus"),
    receiptScanResults: document.getElementById("receiptScanResults"),
    receiptStoreName: document.getElementById("receiptStoreName"),
    receiptDate: document.getElementById("receiptDate"),
    receiptTotal: document.getElementById("receiptTotal"),
    receiptItemsEditor: document.getElementById("receiptItemsEditor"),
    receiptTrackListSelect: document.getElementById("receiptTrackListSelect"),
    newTrackedListFromReceiptButton: document.getElementById("newTrackedListFromReceiptButton"),
    saveReceiptButton: document.getElementById("saveReceiptButton"),
    clearReceiptButton: document.getElementById("clearReceiptButton"),
    analyticsSectionTabs: document.getElementById("analyticsSectionTabs"),
    pastReceiptsContent: document.getElementById("pastReceiptsContent"),
    itemInfoSearchInput: document.getElementById("itemInfoSearchInput"),
    itemInfoContent: document.getElementById("itemInfoContent"),
    analyticsContent: document.getElementById("analyticsContent"),
    trackedListsContent: document.getElementById("trackedListsContent"),
    trackedListsEmpty: document.getElementById("trackedListsEmpty"),
    newTrackedListForm: document.getElementById("newTrackedListForm"),
    newTrackedListTitle: document.getElementById("newTrackedListTitle"),
    recipeBooksPane: document.getElementById("recipeBooksPane"),
    toggleRecipeAddButton: document.getElementById("toggleRecipeAddButton"),
    recipeAddForm: document.getElementById("recipeAddForm"),
    recipePasteInput: document.getElementById("recipePasteInput"),
    parseRecipeButton: document.getElementById("parseRecipeButton"),
    recipeParsedPreview: document.getElementById("recipeParsedPreview"),
    parsedRecipeName: document.getElementById("parsedRecipeName"),
    parsedIngredientsList: document.getElementById("parsedIngredientsList"),
    cancelRecipeButton: document.getElementById("cancelRecipeButton"),
    recipeBooksList: document.getElementById("recipeBooksList"),
    recipeBooksEmptyState: document.getElementById("recipeBooksEmptyState"),
    recipeDetailOverlay: document.getElementById("recipeDetailOverlay"),
    recipeDetailName: document.getElementById("recipeDetailName"),
    recipeDetailCount: document.getElementById("recipeDetailCount"),
    recipeDetailIngredients: document.getElementById("recipeDetailIngredients"),
    closeRecipeDetailButton: document.getElementById("closeRecipeDetailButton"),
    addRecipeToListButton: document.getElementById("addRecipeToListButton"),
    deleteRecipeButton: document.getElementById("deleteRecipeButton"),
    recipeDetailBodyWrap: document.getElementById("recipeDetailBodyWrap"),
    recipeDetailBody: document.getElementById("recipeDetailBody"),
    recipeDetailLastAdded: document.getElementById("recipeDetailLastAdded"),
    recipeSearchInput: document.getElementById("recipeSearchInput"),
    recipeMethodPaste: document.getElementById("recipeMethodPaste"),
    recipeMethodPhoto: document.getElementById("recipeMethodPhoto"),
    recipeMethodUrl: document.getElementById("recipeMethodUrl"),
    recipeBookImageInput: document.getElementById("recipeBookImageInput"),
    takeRecipeBookPhotoButton: document.getElementById("takeRecipeBookPhotoButton"),
    chooseRecipeBookImageButton: document.getElementById("chooseRecipeBookImageButton"),
    recipeBookScanStatus: document.getElementById("recipeBookScanStatus"),
    recipeUrlInput: document.getElementById("recipeUrlInput"),
    fetchRecipeUrlButton: document.getElementById("fetchRecipeUrlButton"),
    recipeUrlStatus: document.getElementById("recipeUrlStatus"),
    householdModal: document.getElementById("householdModal"),
    householdModalName: document.getElementById("householdModalName"),
    closeHouseholdModalButton: document.getElementById("closeHouseholdModalButton")
  };

  /* ── Tab switching ────────────────────────────────────────── */
  function switchTab(name) {
    if (name === "lists") {
      state.notesPanel = "lists";
      name = "notes";
    }
    state.activeTab = name;
    const panes = {
      shopping: elements.listPanel,
      memberships: elements.membershipsPane,
      notes: elements.notesPane,
      recipes: elements.recipeBooksPane,
      household: elements.sidebarPanel
    };
    Object.entries(panes).forEach(([key, pane]) => {
      if (pane) pane.classList.toggle("hidden", key !== name);
    });
    document.querySelectorAll("#tabBar .tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === name);
    });
    if (name === "notes") {
      updateNotesPanel();
      renderNotes()
        .then(() => updateNotesPanel())
        .catch((err) => showToast(err.message || "Could not load notes."));
      renderTempLists();
    }
    if (name === "memberships") {
      loadMemberships()
        .then(() => renderMemberships())
        .catch((err) => {
          state.membershipsError = err.message || "Could not load memberships.";
          renderMemberships();
        });
    }
    if (name === "recipes") {
      loadRecipes().then(() => renderRecipeBooks()).catch((err) => showToast(err.message || "Could not load recipes."));
    }
    if (name === "household") {
      Promise.all([loadReceipts(), loadTrackedLists()])
        .then(() => {
          renderAnalytics();
          renderPastReceipts();
          renderItemInformation();
          renderTrackedLists();
          updateTrackedListSelect();
          updateAnalyticsPanel();
        })
        .catch((err) => showToast(err.message || "Could not load household data."));
    }
  }

  // Wire tab-bar clicks once (event delegation)
  if (elements.tabBar) {
    elements.tabBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-btn");
      if (btn && btn.dataset.tab) switchTab(btn.dataset.tab);
    });
  }

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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
    if (elements.composerBackdrop) {
      elements.composerBackdrop.classList.add("hidden");
      elements.composerBackdrop.classList.remove("is-visible");
    }
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
      .replace(/[|ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦]/g, " ")
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
          quantity: String(item?.quantity || "").trim(),
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

    const MAX_FILE_SIZE_MB = 15;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new Error(`Image is too large (max ${MAX_FILE_SIZE_MB} MB). Try a smaller photo.`);
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
    if (!state.household || !state.session) {
      throw new Error("Not connected to a household.");
    }

    const selectedItems = state.recipeScan.items
      .filter((item) => item.selected && String(item.name || "").trim())
      .map((item) => ({ ...item, name: String(item.name || "").trim() }));
    const mealName = elements.scannedMealName.value.trim();
    const isUrgent = document.getElementById("itemUrgent").checked;

    if (!selectedItems.length) {
      throw new Error("Choose at least one scanned ingredient to add.");
    }

    if (!mealName) {
      throw new Error("Add the meal name before saving scanned ingredients.");
    }

    const payload = selectedItems.map((item, index) => ({
      household_id: state.household.id,
      name: item.name,
      note: item.quantity || "",
      is_urgent: isUrgent,
      created_by: state.session.user.id,
      meal_group: mealName,
      meal_item_order: index
    }));

    const { error } = await state.client.from("shopping_items").insert(payload);
    if (error) throw error;
    await emitNotification("item_added", `${mealName} meal`, isUrgent);

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
    elements.shoppingList.classList.toggle("notes-visible", state.showNotes);
    elements.recentShoppingList.classList.toggle("notes-visible", state.showNotes);

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
      meta.textContent = `${list.items.length} item${list.items.length === 1 ? "" : "s"} \u00B7 Added by ${owner}`;

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
      addButton.className = "circle-plus-btn";
      addButton.textContent = "+";
      addButton.setAttribute("aria-label", "Add item");

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

  function getSafeMembershipFileName(file) {
    const rawName = file?.name || "barcode.jpg";
    const parts = rawName.split(".");
    const ext = (parts.length > 1 ? parts.pop() : "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const base = parts.join(".").replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "barcode";
    return `${base}.${ext}`;
  }

  function getSelectedMembership() {
    return state.memberships.find((membership) => membership.id === state.selectedMembershipId) || null;
  }

  async function addSignedMembershipUrls(memberships) {
    return Promise.all((memberships || []).map(async (membership) => {
      if (!membership.image_path) return { ...membership, imageUrl: "" };
      const { data, error } = await state.client.storage
        .from("membership-barcodes")
        .createSignedUrl(membership.image_path, 60 * 60);
      return { ...membership, imageUrl: error ? "" : (data?.signedUrl || "") };
    }));
  }

  async function loadMemberships() {
    if (!state.household) {
      state.memberships = [];
      state.membershipsError = "";
      return;
    }

    let result = await state.client
      .from("shopping_memberships")
      .select("id, household_id, shop_name, image_path, image_filename, membership_text, created_by, created_at")
      .eq("household_id", state.household.id)
      .order("shop_name", { ascending: true });

    if (result.error && String(result.error.message || "").includes("membership_text")) {
      result = await state.client
        .from("shopping_memberships")
        .select("id, household_id, shop_name, image_path, image_filename, created_by, created_at")
        .eq("household_id", state.household.id)
        .order("shop_name", { ascending: true });
    }

    const { data, error } = result;
    if (error) {
      state.memberships = [];
      state.membershipsError = "Memberships need the latest database update. Re-run supabase-shopping-schema.sql, then refresh.";
      throw new Error(state.membershipsError);
    }

    state.memberships = await addSignedMembershipUrls(data || []);
    state.membershipsError = "";
    if (state.selectedMembershipId && !getSelectedMembership()) {
      state.selectedMembershipId = null;
    }
  }

  async function createMembership(shopName, file, membershipText) {
    if (!state.household) throw new Error("No household loaded.");
    if (!shopName) throw new Error("Add the shop name first.");
    if (!file && !membershipText) throw new Error("Add a barcode picture or membership number first.");

    let imagePath = null;
    let safeName = null;
    if (file) {
      safeName = getSafeMembershipFileName(file);
      imagePath = `${state.household.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await state.client.storage
        .from("membership-barcodes")
        .upload(imagePath, file, { upsert: false });
      if (uploadError) {
        throw new Error("Barcode upload failed: " + uploadError.message);
      }
    }

    const { error: insertError } = await state.client
      .from("shopping_memberships")
      .insert({
        household_id: state.household.id,
        shop_name: shopName,
        image_path: imagePath,
        image_filename: file ? (file.name || safeName) : null,
        membership_text: membershipText || null,
        created_by: state.session.user.id
      });

    if (insertError) {
      if (imagePath) {
        await state.client.storage.from("membership-barcodes").remove([imagePath]).catch(() => {});
      }
      throw insertError;
    }
  }

  async function deleteSelectedMembership() {
    const membership = getSelectedMembership();
    if (!membership) return;

    const { error } = await state.client
      .from("shopping_memberships")
      .delete()
      .eq("id", membership.id);
    if (error) throw error;

    if (membership.image_path) {
      state.client.storage.from("membership-barcodes").remove([membership.image_path]).catch(() => {});
    }

    state.selectedMembershipId = null;
    await loadMemberships();
    renderMemberships();
  }

  function showMembershipViewer(membershipId) {
    state.selectedMembershipId = membershipId;
    renderMembershipViewer();
    if (elements.membershipViewer) {
      elements.membershipViewer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderMembershipViewer() {
    if (!elements.membershipViewer) return;
    const membership = getSelectedMembership();
    elements.membershipViewer.classList.toggle("hidden", !membership);
    if (!membership) return;

    if (elements.membershipViewerTitle) elements.membershipViewerTitle.textContent = membership.shop_name || "Membership";
    if (elements.membershipBarcodeFrame) elements.membershipBarcodeFrame.classList.toggle("hidden", !membership.imageUrl);
    if (elements.membershipTextFrame) elements.membershipTextFrame.classList.toggle("hidden", !membership.membership_text);
    if (elements.membershipViewerImage) {
      elements.membershipViewerImage.src = membership.imageUrl || "";
      elements.membershipViewerImage.alt = `${membership.shop_name || "Membership"} barcode`;
    }
    if (elements.membershipViewerText) {
      elements.membershipViewerText.textContent = membership.membership_text || "";
    }
  }

  function renderMemberships() {
    if (!elements.membershipsList || !elements.membershipsEmptyState) return;
    elements.membershipsList.innerHTML = "";

    if (state.membershipsError) {
      elements.membershipsEmptyState.classList.remove("hidden");
      elements.membershipsEmptyState.querySelector(".message").textContent = state.membershipsError;
      renderMembershipViewer();
      return;
    }

    const hasMemberships = state.memberships.length > 0;
    elements.membershipsEmptyState.classList.toggle("hidden", hasMemberships);
    elements.membershipsEmptyState.querySelector(".message").textContent = "No memberships yet. Add a barcode picture or membership number above.";

    state.memberships.forEach((membership) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "membership-card";
      card.addEventListener("click", () => showMembershipViewer(membership.id));

      const thumb = document.createElement("span");
      thumb.className = "membership-thumb";
      if (membership.imageUrl) {
        const img = document.createElement("img");
        img.src = membership.imageUrl;
        img.alt = "";
        thumb.appendChild(img);
      } else {
        thumb.textContent = "Number";
      }

      const copy = document.createElement("span");
      copy.className = "membership-card-copy";
      const title = document.createElement("span");
      title.className = "membership-card-title";
      title.textContent = membership.shop_name || "Membership";
      const meta = document.createElement("span");
      meta.className = "membership-card-meta";
      meta.textContent = membership.membership_text
        ? `Tap to show ${membership.imageUrl ? "barcode and number" : "number"}`
        : "Tap to show barcode";
      copy.appendChild(title);
      copy.appendChild(meta);

      card.appendChild(thumb);
      card.appendChild(copy);
      elements.membershipsList.appendChild(card);
    });

    renderMembershipViewer();
  }

  function renderHouseholdState() {
    const hasHousehold = Boolean(state.household);
    elements.householdPanel.classList.toggle("hidden", hasHousehold);

    // Show/hide app chrome
    if (elements.appHeader) elements.appHeader.classList.toggle("hidden", !hasHousehold);
    if (elements.tabBar) elements.tabBar.classList.toggle("hidden", !hasHousehold);

    if (hasHousehold) {
      // Activate the last active tab, or default to shopping
      switchTab(state.activeTab || "shopping");
    } else {
      // Hide all tab panes when signed out
      [elements.listPanel, elements.membershipsPane, elements.notesPane, elements.recipeBooksPane, elements.sidebarPanel].forEach((p) => {
        if (p) p.classList.add("hidden");
      });
    }

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
    renderMemberships();
  }

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
      channel.unsubscribe();
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
    const membershipsChannel = state.client
      .channel(`shopping-memberships-${state.household.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_memberships",
          filter: `household_id=eq.${state.household.id}`
        },
        async () => {
          try {
            await loadMemberships();
            if (state.activeTab === "memberships") renderMemberships();
          } catch (error) {
            state.membershipsError = error.message || "Could not load memberships.";
            if (state.activeTab === "memberships") renderMemberships();
          }
        }
      )
      .subscribe();
    const recipesChannel = state.client
      .channel(`shopping-recipes-${state.household.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_recipes",
          filter: `household_id=eq.${state.household.id}`
        },
        async () => {
          await loadRecipes();
          if (state.activeTab === "recipes") renderRecipeBooks();
        }
      )
      .subscribe();

    state.channels.push(itemsChannel, notificationsChannel, tempListsChannel, membershipsChannel, recipesChannel);
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
    await loadTempLists();
    try {
      await loadMemberships();
    } catch (error) {
      state.membershipsError = error.message || "Could not load memberships.";
    }
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
    if (elements.composerCard.contains(target) || (elements.mobileComposerButton && elements.mobileComposerButton.contains(target))) {
      return;
    }

    closeAddComposer();
  }

  /* ── Personal notes (Supabase – private via RLS) ──────────── */

  function formatNoteDate(isoString) {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
  }

  function setNotesLoading(isLoading) {
    if (elements.addNoteButton) {
      elements.addNoteButton.disabled = isLoading;
      elements.addNoteButton.textContent = isLoading ? "Saving…" : "Add note";
    }
  }

  function getTodayDateValue() {
    return toDateInputValue(new Date());
  }

  function getNotesCalendarMonthValue() {
    return state.notesCalendarMonth || getTodayDateValue().slice(0, 7);
  }

  function formatDueDate(dateString) {
    if (!dateString) return "";
    return new Date(`${dateString}T00:00:00`).toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  async function loadPersonalNotes() {
    if (!state.client) return [];
    const { data, error } = await state.client
      .from("shopping_personal_notes")
      .select("id, text, done, due_date, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      if (String(error.message || "").toLowerCase().includes("due_date")) {
        const fallback = await state.client
          .from("shopping_personal_notes")
          .select("id, text, done, created_at")
          .order("created_at", { ascending: false });
        if (fallback.error) throw fallback.error;
        state.personalNotes = (fallback.data || []).map((note) => ({ ...note, due_date: null }));
        showToast("Run notes-due-date-schema-update.sql to enable note due dates.");
        return state.personalNotes;
      }
      throw error;
    }
    state.personalNotes = data || [];
    return state.personalNotes;
  }

  async function createPersonalNote(text, dueDate = null) {
    const payload = { text, done: false };
    if (dueDate) payload.due_date = dueDate;
    const { error } = await state.client
      .from("shopping_personal_notes")
      .insert(payload);
    if (error) throw error;
  }

  async function updatePersonalNoteDueDate(noteId, dueDate) {
    const { error } = await state.client
      .from("shopping_personal_notes")
      .update({ due_date: dueDate || null })
      .eq("id", noteId);
    if (error) throw error;
    state.personalNotes = state.personalNotes.map((note) => (
      note.id === noteId ? { ...note, due_date: dueDate || null } : note
    ));
  }

  function attachListsToNotesPane() {
    const notesShell = document.querySelector("#notesPane .notes-shell");
    if (!notesShell || !elements.notesListsSubpane) return;
    if (elements.notesListsSubpane.parentElement !== notesShell) {
      notesShell.appendChild(elements.notesListsSubpane);
    }
  }

  function updateNotesPanel() {
    attachListsToNotesPane();
    const activePanel = state.notesPanel || "notes";
    document.querySelectorAll("#notesPane .notes-subpane").forEach((pane) => {
      pane.classList.toggle("hidden", pane.dataset.notesPanel !== activePanel);
    });
    if (elements.notesModeButton) elements.notesModeButton.classList.toggle("active", activePanel === "notes");
    if (elements.notesCalendarModeButton) elements.notesCalendarModeButton.classList.toggle("active", activePanel === "calendar");
    if (elements.notesListsModeButton) elements.notesListsModeButton.classList.toggle("active", activePanel === "lists");
    if (activePanel === "calendar") renderNotesCalendar();
  }

  async function renderNotes() {
    if (!elements.notesList || !state.client) return;

    let notes = [];
    try {
      notes = await loadPersonalNotes();
    } catch (error) {
      elements.notesList.innerHTML = "";
      showToast("Could not load notes: " + error.message);
      return;
    }

    elements.notesList.innerHTML = "";

    if (!notes || !notes.length) {
      elements.notesEmptyState.classList.remove("hidden");
      renderNotesCalendar();
      return;
    }
    elements.notesEmptyState.classList.add("hidden");

    notes.forEach((note) => {
      const card = document.createElement("div");
      card.className = `note-card${note.done ? " done" : ""}`;
      card.dataset.id = note.id;

      const content = document.createElement("div");
      content.className = "note-content";

      const body = document.createElement("p");
      body.className = "note-body";
      body.textContent = note.text;

      const meta = document.createElement("span");
      meta.className = "note-meta";
      meta.textContent = formatNoteDate(note.created_at);

      const due = document.createElement("span");
      due.className = `note-due${note.due_date ? "" : " hidden"}`;
      due.textContent = note.due_date ? `Due ${formatDueDate(note.due_date)}` : "";

      content.appendChild(body);
      content.appendChild(due);
      content.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "note-actions";

      const dueBtn = document.createElement("button");
      dueBtn.className = "note-date-btn";
      dueBtn.type = "button";
      dueBtn.textContent = note.due_date ? "Change date" : "Add date";
      dueBtn.addEventListener("click", async () => {
        const nextDate = window.prompt("Due date (YYYY-MM-DD). Leave blank to remove:", note.due_date || "");
        if (nextDate === null) return;
        const trimmed = nextDate.trim();
        if (trimmed && !isValidDateInputValue(trimmed)) {
          showToast("Enter the date as YYYY-MM-DD.");
          return;
        }
        try {
          await updatePersonalNoteDueDate(note.id, trimmed || null);
          await renderNotes();
        } catch (err) {
          showToast(err.message || "Could not update due date.");
        }
      });

      const doneBtn = document.createElement("button");
      doneBtn.className = "note-done-btn";
      doneBtn.type = "button";
      doneBtn.textContent = note.done ? "Undo" : "✓ Done";
      doneBtn.addEventListener("click", async () => {
        doneBtn.disabled = true;
        const { error: updateError } = await state.client
          .from("shopping_personal_notes")
          .update({ done: !note.done })
          .eq("id", note.id);
        if (updateError) {
          showToast("Could not update note.");
          doneBtn.disabled = false;
          return;
        }
        await renderNotes();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "note-delete-btn";
      deleteBtn.type = "button";
      deleteBtn.textContent = "✕";
      deleteBtn.title = "Delete note";
      deleteBtn.addEventListener("click", async () => {
        deleteBtn.disabled = true;
        const { error: deleteError } = await state.client
          .from("shopping_personal_notes")
          .delete()
          .eq("id", note.id);
        if (deleteError) {
          showToast("Could not delete note.");
          deleteBtn.disabled = false;
          return;
        }
        await renderNotes();
      });

      actions.appendChild(dueBtn);
      actions.appendChild(doneBtn);
      actions.appendChild(deleteBtn);
      card.appendChild(content);
      card.appendChild(actions);
      elements.notesList.appendChild(card);
    });
    renderNotesCalendar();
  }

  function renderNotesCalendar() {
    if (!elements.notesCalendarGrid || !elements.notesCalendarTitle) return;
    if (!state.notesCalendarSelectedDate) state.notesCalendarSelectedDate = getTodayDateValue();
    if (!state.notesCalendarMonth) state.notesCalendarMonth = state.notesCalendarSelectedDate.slice(0, 7);

    const [year, month] = getNotesCalendarMonthValue().split("-").map((part) => parseInt(part, 10));
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startOffset = firstDay.getDay();
    const monthLabel = firstDay.toLocaleDateString([], { month: "long", year: "numeric" });
    const notesByDate = new Map();
    state.personalNotes.forEach((note) => {
      if (!note.due_date) return;
      const list = notesByDate.get(note.due_date) || [];
      list.push(note);
      notesByDate.set(note.due_date, list);
    });

    elements.notesCalendarTitle.textContent = monthLabel;
    if (elements.notesCalendarSelectedDate) elements.notesCalendarSelectedDate.value = state.notesCalendarSelectedDate;
    elements.notesCalendarGrid.innerHTML = "";

    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
      const head = document.createElement("span");
      head.className = "notes-calendar-weekday";
      head.textContent = day;
      elements.notesCalendarGrid.appendChild(head);
    });

    for (let i = 0; i < startOffset; i += 1) {
      const spacer = document.createElement("span");
      spacer.className = "notes-calendar-spacer";
      elements.notesCalendarGrid.appendChild(spacer);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateValue = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const notes = notesByDate.get(dateValue) || [];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `notes-calendar-day${dateValue === state.notesCalendarSelectedDate ? " selected" : ""}${notes.length ? " has-notes" : ""}`;
      btn.dataset.date = dateValue;
      btn.innerHTML = `<strong>${day}</strong>${notes.slice(0, 2).map((note) => `<span>${escapeHtml(note.text)}</span>`).join("")}${notes.length > 2 ? `<em>+${notes.length - 2} more</em>` : ""}`;
      btn.addEventListener("click", () => {
        state.notesCalendarSelectedDate = dateValue;
        if (elements.notesCalendarSelectedDate) elements.notesCalendarSelectedDate.value = dateValue;
        renderNotesCalendar();
      });
      elements.notesCalendarGrid.appendChild(btn);
    }
  }

  /* ── Receipt scanning ────────────────────────────────────── */

  async function prepareReceiptImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const maxDim = 1600;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
            else { width = Math.round(width * maxDim / height); height = maxDim; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function scanReceiptImage(file) {
    if (!file) return;

    const MAX_FILE_SIZE_MB = 15;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new Error(`Image is too large (max ${MAX_FILE_SIZE_MB} MB). Try a smaller photo.`);
    }

    if (!appConfig.receiptScanFunctionUrl || appConfig.receiptScanFunctionUrl.includes("YOUR_PROJECT")) {
      throw new Error("Receipt scan needs the function URL set in shopping-cloud-config.js.");
    }
    state.receiptScan.imageName = file.name || "receipt";
    state.receiptScan.imageFile = file;
    if (elements.receiptScanStatus) elements.receiptScanStatus.textContent = `Scanning ${state.receiptScan.imageName}…`;
    if (elements.receiptScanResults) elements.receiptScanResults.classList.add("hidden");

    const imageDataUrl = await prepareReceiptImage(file);
    let response;
    try {
      response = await fetch(appConfig.receiptScanFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: appConfig.supabaseAnonKey || "",
          Authorization: `Bearer ${state.session.access_token}`
        },
        body: JSON.stringify({ imageDataUrl })
      });
    } catch (err) {
      throw new TypeError("Could not reach the receipt scan function — check CORS/network.");
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404) throw new Error("Receipt scan function not deployed yet.");
      throw new Error(payload.error || "Receipt scan failed.");
    }

    state.receiptScan.items = (payload.items || []).map((item) => ({
      ...item,
      included: true,
      tracked: false,
      category: item.category || categoryMatcher.categorizeItem(item.name) || "Other"
    }));

    if (elements.receiptStoreName) elements.receiptStoreName.value = payload.storeName || "";
    if (elements.receiptDate) elements.receiptDate.value = payload.receiptDate || "";
    if (elements.receiptTotal) elements.receiptTotal.value = payload.totalAmount != null ? payload.totalAmount : "";

    renderReceiptScanResults();
    if (elements.receiptScanResults) elements.receiptScanResults.classList.remove("hidden");
    if (elements.receiptDate && !isValidDateInputValue(elements.receiptDate.value)) {
      showToast("No receipt date was detected.");
      const enteredDate = promptForReceiptDate();
      if (enteredDate) {
        elements.receiptDate.value = enteredDate;
      } else {
        elements.receiptDate.focus();
      }
    }
    if (elements.receiptScanStatus) elements.receiptScanStatus.textContent = `Found ${state.receiptScan.items.length} items — edit as needed, then save.`;
  }

  function renderReceiptScanResults() {
    if (!elements.receiptItemsEditor) return;
    elements.receiptItemsEditor.innerHTML = "";

    const header = document.createElement("div");
    header.className = "receipt-item-review-header";
    ["Use", "Track", "Item", "Amount", "Category"].forEach((label) => {
      const heading = document.createElement("span");
      heading.textContent = label;
      header.appendChild(heading);
    });
    elements.receiptItemsEditor.appendChild(header);

    state.receiptScan.items.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "receipt-item-review-row";
      let weightInput = null;
      let rateInput = null;
      const syncWeightedInputs = (source) => {
        if (!weightInput || !rateInput) return;
        const amount = parseFloat(state.receiptScan.items[idx].amount) || 0;
        const weight = parseFloat(weightInput.value);
        const rate = parseFloat(rateInput.value);
        if (source === "rate" && amount > 0 && Number.isFinite(rate) && rate > 0) {
          const nextWeight = amount / rate;
          weightInput.value = nextWeight.toFixed(3).replace(/\.?0+$/g, "");
          state.receiptScan.items[idx].quantity = weightInput.value;
          return;
        }
        if (source !== "rate" && amount > 0 && Number.isFinite(weight) && weight > 0) {
          rateInput.value = (amount / weight).toFixed(2);
        }
      };

      const includeBox = document.createElement("input");
      includeBox.type = "checkbox"; includeBox.checked = item.included !== false;
      includeBox.title = "Include in receipt";
      includeBox.setAttribute("aria-label", "Include item in saved receipt");
      includeBox.addEventListener("change", () => { state.receiptScan.items[idx].included = includeBox.checked; });

      const starBox = document.createElement("input");
      starBox.type = "checkbox"; starBox.className = "track-star"; starBox.checked = Boolean(item.tracked);
      starBox.title = "Add this item to the selected tracked list";
      starBox.setAttribute("aria-label", "Track this item in the selected tracked list");
      starBox.addEventListener("change", () => { state.receiptScan.items[idx].tracked = starBox.checked; });

      const nameInput = document.createElement("input");
      nameInput.type = "text"; nameInput.className = "receipt-item-name-input";
      nameInput.value = item.name || "";
      nameInput.addEventListener("input", () => { state.receiptScan.items[idx].name = nameInput.value; });

      const amtInput = document.createElement("input");
      amtInput.type = "number"; amtInput.step = "0.01"; amtInput.className = "receipt-item-amt-input";
      amtInput.value = item.amount != null ? item.amount : ""; amtInput.placeholder = "0.00";
      amtInput.addEventListener("input", () => {
        state.receiptScan.items[idx].amount = parseFloat(amtInput.value) || 0;
        syncWeightedInputs("amount");
      });

      const catSelect = document.createElement("select");
      catSelect.className = "receipt-item-cat-select";
      categoryMatcher.CATEGORY_ORDER.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat; opt.textContent = cat;
        if (cat === item.category) opt.selected = true;
        catSelect.appendChild(opt);
      });
      catSelect.addEventListener("change", () => {
        state.receiptScan.items[idx].category = catSelect.value;
        renderReceiptScanResults();
      });

      row.appendChild(includeBox);
      row.appendChild(starBox);
      row.appendChild(nameInput);
      row.appendChild(amtInput);
      row.appendChild(catSelect);
      elements.receiptItemsEditor.appendChild(row);

      if (isVariableWeightCategory(item.category)) {
        const weightRow = document.createElement("div");
        weightRow.className = "receipt-item-weight-row";

        const label = document.createElement("span");
        label.textContent = "Weighted item";

        weightInput = document.createElement("input");
        weightInput.type = "number";
        weightInput.step = "0.001";
        weightInput.min = "0";
        weightInput.className = "receipt-item-weight-input";
        weightInput.placeholder = "Weight kg";
        const currentWeight = parseFloat(state.receiptScan.items[idx].quantity);
        weightInput.value = Number.isFinite(currentWeight) && currentWeight > 0 && currentWeight <= 20 ? String(currentWeight) : "";
        weightInput.addEventListener("input", () => {
          state.receiptScan.items[idx].quantity = weightInput.value;
          syncWeightedInputs("weight");
        });

        rateInput = document.createElement("input");
        rateInput.type = "number";
        rateInput.step = "0.01";
        rateInput.min = "0";
        rateInput.className = "receipt-item-rate-input";
        rateInput.placeholder = "$/kg";
        rateInput.addEventListener("input", () => syncWeightedInputs("rate"));

        const hint = document.createElement("small");
        hint.textContent = "Enter weight or $/kg if the receipt did not scan it.";

        weightRow.appendChild(label);
        weightRow.appendChild(weightInput);
        weightRow.appendChild(rateInput);
        weightRow.appendChild(hint);
        elements.receiptItemsEditor.appendChild(weightRow);
        syncWeightedInputs("weight");
      }
    });
  }

  async function saveReceipt() {
    if (!state.household) throw new Error("No household loaded.");
    const includedItems = state.receiptScan.items.filter((i) => i.included !== false);
    const starredItems = state.receiptScan.items.filter((i) => i.tracked);
    if (!includedItems.length) throw new Error("No items to save — check at least one item.");

    const storeName = elements.receiptStoreName?.value.trim() || null;
    let receiptDate = elements.receiptDate?.value || "";
    if (!isValidDateInputValue(receiptDate)) {
      showToast("Please enter the receipt date before saving.");
      const enteredDate = promptForReceiptDate();
      if (!enteredDate) {
        elements.receiptDate?.focus();
        throw new Error("Receipt date is required before saving.");
      }
      receiptDate = enteredDate;
      if (elements.receiptDate) elements.receiptDate.value = enteredDate;
    }
    const totalAmount = parseFloat(elements.receiptTotal?.value) || null;

    let imagePath = null;
    if (state.receiptScan.imageFile) {
      const ext = (state.receiptScan.imageFile.name || "jpg").split(".").pop();
      imagePath = `${state.household.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await state.client.storage
        .from("receipt-images")
        .upload(imagePath, state.receiptScan.imageFile);
      if (uploadErr) throw new Error("Image upload failed: " + uploadErr.message);
    }

    const { data: receipt, error: recErr } = await state.client
      .from("shopping_receipts")
      .insert({ household_id: state.household.id, uploaded_by: state.session.user.id, store_name: storeName, receipt_date: receiptDate, total_amount: totalAmount, image_path: imagePath })
      .select().single();
    if (recErr) throw recErr;

    const { error: itemsErr } = await state.client.from("shopping_receipt_items").insert(
      includedItems.map((i) => ({
        receipt_id: receipt.id,
        household_id: state.household.id,
        item_name: i.name || "",
        normalized_item_name: (i.name || "").toLowerCase().trim(),
        category: i.category || "Other",
        quantity: parseFloat(i.quantity) || 0,
        line_total: parseFloat(i.amount) || 0,
        receipt_date: receiptDate
      }))
    );
    if (itemsErr) throw itemsErr;

    const trackedListId = elements.receiptTrackListSelect?.value;
    if (trackedListId && starredItems.length) {
      const { data: savedItems } = await state.client.from("shopping_receipt_items").select("id, item_name").eq("receipt_id", receipt.id);
      const trackPayload = starredItems.map((i) => ({
        tracked_list_id: trackedListId,
        receipt_item_id: savedItems?.find((s) => s.item_name === i.name)?.id || null,
        name: i.name,
        amount: i.amount || null,
        created_by: state.session.user.id
      }));
      const { error: trackErr } = await state.client.from("shopping_tracked_list_items").insert(trackPayload);
      if (trackErr) throw trackErr;
    }

    state.receiptScan = { items: [], storeName: "", receiptDate: "", totalAmount: null, imageName: "", imageFile: null };
    if (elements.receiptScanResults) elements.receiptScanResults.classList.add("hidden");
    if (elements.receiptScanStatus) elements.receiptScanStatus.textContent = "Receipt saved successfully.";

    await Promise.all([loadReceipts(), loadTrackedLists()]);
    renderAnalytics();
    renderPastReceipts();
    renderItemInformation();
    renderTrackedLists();
    showToast(`Receipt from ${storeName || "unknown store"} saved.`);
  }

  /* ── Receipt / analytics loading ─────────────────────────── */

  async function loadReceipts() {
    if (!state.household) return;

    const { data: receipts, error } = await state.client
      .from("shopping_receipts")
      .select("id, store_name, receipt_date, total_amount, image_path, uploaded_by, created_at")
      .eq("household_id", state.household.id)
      .order("receipt_date", { ascending: false, nullsFirst: false });
    if (error) throw error;

    if (receipts && receipts.length) {
      const { data: items } = await state.client
        .from("shopping_receipt_items")
        .select("id, receipt_id, item_name, line_total, quantity, category")
        .in("receipt_id", receipts.map((r) => r.id));
      state.receipts = receipts.map((r) => ({ ...r, items: (items || []).filter((i) => i.receipt_id === r.id) }));
    } else {
      state.receipts = [];
    }
  }

  async function loadTrackedLists() {
    if (!state.household) return;
    const { data: lists, error } = await state.client
      .from("shopping_tracked_lists")
      .select("id, name, created_by, created_at")
      .eq("household_id", state.household.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    if (lists && lists.length) {
      const { data: items } = await state.client
        .from("shopping_tracked_list_items")
        .select("id, tracked_list_id, receipt_item_id, name, amount, note, created_at")
        .in("tracked_list_id", lists.map((l) => l.id))
        .order("created_at", { ascending: true });

      const trackedItems = items || [];
      const receiptItemIds = [...new Set(trackedItems.map((item) => item.receipt_item_id).filter(Boolean))];
      let receiptDetailsByItemId = {};
      if (receiptItemIds.length) {
        const { data: receiptItems, error: receiptItemsError } = await state.client
          .from("shopping_receipt_items")
          .select("id, receipt_id, item_name, line_total, category")
          .in("id", receiptItemIds);
        if (receiptItemsError) throw receiptItemsError;

        const receiptIds = [...new Set((receiptItems || []).map((item) => item.receipt_id).filter(Boolean))];
        let receiptsById = {};
        if (receiptIds.length) {
          const { data: receipts, error: receiptsError } = await state.client
            .from("shopping_receipts")
            .select("id, store_name, receipt_date, total_amount")
            .in("id", receiptIds);
          if (receiptsError) throw receiptsError;
          receiptsById = Object.fromEntries((receipts || []).map((receipt) => [receipt.id, receipt]));
        }

        receiptDetailsByItemId = Object.fromEntries((receiptItems || []).map((item) => {
          const receipt = receiptsById[item.receipt_id] || null;
          return [item.id, receipt ? {
            id: receipt.id,
            store_name: receipt.store_name,
            receipt_date: receipt.receipt_date,
            total_amount: receipt.total_amount,
            item_name: item.item_name,
            line_total: item.line_total,
            category: item.category
          } : null];
        }));
      }

      state.trackedLists = lists.map((l) => ({
        ...l,
        items: trackedItems
          .filter((i) => i.tracked_list_id === l.id)
          .map((item) => {
            const receipt = receiptDetailsByItemId[item.receipt_item_id] || null;
            return {
              ...item,
              purchase_date: receipt?.receipt_date || null,
              receipt
            };
          })
      }));
    } else {
      state.trackedLists = [];
    }
  }

  /* ── Analytics rendering ─────────────────────────────────── */

  function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isValidDateInputValue(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
    const date = new Date(`${value}T00:00:00`);
    return Number.isFinite(date.getTime()) && toDateInputValue(date) === value;
  }

  function promptForReceiptDate(message = "No receipt date was detected. Enter the receipt date (YYYY-MM-DD):") {
    const entered = window.prompt(message, "");
    if (!entered) return "";
    const trimmed = entered.trim();
    if (!isValidDateInputValue(trimmed)) {
      showToast("Please enter the date as YYYY-MM-DD.");
      return "";
    }
    return trimmed;
  }

  function formatReceiptDate(dateString) {
    if (!dateString) return "No receipt date";
    return new Date(`${dateString}T00:00:00`).toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function addTrackedDetailLine(container, label, value) {
    const term = document.createElement("span");
    term.className = "tracked-list-detail-label";
    term.textContent = label;
    const detail = document.createElement("span");
    detail.textContent = value;
    container.appendChild(term);
    container.appendChild(detail);
  }

  function getTrackedDateRange() {
    return getAnalyticsDateRange(state.trackedListRange || "current-financial-year");
  }

  function getTrackedItemDate(item) {
    return item.purchase_date || item.receipt?.receipt_date || item.created_at?.slice(0, 10) || "";
  }

  function isTrackedItemInRange(item, dateRange) {
    if (!dateRange.start && !dateRange.end) return true;
    const date = getTrackedItemDate(item);
    return Boolean(date) && date >= dateRange.start && date <= dateRange.end;
  }

  function getFilteredTrackedItems(list, dateRange = getTrackedDateRange()) {
    return (list.items || []).filter((item) => isTrackedItemInRange(item, dateRange));
  }

  function getTrackedItemAmount(item) {
    return parseFloat(item.amount ?? item.receipt?.line_total ?? 0) || 0;
  }

  function getTrackedReportSummary(items) {
    const summary = {
      total: 0,
      count: items.length,
      byItem: new Map(),
      byCategory: new Map(),
      byStore: new Map()
    };

    items.forEach((item) => {
      const amount = getTrackedItemAmount(item);
      const itemName = item.name || item.receipt?.item_name || "Unnamed item";
      const category = item.receipt?.category || "Other";
      const store = item.receipt?.store_name || "Unknown store";
      summary.total += amount;
      summary.byItem.set(itemName, (summary.byItem.get(itemName) || 0) + amount);
      summary.byCategory.set(category, (summary.byCategory.get(category) || 0) + amount);
      summary.byStore.set(store, (summary.byStore.get(store) || 0) + amount);
    });

    return summary;
  }

  function getTrackedRangeLabel(dateRange) {
    if (!dateRange.start && !dateRange.end) return "All time";
    return `${dateRange.label}: ${formatReceiptDate(dateRange.start)} to ${formatReceiptDate(dateRange.end)}`;
  }

  function escapeXml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function slugifyFileName(value) {
    const slug = String(value || "tracked-list")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "tracked-list";
  }

  function downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function buildExcelCell(value, type = "String") {
    const safeValue = type === "Number" ? String(Number(value) || 0) : escapeXml(value);
    return `<Cell><Data ss:Type="${type}">${safeValue}</Data></Cell>`;
  }

  function exportTrackedListReport(list) {
    const dateRange = getTrackedDateRange();
    const items = getFilteredTrackedItems(list, dateRange)
      .slice()
      .sort((a, b) => getTrackedItemDate(a).localeCompare(getTrackedItemDate(b)));
    const summary = getTrackedReportSummary(items);
    if (!items.length) {
      showToast(`No "${list.name}" items in ${dateRange.label}.`);
      return;
    }

    const rows = [
      `<Row>${buildExcelCell("Tracked list report")}${buildExcelCell(list.name)}</Row>`,
      `<Row>${buildExcelCell("Period")}${buildExcelCell(getTrackedRangeLabel(dateRange))}</Row>`,
      `<Row>${buildExcelCell("Total")}${buildExcelCell(summary.total, "Number")}</Row>`,
      `<Row>${buildExcelCell("Items")}${buildExcelCell(summary.count, "Number")}</Row>`,
      "<Row></Row>",
      `<Row>${buildExcelCell("Item summary")}${buildExcelCell("Total")}</Row>`,
      ...[...summary.byItem.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => `<Row>${buildExcelCell(name)}${buildExcelCell(amount, "Number")}</Row>`),
      "<Row></Row>",
      `<Row>${buildExcelCell("Date")}${buildExcelCell("Store")}${buildExcelCell("Item")}${buildExcelCell("Category")}${buildExcelCell("Amount")}${buildExcelCell("Receipt item")}${buildExcelCell("Added")}</Row>`,
      ...items.map((item) => `<Row>${
        buildExcelCell(getTrackedItemDate(item))
      }${
        buildExcelCell(item.receipt?.store_name || "")
      }${
        buildExcelCell(item.name || item.receipt?.item_name || "")
      }${
        buildExcelCell(item.receipt?.category || "Other")
      }${
        buildExcelCell(getTrackedItemAmount(item), "Number")
      }${
        buildExcelCell(item.receipt?.item_name || "")
      }${
        buildExcelCell(formatNoteDate(item.created_at))
      }</Row>`)
    ];

    const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Tracked Report">
    <Table>${rows.join("")}</Table>
  </Worksheet>
</Workbook>`;

    const filename = `${slugifyFileName(list.name)}-${slugifyFileName(dateRange.label)}.xls`;
    downloadTextFile(filename, workbook, "application/vnd.ms-excel;charset=utf-8");
  }

  function getAnalyticsDateRange(rangeOverride) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const range = rangeOverride || state.analyticsRange || "current-month";

    if (range === "all-time") {
      return { start: "", end: "", label: "all time" };
    }

    if (range === "last-month") {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { start: toDateInputValue(start), end: toDateInputValue(end), label: "last month" };
    }

    if (range === "current-financial-year" || range === "last-financial-year") {
      const currentFyStartYear = month >= 3 ? year : year - 1;
      const startYear = range === "last-financial-year" ? currentFyStartYear - 1 : currentFyStartYear;
      const start = new Date(startYear, 3, 1);
      const end = new Date(startYear + 1, 2, 31);
      const label = range === "last-financial-year" ? "last NZ financial year" : "current NZ financial year";
      return { start: toDateInputValue(start), end: toDateInputValue(end), label };
    }

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start: toDateInputValue(start), end: toDateInputValue(end), label: "current month" };
  }

  function renderAnalyticsCategoryOptions(selectedCategory) {
    const selected = selectedCategory || "Other";
    const categories = categoryMatcher.CATEGORY_ORDER.includes(selected)
      ? categoryMatcher.CATEGORY_ORDER
      : [...categoryMatcher.CATEGORY_ORDER, selected];
    return categories.map((category) => (
      `<option value="${escapeHtml(category)}"${category === selected ? " selected" : ""}>${escapeHtml(category)}</option>`
    )).join("");
  }

  const VARIABLE_WEIGHT_CATEGORIES = new Set(["Fruit", "Vegetables", "Meat", "Seafood", "Deli & Chilled"]);

  function isVariableWeightCategory(category) {
    return VARIABLE_WEIGHT_CATEGORIES.has(category || "");
  }

  function getQuantityAsManualWeightMeasurement(item) {
    const quantity = parseFloat(item?.quantity);
    if (!isVariableWeightCategory(item?.category) || !Number.isFinite(quantity) || quantity <= 0 || quantity > 20) return null;
    if (Math.abs(quantity - Math.round(quantity)) <= 0.001) return null;
    const measurement = normalizeMeasurementValue(quantity, "kg");
    return measurement ? { ...measurement, fromQuantity: true } : null;
  }

  function normalizeReceiptProductName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/\b\d+\s*(?:x|pk|pack of)\s*\d+(?:\.\d+)?\s*(?:kg|g|mg|l|litres?|liters?|ml)\b/g, " ")
      .replace(/\b\d+(?:\.\d+)?\s*(?:kg|g|mg|l|litres?|liters?|ml)\b/g, " ")
      .replace(/\b(can|cans|tin|tins|bottle|bottles|carton|cartons|jar|jars|bag|bags|box|boxes|pack|packs|packet|packets|pkt|pouch|pouches|each|ea)\b/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeReceiptFullName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeMeasurementValue(amount, unit) {
    const value = parseFloat(amount);
    const normalizedUnit = String(unit || "").toLowerCase();
    if (!Number.isFinite(value) || value <= 0) return null;

    if (["kg"].includes(normalizedUnit)) return { group: "weight", baseValue: value, displayValue: value >= 1 ? `${formatMeasurementNumber(value)}kg` : `${Math.round(value * 1000)}g` };
    if (["g"].includes(normalizedUnit)) return { group: "weight", baseValue: value / 1000, displayValue: value >= 1000 ? `${formatMeasurementNumber(value / 1000)}kg` : `${formatMeasurementNumber(value)}g` };
    if (["mg"].includes(normalizedUnit)) return { group: "weight", baseValue: value / 1000000, displayValue: `${formatMeasurementNumber(value)}mg` };
    if (["l", "litre", "litres", "liter", "liters"].includes(normalizedUnit)) return { group: "volume", baseValue: value, displayValue: value >= 1 ? `${formatMeasurementNumber(value)}l` : `${Math.round(value * 1000)}ml` };
    if (normalizedUnit === "ml") return { group: "volume", baseValue: value / 1000, displayValue: value >= 1000 ? `${formatMeasurementNumber(value / 1000)}l` : `${formatMeasurementNumber(value)}ml` };
    return null;
  }

  function formatMeasurementNumber(value) {
    return Number(value).toFixed(3).replace(/\.?0+$/g, "");
  }

  function getReceiptItemMeasurement(item) {
    const name = item?.item_name || "";
    const packMatch = name.match(/\b(\d+)\s*(?:x|pk|pack of)\s*(\d+(?:\.\d+)?)\s*(kg|g|mg|l|litres?|liters?|ml)\b/i);
    if (packMatch) {
      const perPack = normalizeMeasurementValue(packMatch[2], packMatch[3]);
      if (perPack) {
        return {
          ...perPack,
          packCount: parseInt(packMatch[1], 10),
          signature: `${parseInt(packMatch[1], 10)}x${perPack.displayValue}`
        };
      }
    }

    const manualWeight = getQuantityAsManualWeightMeasurement(item);
    if (manualWeight) return { ...manualWeight, signature: manualWeight.displayValue };

    const matches = [...name.matchAll(/\b(\d+(?:\.\d+)?)\s*(kg|g|mg|l|litres?|liters?|ml)\b/gi)];
    if (!matches.length) return null;

    const last = matches[matches.length - 1];
    const measurement = normalizeMeasurementValue(last[1], last[2]);
    if (!measurement) return null;
    return { ...measurement, signature: measurement.displayValue };
  }

  function isLikelyVariableWeightItem(item, measurement) {
    if (!measurement || measurement.group !== "weight") return false;
    if (measurement.fromQuantity) return true;
    const category = item.category || "Other";
    const quantity = parseFloat(item.quantity);
    const decimalQuantity = Number.isFinite(quantity) && quantity > 0 && Math.abs(quantity - Math.round(quantity)) > 0.001;
    const grams = measurement.baseValue * 1000;
    const commonPackGrams = [100, 125, 150, 180, 200, 250, 300, 400, 410, 420, 425, 450, 500, 750, 900, 1000, 1500, 2000];
    const commonPack = commonPackGrams.some((pack) => Math.abs(grams - pack) <= 2);
    return decimalQuantity || (isVariableWeightCategory(category) && !commonPack);
  }

  function getReceiptItemIdentity(item) {
    const measurement = getReceiptItemMeasurement(item);
    const productName = normalizeReceiptProductName(item.item_name);
    const fallbackName = normalizeReceiptFullName(item.item_name);
    const baseName = productName || fallbackName || "item";
    const variableWeight = isLikelyVariableWeightItem(item, measurement);

    if (variableWeight) {
      return {
        key: `${baseName}|per-kg`,
        label: baseName,
        compareLabel: "Matched as variable weight and normalized to kg.",
        priceUnit: "per kg",
        mode: "variable-weight",
        measurement
      };
    }

    if (measurement?.signature) {
      return {
        key: `${baseName}|${measurement.signature}`,
        label: `${baseName} ${measurement.signature}`,
        compareLabel: `Matched by same product and size (${measurement.signature}).`,
        priceUnit: "per item",
        mode: "fixed-size",
        measurement
      };
    }

    return {
      key: fallbackName,
      label: fallbackName || "item",
      compareLabel: "Matched by item name. Sizes are kept separate when the scan finds one.",
      priceUnit: "per item",
      mode: "name-only",
      measurement: null
    };
  }

  function getReceiptItemComparablePrice(item, identity) {
    const lineTotal = parseFloat(item.line_total) || 0;
    if (identity.mode === "variable-weight" && identity.measurement?.baseValue) {
      return lineTotal / identity.measurement.baseValue;
    }

    const quantityCount = getReceiptItemQuantityCount(item, identity, lineTotal);
    if (quantityCount > 1) {
      return lineTotal / quantityCount;
    }

    return lineTotal;
  }

  function getReceiptItemQuantityCount(item, identity, lineTotal) {
    const quantity = parseFloat(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 1) return 1;

    const roundedQuantity = Math.round(quantity);
    if (Math.abs(quantity - roundedQuantity) > 0.001) return 1;
    if (roundedQuantity > 20) return 1;

    const measurement = identity?.measurement;
    if (measurement?.baseValue) {
      const closeToMeasurement = (value) => Math.abs(quantity - value) <= 0.01;
      if (closeToMeasurement(measurement.baseValue) || closeToMeasurement(measurement.baseValue * 1000)) {
        return 1;
      }
    }

    const unitPrice = lineTotal / roundedQuantity;
    if (!Number.isFinite(unitPrice) || unitPrice < 0.1) {
      return 1;
    }

    return roundedQuantity;
  }

  function getReceiptItemPriceBasisText(item, identity, lineTotal) {
    if (identity.mode === "variable-weight" && identity.measurement?.baseValue) {
      if (identity.measurement.fromQuantity) {
        return `Used recorded weight ${identity.measurement.displayValue}, shown ${identity.priceUnit}`;
      }
      return `Used ${identity.measurement.displayValue} weight, shown ${identity.priceUnit}`;
    }

    const quantityCount = getReceiptItemQuantityCount(item, identity, lineTotal);
    if (quantityCount > 1) {
      return `Divided by quantity ${quantityCount}, shown ${identity.priceUnit}`;
    }

    return `Used line total, shown ${identity.priceUnit}`;
  }

  function findReceiptItemById(itemId) {
    for (const receipt of state.receipts) {
      const item = (receipt.items || []).find((entry) => entry.id === itemId);
      if (item) return { receipt, item };
    }
    return null;
  }

  function getReceiptPriceHistory(itemId) {
    const selected = findReceiptItemById(itemId);
    if (!selected) return null;

    const identity = getReceiptItemIdentity(selected.item);
    const points = state.receipts
      .flatMap((receipt) => (receipt.items || []).map((item) => ({ receipt, item })))
      .filter(({ receipt, item }) => receipt.receipt_date && getReceiptItemIdentity(item).key === identity.key)
      .map(({ receipt, item }) => {
        const lineTotal = parseFloat(item.line_total) || 0;
        return {
          id: item.id,
          date: receipt.receipt_date,
          store: receipt.store_name || "Unknown store",
          itemName: item.item_name,
          lineTotal,
          quantity: parseFloat(item.quantity) || 0,
          price: getReceiptItemComparablePrice(item, identity),
          basis: getReceiptItemPriceBasisText(item, identity, lineTotal)
        };
      })
      .filter((point) => Number.isFinite(point.price) && point.price > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    return { selected, identity, points };
  }

  function renderPriceHistorySvg(points) {
    const width = 620;
    const height = 220;
    const padLeft = 54;
    const padRight = 18;
    const padTop = 18;
    const padBottom = 44;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;
    const prices = points.map((point) => point.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const spread = Math.max(0.01, maxPrice - minPrice);
    const yMin = Math.max(0, minPrice - spread * 0.15);
    const yMax = maxPrice + spread * 0.15;
    const xFor = (index) => padLeft + (points.length === 1 ? chartW / 2 : (index / (points.length - 1)) * chartW);
    const yFor = (price) => padTop + (1 - ((price - yMin) / Math.max(0.01, yMax - yMin))) * chartH;
    const pointCoords = points.map((point, index) => `${xFor(index).toFixed(1)},${yFor(point.price).toFixed(1)}`).join(" ");
    const firstDate = formatReceiptDate(points[0].date);
    const lastDate = formatReceiptDate(points[points.length - 1].date);
    const yTicks = [yMin, (yMin + yMax) / 2, yMax];
    const ticks = yTicks.map((value) => {
      const y = yFor(value);
      return `<g><line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${width - padRight}" y2="${y.toFixed(1)}"/><text x="${padLeft - 8}" y="${(y + 4).toFixed(1)}">${escapeHtml(formatCurrency(value))}</text></g>`;
    }).join("");

    const circles = points.map((point, index) => {
      const x = xFor(index);
      const y = yFor(point.price);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"><title>${escapeHtml(`${formatReceiptDate(point.date)} - ${formatCurrency(point.price)}`)}</title></circle>`;
    }).join("");

    return `
      <svg class="price-history-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Price history chart">
        <g class="price-history-grid">${ticks}</g>
        <line class="price-history-axis" x1="${padLeft}" y1="${height - padBottom}" x2="${width - padRight}" y2="${height - padBottom}"/>
        <polyline class="price-history-line" points="${pointCoords}"/>
        <g class="price-history-points">${circles}</g>
        <text class="price-history-date-label" x="${padLeft}" y="${height - 14}">${escapeHtml(firstDate)}</text>
        <text class="price-history-date-label end" x="${width - padRight}" y="${height - 14}">${escapeHtml(lastDate)}</text>
      </svg>`;
  }

  function getLatestStorePriceComparison(points) {
    const latestByStore = new Map();
    points.forEach((point) => {
      if (!point.date || !Number.isFinite(point.price) || point.price <= 0) return;
      const storeKey = String(point.store || "Unknown store").trim().toLowerCase();
      const current = latestByStore.get(storeKey);
      if (!current || point.date > current.date) {
        latestByStore.set(storeKey, point);
      }
    });

    const latestStorePoints = [...latestByStore.values()];
    if (latestStorePoints.length < 2) return null;

    const newestDate = latestStorePoints.reduce((newest, point) => point.date > newest ? point.date : newest, latestStorePoints[0].date);
    const cutoffDate = new Date(`${newestDate}T00:00:00`);
    cutoffDate.setMonth(cutoffDate.getMonth() - 3);
    const cutoffValue = toDateInputValue(cutoffDate);
    const comparablePoints = latestStorePoints.filter((point) => point.date >= cutoffValue && point.date <= newestDate);
    if (comparablePoints.length < 2) {
      return { comparablePoints, newestDate, cutoffValue, cheapest: null };
    }

    comparablePoints.sort((a, b) => a.price - b.price || b.date.localeCompare(a.date));
    return {
      comparablePoints,
      newestDate,
      cutoffValue,
      cheapest: comparablePoints[0]
    };
  }

  function renderStorePriceComparison(points, priceUnit) {
    const comparison = getLatestStorePriceComparison(points);
    if (!comparison) return "";

    if (!comparison.cheapest) {
      return `
        <div class="price-history-store-compare muted">
          <strong>Shop comparison</strong>
          <span>No cheapest recent shop yet.</span>
        </div>`;
    }

    return `
      <div class="price-history-store-compare">
        <strong>Cheapest recent shop: ${escapeHtml(comparison.cheapest.store)}</strong>
        <span>${escapeHtml(formatCurrency(comparison.cheapest.price))} ${escapeHtml(priceUnit)} on ${escapeHtml(formatReceiptDate(comparison.cheapest.date))}</span>
      </div>`;
  }

  function renderPriceHistoryPanel() {
    if (!state.analyticsSelectedHistoryItemId) return "";
    const history = getReceiptPriceHistory(state.analyticsSelectedHistoryItemId);
    if (!history) return "";

    const points = history.points;
    const latest = points[points.length - 1] || null;
    const oldest = points[0] || null;
    const average = points.reduce((sum, point) => sum + point.price, 0) / Math.max(1, points.length);
    const change = latest && oldest && points.length > 1 ? latest.price - oldest.price : 0;
    const changeText = points.length > 1
      ? `${change >= 0 ? "+" : ""}${formatCurrency(change)} since first scan`
      : "Only one matching scan so far";
    const rows = points.slice(-8).reverse().map((point) => `
      <div class="price-history-row${point.id === state.analyticsSelectedHistoryItemId ? " selected" : ""}">
        <span>${escapeHtml(formatReceiptDate(point.date))}</span>
        <span class="price-history-source">
          <strong>${escapeHtml(point.store)}</strong>
          <small>Scanned text: ${escapeHtml(point.itemName || "Unknown item")}</small>
          <small>Recorded weight/qty: ${escapeHtml(point.quantity || "none")} - Line total: ${escapeHtml(formatCurrency(point.lineTotal))} - ${escapeHtml(point.basis)}</small>
        </span>
        <strong>${escapeHtml(formatCurrency(point.price))}</strong>
      </div>`).join("");

    return `
      <section class="price-history-panel">
        <div class="price-history-head">
          <div>
            <p class="eyebrow">Price History</p>
            <h4>${escapeHtml(history.selected.item.item_name || "Item")}</h4>
            <p class="helper-text">${escapeHtml(history.identity.compareLabel)} Showing ${escapeHtml(formatCurrency(average))} average ${escapeHtml(history.identity.priceUnit)}.</p>
          </div>
          <button class="secondary analytics-icon-btn price-history-close-btn" type="button" title="Close price history" aria-label="Close price history">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>
          </button>
        </div>
        <div class="price-history-stats">
          <span><strong>${points.length}</strong> scans</span>
          <span><strong>${latest ? escapeHtml(formatCurrency(latest.price)) : "$0.00"}</strong> latest</span>
          <span><strong>${escapeHtml(changeText)}</strong></span>
        </div>
        ${renderStorePriceComparison(points, history.identity.priceUnit)}
        ${points.length ? renderPriceHistorySvg(points) : `<p class="helper-text">No dated receipt scans found for this item yet.</p>`}
        <div class="price-history-rows">${rows}</div>
      </section>`;
  }

  async function saveAnalyticsReceiptItem(itemId, itemName, category, quantityValue) {
    const nextName = String(itemName || "").trim();
    const nextCategory = category || "Other";
    const hasQuantityValue = quantityValue != null;
    const nextQuantity = parseFloat(quantityValue) || 0;
    if (!nextName) {
      showToast("Item name cannot be blank.");
      return false;
    }

    const updatePayload = {
      item_name: nextName,
      normalized_item_name: nextName.toLowerCase(),
      category: nextCategory
    };
    if (hasQuantityValue) updatePayload.quantity = nextQuantity;

    const { error } = await state.client
      .from("shopping_receipt_items")
      .update(updatePayload)
      .eq("id", itemId);
    if (error) throw error;

    state.receipts = state.receipts.map((receipt) => ({
      ...receipt,
      items: (receipt.items || []).map((item) => (
        item.id === itemId
          ? { ...item, item_name: nextName, category: nextCategory, ...(hasQuantityValue ? { quantity: nextQuantity } : {}) }
          : item
      ))
    }));
    return true;
  }

  async function deleteAnalyticsReceiptItem(itemId) {
    const receipt = state.receipts.find((r) => (r.items || []).some((item) => item.id === itemId));
    const item = receipt?.items?.find((receiptItem) => receiptItem.id === itemId);
    if (!item) return;

    const { error: unlinkError } = await state.client
      .from("shopping_tracked_list_items")
      .update({ receipt_item_id: null })
      .eq("receipt_item_id", itemId);
    if (unlinkError) throw unlinkError;

    const { error: itemError } = await state.client
      .from("shopping_receipt_items")
      .delete()
      .eq("id", itemId);
    if (itemError) throw itemError;

    state.receipts = state.receipts.map((r) => (
      r.id === receipt.id
        ? { ...r, items: (r.items || []).filter((receiptItem) => receiptItem.id !== itemId) }
        : r
    ));
    state.trackedLists = state.trackedLists.map((list) => ({
      ...list,
      items: (list.items || []).map((trackedItem) => (
        trackedItem.receipt_item_id === itemId ? { ...trackedItem, receipt_item_id: null, receipt: null, purchase_date: null } : trackedItem
      ))
    }));
  }

  async function deleteReceipt(receiptId) {
    const receipt = state.receipts.find((r) => r.id === receiptId);
    if (!receipt) return;

    const itemIds = (receipt.items || []).map((item) => item.id).filter(Boolean);
    if (itemIds.length) {
      const { error: unlinkError } = await state.client
        .from("shopping_tracked_list_items")
        .update({ receipt_item_id: null })
        .in("receipt_item_id", itemIds);
      if (unlinkError) throw unlinkError;

      const { error: itemsError } = await state.client
        .from("shopping_receipt_items")
        .delete()
        .eq("receipt_id", receiptId);
      if (itemsError) throw itemsError;
    }

    const { error: receiptError } = await state.client
      .from("shopping_receipts")
      .delete()
      .eq("id", receiptId);
    if (receiptError) throw receiptError;

    if (receipt.image_path) {
      state.client.storage.from("receipt-images").remove([receipt.image_path]).catch(() => {});
    }

    state.receipts = state.receipts.filter((r) => r.id !== receiptId);
    state.analyticsOpenReceiptIds.delete(receiptId);
    state.trackedLists = state.trackedLists.map((list) => ({
      ...list,
      items: (list.items || []).map((item) => (
        itemIds.includes(item.receipt_item_id) ? { ...item, receipt_item_id: null } : item
      ))
    }));
  }

  async function saveReceiptDate(receiptId, receiptDate) {
    if (!isValidDateInputValue(receiptDate)) {
      throw new Error("Enter a valid receipt date.");
    }

    const { error: receiptError } = await state.client
      .from("shopping_receipts")
      .update({ receipt_date: receiptDate })
      .eq("id", receiptId);
    if (receiptError) throw receiptError;

    const { error: itemsError } = await state.client
      .from("shopping_receipt_items")
      .update({ receipt_date: receiptDate })
      .eq("receipt_id", receiptId);
    if (itemsError) throw itemsError;

    state.receipts = state.receipts.map((receipt) => (
      receipt.id === receiptId
        ? {
            ...receipt,
            receipt_date: receiptDate,
            items: (receipt.items || []).map((item) => ({ ...item, receipt_date: receiptDate }))
          }
        : receipt
    ));

    state.trackedLists = state.trackedLists.map((list) => ({
      ...list,
      items: (list.items || []).map((item) => (
        item.receipt?.id === receiptId
          ? { ...item, purchase_date: receiptDate, receipt: { ...item.receipt, receipt_date: receiptDate } }
          : item
      ))
    }));
  }

  function renderAnalyticsEditableItem(item, options = {}) {
    const metaText = options.metaText
      ? `<span class="analytics-receipt-item-meta">${escapeHtml(options.metaText)}</span>`
      : "";
    const quantity = parseFloat(item.quantity);
    const weightValue = Number.isFinite(quantity) && quantity > 0 && quantity <= 20 ? formatMeasurementNumber(quantity) : "";
    const weightEdit = isVariableWeightCategory(item.category)
      ? `<label class="analytics-receipt-item-weight-edit">
          <span>Weight kg</span>
          <input class="analytics-receipt-item-weight" type="number" min="0" step="0.001" value="${escapeHtml(weightValue)}" data-original-value="${escapeHtml(weightValue)}" aria-label="Receipt item weight in kilograms">
        </label>`
      : "";
    return `
        <div class="analytics-receipt-item" data-item-id="${escapeHtml(item.id)}">
          <div class="analytics-receipt-item-name-wrap">
            <div class="analytics-receipt-item-main-row">
              <input class="analytics-receipt-item-name" type="text" value="${escapeHtml(item.item_name)}" aria-label="Receipt item name" data-original-value="${escapeHtml(item.item_name)}">
              <span class="analytics-category-control" title="Change category">
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 10.5 13.5 4H5v8.5L11.5 19a2.1 2.1 0 0 0 3 0l5.5-5.5a2.1 2.1 0 0 0 0-3Z"/><circle cx="8.5" cy="7.5" r="1.3"/></svg>
                <select class="analytics-receipt-item-category" aria-label="Receipt item category" data-original-value="${escapeHtml(item.category || "Other")}">
                  ${renderAnalyticsCategoryOptions(item.category)}
                </select>
              </span>
              <button class="secondary analytics-icon-btn analytics-save-item-btn" data-item-id="${escapeHtml(item.id)}" type="button" title="Save item changes" aria-label="Save item changes" disabled>
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v6h7V4"/><path d="M8 17h8"/></svg>
              </button>
              <button class="secondary analytics-icon-btn analytics-track-btn" data-item-id="${escapeHtml(item.id)}" data-item-name="${escapeHtml(item.item_name)}" data-item-amt="${item.line_total || 0}" type="button" title="Track item" aria-label="Track item">
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/></svg>
              </button>
              <button class="secondary analytics-icon-btn analytics-history-btn" data-item-id="${escapeHtml(item.id)}" type="button" title="Price history" aria-label="Price history">
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 4-6"/></svg>
              </button>
              <button class="secondary analytics-icon-btn analytics-delete-item-btn" data-item-id="${escapeHtml(item.id)}" data-item-name="${escapeHtml(item.item_name)}" type="button" title="Delete item" aria-label="Delete item">
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>
              </button>
            </div>
            ${metaText}
            ${weightEdit}
          </div>
          <span class="analytics-bar-amt">${formatCurrency(item.line_total || 0)}</span>
        </div>`;
  }

  function renderAnalytics() {
    if (!elements.analyticsContent) return;
    const dateRange = getAnalyticsDateRange();
    const receipts = state.receipts.filter((r) => (
      r.receipt_date && r.receipt_date >= dateRange.start && r.receipt_date <= dateRange.end
    ));

    if (!receipts.length) {
      elements.analyticsContent.innerHTML = `<p class="helper-text">No receipts for ${dateRange.label} - scan one above to get started.</p>`;
      return;
    }

    const total = receipts.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
    const allItems = receipts.flatMap((r) => (r.items || []).map((item) => ({
      ...item,
      receiptStoreName: r.store_name || "Unknown store",
      receiptDate: r.receipt_date || null
    })));

    const byCategory = {};
    allItems.forEach((item) => {
      const cat = item.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + (parseFloat(item.line_total) || 0);
    });
    const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxAmt = sortedCats.length ? sortedCats[0][1] : 1;

    const barsHtml = sortedCats.map(([cat, amt], idx) => {
      const categoryItems = allItems.filter((item) => (item.category || "Other") === cat);
      const expandedClass = state.analyticsOpenCategoryNames.has(cat) ? "" : " hidden";
      const itemsHtml = categoryItems.map((item) => renderAnalyticsEditableItem(item, {
        metaText: `${item.receiptStoreName} - ${formatReceiptDate(item.receiptDate)}`
      })).join("");
      return `
        <div class="analytics-bar-row" role="button" tabindex="0" aria-expanded="${state.analyticsOpenCategoryNames.has(cat)}" data-category="${escapeHtml(cat)}" data-category-panel="category-items-${idx}">
          <span class="analytics-bar-cat">${escapeHtml(cat)}</span>
          <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${Math.round((amt / maxAmt) * 100)}%"></div></div>
          <span class="analytics-bar-amt">${formatCurrency(amt)}</span>
        </div>
        <div class="analytics-category-items${expandedClass}" id="category-items-${idx}">${itemsHtml}</div>`;
    }).join("");

    const receiptsHtml = receipts.map((r) => {
      const dateStr = r.receipt_date ? new Date(r.receipt_date + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "No date";
      const itemsHtml = (r.items || []).map((item) => renderAnalyticsEditableItem(item)).join("");
      const expandedClass = state.analyticsOpenReceiptIds.has(r.id) ? "" : " hidden";
      return `
        <div class="analytics-receipt-row" data-receipt-id="${escapeHtml(r.id)}">
          <div class="analytics-receipt-copy">
            <span class="analytics-receipt-store">${escapeHtml(r.store_name || "Unknown store")}</span>
            <span class="helper-text" style="font-size:0.78rem">${dateStr} - ${(r.items || []).length} items</span>
            <label class="analytics-receipt-date-edit">
              <span>Date</span>
              <input class="analytics-receipt-date-input" type="date" value="${escapeHtml(r.receipt_date || "")}" data-original-value="${escapeHtml(r.receipt_date || "")}" aria-label="Receipt date">
              <button class="secondary analytics-receipt-date-save" type="button" data-receipt-id="${escapeHtml(r.id)}" disabled>Save</button>
            </label>
          </div>
          <span class="analytics-receipt-total">${formatCurrency(r.total_amount || 0)}</span>
          ${r.image_path ? `<button class="secondary analytics-icon-btn analytics-view-btn" data-receipt-id="${escapeHtml(r.id)}" type="button" title="View receipt image" aria-label="View receipt image"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg></button>` : `<span class="analytics-receipt-action-spacer"></span>`}
          <button class="secondary analytics-icon-btn analytics-delete-btn" data-receipt-id="${escapeHtml(r.id)}" type="button" title="Delete receipt" aria-label="Delete receipt"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg></button>
        </div>
        <div class="analytics-receipt-items${expandedClass}" id="ri-${escapeHtml(r.id)}">${itemsHtml}</div>`;
    }).join("");

    elements.analyticsContent.innerHTML = `
      <div class="analytics-summary">
        <div class="analytics-stat"><span class="analytics-stat-label">Total spent</span><span class="analytics-stat-value">${formatCurrency(total)}</span></div>
        <div class="analytics-stat"><span class="analytics-stat-label">Receipts</span><span class="analytics-stat-value">${receipts.length}</span></div>
        <div class="analytics-stat"><span class="analytics-stat-label">Items</span><span class="analytics-stat-value">${allItems.length}</span></div>
      </div>
      ${renderPriceHistoryPanel()}
      ${sortedCats.length ? `<div><p class="eyebrow" style="margin:0 0 8px">By category</p><div class="analytics-bars">${barsHtml}</div></div>` : ""}`;

    elements.analyticsContent.querySelectorAll(".analytics-bar-row").forEach((row) => {
      const toggleCategory = () => {
        const panel = document.getElementById(row.dataset.categoryPanel);
        if (!panel) return;
        panel.classList.toggle("hidden");
        const isOpen = !panel.classList.contains("hidden");
        row.setAttribute("aria-expanded", String(isOpen));
        if (isOpen) {
          state.analyticsOpenCategoryNames.add(row.dataset.category);
        } else {
          state.analyticsOpenCategoryNames.delete(row.dataset.category);
        }
      };
      row.addEventListener("click", toggleCategory);
      row.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        toggleCategory();
      });
    });
    elements.analyticsContent.querySelectorAll(".analytics-receipt-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        const el = document.getElementById(`ri-${row.dataset.receiptId}`);
        if (!el) return;
        el.classList.toggle("hidden");
        if (el.classList.contains("hidden")) {
          state.analyticsOpenReceiptIds.delete(row.dataset.receiptId);
        } else {
          state.analyticsOpenReceiptIds.add(row.dataset.receiptId);
        }
      });
    });
    elements.analyticsContent.querySelectorAll(".analytics-receipt-item").forEach((row) => {
      const nameInput = row.querySelector(".analytics-receipt-item-name");
      const categorySelect = row.querySelector(".analytics-receipt-item-category");
      const weightInput = row.querySelector(".analytics-receipt-item-weight");
      const saveButton = row.querySelector(".analytics-save-item-btn");
      const updateSaveState = () => {
        const dirty = nameInput.value.trim() !== nameInput.dataset.originalValue
          || categorySelect.value !== categorySelect.dataset.originalValue
          || (weightInput && weightInput.value !== weightInput.dataset.originalValue);
        saveButton.disabled = !dirty;
      };
      nameInput.addEventListener("input", updateSaveState);
      categorySelect.addEventListener("change", updateSaveState);
      weightInput?.addEventListener("input", updateSaveState);
      saveButton.addEventListener("click", async (e) => {
        e.stopPropagation();
        saveButton.disabled = true;
        saveButton.classList.add("is-loading");
        saveButton.setAttribute("aria-label", "Saving item changes");
        saveButton.title = "Saving item changes";
        try {
          const saved = await saveAnalyticsReceiptItem(row.dataset.itemId, nameInput.value, categorySelect.value, weightInput ? weightInput.value : null);
          if (!saved) {
            saveButton.disabled = false;
            saveButton.classList.remove("is-loading");
            saveButton.setAttribute("aria-label", "Save item changes");
            saveButton.title = "Save item changes";
            return;
          }
          showToast("Receipt item updated.");
          renderAnalytics();
        } catch (err) {
          showToast(err.message || "Could not update receipt item.");
          saveButton.disabled = false;
          saveButton.classList.remove("is-loading");
          saveButton.setAttribute("aria-label", "Save item changes");
          saveButton.title = "Save item changes";
        }
      });
    });
    elements.analyticsContent.querySelectorAll(".analytics-history-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.analyticsSelectedHistoryItemId = btn.dataset.itemId;
        renderAnalytics();
        elements.analyticsContent.querySelector(".price-history-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    elements.analyticsContent.querySelector(".price-history-close-btn")?.addEventListener("click", () => {
      state.analyticsSelectedHistoryItemId = null;
      renderAnalytics();
    });
    elements.analyticsContent.querySelectorAll(".analytics-view-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const rec = state.receipts.find((r) => r.id === btn.dataset.receiptId);
        if (!rec?.image_path) return;
        try {
          const { data, error } = await state.client.storage.from("receipt-images").createSignedUrl(rec.image_path, 120);
          if (error) throw error;
          window.open(data.signedUrl, "_blank");
        } catch { showToast("Could not open receipt image."); }
      });
    });
    elements.analyticsContent.querySelectorAll(".analytics-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const receipt = state.receipts.find((r) => r.id === btn.dataset.receiptId);
        const label = receipt?.store_name || "this receipt";
        if (!window.confirm(`Delete ${label}? This removes the saved receipt and its item rows.`)) return;
        btn.disabled = true;
        btn.textContent = "Deleting...";
        try {
          await deleteReceipt(btn.dataset.receiptId);
          showToast("Receipt deleted.");
          renderAnalytics();
          renderTrackedLists();
        } catch (err) {
          showToast(err.message || "Could not delete receipt.");
          btn.disabled = false;
          btn.textContent = "Delete";
        }
      });
    });
    elements.analyticsContent.querySelectorAll(".analytics-track-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const itemRow = btn.closest(".analytics-receipt-item");
        const currentName = itemRow?.querySelector(".analytics-receipt-item-name")?.value?.trim();
        showTrackItemDialog(btn.dataset.itemId, currentName || btn.dataset.itemName, parseFloat(btn.dataset.itemAmt) || 0);
      });
    });
    elements.analyticsContent.querySelectorAll(".analytics-delete-item-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const name = btn.dataset.itemName || "this item";
        if (!window.confirm(`Delete "${name}" from this receipt?`)) return;
        btn.disabled = true;
        btn.classList.add("is-loading");
        try {
          await deleteAnalyticsReceiptItem(btn.dataset.itemId);
          showToast("Receipt item deleted.");
          renderAnalytics();
          renderTrackedLists();
        } catch (err) {
          showToast(err.message || "Could not delete receipt item.");
          btn.disabled = false;
          btn.classList.remove("is-loading");
        }
      });
    });
  }

  function updateAnalyticsPanel() {
    document.querySelectorAll(".analytics-panel").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.analyticsPanel !== state.analyticsPanel);
    });
    document.querySelectorAll("#analyticsSectionTabs [data-analytics-panel]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.analyticsPanel === state.analyticsPanel);
    });

    if (state.analyticsPanel === "money") renderAnalytics();
    if (state.analyticsPanel === "receipts") renderPastReceipts();
    if (state.analyticsPanel === "tracked") renderTrackedLists();
    if (state.analyticsPanel === "info") renderItemInformation();
  }

  function renderPastReceipts() {
    if (!elements.pastReceiptsContent) return;

    const receipts = [...state.receipts].sort((a, b) => {
      const aDate = a.receipt_date || a.created_at || "";
      const bDate = b.receipt_date || b.created_at || "";
      return bDate.localeCompare(aDate);
    });

    if (!receipts.length) {
      elements.pastReceiptsContent.innerHTML = `<p class="helper-text">No receipts scanned yet - scan one above.</p>`;
      return;
    }

    const receiptsHtml = receipts.map((r) => {
      const dateStr = r.receipt_date ? new Date(r.receipt_date + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "No date";
      const itemsHtml = (r.items || []).map((item) => renderAnalyticsEditableItem(item)).join("");
      const expandedClass = state.analyticsOpenReceiptIds.has(r.id) ? "" : " hidden";
      return `
        <div class="analytics-receipt-row" data-receipt-id="${escapeHtml(r.id)}">
          <div class="analytics-receipt-copy">
            <span class="analytics-receipt-store">${escapeHtml(r.store_name || "Unknown store")}</span>
            <span class="helper-text" style="font-size:0.78rem">${dateStr} - ${(r.items || []).length} items</span>
          </div>
          <span class="analytics-receipt-total">${formatCurrency(r.total_amount || 0)}</span>
          ${r.image_path ? `<button class="secondary analytics-icon-btn analytics-view-btn" data-receipt-id="${escapeHtml(r.id)}" type="button" title="View receipt image" aria-label="View receipt image"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg></button>` : `<span class="analytics-receipt-action-spacer"></span>`}
          <button class="secondary analytics-icon-btn analytics-delete-btn" data-receipt-id="${escapeHtml(r.id)}" type="button" title="Delete receipt" aria-label="Delete receipt"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg></button>
        </div>
        <div class="analytics-receipt-items${expandedClass}" id="ri-${escapeHtml(r.id)}">${itemsHtml}</div>`;
    }).join("");

    elements.pastReceiptsContent.innerHTML = `<div class="analytics-receipts-list">${receiptsHtml}</div>`;
    wireReceiptPanels(elements.pastReceiptsContent);
  }

  function wireReceiptPanels(container) {
    container.querySelectorAll(".analytics-receipt-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest("button,input,select,label")) return;
        const el = document.getElementById(`ri-${row.dataset.receiptId}`);
        if (!el) return;
        el.classList.toggle("hidden");
        if (el.classList.contains("hidden")) {
          state.analyticsOpenReceiptIds.delete(row.dataset.receiptId);
        } else {
          state.analyticsOpenReceiptIds.add(row.dataset.receiptId);
        }
      });
    });

    container.querySelectorAll(".analytics-receipt-date-edit").forEach((wrap) => {
      const input = wrap.querySelector(".analytics-receipt-date-input");
      const button = wrap.querySelector(".analytics-receipt-date-save");
      if (!input || !button) return;
      input.addEventListener("input", () => {
        button.disabled = input.value === input.dataset.originalValue;
      });
      button.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!isValidDateInputValue(input.value)) {
          showToast("Enter a valid receipt date.");
          input.focus();
          return;
        }
        button.disabled = true;
        button.textContent = "Saving";
        try {
          await saveReceiptDate(button.dataset.receiptId, input.value);
          showToast("Receipt date updated.");
          renderPastReceipts();
          renderAnalytics();
          renderTrackedLists();
          renderItemInformation();
        } catch (err) {
          showToast(err.message || "Could not update receipt date.");
          button.disabled = false;
          button.textContent = "Save";
        }
      });
    });

    container.querySelectorAll(".analytics-receipt-item").forEach((row) => {
      const nameInput = row.querySelector(".analytics-receipt-item-name");
      const categorySelect = row.querySelector(".analytics-receipt-item-category");
      const weightInput = row.querySelector(".analytics-receipt-item-weight");
      const saveButton = row.querySelector(".analytics-save-item-btn");
      const updateSaveState = () => {
        const dirty = nameInput.value.trim() !== nameInput.dataset.originalValue
          || categorySelect.value !== categorySelect.dataset.originalValue
          || (weightInput && weightInput.value !== weightInput.dataset.originalValue);
        saveButton.disabled = !dirty;
      };
      nameInput.addEventListener("input", updateSaveState);
      categorySelect.addEventListener("change", updateSaveState);
      weightInput?.addEventListener("input", updateSaveState);
      saveButton.addEventListener("click", async (e) => {
        e.stopPropagation();
        saveButton.disabled = true;
        saveButton.classList.add("is-loading");
        try {
          const saved = await saveAnalyticsReceiptItem(row.dataset.itemId, nameInput.value, categorySelect.value, weightInput ? weightInput.value : null);
          if (!saved) return;
          showToast("Receipt item updated.");
          renderPastReceipts();
          renderAnalytics();
          renderItemInformation();
        } catch (err) {
          showToast(err.message || "Could not update receipt item.");
          saveButton.disabled = false;
          saveButton.classList.remove("is-loading");
        }
      });
    });

    container.querySelectorAll(".analytics-history-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.analyticsSelectedHistoryItemId = btn.dataset.itemId;
        state.analyticsPanel = "info";
        renderItemInformation();
        updateAnalyticsPanel();
      });
    });

    container.querySelectorAll(".analytics-view-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const rec = state.receipts.find((r) => r.id === btn.dataset.receiptId);
        if (!rec?.image_path) return;
        try {
          const { data, error } = await state.client.storage.from("receipt-images").createSignedUrl(rec.image_path, 120);
          if (error) throw error;
          window.open(data.signedUrl, "_blank");
        } catch { showToast("Could not open receipt image."); }
      });
    });

    container.querySelectorAll(".analytics-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const receipt = state.receipts.find((r) => r.id === btn.dataset.receiptId);
        const label = receipt?.store_name || "this receipt";
        if (!window.confirm(`Delete ${label}? This removes the saved receipt and its item rows.`)) return;
        btn.disabled = true;
        try {
          await deleteReceipt(btn.dataset.receiptId);
          showToast("Receipt deleted.");
          renderPastReceipts();
          renderAnalytics();
          renderItemInformation();
          renderTrackedLists();
        } catch (err) {
          showToast(err.message || "Could not delete receipt.");
          btn.disabled = false;
        }
      });
    });

    container.querySelectorAll(".analytics-track-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const itemRow = btn.closest(".analytics-receipt-item");
        const currentName = itemRow?.querySelector(".analytics-receipt-item-name")?.value?.trim();
        showTrackItemDialog(btn.dataset.itemId, currentName || btn.dataset.itemName, parseFloat(btn.dataset.itemAmt) || 0);
      });
    });

    container.querySelectorAll(".analytics-delete-item-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const name = btn.dataset.itemName || "this item";
        if (!window.confirm(`Delete "${name}" from this receipt?`)) return;
        btn.disabled = true;
        btn.classList.add("is-loading");
        try {
          await deleteAnalyticsReceiptItem(btn.dataset.itemId);
          showToast("Receipt item deleted.");
          renderPastReceipts();
          renderAnalytics();
          renderItemInformation();
          renderTrackedLists();
        } catch (err) {
          showToast(err.message || "Could not delete receipt item.");
          btn.disabled = false;
          btn.classList.remove("is-loading");
        }
      });
    });
  }

  function getItemInfoGroups() {
    const query = normalizeReceiptFullName(state.itemInfoSearch || "");
    const groups = new Map();

    state.receipts.forEach((receipt) => {
      (receipt.items || []).forEach((item) => {
        const fullName = normalizeReceiptFullName(item.item_name);
        if (query && !fullName.includes(query)) return;

        const identity = getReceiptItemIdentity(item);
        if (!groups.has(identity.key)) {
          groups.set(identity.key, {
            key: identity.key,
            identity,
            displayName: item.item_name || identity.label,
            count: 0,
            totalSpent: 0,
            latestDate: "",
            latestStore: "",
            representativeItemId: item.id
          });
        }

        const group = groups.get(identity.key);
        group.count += 1;
        group.totalSpent += parseFloat(item.line_total) || 0;
        const receiptDate = receipt.receipt_date || receipt.created_at || "";
        if (receiptDate >= group.latestDate) {
          group.latestDate = receiptDate;
          group.latestStore = receipt.store_name || "Unknown store";
          group.displayName = item.item_name || group.displayName;
          group.representativeItemId = item.id;
        }
      });
    });

    return [...groups.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.totalSpent - a.totalSpent;
    });
  }

  function renderItemInformation() {
    if (!elements.itemInfoContent) return;
    const groups = getItemInfoGroups();
    const visibleGroups = state.itemInfoSearch ? groups : groups.slice(0, 10);
    const historyHtml = renderPriceHistoryPanel();

    if (!groups.length) {
      elements.itemInfoContent.innerHTML = `<p class="helper-text">${state.itemInfoSearch ? "No scanned items match that search." : "No scanned item information yet."}</p>`;
      return;
    }

    const itemRows = visibleGroups.map((group, index) => `
      <button class="item-info-row" type="button" data-item-id="${escapeHtml(group.representativeItemId)}">
        <span class="item-info-rank">${index + 1}</span>
        <span class="item-info-copy">
          <strong>${escapeHtml(group.displayName)}</strong>
          <span>${escapeHtml(group.identity.compareLabel)} Latest ${group.latestDate ? escapeHtml(formatReceiptDate(group.latestDate)) : "No date"}${group.latestStore ? ` - ${escapeHtml(group.latestStore)}` : ""}</span>
        </span>
        <span class="item-info-count">${group.count}</span>
        <span class="item-info-total">${formatCurrency(group.totalSpent)}</span>
      </button>`).join("");

    elements.itemInfoContent.innerHTML = `
      ${historyHtml}
      <div class="item-info-list">${itemRows}</div>`;

    elements.itemInfoContent.querySelectorAll(".item-info-row").forEach((row) => {
      row.addEventListener("click", () => {
        state.analyticsSelectedHistoryItemId = row.dataset.itemId;
        renderItemInformation();
        elements.itemInfoContent.querySelector(".price-history-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    elements.itemInfoContent.querySelector(".price-history-close-btn")?.addEventListener("click", () => {
      state.analyticsSelectedHistoryItemId = null;
      renderItemInformation();
    });
  }

  function showTrackItemDialog(itemId, itemName, itemAmt) {
    if (!state.trackedLists.length) { showToast("Create a tracked list first."); return; }
    const lines = state.trackedLists.map((l, i) => `${i + 1}. ${l.name}`).join("\n");
    const choice = window.prompt(`Add "${itemName}" (${formatCurrency(itemAmt)}) to which tracked list?\n\n${lines}\n\nEnter number:`);
    if (!choice) return;
    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= state.trackedLists.length) { showToast("Invalid selection."); return; }
    const list = state.trackedLists[idx];
    state.client.from("shopping_tracked_list_items").insert({
      tracked_list_id: list.id,
      receipt_item_id: itemId || null,
      name: itemName,
      amount: itemAmt || null,
      created_by: state.session.user.id
    }).then(({ error }) => {
      if (error) { showToast("Could not add item."); return; }
      showToast(`"${itemName}" added to "${list.name}".`);
      loadTrackedLists().then(() => { renderTrackedLists(); updateTrackedListSelect(); }).catch(() => {});
    });
  }

  /* ── Tracked list rendering ──────────────────────────────── */

  function updateTrackedListSelect() {
    if (!elements.receiptTrackListSelect) return;
    const current = elements.receiptTrackListSelect.value;
    elements.receiptTrackListSelect.innerHTML = "<option value=\"\">— none —</option>";
    state.trackedLists.forEach((list) => {
      const opt = document.createElement("option");
      opt.value = list.id; opt.textContent = list.name;
      if (list.id === current) opt.selected = true;
      elements.receiptTrackListSelect.appendChild(opt);
    });
  }

  function renderTrackedLists() {
    if (!elements.trackedListsContent || !elements.trackedListsEmpty) return;
    elements.trackedListsContent.innerHTML = "";
    if (!state.trackedLists.length) {
      elements.trackedListsEmpty.classList.remove("hidden");
      return;
    }
    elements.trackedListsEmpty.classList.add("hidden");

    const dateRange = getTrackedDateRange();

    state.trackedLists.forEach((list) => {
      const listItems = list.items || [];
      const filteredItems = getFilteredTrackedItems(list, dateRange);
      const summary = getTrackedReportSummary(filteredItems);
      const reportOpen = state.trackedReportOpenIds.has(list.id);
      const card = document.createElement("div");
      card.className = "tracked-list-card";

      const head = document.createElement("div");
      head.className = "tracked-list-head";
      const titleWrap = document.createElement("div");
      titleWrap.className = "tracked-list-title-wrap";
      const title = document.createElement("h4");
      title.className = "tracked-list-title"; title.textContent = list.name;
      const meta = document.createElement("span");
      meta.className = "tracked-list-meta";
      meta.textContent = `${filteredItems.length} of ${listItems.length} item${listItems.length === 1 ? "" : "s"} \u00B7 ${dateRange.label} total ${formatCurrency(summary.total)}`;
      titleWrap.appendChild(title); titleWrap.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "tracked-list-actions";
      const reportBtn = document.createElement("button");
      reportBtn.type = "button";
      reportBtn.className = "secondary";
      reportBtn.textContent = reportOpen ? "Hide report" : "Report";
      reportBtn.addEventListener("click", () => {
        if (state.trackedReportOpenIds.has(list.id)) {
          state.trackedReportOpenIds.delete(list.id);
        } else {
          state.trackedReportOpenIds.add(list.id);
        }
        renderTrackedLists();
      });

      const exportBtn = document.createElement("button");
      exportBtn.type = "button";
      exportBtn.className = "secondary";
      exportBtn.textContent = "Export Excel";
      exportBtn.addEventListener("click", () => exportTrackedListReport(list));

      const delBtn = document.createElement("button");
      delBtn.type = "button"; delBtn.className = "secondary temp-list-delete"; delBtn.textContent = "Delete";
      delBtn.addEventListener("click", async () => {
        if (!window.confirm(`Delete "${list.name}"?`)) return;
        try {
          const { error } = await state.client.from("shopping_tracked_lists").delete().eq("id", list.id);
          if (error) throw error;
          await loadTrackedLists(); renderTrackedLists(); updateTrackedListSelect();
        } catch (err) { showToast(err.message || "Could not delete list."); }
      });

      actions.appendChild(reportBtn);
      actions.appendChild(exportBtn);
      actions.appendChild(delBtn);
      head.appendChild(titleWrap); head.appendChild(actions);

      const filterSummary = document.createElement("div");
      filterSummary.className = "tracked-list-filter-summary";
      filterSummary.textContent = getTrackedRangeLabel(dateRange);

      const itemsDiv = document.createElement("div");
      itemsDiv.className = "tracked-list-items";
      if (!listItems.length) {
        const empty = document.createElement("p");
        empty.className = "helper-text"; empty.textContent = "No items yet — star items when reviewing a receipt.";
        itemsDiv.appendChild(empty);
      } else if (!filteredItems.length) {
        const empty = document.createElement("p");
        empty.className = "helper-text";
        empty.textContent = `No tracked items in ${dateRange.label}.`;
        itemsDiv.appendChild(empty);
      } else {
        filteredItems.forEach((item) => {
          const row = document.createElement("div");
          row.className = "tracked-list-item";
          row.tabIndex = 0;
          row.setAttribute("role", "button");
          row.setAttribute("aria-expanded", "false");
          const name = document.createElement("span");
          name.className = "tracked-list-item-name"; name.textContent = item.name;
          const date = document.createElement("span");
          date.className = "tracked-list-item-date";
          date.textContent = formatReceiptDate(getTrackedItemDate(item));
          const amt = document.createElement("span");
          amt.className = "tracked-list-item-amt"; amt.textContent = formatCurrency(getTrackedItemAmount(item));
          const rm = document.createElement("button");
          rm.type = "button"; rm.className = "secondary temp-list-remove"; rm.textContent = "Remove";
          rm.addEventListener("click", async (e) => {
            e.stopPropagation();
            const { error } = await state.client.from("shopping_tracked_list_items").delete().eq("id", item.id);
            if (error) { showToast("Could not remove item."); return; }
            await loadTrackedLists(); renderTrackedLists(); updateTrackedListSelect();
          });
          row.appendChild(name); row.appendChild(date); row.appendChild(amt); row.appendChild(rm);
          itemsDiv.appendChild(row);

          const details = document.createElement("div");
          details.className = "tracked-list-item-detail hidden";
          if (item.receipt) {
            addTrackedDetailLine(details, "Receipt", item.receipt.store_name || "Unknown store");
            addTrackedDetailLine(details, "Purchase date", formatReceiptDate(item.receipt.receipt_date));
            addTrackedDetailLine(details, "Receipt item", item.receipt.item_name || item.name);
            addTrackedDetailLine(details, "Category", item.receipt.category || "Other");
            addTrackedDetailLine(details, "Receipt total", formatCurrency(item.receipt.total_amount || 0));
          } else {
            addTrackedDetailLine(details, "Receipt", item.receipt_item_id ? "Original receipt not found" : "Not linked to a receipt");
            addTrackedDetailLine(details, "Added to list", formatNoteDate(item.created_at));
          }
          const toggleDetails = () => {
            details.classList.toggle("hidden");
            row.setAttribute("aria-expanded", String(!details.classList.contains("hidden")));
          };
          row.addEventListener("click", toggleDetails);
          row.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            toggleDetails();
          });
          itemsDiv.appendChild(details);
        });
      }
      card.appendChild(head);
      card.appendChild(filterSummary);

      if (reportOpen) {
        const report = document.createElement("div");
        report.className = "tracked-list-report";

        const reportSummary = document.createElement("div");
        reportSummary.className = "tracked-report-summary";
        [
          ["Total", formatCurrency(summary.total)],
          ["Items", String(summary.count)],
          ["Period", getTrackedRangeLabel(dateRange)]
        ].forEach(([label, value]) => {
          const stat = document.createElement("div");
          stat.className = "tracked-report-stat";
          const statLabel = document.createElement("span");
          statLabel.textContent = label;
          const statValue = document.createElement("strong");
          statValue.textContent = value;
          stat.appendChild(statLabel);
          stat.appendChild(statValue);
          reportSummary.appendChild(stat);
        });
        report.appendChild(reportSummary);

        const addGroup = (titleText, entries) => {
          const group = document.createElement("div");
          group.className = "tracked-report-group";
          const groupTitle = document.createElement("h5");
          groupTitle.textContent = titleText;
          group.appendChild(groupTitle);
          const sorted = [...entries].sort((a, b) => b[1] - a[1]);
          if (!sorted.length) {
            const empty = document.createElement("p");
            empty.className = "helper-text";
            empty.textContent = "No matching items.";
            group.appendChild(empty);
          } else {
            sorted.forEach(([name, amount]) => {
              const line = document.createElement("div");
              line.className = "tracked-report-row";
              const label = document.createElement("span");
              label.textContent = name;
              const value = document.createElement("strong");
              value.textContent = formatCurrency(amount);
              line.appendChild(label);
              line.appendChild(value);
              group.appendChild(line);
            });
          }
          report.appendChild(group);
        };

        addGroup("By item", summary.byItem.entries());
        addGroup("By category", summary.byCategory.entries());
        addGroup("By store", summary.byStore.entries());

        const detailGroup = document.createElement("div");
        detailGroup.className = "tracked-report-group tracked-report-detail";
        const detailTitle = document.createElement("h5");
        detailTitle.textContent = "Items bought";
        detailGroup.appendChild(detailTitle);
        if (!filteredItems.length) {
          const empty = document.createElement("p");
          empty.className = "helper-text";
          empty.textContent = "No matching items.";
          detailGroup.appendChild(empty);
        }
        filteredItems
          .slice()
          .sort((a, b) => getTrackedItemDate(b).localeCompare(getTrackedItemDate(a)))
          .forEach((item) => {
            const line = document.createElement("div");
            line.className = "tracked-report-row";
            const label = document.createElement("span");
            label.textContent = `${formatReceiptDate(getTrackedItemDate(item))} - ${item.receipt?.store_name || "Unknown store"} - ${item.name}`;
            const value = document.createElement("strong");
            value.textContent = formatCurrency(getTrackedItemAmount(item));
            line.appendChild(label);
            line.appendChild(value);
            detailGroup.appendChild(line);
          });
        report.appendChild(detailGroup);
        card.appendChild(report);
      }

      card.appendChild(itemsDiv);
      elements.trackedListsContent.appendChild(card);
    });
  }

  async function createTrackedList(name) {
    if (!state.household) throw new Error("No household.");
    const { error } = await state.client.from("shopping_tracked_lists").insert({
      household_id: state.household.id, name, created_by: state.session.user.id
    });
    if (error) throw error;
    await loadTrackedLists(); renderTrackedLists(); updateTrackedListSelect();
  }

  /* ── Recipe Books ────────────────────────────────────────── */

  const PREP_WORDS = [
    "finely", "roughly", "coarsely", "thinly", "thickly", "freshly", "lightly", "gently",
    "well", "very", "extra", "large", "small", "medium", "big", "cold", "warm", "hot",
    "ripe", "soft", "firm", "raw", "cooked", "plain", "whole", "ground", "lean",
    "chopped", "diced", "sliced", "minced", "grated", "crushed", "peeled", "trimmed",
    "halved", "quartered", "cubed", "torn", "shredded", "mashed", "beaten", "whisked",
    "melted", "softened", "sifted", "packed", "heaped", "leveled", "level",
    "at room temperature", "room temperature"
  ];

  function cleanIngredientName(raw) {
    // Strip parenthetical notes first (e.g. "(penne, spirals, or shells)", "(go light for baby)")
    let name = raw.replace(/\s*\(.*?\)/g, "").trim();

    // Strip anything after a comma (preparation notes)
    name = name.split(",")[0].trim();

    // Strip leading container/preparation words (e.g. "can", "tin", "chopped")
    const stripLeading = [...PREP_WORDS, "can", "tin", "canned", "tinned", "dried", "frozen", "fresh"];
    const words = name.split(/\s+/);
    let start = 0;
    while (start < words.length - 1 && stripLeading.includes(words[start].toLowerCase())) {
      start++;
    }
    name = words.slice(start).join(" ");

    // Capitalise first letter
    return name.length >= 2 ? name.charAt(0).toUpperCase() + name.slice(1) : raw;
  }

  function parseIngredientLine(line) {
    let cleaned = line.replace(/^[-•*·◦▸▪▫●○✓✗]\s*/, "").trim();
    if (!cleaned || cleaned.length < 2) return null;

    // Skip optional lines — handled separately
    if (/^optional/i.test(cleaned)) return null;

    const lower = cleaned.toLowerCase();
    if (RECIPE_SCAN_SKIP_WORDS.some((w) => lower === w || lower.startsWith(w + " ") || lower.startsWith(w + ":"))) return null;
    if (/^\d+\s*(minutes?|hours?|seconds?)\b/.test(lower)) return null;

    const unitPattern = RECIPE_SCAN_UNITS.join("|");

    // Match quantity WITH a known unit (e.g. "2 tbsp", "200g", "1 big handful")
    const unitQtyRegex = new RegExp(
      `^([\\d\\s–\\-/.,¼½¾⅓⅔⅛⅜⅝⅞×xX]+(?:(?:big|large|small|heaped|level|generous|scant)\\s+)?(?:${unitPattern})\\.?\\s+(?:of\\s+)?)`,
      "i"
    );
    const unitMatch = cleaned.match(unitQtyRegex);
    if (unitMatch) {
      const quantity = unitMatch[1].trim();
      const rawName = cleaned.slice(unitMatch[0].length).trim();
      const name = cleanIngredientName(rawName);
      return name.length >= 2 ? { name, quantity } : null;
    }

    // Match bare number quantity with no unit (e.g. "2 eggs", "1 avocado", "3-4 wraps")
    const bareQtyRegex = /^([\d–\-\/]+)\s+/;
    const bareMatch = cleaned.match(bareQtyRegex);
    if (bareMatch) {
      const quantity = bareMatch[1].trim();
      const rawName = cleaned.slice(bareMatch[0].length).trim();
      const name = cleanIngredientName(rawName);
      return name.length >= 2 ? { name, quantity } : null;
    }

    return { name: cleanIngredientName(cleaned), quantity: "" };
  }

  function parseRecipeText(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return { name: "", ingredients: [] };

    const ingHeaderIdx = lines.findIndex((l) =>
      /^ingredients?\s*[:\-–—]/i.test(l) || /^ingredients?$/i.test(l)
    );

    let recipeName = "";
    let ingredientLines = [];

    if (ingHeaderIdx >= 0) {
      const before = lines.slice(0, ingHeaderIdx);
      recipeName = before.find((l) => l.length > 2 && !/^(serves|prep|cook|total|yield|time|rating)/i.test(l)) || "";
      const after = lines.slice(ingHeaderIdx + 1);
      const nextSection = after.findIndex((l) =>
        /^(method|directions?|instructions?|steps?|preparation|how to|to make|procedure|notes?|tips?)\s*[:\-–—]?$/i.test(l)
      );
      ingredientLines = nextSection >= 0 ? after.slice(0, nextSection) : after;
    } else {
      recipeName = lines[0];
      ingredientLines = lines.slice(1);
    }

    const ingredients = [];
    const optionalIngredients = [];

    ingredientLines.forEach((l) => {
      if (/^optional/i.test(l.trim())) {
        // Strip "Optional:" prefix and collect as optional ingredients
        const rest = l.replace(/^optional\s*[:\-–]?\s*/i, "").trim();
        rest.split(/[,\/]/).forEach((part) => {
          const parsed = parseIngredientLine(part.trim());
          if (parsed) optionalIngredients.push(parsed);
        });
      } else {
        const parsed = parseIngredientLine(l);
        if (parsed) ingredients.push(parsed);
      }
    });

    // Append optional ingredients with a flag so the UI can show them differently
    optionalIngredients.forEach((i) => ingredients.push({ ...i, optional: true }));

    return { name: recipeName, ingredients, body: text.trim() };
  }

  async function loadRecipes() {
    if (!state.household) {
      state.recipes = [];
      return;
    }
    const { data, error } = await state.client
      .from("shopping_recipes")
      .select("id, name, ingredients, body, created_by, created_at, taste_rating, ease_rating, last_added_at")
      .eq("household_id", state.household.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    state.recipes = data || [];
  }

  function renderRecipeBody(container, text) {
    container.innerHTML = "";
    if (!text || !text.trim()) return false;

    const IS_ING_HEADER  = /^(ingredients?|what you.?ll need|you.?ll need)\s*[:\-–—]?$/i;
    const IS_SECTION     = /^(method|directions?|instructions?|steps?|preparation|how to make|how to|to make|for the sauce|for the|sauce|dressing|marinade|to serve|serving|notes?|tips?|garnish|variations?)\s*[:\-–—]?$/i;
    const IS_SKIP        = /^(serves?|prep[\s\-]?time|cook[\s\-]?time|total[\s\-]?time|yield|makes|difficulty|calories|nutrition|source|recipe by|adapted from|rating|cuisine)\s*[:–—]/i;
    const IS_NUMBERED    = /^(?:step\s*)?(\d+)[\.\)\:\s]\s*(.+)/i;
    const IS_BULLET      = /^[\•\-\*]\s+(.+)/;

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Strip ingredient block (they live in the ingredients panel already)
    let skipIngBlock = false;
    const renderLines = [];
    lines.forEach(line => {
      if (IS_ING_HEADER.test(line))  { skipIngBlock = true; return; }
      if (skipIngBlock && IS_SECTION.test(line)) { skipIngBlock = false; } // method starts — fall through
      if (skipIngBlock) return;
      if (IS_SKIP.test(line)) return;
      renderLines.push(line);
    });

    if (!renderLines.length) return false;

    let inMethodSection = false;
    let autoStep = 0;

    renderLines.forEach(line => {
      // ── Section heading ─────────────────────────────────────
      if (IS_SECTION.test(line)) {
        const h = document.createElement("h4");
        h.className = "recipe-body-section";
        h.textContent = line.replace(/[:\-–—]\s*$/, "").trim();
        container.appendChild(h);
        inMethodSection = true;
        autoStep = 0;
        return;
      }

      // ── Numbered step: "1." / "1)" / "Step 1:" ─────────────
      const numMatch = line.match(IS_NUMBERED);
      if (numMatch) {
        container.appendChild(makeStep(numMatch[1], numMatch[2].trim(), false));
        return;
      }

      // ── Bullet point ────────────────────────────────────────
      const bulletMatch = line.match(IS_BULLET);
      if (bulletMatch) {
        container.appendChild(makeStep("·", bulletMatch[1], true));
        return;
      }

      // ── Plain long line inside a method section → auto-number
      if (inMethodSection && line.length > 25) {
        autoStep++;
        container.appendChild(makeStep(autoStep, line, false));
        return;
      }

      // ── Everything else: small muted note ───────────────────
      const p = document.createElement("p");
      p.className = "recipe-body-note";
      p.textContent = line;
      container.appendChild(p);
    });

    return container.childElementCount > 0;
  }

  function makeStep(label, text, isBullet) {
    const wrap = document.createElement("div");
    wrap.className = `recipe-step${isBullet ? " recipe-step-bullet" : ""}`;

    const num = document.createElement("span");
    num.className = "recipe-step-num";
    num.textContent = label;

    const p = document.createElement("p");
    p.className = "recipe-step-text";
    p.textContent = text;

    wrap.appendChild(num);
    wrap.appendChild(p);

    // Tap to cross off, tap again to undo
    wrap.addEventListener("click", () => {
      const done = wrap.classList.toggle("done");
      num.textContent = done ? "✓" : label;
    });

    return wrap;
  }

  function formatRecipeDate(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    const diffDays = Math.floor((Date.now() - d) / 86400000);
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString([], { day: "numeric", month: "short", year: diffDays > 365 ? "numeric" : undefined });
  }

  function renderStarButtons(container, currentValue, onRate) {
    container.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `recipe-star-btn${i <= (currentValue || 0) ? " filled" : ""}`;
      btn.setAttribute("aria-label", `${i} star${i !== 1 ? "s" : ""}`);
      btn.textContent = "★";
      btn.addEventListener("mouseenter", () => {
        container.querySelectorAll(".recipe-star-btn").forEach((b, idx) => b.classList.toggle("hover", idx < i));
      });
      btn.addEventListener("mouseleave", () => {
        container.querySelectorAll(".recipe-star-btn").forEach(b => b.classList.remove("hover"));
      });
      btn.addEventListener("click", () => onRate(i));
      container.appendChild(btn);
    }
  }

  function buildDetailStars(recipeId, field, container, currentValue) {
    renderStarButtons(container, currentValue, async (val) => {
      try {
        await saveRecipeRating(recipeId, field, val);
        const recipe = state.recipes.find(r => r.id === recipeId);
        if (recipe) recipe[field] = val;
        buildDetailStars(recipeId, field, container, val);
        renderRecipeBooks();
      } catch (err) {
        showToast(err.message || "Could not save rating.");
      }
    });
  }

  async function saveRecipeRating(recipeId, field, value) {
    const { error } = await state.client.from("shopping_recipes").update({ [field]: value }).eq("id", recipeId);
    if (error) throw error;
  }

  function renderRecipeBooks() {
    const list = elements.recipeBooksList;
    const emptyState = elements.recipeBooksEmptyState;
    if (!list) return;

    list.innerHTML = "";

    const searchTerm = (state.recipeSearch || "").toLowerCase().trim();
    const filtered = state.recipes.filter(r =>
      !searchTerm || (r.name || "").toLowerCase().includes(searchTerm)
    );

    if (!filtered.length) {
      if (emptyState) {
        const msg = emptyState.querySelector("#recipeBooksEmptyMessage") || emptyState.querySelector("p");
        if (msg) msg.textContent = searchTerm ? `No recipes match "${state.recipeSearch}".` : "No recipes saved yet — add one above.";
        emptyState.classList.remove("hidden");
      }
      return;
    }
    if (emptyState) emptyState.classList.add("hidden");

    // Sort: recipes used in last 10 days first, then by created_at desc
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const isRecent = (r) => r.last_added_at && new Date(r.last_added_at) >= tenDaysAgo;

    const sorted = [...filtered].sort((a, b) => {
      const aR = isRecent(a), bR = isRecent(b);
      if (aR && !bR) return -1;
      if (!aR && bR) return 1;
      if (aR && bR) return new Date(b.last_added_at) - new Date(a.last_added_at);
      return new Date(b.created_at) - new Date(a.created_at);
    });

    sorted.forEach((recipe) => {
      const recent = isRecent(recipe);
      const card = document.createElement("article");
      card.className = `recipe-card${recent ? " recipe-card-recent" : ""}`;

      // Header: name + badges
      const header = document.createElement("div");
      header.className = "recipe-card-header";

      const name = document.createElement("h4");
      name.className = "recipe-card-name";
      name.textContent = recipe.name;
      header.appendChild(name);

      const metaWrap = document.createElement("div");
      metaWrap.className = "recipe-card-meta-wrap";
      if (recent) {
        const badge = document.createElement("span");
        badge.className = "recipe-recent-badge";
        badge.textContent = "Recent";
        metaWrap.appendChild(badge);
      }
      const ingCount = (recipe.ingredients || []).length;
      const meta = document.createElement("span");
      meta.className = "recipe-card-meta";
      meta.textContent = `${ingCount} ingredient${ingCount === 1 ? "" : "s"}`;
      metaWrap.appendChild(meta);
      header.appendChild(metaWrap);
      card.appendChild(header);

      // Ratings display
      if (recipe.taste_rating || recipe.ease_rating) {
        const ratingsRow = document.createElement("div");
        ratingsRow.className = "recipe-card-ratings";
        const makeRatingSpan = (label, val) => {
          const span = document.createElement("span");
          span.className = "recipe-card-rating";
          const lbl = document.createElement("span");
          lbl.className = "rating-label";
          lbl.textContent = label;
          const stars = document.createElement("span");
          stars.className = "star-display";
          stars.textContent = "★".repeat(val) + "☆".repeat(5 - val);
          span.appendChild(lbl);
          span.appendChild(stars);
          return span;
        };
        if (recipe.taste_rating) ratingsRow.appendChild(makeRatingSpan("Taste", recipe.taste_rating));
        if (recipe.ease_rating) ratingsRow.appendChild(makeRatingSpan("Ease", recipe.ease_rating));
        card.appendChild(ratingsRow);
      }

      // Last added date
      if (recipe.last_added_at) {
        const dateEl = document.createElement("p");
        dateEl.className = "recipe-card-last-added";
        dateEl.textContent = `Last added to list: ${formatRecipeDate(recipe.last_added_at)}`;
        card.appendChild(dateEl);
      }

      // Ingredient preview
      const previewItems = (recipe.ingredients || []).slice(0, 4).map((i) => i.name);
      if (previewItems.length) {
        const preview = document.createElement("p");
        preview.className = "recipe-card-ingredients";
        preview.textContent = previewItems.join(", ") + (ingCount > 4 ? ` +${ingCount - 4} more` : "");
        card.appendChild(preview);
      }

      // Actions
      const cardActions = document.createElement("div");
      cardActions.className = "recipe-card-actions";

      const useBtn = document.createElement("button");
      useBtn.className = "recipe-card-use-btn";
      useBtn.type = "button";
      useBtn.textContent = "Open recipe →";
      useBtn.addEventListener("click", () => openRecipeDetail(recipe));

      const delBtn = document.createElement("button");
      delBtn.className = "secondary recipe-card-del-btn";
      delBtn.type = "button";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", async () => {
        if (!confirm(`Delete "${recipe.name}"?`)) return;
        delBtn.disabled = true;
        try {
          const { error } = await state.client.from("shopping_recipes").delete().eq("id", recipe.id);
          if (error) throw error;
          state.recipes = state.recipes.filter((r) => r.id !== recipe.id);
          renderRecipeBooks();
          showToast(`"${recipe.name}" deleted.`);
        } catch (err) {
          showToast(err.message || "Could not delete recipe.");
          delBtn.disabled = false;
        }
      });

      cardActions.appendChild(useBtn);
      cardActions.appendChild(delBtn);
      card.appendChild(cardActions);

      list.appendChild(card);
    });
  }

  function openRecipeDetail(recipe) {
    const overlay = elements.recipeDetailOverlay;
    if (!overlay) return;

    elements.recipeDetailName.textContent = recipe.name;
    const ingCount = (recipe.ingredients || []).length;
    elements.recipeDetailCount.textContent = `${ingCount} ingredient${ingCount === 1 ? "" : "s"}`;

    // Last added
    if (elements.recipeDetailLastAdded) {
      elements.recipeDetailLastAdded.textContent = recipe.last_added_at
        ? `Last cooked: ${formatRecipeDate(recipe.last_added_at)}`
        : "";
    }

    // Recipe body / method shown first — rendered as structured steps
    const bodyWrap = elements.recipeDetailBodyWrap;
    const bodyEl = elements.recipeDetailBody;
    if (bodyWrap && bodyEl) {
      const hasContent = recipe.body ? renderRecipeBody(bodyEl, recipe.body) : false;
      bodyWrap.classList.toggle("hidden", !hasContent);
    }

    // Star ratings
    const tasteContainer = document.getElementById("tasteStars");
    const easeContainer = document.getElementById("easeStars");
    if (tasteContainer) buildDetailStars(recipe.id, "taste_rating", tasteContainer, recipe.taste_rating);
    if (easeContainer) buildDetailStars(recipe.id, "ease_rating", easeContainer, recipe.ease_rating);

    // Ingredients collapsed at bottom — keep closed so method is read first
    const addSection = document.getElementById("recipeDetailAddSection");
    if (addSection) addSection.removeAttribute("open");

    const ingList = elements.recipeDetailIngredients;
    ingList.innerHTML = "";

    (recipe.ingredients || []).forEach((ing, i) => {
      const row = document.createElement("label");
      row.className = "recipe-ingredient-row";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = true;
      cb.dataset.index = i;
      row.appendChild(cb);

      if (ing.quantity) {
        const qtySpan = document.createElement("span");
        qtySpan.className = "recipe-ingredient-qty";
        qtySpan.textContent = ing.quantity;
        row.appendChild(qtySpan);
      }

      const nameSpan = document.createElement("span");
      nameSpan.className = "recipe-ingredient-name";
      nameSpan.textContent = ing.name;
      row.appendChild(nameSpan);

      ingList.appendChild(row);
    });

    overlay.dataset.recipeId = recipe.id;
    overlay.dataset.recipeName = recipe.name;
    overlay.classList.remove("hidden");
    // Scroll detail card to top each time it opens
    overlay.querySelector(".recipe-detail-card")?.scrollTo({ top: 0, behavior: "instant" });
  }

  async function saveRecipe(name, ingredients, body) {
    const { error } = await state.client.from("shopping_recipes").insert({
      household_id: state.household.id,
      name,
      ingredients,
      body: body || "",
      created_by: state.session.user.id
    });
    if (error) throw error;
  }

  async function addRecipeIngredientsToList(recipeName, selectedIngredients, recipeId) {
    if (!selectedIngredients.length) throw new Error("Select at least one ingredient.");

    const payload = selectedIngredients.map((ing, index) => ({
      household_id: state.household.id,
      name: ing.name,
      note: ing.quantity || "",
      is_urgent: false,
      created_by: state.session.user.id,
      meal_group: recipeName,
      meal_item_order: index
    }));

    const { error } = await state.client.from("shopping_items").insert(payload);
    if (error) throw error;
    await emitNotification("item_added", `${recipeName} (recipe)`, false);

    // Track when this recipe was last added to the list
    if (recipeId) {
      const now = new Date().toISOString();
      await state.client.from("shopping_recipes").update({ last_added_at: now }).eq("id", recipeId);
      const recipe = state.recipes.find(r => r.id === recipeId);
      if (recipe) recipe.last_added_at = now;
    }
  }

  function resetRecipeAddForm() {
    elements.recipePasteInput.value = "";
    elements.parsedIngredientsList.innerHTML = "";
    elements.recipeParsedPreview.classList.add("hidden");
    if (elements.recipeBookScanStatus) elements.recipeBookScanStatus.textContent = "";
    if (elements.recipeUrlStatus) elements.recipeUrlStatus.textContent = "";
    if (elements.recipeUrlInput) elements.recipeUrlInput.value = "";
    // Reset to paste tab
    elements.recipeAddForm.querySelectorAll(".recipe-method-tab").forEach((t, i) => t.classList.toggle("active", i === 0));
    if (elements.recipeMethodPaste) elements.recipeMethodPaste.classList.remove("hidden");
    if (elements.recipeMethodPhoto) elements.recipeMethodPhoto.classList.add("hidden");
    if (elements.recipeMethodUrl) elements.recipeMethodUrl.classList.add("hidden");
  }

  function wireRecipeBooksEvents() {
    if (!elements.toggleRecipeAddButton) return;

    elements.toggleRecipeAddButton.addEventListener("click", () => {
      const isHidden = elements.recipeAddForm.classList.contains("hidden");
      elements.recipeAddForm.classList.toggle("hidden", !isHidden);
      elements.recipeParsedPreview.classList.add("hidden");
      if (isHidden) {
        resetRecipeAddForm();
        elements.toggleRecipeAddButton.textContent = "Cancel";
      } else {
        elements.toggleRecipeAddButton.textContent = "+ Add recipe";
      }
    });

    // ── Method tab switching ────────────────────────────────
    const methodPanels = {
      paste: elements.recipeMethodPaste,
      photo: elements.recipeMethodPhoto,
      url:   elements.recipeMethodUrl
    };
    elements.recipeAddForm.querySelectorAll(".recipe-method-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        elements.recipeAddForm.querySelectorAll(".recipe-method-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        Object.entries(methodPanels).forEach(([key, panel]) => {
          if (panel) panel.classList.toggle("hidden", key !== tab.dataset.method);
        });
        elements.recipeParsedPreview.classList.add("hidden");
      });
    });

    // ── Shared parse helper ────────────────────────────────
    function applyParsedRecipe(text) {
      const parsed = parseRecipeText(text);
      elements.parsedRecipeName.value = parsed.name;
      elements.recipeAddForm.dataset.body = parsed.body;
      elements.parsedIngredientsList.innerHTML = "";

      if (!parsed.ingredients.length) {
        showToast("No ingredients found — check the text and try again.");
        return false;
      }

      parsed.ingredients.forEach((ing) => {
        const row = document.createElement("label");
        row.className = "recipe-ingredient-row";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !ing.optional;
        row.appendChild(cb);
        if (ing.quantity) {
          const qty = document.createElement("span");
          qty.className = "recipe-ingredient-qty";
          qty.textContent = ing.quantity;
          row.appendChild(qty);
        }
        const input = document.createElement("input");
        input.type = "text";
        input.className = "parsed-ingredient-input";
        input.value = ing.name;
        input.dataset.quantity = ing.quantity || "";
        row.appendChild(input);
        if (ing.optional) {
          const optTag = document.createElement("span");
          optTag.className = "recipe-optional-tag";
          optTag.textContent = "optional";
          row.appendChild(optTag);
        }
        elements.parsedIngredientsList.appendChild(row);
      });

      elements.recipeParsedPreview.classList.remove("hidden");
      elements.recipeParsedPreview.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    }

    // ── Paste: parse button ────────────────────────────────
    if (elements.parseRecipeButton) {
      elements.parseRecipeButton.addEventListener("click", () => {
        const text = elements.recipePasteInput.value.trim();
        if (!text) { showToast("Paste some recipe text first."); return; }
        applyParsedRecipe(text);
      });
    }

    // ── Photo: scan recipe book page ───────────────────────
    function openRecipeBookPicker(captureCamera) {
      if (!elements.recipeBookImageInput) return;
      elements.recipeBookImageInput.value = "";
      captureCamera
        ? elements.recipeBookImageInput.setAttribute("capture", "environment")
        : elements.recipeBookImageInput.removeAttribute("capture");
      elements.recipeBookImageInput.click();
    }

    if (elements.takeRecipeBookPhotoButton) {
      elements.takeRecipeBookPhotoButton.addEventListener("click", () => openRecipeBookPicker(true));
    }
    if (elements.chooseRecipeBookImageButton) {
      elements.chooseRecipeBookImageButton.addEventListener("click", () => openRecipeBookPicker(false));
    }

    if (elements.recipeBookImageInput) {
      elements.recipeBookImageInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
          showToast("Image too large — try a smaller photo (max 15 MB).");
          return;
        }
        if (!appConfig.recipeScanFunctionUrl) {
          showToast("Recipe scan function URL not set in shopping-cloud-config.js.");
          return;
        }

        if (elements.recipeBookScanStatus) elements.recipeBookScanStatus.textContent = "Scanning recipe…";
        if (elements.takeRecipeBookPhotoButton) elements.takeRecipeBookPhotoButton.disabled = true;
        if (elements.chooseRecipeBookImageButton) elements.chooseRecipeBookImageButton.disabled = true;

        try {
          const imageDataUrl = await prepareRecipeImageForUpload(file);
          const res = await fetch(appConfig.recipeScanFunctionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: appConfig.supabaseAnonKey || "",
              Authorization: `Bearer ${state.session.access_token}`
            },
            body: JSON.stringify({ imageDataUrl, imageName: file.name })
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(payload.error || "Scan failed.");

          const rawText = String(payload.rawText || "").trim();
          if (!rawText) throw new Error("Could not read the recipe from that photo — try a clearer, straighter shot.");

          if (elements.recipeBookScanStatus) elements.recipeBookScanStatus.textContent = "Recipe read! Extracting…";
          elements.recipePasteInput.value = rawText;

          if (!applyParsedRecipe(rawText)) {
            if (elements.recipeBookScanStatus) elements.recipeBookScanStatus.textContent = "Scanned but no ingredients detected. Edit the text and try again.";
          } else {
            if (elements.recipeBookScanStatus) elements.recipeBookScanStatus.textContent = "";
          }
        } catch (err) {
          const msg = err.message || "Photo scan failed.";
          if (elements.recipeBookScanStatus) elements.recipeBookScanStatus.textContent = msg;
          showToast(msg);
        } finally {
          if (elements.takeRecipeBookPhotoButton) elements.takeRecipeBookPhotoButton.disabled = false;
          if (elements.chooseRecipeBookImageButton) elements.chooseRecipeBookImageButton.disabled = false;
          elements.recipeBookImageInput.value = "";
        }
      });
    }

    // ── URL: fetch recipe from website ─────────────────────
    if (elements.fetchRecipeUrlButton) {
      elements.fetchRecipeUrlButton.addEventListener("click", async () => {
        const url = elements.recipeUrlInput?.value.trim();
        if (!url) { showToast("Enter a recipe URL first."); return; }

        if (!appConfig.recipeUrlFunctionUrl || appConfig.recipeUrlFunctionUrl.includes("YOUR_PROJECT")) {
          showToast("Recipe URL function not set in shopping-cloud-config.js.");
          return;
        }

        elements.fetchRecipeUrlButton.disabled = true;
        elements.fetchRecipeUrlButton.textContent = "Fetching…";
        if (elements.recipeUrlStatus) elements.recipeUrlStatus.textContent = "Fetching recipe…";

        try {
          const res = await fetch(appConfig.recipeUrlFunctionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: appConfig.supabaseAnonKey || "",
              Authorization: `Bearer ${state.session.access_token}`
            },
            body: JSON.stringify({ url })
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(payload.error || "Could not fetch recipe.");

          const text = String(payload.text || "").trim();
          if (!text) throw new Error("No recipe content found at that URL.");

          if (elements.recipeUrlStatus) elements.recipeUrlStatus.textContent = "Recipe fetched! Extracting…";
          elements.recipePasteInput.value = text;

          if (!applyParsedRecipe(text)) {
            if (elements.recipeUrlStatus) elements.recipeUrlStatus.textContent = "Fetched but no ingredients detected.";
          } else {
            if (elements.recipeUrlStatus) elements.recipeUrlStatus.textContent = "";
          }
        } catch (err) {
          const msg = err.message || "URL fetch failed.";
          if (elements.recipeUrlStatus) elements.recipeUrlStatus.textContent = msg;
          showToast(msg);
        } finally {
          elements.fetchRecipeUrlButton.disabled = false;
          elements.fetchRecipeUrlButton.textContent = "Fetch recipe";
        }
      });
    }

    elements.recipeAddForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = elements.parsedRecipeName.value.trim();
      if (!name) { showToast("Enter a recipe name."); return; }

      const rows = elements.parsedIngredientsList.querySelectorAll(".recipe-ingredient-row");
      const ingredients = [];
      rows.forEach((row) => {
        const cb = row.querySelector("input[type='checkbox']");
        const nameInput = row.querySelector(".parsed-ingredient-input");
        if (!cb || !cb.checked || !nameInput) return;
        const ingName = nameInput.value.trim();
        if (!ingName) return;
        ingredients.push({ name: ingName, quantity: nameInput.dataset.quantity || "", optional: row.querySelector(".recipe-optional-tag") ? true : undefined });
      });

      if (!ingredients.length) { showToast("Select at least one ingredient."); return; }

      const body = elements.recipeAddForm.dataset.body || "";
      try {
        await saveRecipe(name, ingredients, body);
        await loadRecipes();
        renderRecipeBooks();
        showToast(`"${name}" saved.`);
        elements.recipeAddForm.reset();
        elements.recipeParsedPreview.classList.add("hidden");
        elements.recipeAddForm.classList.add("hidden");
        elements.toggleRecipeAddButton.textContent = "+ Add recipe";
      } catch (err) {
        showToast(err.message || "Could not save recipe.");
      }
    });

    if (elements.cancelRecipeButton) {
      elements.cancelRecipeButton.addEventListener("click", () => {
        resetRecipeAddForm();
        elements.recipeAddForm.classList.add("hidden");
        elements.toggleRecipeAddButton.textContent = "+ Add recipe";
      });
    }

    elements.closeRecipeDetailButton.addEventListener("click", () => {
      elements.recipeDetailOverlay.classList.add("hidden");
    });

    elements.recipeDetailOverlay.addEventListener("click", (e) => {
      if (e.target === elements.recipeDetailOverlay) {
        elements.recipeDetailOverlay.classList.add("hidden");
      }
    });

    elements.addRecipeToListButton.addEventListener("click", async () => {
      const overlay = elements.recipeDetailOverlay;
      const recipeName = overlay.dataset.recipeName;
      const recipeId = overlay.dataset.recipeId;
      const recipe = state.recipes.find((r) => r.id === recipeId);
      if (!recipe) return;

      const checkboxes = overlay.querySelectorAll("#recipeDetailIngredients input[type='checkbox']");
      const selectedIngredients = [];
      checkboxes.forEach((cb) => {
        if (cb.checked) {
          const idx = parseInt(cb.dataset.index, 10);
          if (!isNaN(idx) && recipe.ingredients[idx]) selectedIngredients.push(recipe.ingredients[idx]);
        }
      });

      try {
        elements.addRecipeToListButton.disabled = true;
        elements.addRecipeToListButton.textContent = "Adding…";
        await addRecipeIngredientsToList(recipeName, selectedIngredients, recipeId);
        await loadItems();
        renderItems();
        renderRecipeBooks();
        overlay.classList.add("hidden");
        showToast(`${recipeName} added to shopping list.`);
        switchTab("shopping");
      } catch (err) {
        showToast(err.message || "Could not add to list.");
      } finally {
        elements.addRecipeToListButton.disabled = false;
        elements.addRecipeToListButton.textContent = "Add selected to list";
      }
    });

    elements.deleteRecipeButton.addEventListener("click", async () => {
      const overlay = elements.recipeDetailOverlay;
      const recipeId = overlay.dataset.recipeId;
      const recipeName = overlay.dataset.recipeName;
      if (!recipeId) return;
      if (!confirm(`Delete "${recipeName}"?`)) return;

      try {
        elements.deleteRecipeButton.disabled = true;
        const { error } = await state.client.from("shopping_recipes").delete().eq("id", recipeId);
        if (error) throw error;
        state.recipes = state.recipes.filter((r) => r.id !== recipeId);
        renderRecipeBooks();
        overlay.classList.add("hidden");
        showToast(`"${recipeName}" deleted.`);
      } catch (err) {
        showToast(err.message || "Could not delete recipe.");
      } finally {
        elements.deleteRecipeButton.disabled = false;
      }
    });

    // Recipe search
    if (elements.recipeSearchInput) {
      elements.recipeSearchInput.addEventListener("input", () => {
        state.recipeSearch = elements.recipeSearchInput.value;
        renderRecipeBooks();
      });
    }
  }

  /* ── Receipt event wiring ────────────────────────────────── */

  function wireReceiptEvents() {
    if (elements.receiptImageInput) {
      elements.receiptImageInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (elements.takeReceiptPhotoButton) elements.takeReceiptPhotoButton.disabled = true;
        if (elements.chooseReceiptImageButton) elements.chooseReceiptImageButton.disabled = true;
        try { await scanReceiptImage(file); }
        catch (err) {
          if (elements.receiptScanStatus) elements.receiptScanStatus.textContent = err.message || "Scan failed.";
          showToast(err.message || "Receipt scan failed.");
        } finally {
          if (elements.takeReceiptPhotoButton) elements.takeReceiptPhotoButton.disabled = false;
          if (elements.chooseReceiptImageButton) elements.chooseReceiptImageButton.disabled = false;
        }
        elements.receiptImageInput.value = "";
      });
    }
    if (elements.takeReceiptPhotoButton) {
      elements.takeReceiptPhotoButton.addEventListener("click", () => {
        if (!elements.receiptImageInput) return;
        elements.receiptImageInput.setAttribute("capture", "environment");
        elements.receiptImageInput.click();
      });
    }
    if (elements.chooseReceiptImageButton) {
      elements.chooseReceiptImageButton.addEventListener("click", () => {
        if (!elements.receiptImageInput) return;
        elements.receiptImageInput.removeAttribute("capture");
        elements.receiptImageInput.click();
      });
    }
    if (elements.clearReceiptButton) {
      elements.clearReceiptButton.addEventListener("click", () => {
        state.receiptScan = { items: [], storeName: "", receiptDate: "", totalAmount: null, imageName: "", imageFile: null };
        if (elements.receiptScanResults) elements.receiptScanResults.classList.add("hidden");
        if (elements.receiptScanStatus) elements.receiptScanStatus.textContent = "No receipt selected.";
      });
    }
    if (elements.saveReceiptButton) {
      elements.saveReceiptButton.addEventListener("click", async () => {
        try {
          elements.saveReceiptButton.disabled = true;
          elements.saveReceiptButton.textContent = "Saving…";
          await saveReceipt();
        } catch (err) { showToast(err.message || "Could not save receipt."); }
        finally { elements.saveReceiptButton.disabled = false; elements.saveReceiptButton.textContent = "Save receipt"; }
      });
    }
    if (elements.newTrackedListFromReceiptButton) {
      elements.newTrackedListFromReceiptButton.addEventListener("click", async () => {
        const name = window.prompt("Name for new tracked list:");
        if (!name?.trim()) return;
        try {
          await createTrackedList(name.trim());
          showToast(`"${name.trim()}" created.`);
          const opt = [...(elements.receiptTrackListSelect?.options || [])].find((o) => o.textContent === name.trim());
          if (opt) opt.selected = true;
        } catch (err) { showToast(err.message || "Could not create list."); }
      });
    }
    if (elements.newTrackedListForm) {
      elements.newTrackedListForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = elements.newTrackedListTitle?.value?.trim();
        if (!name) return;
        try { await createTrackedList(name); elements.newTrackedListTitle.value = ""; showToast(`"${name}" created.`); }
        catch (err) { showToast(err.message || "Could not create list."); }
      });
    }
    document.querySelectorAll(".analytics-period-row .tab[data-range]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".analytics-period-row .tab[data-range]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.analyticsRange = btn.dataset.range || "current-month";
        renderAnalytics();
      });
    });
    document.querySelectorAll(".tracked-period-row .tab[data-tracked-range]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tracked-period-row .tab[data-tracked-range]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.trackedListRange = btn.dataset.trackedRange || "current-financial-year";
        renderTrackedLists();
      });
    });
    if (elements.analyticsSectionTabs) {
      elements.analyticsSectionTabs.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-analytics-panel]");
        if (!btn) return;
        state.analyticsPanel = btn.dataset.analyticsPanel || "scan";
        updateAnalyticsPanel();
      });
    }
    if (elements.itemInfoSearchInput) {
      elements.itemInfoSearchInput.addEventListener("input", () => {
        state.itemInfoSearch = elements.itemInfoSearchInput.value.trim();
        state.analyticsSelectedHistoryItemId = null;
        renderItemInformation();
      });
    }
  }

  function wireNotesEvents() {
    attachListsToNotesPane();
    if (elements.notesModeButton) {
      elements.notesModeButton.addEventListener("click", () => {
        state.notesPanel = "notes";
        updateNotesPanel();
        renderNotes().catch((err) => showToast(err.message || "Could not load notes."));
      });
    }
    if (elements.notesListsModeButton) {
      elements.notesListsModeButton.addEventListener("click", () => {
        state.notesPanel = "lists";
        updateNotesPanel();
        renderTempLists();
      });
    }
    if (elements.notesCalendarModeButton) {
      elements.notesCalendarModeButton.addEventListener("click", async () => {
        state.notesPanel = "calendar";
        if (!state.notesCalendarSelectedDate) state.notesCalendarSelectedDate = getTodayDateValue();
        state.notesCalendarMonth = state.notesCalendarSelectedDate.slice(0, 7);
        try { await loadPersonalNotes(); }
        catch (err) { showToast(err.message || "Could not load notes calendar."); }
        updateNotesPanel();
      });
    }
    if (elements.noteDueDateToggle) {
      elements.noteDueDateToggle.addEventListener("click", () => {
        state.notesDueDateVisible = !state.notesDueDateVisible;
        elements.noteDueDateWrap?.classList.toggle("hidden", !state.notesDueDateVisible);
        elements.noteDueDateToggle.textContent = state.notesDueDateVisible ? "Remove due date" : "Add due date";
        if (!state.notesDueDateVisible && elements.noteDueDateInput) elements.noteDueDateInput.value = "";
        if (state.notesDueDateVisible) elements.noteDueDateInput?.focus();
      });
    }
    elements.notesCalendarPrev?.addEventListener("click", () => {
      const [year, month] = getNotesCalendarMonthValue().split("-").map((part) => parseInt(part, 10));
      state.notesCalendarMonth = toDateInputValue(new Date(year, month - 2, 1)).slice(0, 7);
      renderNotesCalendar();
    });
    elements.notesCalendarNext?.addEventListener("click", () => {
      const [year, month] = getNotesCalendarMonthValue().split("-").map((part) => parseInt(part, 10));
      state.notesCalendarMonth = toDateInputValue(new Date(year, month, 1)).slice(0, 7);
      renderNotesCalendar();
    });
    elements.notesCalendarSelectedDate?.addEventListener("change", () => {
      if (!isValidDateInputValue(elements.notesCalendarSelectedDate.value)) return;
      state.notesCalendarSelectedDate = elements.notesCalendarSelectedDate.value;
      state.notesCalendarMonth = state.notesCalendarSelectedDate.slice(0, 7);
      renderNotesCalendar();
    });
    elements.notesCalendarForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = elements.notesCalendarNoteInput?.value.trim();
      const dueDate = elements.notesCalendarSelectedDate?.value || state.notesCalendarSelectedDate;
      if (!text || !isValidDateInputValue(dueDate)) return;
      try {
        await createPersonalNote(text, dueDate);
        elements.notesCalendarNoteInput.value = "";
        await loadPersonalNotes();
        renderNotesCalendar();
        if (state.notesPanel === "notes") await renderNotes();
      } catch (err) {
        showToast(err.message || "Could not save calendar note.");
      }
    });
    if (!elements.notesForm) return;
    elements.notesForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = elements.noteInput.value.trim();
      if (!text) return;
      const dueDate = state.notesDueDateVisible && elements.noteDueDateInput?.value ? elements.noteDueDateInput.value : null;
      if (dueDate && !isValidDateInputValue(dueDate)) {
        showToast("Enter a valid due date.");
        return;
      }
      setNotesLoading(true);
      let error = null;
      try {
        await createPersonalNote(text, dueDate);
      } catch (err) {
        error = err;
      }
      setNotesLoading(false);
      if (error) {
        showToast("Could not save note: " + error.message);
        return;
      }
      elements.noteInput.value = "";
      if (elements.noteDueDateInput) elements.noteDueDateInput.value = "";
      state.notesDueDateVisible = false;
      elements.noteDueDateWrap?.classList.add("hidden");
      if (elements.noteDueDateToggle) elements.noteDueDateToggle.textContent = "Add due date";
      await renderNotes();
    });
  }

  function wireMembershipEvents() {
    if (elements.membershipForm) {
      elements.membershipForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const shopName = elements.membershipShopName?.value.trim();
        const file = elements.membershipBarcodeInput?.files?.[0];
        const membershipText = elements.membershipTextInput?.value.trim();
        if (elements.addMembershipButton) {
          elements.addMembershipButton.disabled = true;
          elements.addMembershipButton.textContent = "Adding...";
        }
        try {
          await createMembership(shopName, file, membershipText);
          elements.membershipForm.reset();
          await loadMemberships();
          renderMemberships();
          showToast(`${shopName} membership added.`);
        } catch (error) {
          showToast(error.message || "Could not add membership.");
        } finally {
          if (elements.addMembershipButton) {
            elements.addMembershipButton.disabled = false;
            elements.addMembershipButton.textContent = "Add membership";
          }
        }
      });
    }

    if (elements.closeMembershipViewerButton) {
      elements.closeMembershipViewerButton.addEventListener("click", () => {
        state.selectedMembershipId = null;
        renderMembershipViewer();
      });
    }

    if (elements.deleteMembershipButton) {
      elements.deleteMembershipButton.addEventListener("click", async () => {
        const membership = getSelectedMembership();
        if (!membership) return;
        if (!window.confirm(`Delete ${membership.shop_name || "this membership"}?`)) return;
        try {
          await deleteSelectedMembership();
          showToast("Membership deleted.");
        } catch (error) {
          showToast(error.message || "Could not delete membership.");
        }
      });
    }
  }

  function wireEvents() {
    if (elements.backToLoginButton) {
      elements.backToLoginButton.addEventListener("click", () => {
        removeChannels();
        window.ShoppingAuth.signOut("shopping-login.html");
      });
    }

    // Member pill → open household modal
    if (elements.memberPill) {
      elements.memberPill.addEventListener("click", () => {
        if (!state.household) return;
        if (elements.householdModalName) {
          elements.householdModalName.textContent = state.household.name;
        }
        if (elements.householdModal) {
          elements.householdModal.classList.remove("hidden");
          updateInvitePanel();
        }
      });
    }

    if (elements.closeHouseholdModalButton) {
      elements.closeHouseholdModalButton.addEventListener("click", () => {
        elements.householdModal.classList.add("hidden");
      });
    }

    if (elements.householdModal) {
      elements.householdModal.addEventListener("click", (e) => {
        if (e.target === elements.householdModal) {
          elements.householdModal.classList.add("hidden");
        }
      });
    }

    if (elements.signOutButton) {
      elements.signOutButton.addEventListener("click", () => {
        removeChannels();
        window.ShoppingAuth.signOut("shopping-login.html");
      });
    }

    if (elements.copyInviteButton) elements.copyInviteButton.addEventListener("click", async () => {
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

    if (elements.toggleAddPanelButton) {
      elements.toggleAddPanelButton.addEventListener("click", () => {
        if (elements.addEntryForm.classList.contains("hidden")) {
          openAddComposer();
        } else {
          closeAddComposer();
        }
      });
    }

    if (elements.scanRecipeButton) {
      elements.scanRecipeButton.addEventListener("click", () => {
        if (elements.addEntryForm.classList.contains("hidden")) {
          openAddComposer();
        }
        elements.chooseRecipeImageButton.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    if (elements.mobileComposerButton) {
      elements.mobileComposerButton.addEventListener("click", () => {
        if (elements.addEntryForm.classList.contains("hidden")) {
          openAddComposer();
        } else {
          closeAddComposer();
        }
      });
    }

    if (elements.composerBackdrop) {
      elements.composerBackdrop.addEventListener("click", () => {
        closeAddComposer();
      });
    }

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

      if (elements.takeRecipePhotoButton) elements.takeRecipePhotoButton.disabled = true;
      if (elements.chooseRecipeImageButton) elements.chooseRecipeImageButton.disabled = true;

      try {
        await scanRecipeImage(file);
      } catch (error) {
        clearRecipeScanResults();
        state.recipeScan.imageName = file.name || "recipe image";
        setRecipeScanStatus(error.message || "Unable to scan recipe image.");
        showToast(error.message || "Unable to scan recipe image.");
      } finally {
        if (elements.takeRecipePhotoButton) elements.takeRecipePhotoButton.disabled = false;
        if (elements.chooseRecipeImageButton) elements.chooseRecipeImageButton.disabled = false;
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

    if (elements.toggleNotesButton) {
      elements.toggleNotesButton.addEventListener("click", () => {
        state.showNotes = !state.showNotes;
        elements.toggleNotesButton.classList.toggle("active", state.showNotes);
        renderItems();
      });
    }

    wireQuickAddButtons();
    wireMembershipEvents();
    wireNotesEvents();
    wireReceiptEvents();
    wireRecipeBooksEvents();
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





































