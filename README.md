# 💰 SpendWise - Smart Expense Tracker

A beautiful Progressive Web App (PWA) for tracking daily expenses with 100% privacy. All data is stored locally on your device.

**Current Version: `v46` (February 2026)**

## 🚀 Recent Updates (v46)
- 📊 **Precise "All Time" Range**: The All Time spending chart now starts exactly from your first expense and ends at your last, removing empty months from the display.
- 📈 **Enhanced Stats Clarity**: Specific titles like "All Time Spending Trend" for better context.
- 📉 **Dynamic Chart Titles**: Smart renaming based on time resolution.
- 🗑️ **Bulk History Deletion**: Quick "Clear Day" button in the history tab.
- ⚡ **Instant UI Sync**: Unified refresh engine for immediate data reflection.
- 📱 **Mobile-First Navigation**: Fixed bottom navigation bar for better reachability on mobile devices.
- 🎨 **Adaptive UI**: Symmetrical and adaptive category grid using CSS Container Queries for perfect fit on all screens.
- 📊 **Enhanced Stats Layout**: Redesigned statistics page with a prioritized hero section and smart grid that adapts when assets are empty.
- 🛠️ **UX Refinements**: Glassmorphism effects, improved currency input fields (no more doubled borders), and safe-area support for modern notches.
- 💰 **Asset Tracking**: New "Assets" page to manage and track values for Stocks, Gold, Crypto, and more.
- 📊 **CSV Import**: Restore or migrate data by uploading CSV files with a standardized format.
- 📅 **Custom Date Stats**: Select any date range in Statistics for precise spending analysis.
- 🔄 **Monthly Snapshots**: Truly independent budget plans and structures for every month.

## Features

- ✅ **Track Daily Expenses** - Add amount, category, and description
- ✅ **Asset Management** - Track net worth and asset allocation (Stocks, Gold, etc.)
- ✅ **High-Level Budgeting** - Set limits for groups like "Nabung" or "Lifestyle"
- ✅ **CSV Import/Export** - Full backup and restore capabilities via CSV
- ✅ **Historical Overview** - Navigate backwards to previous months to track history
- ✅ **Custom Stats Range** - Analyze spending over any specific time period
- ✅ **Statistics & Charts** - Beautiful doughnut, trend, and allocation charts
- ✅ **Offline Support** - Works without internet connection
- ✅ **Installable** - Add to home screen like a native app
- ✅ **CSV Export** - Download your data as a CSV file anytime
- ✅ **Indonesian Rupiah** - Currency formatted for IDR
- ✅ **Privacy Focused** - No cloud sync, your data stays on your device

## Installation

### On Android (Chrome)
1. Open the app URL
2. Tap the menu (⋮) button
3. Select "Add to Home screen"
4. Tap "Add"

### On iPhone (Safari)
1. Open the app URL
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

## Running Locally

1. Navigate to the project folder:
   ```bash
   cd SpendWise
   ```

2. Start a local server:
   ```bash
   python3 -m http.server 8080
   ```
   or
   ```bash
   npx serve .
   ```

3. Open http://localhost:8080 in your browser

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, flexbox, grid, animations
- **JavaScript (ES6+)** - Vanilla JS, no frameworks
- **Chart.js** - Data visualization
- **Service Worker** - Offline support (v24 cache logic)
- **Web App Manifest** - PWA installability

## Project Structure

```
SpendWise/
├── index.html          # Main HTML file
├── styles.css          # All styles
├── app.js              # Application logic
├── sw.js               # Service worker
├── manifest.json       # PWA manifest
├── icons/              # App icons
└── README.md           # This file
```

## Customization

### Change Currency
Edit `app.js` and modify the `formatCurrency` function:
```javascript
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};
```

### Add Categories
Edit both `index.html` (category grid) and `app.js` (CATEGORIES object):
```javascript
const CATEGORIES = {
    food: { icon: '🍔', color: '#ff6b6b' },
    // Add your category here
    newCategory: { icon: '🎯', color: '#abcdef' }
};
```

## Browser Support

- ✅ Chrome (Android & Desktop)
- ✅ Edge
- ✅ Firefox
- ✅ Safari (iOS 11.3+)
- ✅ Samsung Internet

## License

MIT License - Feel free to use and modify!

---

Made with ❤️ for smarter spending
