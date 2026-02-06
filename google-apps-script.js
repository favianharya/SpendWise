/**
 * Google Apps Script for SpendWise Expense Tracker
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Delete any code in Code.gs and paste this entire script
 * 4. Click Deploy → New deployment
 * 5. Select "Web app" as the type
 * 6. Set "Execute as" to "Me"
 * 7. Set "Who has access" to "Anyone"
 * 8. Click Deploy and copy the Web App URL
 * 9. Paste the URL in SpendWise app settings
 * 
 * SHEET STRUCTURE:
 * The script will automatically create headers in your sheet:
 * Column A: Date
 * Column B: Amount
 * Column C: Category
 * Column D: Description
 * Column E: Timestamp
 */

// Main entry point for POST requests
function doPost(e) {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

        // Initialize headers if sheet is empty
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['Date', 'Amount', 'Category', 'Description', 'Timestamp']);
            // Format header row
            sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#6c63ff').setFontColor('white');
        }

        // Parse the incoming data
        const data = JSON.parse(e.postData.contents);

        // Append the expense to the sheet
        sheet.appendRow([
            data.date,
            data.amount,
            data.category,
            data.description,
            new Date().toISOString()
        ]);

        // Format the amount column as currency
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow, 2).setNumberFormat('Rp #,##0');

        // Return success response
        return ContentService
            .createTextOutput(JSON.stringify({ success: true, message: 'Expense added successfully' }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        // Return error response
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// Handle GET requests (for testing)
function doGet(e) {
    return ContentService
        .createTextOutput(JSON.stringify({
            status: 'ok',
            message: 'SpendWise API is running. Use POST to add expenses.'
        }))
        .setMimeType(ContentService.MimeType.JSON);
}

// Helper function to get all expenses (for future use)
function getAllExpenses() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();

    // Skip header row
    const expenses = data.slice(1).map(row => ({
        date: row[0],
        amount: row[1],
        category: row[2],
        description: row[3],
        timestamp: row[4]
    }));

    return expenses;
}

// Helper function to get monthly summary
function getMonthlySummary(year, month) {
    const expenses = getAllExpenses();

    const filtered = expenses.filter(e => {
        const date = new Date(e.date);
        return date.getFullYear() === year && date.getMonth() === month;
    });

    const total = filtered.reduce((sum, e) => sum + e.amount, 0);

    const byCategory = {};
    filtered.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    return {
        total,
        count: filtered.length,
        byCategory
    };
}
