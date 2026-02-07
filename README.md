# 💰 SpendWise - Smart Expense Tracker

A beautiful Progressive Web App (PWA) for tracking daily expenses with 100% privacy. All data is stored locally on your device.

**Current Version: `v24` (February 2026)**

## 🚀 Recent Updates (v24)
- 🎯 **Budget Groups**: Create high-level containers for categories.
- 📅 **Historical Budgeting**: Navigate past months to see how you performed against your budget plan.
- 📈 **Enhanced Stats**: Toggle charts between "By Category" and "By Budget Group" views.
- 🛡️ **Budget Safety**: Prevents setting budget limits that exceed your monthly income.
- ✨ **UI Refinements**: New icon selector for groups and intuitive blue selection highlights.

## Features

- ✅ **Track Daily Expenses** - Add amount, category, and description
- ✅ **High-Level Budgeting** - Set limits for groups like "Pocket Money" or "Bills"
- ✅ **Historical Overview** - Navigate backwards to previous months to track history
- ✅ **Transaction History** - View expenses by day, week, month, or all time
- ✅ **Statistics & Charts** - Beautiful doughnut and line charts with grouping support
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
