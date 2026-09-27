# UDYAMAM (उद्यमम्) - Personal Diet & Weight Tracker 🌸

A clean, modern, beginner-friendly personal diet and weight tracking web application designed for daily health self-monitoring, nutrition compliance, water tracking, and weight progress.

## ✨ Features

- **Profile & Motivation**: Displays starting baseline (85.0 kg, 5'4", 50 yrs, Weight Loss) and daily motivation banner.
- **Daily Checklist**:
  - 🥬 Vegetables target with optional gram intake
  - 🥚 Eggs target (2 eggs) with auto-status indicator
  - 🧀 Paneer target (75–100 g) with quick increment buttons
  - 💧 Water intake target (2.5 L) with quick buttons (`+250ml`, `+500ml`, `+1L`) and animated visual progress bar
  - 🛡️ Habit checks: Avoided sweets, sugary drinks, fried food, and unnecessary snacking
- **Scoring & Empathetic Feedback**: 100-point transparent compliance score with non-judgmental, uplifting feedback across score tiers.
- **Weight Progress**: Daily weight logger calculating changes from starting baseline and yesterday's weigh-in with supportive explanations.
- **Visual Analytics**: Interactive graphs powered by Chart.js (Weight Progress trend & Daily Diet Achievement %).
- **Consistency Tracker**: Streak counter for consecutive tracked days, total tracked days, and average achievement %.
- **History Archive**: Complete log of previous records with detailed breakdown modal, editing support, and deletion safeguards.
- **Storage & Backup**: Saves automatically to browser `localStorage` with JSON export/import backup options.

## 🚀 How to Run Locally

No build tools, dependencies, or server setup required.

### Method 1: VS Code Live Server
1. Open this folder in **VS Code**.
2. Right-click `index.html` and select **"Open with Live Server"**.

### Method 2: Direct Browser Launch
Simply double-click `index.html` to open it in any modern browser (Chrome, Edge, Firefox, Safari).

## 📁 Project Structure

```
├── index.html        # Semantic HTML layout and UI components
├── style.css         # Calming wellness theme and responsive design
├── script.js         # State management, LocalStorage CRUD, Chart.js integrations
└── README.md         # Project documentation
```

## 🛠️ Customization

Open `script.js` to customize:
- **Daily targets**: Modify the `targets` object inside `CONFIG`.
- **Points allocation**: Adjust point weights in the `scoring` object inside `CONFIG`.
- **Profile information**: Update starting weight, height, age, or goals in `CONFIG`.

---
*Disclaimer: UDYAMAM is a personal food and weight self-monitoring tool. It is not a medical or diagnostic application.*
