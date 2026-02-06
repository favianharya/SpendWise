# 💰 SpendWise - Smart Expense Tracker

A beautiful Progressive Web App (PWA) for tracking daily expenses with 100% privacy. All data is stored locally on your device.

## Features

- ✅ **Track Daily Expenses** - Add amount, category, and description
- ✅ **8 Categories** - Food, Transport, Shopping, Entertainment, Bills, Health, Education, Other
- ✅ **Transaction History** - View expenses by day, week, month, or all time
- ✅ **Statistics & Charts** - Beautiful doughnut and line charts
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
- **Service Worker** - Offline support
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
