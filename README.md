# 💰 SpendWise - Smart Expense Tracker

A beautiful Progressive Web App (PWA) for tracking daily expenses with Google Sheets integration.

## Features

- ✅ **Track Daily Expenses** - Add amount, category, and description
- ✅ **8 Categories** - Food, Transport, Shopping, Entertainment, Bills, Health, Education, Other
- ✅ **Transaction History** - View expenses by day, week, month, or all time
- ✅ **Statistics & Charts** - Beautiful doughnut and line charts
- ✅ **Offline Support** - Works without internet connection
- ✅ **Installable** - Add to home screen like a native app
- ✅ **Google Sheets Sync** - Export expenses to your own Google Sheet
- ✅ **Indonesian Rupiah** - Currency formatted for IDR

## Installation on Android

### Method 1: Direct Installation (Recommended)
1. Open the app URL in Chrome
2. Tap the menu (⋮) button
3. Select "Add to Home screen"
4. Tap "Add"

### Method 2: Install Prompt
- When you visit the app, Chrome may show an "Install" banner
- Simply tap "Install" to add to your home screen

## Running Locally

1. Navigate to the project folder:
   ```bash
   cd expense-tracker
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

## Google Sheets Integration

To sync your expenses to Google Sheets:

1. **Create a Google Sheet**
   - Go to [Google Sheets](https://sheets.google.com)
   - Create a new spreadsheet

2. **Add the Apps Script**
   - Go to Extensions → Apps Script
   - Delete any existing code
   - Copy the contents of `google-apps-script.js` and paste it
   - Save the project (Ctrl+S)

3. **Deploy as Web App**
   - Click Deploy → New deployment
   - Click the gear icon and select "Web app"
   - Set "Execute as" to "Me"
   - Set "Who has access" to "Anyone"
   - Click Deploy
   - Authorize the app when prompted
   - Copy the Web App URL

4. **Configure SpendWise**
   - Click the sync button (🌐) in SpendWise
   - Paste the Web App URL
   - Click "Save & Test Connection"

Now your expenses will automatically sync to Google Sheets!

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, flexbox, grid, animations
- **JavaScript (ES6+)** - Vanilla JS, no frameworks
- **Chart.js** - Data visualization
- **Service Worker** - Offline support
- **Web App Manifest** - PWA installability

## Project Structure

```
expense-tracker/
├── index.html          # Main HTML file
├── styles.css          # All styles
├── app.js              # Application logic
├── sw.js               # Service worker
├── manifest.json       # PWA manifest
├── google-apps-script.js # Google Sheets integration
├── icons/              # App icons
│   └── icon.svg        # Source icon
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
        // ... options
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

### Change Theme Colors
Edit `styles.css` and modify the CSS variables in `:root`

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
