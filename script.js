/**
 * ============================================================================
 * UDYAMAM - My Daily Diet & Weight Tracker
 * Designed for Amma's Health & Wellness Journey
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURATION & TARGETS (EASILY CUSTOMIZABLE)
// ============================================================================
const CONFIG = {
  // Personal Profile
  startingWeight: 85.0, // kg
  height: "5' 4\"",
  age: 50,
  goal: "Weight Loss",

  // Daily Diet Targets
  targets: {
    eggs: 2,           // 2 whole eggs
    paneerMinGrams: 75,// Target 75-100 g (achieved at >= 75)
    paneerMaxGrams: 100,
    waterLitres: 2.5   // 2.5 Litres per day
  },

  // Scoring Weights (Total = 100 Points)
  // You can adjust these point values anytime here:
  scoring: {
    vegetables: 15,          // Target completed
    eggs: 15,                // Target 2 eggs (proportional: 7.5 per egg up to 15)
    paneer: 15,              // Target 75-100g (proportional up to 75g)
    water: 20,               // Target 2.5L (proportional up to 2.5L)
    sweetsAvoided: 10,       // Discipline habit
    sugaryDrinksAvoided: 10, // Discipline habit
    oilyFoodAvoided: 10,     // Discipline habit
    snacksAvoided: 5         // Discipline habit
  },

  // Feedback Messages based on Achievement Tiers
  feedback: {
    excellent: {
      min: 90,
      title: "Excellent Day! 🌟",
      text: "You followed your plan very well. Consistency like this creates wonderful results!"
    },
    great: {
      min: 75,
      title: "Great Progress! 🌱",
      text: "Most of today's targets were achieved. Keep up this beautiful momentum!"
    },
    good: {
      min: 50,
      title: "Good Effort! 🌼",
      text: "You put in good effort today. A few areas can be smoothly improved tomorrow."
    },
    difficult: {
      min: 0,
      title: "Fresh Start Tomorrow! 💪",
      text: "Today had some challenges, but every single day is a fresh opportunity. Be proud of tracking!"
    }
  },

  // Storage key
  storageKey: "udyamam_diet_tracker_records"
};

// ============================================================================
// 2. STATE & CHART INSTANCES
// ============================================================================
let records = []; // Array of daily record objects
let weightChartInstance = null;
let achievementChartInstance = null;
let editingDate = null; // null means today, or YYYY-MM-DD when editing previous day

// ============================================================================
// 3. DATE UTILITIES
// ============================================================================

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats YYYY-MM-DD into a friendly readable format like "Sunday, 27 Sep 2026"
 */
function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

/**
 * Short month and day format for charts e.g. "Sep 27"
 */
function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

// ============================================================================
// 4. LOCALSTORAGE CRUD OPERATIONS
// ============================================================================

function loadRecords() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (raw) {
      records = JSON.parse(raw);
      if (!Array.isArray(records)) records = [];
    } else {
      records = [];
    }
  } catch (err) {
    console.error("Error reading from LocalStorage:", err);
    records = [];
  }
  // Sort records chronologically (oldest first)
  records.sort((a, b) => a.date.localeCompare(b.date));
}

function saveRecordsToStorage() {
  try {
    // Keep sorted
    records.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(records));
  } catch (err) {
    console.error("Error saving to LocalStorage:", err);
    showToast("Error saving data. Storage might be full.");
  }
}

function getRecord(dateStr) {
  return records.find(r => r.date === dateStr) || null;
}

function upsertRecord(newRecord) {
  const index = records.findIndex(r => r.date === newRecord.date);
  if (index >= 0) {
    // Merge existing fields (e.g. keep weight if checklist is being updated and vice-versa)
    records[index] = { ...records[index], ...newRecord };
  } else {
    records.push(newRecord);
  }
  saveRecordsToStorage();
}

function deleteRecordByDate(dateStr) {
  records = records.filter(r => r.date !== dateStr);
  saveRecordsToStorage();
}

// ============================================================================
// 5. CALCULATION LOGIC
// ============================================================================

/**
 * Calculates total achievement score (0 - 100%) and itemized breakdown
 */
function calculateAchievement(data) {
  let score = 0;
  const breakdown = {};

  // 1. Vegetables (15 pts)
  const vegMet = Boolean(data.vegetablesCompleted);
  const vegScore = vegMet ? CONFIG.scoring.vegetables : 0;
  score += vegScore;
  breakdown.vegetables = {
    met: vegMet,
    score: vegScore,
    max: CONFIG.scoring.vegetables,
    detail: vegMet ? (data.vegetableQuantity ? `${data.vegetableQuantity}g recorded ✓` : "Target Met ✓") : "Not completed"
  };

  // 2. Eggs (15 pts)
  const eggsEaten = Math.max(0, Number(data.eggs) || 0);
  const eggsMet = eggsEaten >= CONFIG.targets.eggs;
  // Proportional score up to max target
  const eggsRatio = Math.min(1, eggsEaten / CONFIG.targets.eggs);
  const eggsScore = Math.round(eggsRatio * CONFIG.scoring.eggs * 10) / 10;
  score += eggsScore;
  breakdown.eggs = {
    met: eggsMet,
    score: eggsScore,
    max: CONFIG.scoring.eggs,
    detail: `${eggsEaten} / ${CONFIG.targets.eggs} eggs ${eggsMet ? "✓" : ""}`
  };

  // 3. Paneer (15 pts)
  const paneerGrams = Math.max(0, Number(data.paneerQuantity) || 0);
  const paneerMet = paneerGrams >= CONFIG.targets.paneerMinGrams;
  const paneerRatio = Math.min(1, paneerGrams / CONFIG.targets.paneerMinGrams);
  const paneerScore = Math.round(paneerRatio * CONFIG.scoring.paneer * 10) / 10;
  score += paneerScore;
  breakdown.paneer = {
    met: paneerMet,
    score: paneerScore,
    max: CONFIG.scoring.paneer,
    detail: `${paneerGrams} g (Target: 75–100g) ${paneerMet ? "✓" : ""}`
  };

  // 4. Water (20 pts)
  const waterL = Math.max(0, Number(data.waterLitres) || 0);
  const waterMet = waterL >= CONFIG.targets.waterLitres;
  const waterRatio = Math.min(1, waterL / CONFIG.targets.waterLitres);
  const waterScore = Math.round(waterRatio * CONFIG.scoring.water * 10) / 10;
  score += waterScore;
  breakdown.water = {
    met: waterMet,
    score: waterScore,
    max: CONFIG.scoring.water,
    detail: `${waterL.toFixed(2)} L / ${CONFIG.targets.waterLitres} L ${waterMet ? "✓" : ""}`
  };

  // 5. Sweets Avoided (10 pts)
  const sweetsMet = Boolean(data.sweetsAvoided);
  const sweetsScore = sweetsMet ? CONFIG.scoring.sweetsAvoided : 0;
  score += sweetsScore;
  breakdown.sweetsAvoided = {
    met: sweetsMet,
    score: sweetsScore,
    max: CONFIG.scoring.sweetsAvoided,
    detail: sweetsMet ? "Avoided ✓" : "Had sweets"
  };

  // 6. Sugary Drinks Avoided (10 pts)
  const drinksMet = Boolean(data.sugaryDrinksAvoided);
  const drinksScore = drinksMet ? CONFIG.scoring.sugaryDrinksAvoided : 0;
  score += drinksScore;
  breakdown.sugaryDrinksAvoided = {
    met: drinksMet,
    score: drinksScore,
    max: CONFIG.scoring.sugaryDrinksAvoided,
    detail: drinksMet ? "Avoided ✓" : "Had sugary drinks"
  };

  // 7. Fried/Oily Food Avoided (10 pts)
  const friedMet = Boolean(data.oilyFoodAvoided);
  const friedScore = friedMet ? CONFIG.scoring.oilyFoodAvoided : 0;
  score += friedScore;
  breakdown.oilyFoodAvoided = {
    met: friedMet,
    score: friedScore,
    max: CONFIG.scoring.oilyFoodAvoided,
    detail: friedMet ? "Avoided ✓" : "Had fried food"
  };

  // 8. Unnecessary Snacks Avoided (5 pts)
  const snacksMet = Boolean(data.snacksAvoided);
  const snacksScore = snacksMet ? CONFIG.scoring.snacksAvoided : 0;
  score += snacksScore;
  breakdown.snacksAvoided = {
    met: snacksMet,
    score: snacksScore,
    max: CONFIG.scoring.snacksAvoided,
    detail: snacksMet ? "Avoided ✓" : "Snacked"
  };

  // Ensure clean integer round capped at 100
  const totalPercentage = Math.min(100, Math.round(score));

  return {
    percentage: totalPercentage,
    breakdown: breakdown
  };
}

/**
 * Returns feedback info based on score percentage
 */
function getFeedbackForScore(percentage) {
  if (percentage >= CONFIG.feedback.excellent.min) return CONFIG.feedback.excellent;
  if (percentage >= CONFIG.feedback.great.min) return CONFIG.feedback.great;
  if (percentage >= CONFIG.feedback.good.min) return CONFIG.feedback.good;
  return CONFIG.feedback.difficult;
}

/**
 * Calculates current streak (consecutive days where checklist was submitted ending today or yesterday)
 */
function calculateStreak() {
  if (records.length === 0) {
    return { currentStreak: 0, totalDaysTracked: 0, averageAchievement: 0 };
  }

  // Filter only records that have a submitted checklist
  const checklistRecords = records.filter(r => r.achievementPercentage !== undefined && r.achievementPercentage !== null);
  const totalDaysTracked = checklistRecords.length;

  if (totalDaysTracked === 0) {
    return { currentStreak: 0, totalDaysTracked: 0, averageAchievement: 0 };
  }

  // Calculate Average Achievement
  const sumScores = checklistRecords.reduce((acc, r) => acc + (r.achievementPercentage || 0), 0);
  const averageAchievement = Math.round(sumScores / totalDaysTracked);

  // Consecutive Days Streak Calculation
  // Extract unique sorted date strings
  const datesSet = new Set(checklistRecords.map(r => r.date));
  const todayStr = getTodayDateString();

  let streak = 0;
  const parts = todayStr.split("-");
  let checkDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

  // If today has not been submitted yet, start checking from yesterday so streak doesn't break prematurely
  if (!datesSet.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, "0");
    const d = String(checkDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    if (datesSet.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    currentStreak: streak,
    totalDaysTracked: totalDaysTracked,
    averageAchievement: averageAchievement
  };
}

// ============================================================================
// 6. UI SYNCHRONIZATION & INTERACTION HANDLERS
// ============================================================================

/**
 * Updates the water progress bar and text based on the water input field
 */
function updateWaterUI(litres) {
  const currentL = Math.max(0, Number(litres) || 0);
  const targetL = CONFIG.targets.waterLitres;
  const percentage = Math.min(100, Math.round((currentL / targetL) * 100));

  const progressBar = document.getElementById("waterProgressBar");
  const progressText = document.getElementById("waterProgressText");
  const percentageText = document.getElementById("waterPercentageText");
  const successBanner = document.getElementById("waterSuccessBanner");
  const achievementTag = document.getElementById("waterAchievementTag");

  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
    if (percentage >= 100) {
      progressBar.classList.add("achieved");
    } else {
      progressBar.classList.remove("achieved");
    }
  }

  if (progressText) {
    progressText.textContent = `Water: ${currentL.toFixed(2)} L / ${targetL.toFixed(1)} L`;
  }

  if (percentageText) {
    percentageText.textContent = `${percentage}%`;
  }

  if (achievementTag) {
    achievementTag.textContent = `${currentL.toFixed(2)} / ${targetL.toFixed(1)} L`;
    if (currentL >= targetL) {
      achievementTag.classList.add("achieved");
      achievementTag.textContent = "2.5 L Achieved ✓";
    } else {
      achievementTag.classList.remove("achieved");
    }
  }

  if (successBanner) {
    successBanner.style.display = currentL >= targetL ? "block" : "none";
  }
}

/**
 * Quick increment water helper
 */
function addWater(amount) {
  const input = document.getElementById("waterInput");
  if (!input) return;
  const current = Number(input.value) || 0;
  const updated = Math.round((current + amount) * 100) / 100;
  input.value = updated.toFixed(2);
  updateWaterUI(updated);
}

function resetWater() {
  const input = document.getElementById("waterInput");
  if (!input) return;
  input.value = "0.00";
  updateWaterUI(0);
}

/**
 * Quick stepper for eggs
 */
function adjustEggs(delta) {
  const input = document.getElementById("eggsInput");
  if (!input) return;
  let val = (Number(input.value) || 0) + delta;
  if (val < 0) val = 0;
  if (val > 10) val = 10;
  input.value = val;
  updateEggStatus(val);
}

function setEggs(val) {
  const input = document.getElementById("eggsInput");
  if (!input) return;
  input.value = val;
  updateEggStatus(val);
}

function updateEggStatus(val) {
  const statusPill = document.getElementById("eggsTargetStatus");
  if (!statusPill) return;
  if (val >= CONFIG.targets.eggs) {
    statusPill.textContent = `${val} / 2 Target Met ✓`;
    statusPill.classList.add("achieved");
  } else {
    statusPill.textContent = `Target: 2 eggs (${val}/2)`;
    statusPill.classList.remove("achieved");
  }
}

/**
 * Quick button for paneer
 */
function setPaneer(grams) {
  const input = document.getElementById("paneerInput");
  if (!input) return;
  input.value = grams;
  updatePaneerStatus(grams);
}

function updatePaneerStatus(grams) {
  const statusPill = document.getElementById("paneerTargetStatus");
  if (!statusPill) return;
  if (grams >= CONFIG.targets.paneerMinGrams) {
    statusPill.textContent = `${grams}g Target Met ✓`;
    statusPill.classList.add("achieved");
  } else {
    statusPill.textContent = `Target: 75–100 g (${grams}g)`;
    statusPill.classList.remove("achieved");
  }
}

/**
 * Shows temporary notification toast
 */
function showToast(msg) {
  const toast = document.getElementById("toastMessage");
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = "block";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.display = "none";
  }, 3500);
}

// ============================================================================
// 7. FORM SUBMISSION HANDLERS
// ============================================================================

/**
 * Handles saving/updating the Daily Checklist
 */
function handleChecklistSubmit() {
  const activeDate = editingDate || getTodayDateString();

  // Read inputs
  const vegCompleted = document.getElementById("vegCheckbox").checked;
  const vegQty = Number(document.getElementById("vegQuantity").value) || 0;
  const eggsVal = Number(document.getElementById("eggsInput").value) || 0;
  const paneerVal = Number(document.getElementById("paneerInput").value) || 0;
  const waterVal = Number(document.getElementById("waterInput").value) || 0;

  // Habits
  const sweetsAvoided = document.getElementById("habitSweets").checked;
  const drinksAvoided = document.getElementById("habitDrinks").checked;
  const friedAvoided = document.getElementById("habitFried").checked;
  const snacksAvoided = document.getElementById("habitSnacks").checked;

  // Validation
  if (eggsVal < 0 || eggsVal > 15) {
    alert("Please enter a valid egg count between 0 and 15.");
    return;
  }
  if (paneerVal < 0 || paneerVal > 1500) {
    alert("Please enter a valid paneer quantity in grams (0 to 1500g).");
    return;
  }
  if (waterVal < 0 || waterVal > 15) {
    alert("Please enter a valid water quantity (0 to 15 Litres).");
    return;
  }

  // Calculate Achievement
  const checklistData = {
    vegetablesCompleted: vegCompleted,
    vegetableQuantity: vegQty,
    eggs: eggsVal,
    paneerQuantity: paneerVal,
    waterLitres: waterVal,
    sweetsAvoided: sweetsAvoided,
    sugaryDrinksAvoided: drinksAvoided,
    oilyFoodAvoided: friedAvoided,
    snacksAvoided: snacksAvoided
  };

  const evalResult = calculateAchievement(checklistData);

  // Retrieve existing record to preserve weight if present
  const existingRecord = getRecord(activeDate) || {};

  const recordToSave = {
    ...existingRecord,
    date: activeDate,
    ...checklistData,
    achievementPercentage: evalResult.percentage,
    lastUpdated: new Date().toISOString()
  };

  upsertRecord(recordToSave);

  // Render achievement report card immediately
  renderDailyAchievementReport(evalResult, recordToSave);

  // Toast confirmation
  const isUpdate = Boolean(existingRecord.achievementPercentage !== undefined);
  showToast(isUpdate ? "Today's report updated successfully! ✓" : "Today's report saved! ✓");

  // Reset editing mode back to normal
  if (editingDate) {
    editingDate = null;
  }

  // Refresh all dashboard metrics, tables, and graphs
  refreshDashboard();
}

/**
 * Handles saving today's weight
 */
function handleWeightSubmit() {
  const weightInput = document.getElementById("weightInput");
  if (!weightInput) return;
  const weightVal = parseFloat(weightInput.value);

  if (isNaN(weightVal) || weightVal < 35 || weightVal > 250) {
    alert("Please enter a realistic weight value between 35 kg and 250 kg.");
    return;
  }

  const activeDate = editingDate || getTodayDateString();
  const existingRecord = getRecord(activeDate) || { date: activeDate };

  const recordToSave = {
    ...existingRecord,
    weight: Math.round(weightVal * 10) / 10
  };

  upsertRecord(recordToSave);
  showToast(`Weight of ${weightVal.toFixed(1)} kg saved! ✓`);

  refreshDashboard();
}

// ============================================================================
// 8. REPORT RENDERING
// ============================================================================

function renderDailyAchievementReport(evalResult, record) {
  const percentage = evalResult.percentage;
  const breakdown = evalResult.breakdown;
  const feedback = getFeedbackForScore(percentage);

  // Update Score Circle & Text
  const scoreNumEl = document.getElementById("reportScoreNumber");
  const scoreCircle = document.getElementById("reportScoreCircle");
  const fbTitle = document.getElementById("reportFeedbackTitle");
  const fbText = document.getElementById("reportFeedbackMessage");
  const dateTag = document.getElementById("reportDateTag");

  if (scoreNumEl) scoreNumEl.textContent = `${percentage}%`;
  if (fbTitle) fbTitle.textContent = feedback.title;
  if (fbText) fbText.textContent = feedback.text;
  if (dateTag) dateTag.textContent = formatDateDisplay(record.date);

  // Color circle based on score
  if (scoreCircle) {
    if (percentage >= 90) {
      scoreCircle.style.borderColor = "var(--primary-brand)";
      scoreCircle.style.color = "var(--primary-deep)";
    } else if (percentage >= 75) {
      scoreCircle.style.borderColor = "var(--status-success)";
      scoreCircle.style.color = "var(--status-success)";
    } else if (percentage >= 50) {
      scoreCircle.style.borderColor = "var(--accent-gold)";
      scoreCircle.style.color = "#996b12";
    } else {
      scoreCircle.style.borderColor = "var(--status-warning)";
      scoreCircle.style.color = "var(--status-warning)";
    }
  }

  // Breakdown list rendering
  const listEl = document.getElementById("reportBreakdownList");
  if (listEl) {
    listEl.innerHTML = `
      <div class="breakdown-item">
        <span class="item-text">🥬 Vegetables</span>
        <span class="item-status ${breakdown.vegetables.met ? "achieved" : "missed"}">
          ${breakdown.vegetables.detail}
        </span>
      </div>
      <div class="breakdown-item">
        <span class="item-text">🥚 Eggs</span>
        <span class="item-status ${breakdown.eggs.met ? "achieved" : "missed"}">
          ${breakdown.eggs.detail}
        </span>
      </div>
      <div class="breakdown-item">
        <span class="item-text">🧀 Paneer</span>
        <span class="item-status ${breakdown.paneer.met ? "achieved" : "missed"}">
          ${breakdown.paneer.detail}
        </span>
      </div>
      <div class="breakdown-item">
        <span class="item-text">💧 Water</span>
        <span class="item-status ${breakdown.water.met ? "achieved" : "missed"}">
          ${breakdown.water.detail}
        </span>
      </div>
      <div class="breakdown-item">
        <span class="item-text">🍬 Sweets avoided</span>
        <span class="item-status ${breakdown.sweetsAvoided.met ? "achieved" : "missed"}">
          ${breakdown.sweetsAvoided.met ? "✓ Achieved" : "Missed"}
        </span>
      </div>
      <div class="breakdown-item">
        <span class="item-text">🥤 Sugary drinks avoided</span>
        <span class="item-status ${breakdown.sugaryDrinksAvoided.met ? "achieved" : "missed"}">
          ${breakdown.sugaryDrinksAvoided.met ? "✓ Achieved" : "Missed"}
        </span>
      </div>
      <div class="breakdown-item">
        <span class="item-text">🍟 Fried food avoided</span>
        <span class="item-status ${breakdown.oilyFoodAvoided.met ? "achieved" : "missed"}">
          ${breakdown.oilyFoodAvoided.met ? "✓ Achieved" : "Missed"}
        </span>
      </div>
      <div class="breakdown-item">
        <span class="item-text">🍪 Unnecessary snacks avoided</span>
        <span class="item-status ${breakdown.snacksAvoided.met ? "achieved" : "missed"}">
          ${breakdown.snacksAvoided.met ? "✓ Achieved" : "Missed"}
        </span>
      </div>
    `;
  }
}

// ============================================================================
// 9. DASHBOARD METRICS & WEIGHT PROGRESS REFRESH
// ============================================================================

function refreshDashboard() {
  const todayStr = getTodayDateString();
  const todayRecord = getRecord(todayStr);

  // 1. Update Today's Date Badge
  const todayDateBadge = document.getElementById("todayDateBadge");
  if (todayDateBadge) {
    todayDateBadge.textContent = `📅 ${formatDateDisplay(todayStr)}`;
  }

  // 2. Form state (New vs Update)
  const submitBtn = document.getElementById("submitChecklistBtn");
  const formBadge = document.getElementById("formStatusBadge");
  const formHelp = document.getElementById("formHelpText");

  if (todayRecord && todayRecord.achievementPercentage !== undefined) {
    if (submitBtn) {
      submitBtn.textContent = "UPDATE TODAY'S REPORT";
      submitBtn.classList.add("update-mode");
    }
    if (formBadge) {
      formBadge.textContent = "Report Submitted ✓";
      formBadge.className = "card-status-indicator submitted";
    }
    if (formHelp) {
      formHelp.textContent = "Today's report is saved. You can modify any value and click Update.";
    }
  } else {
    if (submitBtn) {
      submitBtn.textContent = "SUBMIT TODAY'S REPORT";
      submitBtn.classList.remove("update-mode");
    }
    if (formBadge) {
      formBadge.textContent = "Not Submitted Yet";
      formBadge.className = "card-status-indicator";
    }
  }

  // 3. Populate Checklist Form with Today's Data (if not in editing mode)
  if (!editingDate) {
    populateChecklistForm(todayRecord);
  }

  // 4. Update KPI Summary Cards
  updateKPICards(todayRecord);

  // 5. Update Weight Section
  updateWeightSection();

  // 6. Refresh Charts
  updateCharts();

  // 7. Refresh History Table
  renderHistoryTable();
}

/**
 * Fills checklist form inputs from a record
 */
function populateChecklistForm(record) {
  if (!record) {
    // Defaults
    document.getElementById("vegCheckbox").checked = false;
    document.getElementById("vegQuantity").value = "";
    document.getElementById("eggsInput").value = "0";
    document.getElementById("paneerInput").value = "0";
    document.getElementById("waterInput").value = "0.00";
    document.getElementById("habitSweets").checked = false;
    document.getElementById("habitDrinks").checked = false;
    document.getElementById("habitFried").checked = false;
    document.getElementById("habitSnacks").checked = false;
    updateWaterUI(0);
    updateEggStatus(0);
    updatePaneerStatus(0);
    return;
  }

  document.getElementById("vegCheckbox").checked = Boolean(record.vegetablesCompleted);
  document.getElementById("vegQuantity").value = record.vegetableQuantity || "";
  document.getElementById("eggsInput").value = record.eggs || 0;
  document.getElementById("paneerInput").value = record.paneerQuantity || 0;
  document.getElementById("waterInput").value = (record.waterLitres !== undefined) ? Number(record.waterLitres).toFixed(2) : "0.00";
  document.getElementById("habitSweets").checked = Boolean(record.sweetsAvoided);
  document.getElementById("habitDrinks").checked = Boolean(record.sugaryDrinksAvoided);
  document.getElementById("habitFried").checked = Boolean(record.oilyFoodAvoided);
  document.getElementById("habitSnacks").checked = Boolean(record.snacksAvoided);

  updateWaterUI(record.waterLitres || 0);
  updateEggStatus(record.eggs || 0);
  updatePaneerStatus(record.paneerQuantity || 0);

  // If report exists, render it
  if (record.achievementPercentage !== undefined) {
    const evalResult = calculateAchievement(record);
    renderDailyAchievementReport(evalResult, record);
  }
}

/**
 * Updates KPI Summary Cards at top of screen
 */
function updateKPICards(todayRecord) {
  // Current Weight
  const kpiCurrentWeight = document.getElementById("kpiCurrentWeight");
  const kpiWeightChange = document.getElementById("kpiWeightChange");

  // Find latest recorded weight across all records
  const weightRecords = records.filter(r => r.weight !== undefined && r.weight !== null);
  let latestWeight = null;
  if (weightRecords.length > 0) {
    latestWeight = weightRecords[weightRecords.length - 1].weight;
  }

  if (latestWeight !== null) {
    kpiCurrentWeight.textContent = `${latestWeight.toFixed(1)} kg`;
    const diff = latestWeight - CONFIG.startingWeight;
    if (diff < 0) {
      kpiWeightChange.textContent = `Lost ${Math.abs(diff).toFixed(1)} kg from start 🎉`;
      kpiWeightChange.style.color = "var(--primary-brand)";
    } else if (diff > 0) {
      kpiWeightChange.textContent = `+${diff.toFixed(1)} kg from start`;
      kpiWeightChange.style.color = "var(--text-secondary)";
    } else {
      kpiWeightChange.textContent = `At starting weight (85.0 kg)`;
      kpiWeightChange.style.color = "var(--text-secondary)";
    }
  } else {
    kpiCurrentWeight.textContent = `${CONFIG.startingWeight.toFixed(1)} kg`;
    kpiWeightChange.textContent = "Starting Weight";
  }

  // Today's Achievement
  const kpiAchievement = document.getElementById("kpiAchievement");
  const kpiAchievementStatus = document.getElementById("kpiAchievementStatus");
  if (todayRecord && todayRecord.achievementPercentage !== undefined) {
    kpiAchievement.textContent = `${todayRecord.achievementPercentage}%`;
    const fb = getFeedbackForScore(todayRecord.achievementPercentage);
    kpiAchievementStatus.textContent = fb.title;
  } else {
    kpiAchievement.textContent = "--%";
    kpiAchievementStatus.textContent = "Not submitted yet today";
  }

  // Water Progress
  const kpiWater = document.getElementById("kpiWater");
  const kpiWaterStatus = document.getElementById("kpiWaterStatus");
  const waterL = todayRecord && todayRecord.waterLitres !== undefined ? Number(todayRecord.waterLitres) : 0;
  kpiWater.textContent = `${waterL.toFixed(1)} / 2.5 L`;
  if (waterL >= 2.5) {
    kpiWaterStatus.textContent = "Daily Goal Reached ✓";
    kpiWaterStatus.style.color = "var(--status-success)";
  } else {
    const rem = (2.5 - waterL).toFixed(1);
    kpiWaterStatus.textContent = `${rem} L remaining`;
    kpiWaterStatus.style.color = "var(--text-secondary)";
  }

  // Streak & Total Tracked
  const kpiStreak = document.getElementById("kpiStreak");
  const kpiTotalTracked = document.getElementById("kpiTotalTracked");
  const streakData = calculateStreak();
  kpiStreak.textContent = `${streakData.currentStreak} Day${streakData.currentStreak === 1 ? "" : "s"}`;
  kpiTotalTracked.textContent = `Total: ${streakData.totalDaysTracked} Days | Avg: ${streakData.averageAchievement}%`;
}

/**
 * Updates Weight Entry Section and stats
 */
function updateWeightSection() {
  const weightInput = document.getElementById("weightInput");
  const dispCurrentWeight = document.getElementById("dispCurrentWeight");
  const dispTotalChange = document.getElementById("dispTotalChange");
  const dispYesterdayChange = document.getElementById("dispYesterdayChange");
  const weightMessageBanner = document.getElementById("weightMessageBanner");

  const todayStr = getTodayDateString();
  const todayRecord = getRecord(todayStr);

  // If today has recorded weight, put in input
  if (todayRecord && todayRecord.weight !== undefined && !weightInput.matches(":focus")) {
    weightInput.value = todayRecord.weight;
  }

  const weightRecords = records.filter(r => r.weight !== undefined && r.weight !== null);
  if (weightRecords.length === 0) {
    dispCurrentWeight.textContent = `${CONFIG.startingWeight.toFixed(1)} kg`;
    dispTotalChange.textContent = "0.0 kg";
    dispYesterdayChange.textContent = "--";
    weightMessageBanner.textContent = "Weigh yourself once a day in the morning before breakfast for consistent results.";
    return;
  }

  const latestRecord = weightRecords[weightRecords.length - 1];
  const latestWeight = latestRecord.weight;
  dispCurrentWeight.textContent = `${latestWeight.toFixed(1)} kg`;

  // Total change from starting weight
  const totalChange = latestWeight - CONFIG.startingWeight;
  const sign = totalChange > 0 ? "+" : "";
  dispTotalChange.textContent = `${sign}${totalChange.toFixed(1)} kg`;

  // Change from previous recorded entry
  if (weightRecords.length > 1) {
    const prevWeight = weightRecords[weightRecords.length - 2].weight;
    const diffPrev = latestWeight - prevWeight;
    const prevSign = diffPrev > 0 ? "+" : "";
    dispYesterdayChange.textContent = `${prevSign}${diffPrev.toFixed(1)} kg`;
  } else {
    dispYesterdayChange.textContent = "First entry";
  }

  // Friendly, neutral, motivating message
  if (totalChange < 0) {
    const lostKg = Math.abs(totalChange).toFixed(1);
    weightMessageBanner.innerHTML = `🌟 <strong>You've lost ${lostKg} kg from your starting weight.</strong> Wonderful progress, Amma! Keep taking it one day at a time.`;
  } else if (totalChange > 0) {
    weightMessageBanner.innerHTML = `💧 <strong>Weight naturally fluctuates day to day</strong> due to water retention and digestion. Stay consistent with your diet and water!`;
  } else {
    weightMessageBanner.innerHTML = `⚖️ <strong>Starting baseline recorded at ${CONFIG.startingWeight.toFixed(1)} kg.</strong> Ready for the journey ahead!`;
  }
}

// ============================================================================
// 10. CHART.JS VISUALIZATIONS
// ============================================================================

function initCharts() {
  const weightCtx = document.getElementById("weightChart");
  const achieveCtx = document.getElementById("achievementChart");

  if (weightCtx && typeof Chart !== "undefined") {
    weightChartInstance = new Chart(weightCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Weight (kg)",
            data: [],
            borderColor: "#2a6946",
            backgroundColor: "rgba(42, 105, 70, 0.12)",
            tension: 0.3,
            fill: true,
            pointBackgroundColor: "#205036",
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: "Starting Weight (85 kg)",
            data: [],
            borderColor: "#b5c4ba",
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { boxWidth: 12, font: { family: "inherit", size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (context) => `Weight: ${context.parsed.y} kg`
            }
          }
        },
        scales: {
          y: {
            suggestedMin: 75,
            suggestedMax: 88,
            ticks: {
              callback: (value) => `${value} kg`
            },
            grid: { color: "#eef2ef" }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  if (achieveCtx && typeof Chart !== "undefined") {
    achievementChartInstance = new Chart(achieveCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [{
          label: "Achievement %",
          data: [],
          backgroundColor: [],
          borderRadius: 6,
          maxBarThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Achievement: ${context.parsed.y}%`
            }
          }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`
            },
            grid: { color: "#eef2ef" }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  updateCharts();
}

function updateCharts() {
  if (!weightChartInstance || !achievementChartInstance) return;

  // 1. Weight Chart Data
  const weightRecords = records.filter(r => r.weight !== undefined && r.weight !== null);
  const weightLabels = weightRecords.map(r => formatDateShort(r.date));
  const weightData = weightRecords.map(r => r.weight);
  const baselineData = weightRecords.map(() => CONFIG.startingWeight);

  weightChartInstance.data.labels = weightLabels;
  weightChartInstance.data.datasets[0].data = weightData;
  weightChartInstance.data.datasets[1].data = baselineData;
  weightChartInstance.update();

  // 2. Achievement Chart Data
  const achieveRecords = records.filter(r => r.achievementPercentage !== undefined && r.achievementPercentage !== null);
  const achieveLabels = achieveRecords.map(r => formatDateShort(r.date));
  const achieveData = achieveRecords.map(r => r.achievementPercentage);
  const barColors = achieveData.map(val => {
    if (val >= 90) return "#2a6946"; // Forest green
    if (val >= 75) return "#38a169"; // Light green
    if (val >= 50) return "#d69e2e"; // Warm amber
    return "#e53e3e"; // Red/encouragement
  });

  achievementChartInstance.data.labels = achieveLabels;
  achievementChartInstance.data.datasets[0].data = achieveData;
  achievementChartInstance.data.datasets[0].backgroundColor = barColors;
  achievementChartInstance.update();
}

// ============================================================================
// 11. HISTORY ARCHIVE TABLE & MODAL
// ============================================================================

function renderHistoryTable() {
  const tbody = document.getElementById("historyTableBody");
  const emptyState = document.getElementById("emptyHistoryState");
  const countEl = document.getElementById("historyCount");
  if (!tbody) return;

  // Clone and sort newest first for history review
  const displayList = [...records].reverse();

  if (countEl) {
    countEl.textContent = `${displayList.length} entr${displayList.length === 1 ? "y" : "ies"} recorded`;
  }

  if (displayList.length === 0) {
    tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  tbody.innerHTML = displayList.map(item => {
    const weightStr = item.weight ? `${item.weight.toFixed(1)} kg` : "--";
    const waterStr = item.waterLitres !== undefined ? `${Number(item.waterLitres).toFixed(1)} L` : "--";
    const eggsStr = item.eggs !== undefined ? `${item.eggs}/2` : "--";
    const paneerStr = item.paneerQuantity !== undefined ? `${item.paneerQuantity}g` : "--";
    const vegStr = item.vegetablesCompleted ? "✓ Yes" : (item.achievementPercentage !== undefined ? "No" : "--");

    let scoreBadge = "--";
    if (item.achievementPercentage !== undefined) {
      let scoreClass = "low";
      if (item.achievementPercentage >= 90) scoreClass = "high";
      else if (item.achievementPercentage >= 70) scoreClass = "mid";
      scoreBadge = `<span class="score-tag ${scoreClass}">${item.achievementPercentage}%</span>`;
    }

    return `
      <tr>
        <td><strong>${formatDateDisplay(item.date)}</strong></td>
        <td>${weightStr}</td>
        <td>${scoreBadge}</td>
        <td>${waterStr}</td>
        <td>${eggsStr}</td>
        <td>${paneerStr}</td>
        <td>${vegStr}</td>
        <td>
          <div class="table-btn-group">
            <button type="button" class="btn-table-action" onclick="viewDayModal('${item.date}')" title="View detailed report">View</button>
            <button type="button" class="btn-table-action" onclick="editDay('${item.date}')" title="Edit this day's entries">Edit</button>
            <button type="button" class="btn-table-action delete" onclick="confirmDeleteDay('${item.date}')" title="Delete record">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/**
 * Loads a historical day into the form for editing
 */
function editDay(dateStr) {
  const record = getRecord(dateStr);
  if (!record) return;

  editingDate = dateStr;
  populateChecklistForm(record);

  // Update badge and scroll up
  const formBadge = document.getElementById("formStatusBadge");
  const submitBtn = document.getElementById("submitChecklistBtn");
  const dateBadge = document.getElementById("todayDateBadge");

  if (dateBadge) dateBadge.textContent = `✏️ Editing: ${formatDateDisplay(dateStr)}`;
  if (formBadge) {
    formBadge.textContent = "Editing Mode";
    formBadge.className = "card-status-indicator";
  }
  if (submitBtn) {
    submitBtn.textContent = `SAVE EDITS FOR ${formatDateShort(dateStr).toUpperCase()}`;
    submitBtn.classList.add("update-mode");
  }

  // Scroll to checklist smoothly
  document.getElementById("checklistSection").scrollIntoView({ behavior: "smooth" });
  showToast(`Loaded ${formatDateDisplay(dateStr)} into the form to edit.`);
}

/**
 * Deletes a day with explicit confirmation
 */
function confirmDeleteDay(dateStr) {
  const confirmMsg = `Are you sure you want to delete the record for ${formatDateDisplay(dateStr)}?`;
  if (window.confirm(confirmMsg)) {
    deleteRecordByDate(dateStr);
    showToast(`Record for ${formatDateDisplay(dateStr)} deleted.`);
    refreshDashboard();
  }
}

/**
 * Opens detailed modal for a specific day
 */
function viewDayModal(dateStr) {
  const record = getRecord(dateStr);
  if (!record) return;

  const modal = document.getElementById("detailModalBackdrop");
  const title = document.getElementById("modalDateTitle");
  const body = document.getElementById("modalBodyContent");
  const editBtn = document.getElementById("modalEditBtn");

  if (title) title.textContent = `Report for ${formatDateDisplay(dateStr)}`;
  if (editBtn) {
    editBtn.onclick = () => {
      closeDetailModal();
      editDay(dateStr);
    };
  }

  const hasChecklist = record.achievementPercentage !== undefined && record.achievementPercentage !== null;
  const evalResult = hasChecklist ? calculateAchievement(record) : { percentage: "--", breakdown: null };
  const feedback = hasChecklist ? getFeedbackForScore(record.achievementPercentage) : { title: "Weight Logged", text: "Daily checklist was not recorded on this date." };

  const scoreDisplayHtml = hasChecklist ? `
    <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-app); border-radius: var(--radius-sm);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-weight: 700; color: var(--text-secondary);">Achievement Score:</span>
        <span style="font-size: 1.4rem; font-weight: 800; color: var(--primary-deep);">${evalResult.percentage}%</span>
      </div>
      <div style="font-weight: 600; color: var(--primary-brand); font-size: 0.95rem;">${feedback.title}</div>
      <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 2px;">${feedback.text}</div>
    </div>
  ` : `
    <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-app); border-radius: var(--radius-sm);">
      <div style="font-weight: 600; color: var(--text-secondary); font-size: 0.95rem;">Checklist not submitted for this date</div>
    </div>
  `;

  body.innerHTML = `
    ${scoreDisplayHtml}
    <div style="margin-bottom: 16px;">
      <h4 style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 8px;">Habits & Nutrition:</h4>
      <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px;">
        <li style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:4px;">
          <span>⚖️ Recorded Weight</span>
          <strong>${record.weight ? `${record.weight.toFixed(1)} kg` : "Not recorded"}</strong>
        </li>
        <li style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:4px;">
          <span>🥬 Vegetables</span>
          <strong>${record.vegetablesCompleted ? `Target Met (${record.vegetableQuantity || 0}g)` : (hasChecklist ? "Missed" : "--")}</strong>
        </li>
        <li style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:4px;">
          <span>🥚 Eggs</span>
          <strong>${record.eggs !== undefined ? `${record.eggs} / 2 eggs` : "--"}</strong>
        </li>
        <li style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:4px;">
          <span>🧀 Paneer</span>
          <strong>${record.paneerQuantity !== undefined ? `${record.paneerQuantity} g` : "--"}</strong>
        </li>
        <li style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:4px;">
          <span>💧 Water Intake</span>
          <strong>${record.waterLitres !== undefined ? `${Number(record.waterLitres).toFixed(2)} / 2.5 Litres` : "--"}</strong>
        </li>
        <li style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:4px;">
          <span>🍬 Avoided Sweets</span>
          <strong>${record.sweetsAvoided !== undefined ? (record.sweetsAvoided ? "✓ Yes" : "No") : "--"}</strong>
        </li>
        <li style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:4px;">
          <span>🥤 Avoided Sugary Drinks</span>
          <strong>${record.sugaryDrinksAvoided !== undefined ? (record.sugaryDrinksAvoided ? "✓ Yes" : "No") : "--"}</strong>
        </li>
        <li style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:4px;">
          <span>🍟 Avoided Fried/Oily Food</span>
          <strong>${record.oilyFoodAvoided !== undefined ? (record.oilyFoodAvoided ? "✓ Yes" : "No") : "--"}</strong>
        </li>
        <li style="display:flex; justify-content:space-between; padding-bottom:4px;">
          <span>🍪 Avoided Unnecessary Snacks</span>
          <strong>${record.snacksAvoided !== undefined ? (record.snacksAvoided ? "✓ Yes" : "No") : "--"}</strong>
        </li>
      </ul>
    </div>
  `;

  modal.style.display = "flex";
}

function closeDetailModal(event) {
  const modal = document.getElementById("detailModalBackdrop");
  if (modal) modal.style.display = "none";
}

// ============================================================================
// 12. BACKUP (EXPORT / IMPORT) & RESET
// ============================================================================

function exportDataBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
  const dlAnchor = document.createElement("a");
  const fileName = `udyamam_backup_${getTodayDateString()}.json`;
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", fileName);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  showToast("Backup exported successfully! Check your Downloads folder.");
}

function importDataBackup(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        if (confirm(`Found ${imported.length} records in this backup file. Would you like to merge/replace your current records?`)) {
          // Merge by date
          const map = new Map();
          records.forEach(r => map.set(r.date, r));
          imported.forEach(r => {
            if (r.date) map.set(r.date, { ...(map.get(r.date) || {}), ...r });
          });
          records = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
          saveRecordsToStorage();
          refreshDashboard();
          showToast(`Successfully imported ${imported.length} records! ✓`);
        }
      } else {
        alert("Invalid file format. Expected a JSON array of records.");
      }
    } catch (err) {
      alert("Error parsing JSON file. Please make sure it's a valid backup file.");
      console.error(err);
    }
  };
  reader.readAsText(file);
  event.target.value = ""; // Reset file input
}

function confirmResetAllData() {
  const msg = "⚠️ CAUTION: Are you sure you want to reset and clear ALL recorded data?\n\nThis will delete your history, weight entries, and streaks. This cannot be undone unless you have exported a backup.";
  if (confirm(msg)) {
    if (confirm("Final confirmation: Delete all diet and weight tracking records?")) {
      records = [];
      localStorage.removeItem(CONFIG.storageKey);
      refreshDashboard();
      showToast("All data has been reset.");
    }
  }
}

// ============================================================================
// 13. REAL-TIME INPUT EVENT LISTENERS
// ============================================================================

function attachEventListeners() {
  // Water input live listener
  const waterInput = document.getElementById("waterInput");
  if (waterInput) {
    waterInput.addEventListener("input", (e) => {
      updateWaterUI(e.target.value);
    });
  }

  // Eggs input live listener
  const eggsInput = document.getElementById("eggsInput");
  if (eggsInput) {
    eggsInput.addEventListener("input", (e) => {
      updateEggStatus(Number(e.target.value) || 0);
    });
  }

  // Paneer input live listener
  const paneerInput = document.getElementById("paneerInput");
  if (paneerInput) {
    paneerInput.addEventListener("input", (e) => {
      updatePaneerStatus(Number(e.target.value) || 0);
    });
  }
}

// ============================================================================
// 14. APPLICATION INITIALIZATION
// ============================================================================

window.addEventListener("DOMContentLoaded", () => {
  // 1. Load data from LocalStorage
  loadRecords();

  // 2. Attach interactive listeners
  attachEventListeners();

  // 3. Initialize visual charts
  initCharts();

  // 4. Initial UI synchronization
  refreshDashboard();
});
