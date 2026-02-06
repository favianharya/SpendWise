// ==================== App State ====================
const APP_STATE = {
    expenses: [],
    selectedCategory: null,
    deleteExpenseId: null,
    categoryChart: null,
    trendChart: null
};

// Category configuration
const CATEGORIES = {
    food: { icon: '🍔', color: '#ff6b6b' },
    transport: { icon: '🚗', color: '#4ecdc4' },
    shopping: { icon: '🛍️', color: '#ffd93d' },
    entertainment: { icon: '🎮', color: '#ff8ed4' },
    bills: { icon: '📄', color: '#6bcb77' },
    health: { icon: '💊', color: '#4d96ff' },
    education: { icon: '📚', color: '#9b59b6' },
    other: { icon: '📦', color: '#95a5a6' }
};

// ==================== Utility Functions ====================
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
};

const formatDateFull = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

const getToday = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// ==================== Storage Functions ====================
const loadExpenses = () => {
    try {
        const stored = localStorage.getItem('expenses');
        APP_STATE.expenses = stored ? JSON.parse(stored) : [];
    } catch (e) {
        APP_STATE.expenses = [];
    }
};

const saveExpenses = () => {
    localStorage.setItem('expenses', JSON.stringify(APP_STATE.expenses));
};

// ==================== DOM Elements ====================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// ==================== Toast Notification ====================
const showToast = (message, type = 'success') => {
    const toast = $('#toast');
    const toastMessage = $('#toastMessage');

    toast.className = 'toast show ' + type;
    toastMessage.textContent = message;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};

// ==================== Tab Navigation ====================
const initTabs = () => {
    const tabs = $$('.nav-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding content
            $$('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            $(`#${tabId}Tab`).classList.add('active');

            // Refresh data when switching tabs
            if (tabId === 'history') {
                renderHistory();
            } else if (tabId === 'stats') {
                renderStats();
            }
        });
    });
};

// ==================== Category Selection ====================
const initCategorySelection = () => {
    const categoryBtns = $$('.category-btn');
    const categoryInput = $('#category');

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            APP_STATE.selectedCategory = btn.dataset.category;
            categoryInput.value = btn.dataset.category;
        });
    });
};

// ==================== Form Handling ====================
const initForm = () => {
    const form = $('#expenseForm');
    const dateInput = $('#date');

    // Set default date to today
    dateInput.value = getToday();

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const amount = parseFloat($('#amount').value);
        const category = $('#category').value;
        const description = $('#description').value.trim() || getCategoryName(category);
        const date = $('#date').value;

        if (!amount || amount <= 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }

        if (!category) {
            showToast('Please select a category', 'error');
            return;
        }

        const expense = {
            id: generateId(),
            amount,
            category,
            description,
            date,
            createdAt: new Date().toISOString()
        };

        APP_STATE.expenses.unshift(expense);
        saveExpenses();

        // Reset form
        form.reset();
        dateInput.value = getToday();
        $$('.category-btn').forEach(b => b.classList.remove('selected'));
        APP_STATE.selectedCategory = null;
        $('#category').value = '';

        // Update UI
        updateTodayTotal();
        showToast('Expense added successfully! 💰');
    });
};

const getCategoryName = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
};

// ==================== Today's Total ====================
const updateTodayTotal = () => {
    const today = getToday();
    const todayExpenses = APP_STATE.expenses.filter(e => e.date === today);
    const total = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    $('#todayTotal').textContent = formatCurrency(total);
    $('#todayDate').textContent = formatDateFull(today);
};

// ==================== History Rendering ====================
const renderHistory = () => {
    const filter = $('#historyFilter').value;
    const historyList = $('#historyList');
    const emptyState = $('#emptyHistory');

    let filteredExpenses = [...APP_STATE.expenses];
    const today = new Date();

    switch (filter) {
        case 'today':
            filteredExpenses = filteredExpenses.filter(e => e.date === getToday());
            break;
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= weekAgo);
            break;
        case 'month':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= monthStart);
            break;
    }

    // Sort by date (newest first)
    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredExpenses.length === 0) {
        historyList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    // Group by date
    const groupedExpenses = {};
    filteredExpenses.forEach(expense => {
        if (!groupedExpenses[expense.date]) {
            groupedExpenses[expense.date] = [];
        }
        groupedExpenses[expense.date].push(expense);
    });

    historyList.innerHTML = Object.entries(groupedExpenses).map(([date, expenses]) => `
        <div class="date-group">
            <div class="date-header">${formatDate(date)}</div>
            ${expenses.map(expense => createExpenseItem(expense)).join('')}
        </div>
    `).join('');

    // Add delete event listeners
    $$('.expense-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            APP_STATE.deleteExpenseId = btn.dataset.id;
            $('#deleteModal').classList.remove('hidden');
        });
    });
};

const createExpenseItem = (expense) => {
    const cat = CATEGORIES[expense.category] || CATEGORIES.other;
    return `
        <div class="expense-item" data-id="${expense.id}">
            <div class="expense-icon ${expense.category}">${cat.icon}</div>
            <div class="expense-details">
                <div class="expense-description">${expense.description}</div>
                <div class="expense-meta">
                    <span class="expense-category">${expense.category}</span>
                </div>
            </div>
            <div class="expense-amount">-${formatCurrency(expense.amount)}</div>
            <button class="expense-delete" data-id="${expense.id}" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
            </button>
        </div>
    `;
};

// ==================== Stats Rendering ====================
const renderStats = () => {
    const period = $('#statsPeriod').value;
    const today = new Date();
    let filteredExpenses = [...APP_STATE.expenses];
    let daysInPeriod = 7;

    switch (period) {
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= weekAgo);
            daysInPeriod = 7;
            break;
        case 'month':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= monthStart);
            daysInPeriod = today.getDate();
            break;
        case 'year':
            const yearStart = new Date(today.getFullYear(), 0, 1);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= yearStart);
            daysInPeriod = Math.ceil((today - yearStart) / (1000 * 60 * 60 * 24));
            break;
    }

    // Calculate stats
    const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const dailyAvg = daysInPeriod > 0 ? totalSpent / daysInPeriod : 0;

    // Find highest day
    const dailyTotals = {};
    filteredExpenses.forEach(e => {
        dailyTotals[e.date] = (dailyTotals[e.date] || 0) + e.amount;
    });
    const highestDay = Math.max(...Object.values(dailyTotals), 0);

    // Update stat cards
    $('#totalSpent').textContent = formatCurrency(totalSpent);
    $('#dailyAvg').textContent = formatCurrency(dailyAvg);
    $('#highestDay').textContent = formatCurrency(highestDay);
    $('#totalTransactions').textContent = filteredExpenses.length;

    // Render charts
    renderCategoryChart(filteredExpenses);
    renderTrendChart(filteredExpenses, period);
};

const renderCategoryChart = (expenses) => {
    const ctx = $('#categoryChart').getContext('2d');

    // Calculate totals by category
    const categoryTotals = {};
    expenses.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const labels = Object.keys(categoryTotals).map(c => getCategoryName(c));
    const data = Object.values(categoryTotals);
    const colors = Object.keys(categoryTotals).map(c => CATEGORIES[c]?.color || '#95a5a6');

    if (APP_STATE.categoryChart) {
        APP_STATE.categoryChart.destroy();
    }

    APP_STATE.categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#a0a0b8',
                        font: { size: 11, family: 'Inter' },
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        }
    });
};

const renderTrendChart = (expenses, period) => {
    const ctx = $('#trendChart').getContext('2d');

    // Get date range
    const today = new Date();
    let days = 7;
    if (period === 'month') days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if (period === 'year') days = 12; // Show monthly for year

    const labels = [];
    const data = [];

    if (period === 'year') {
        // Monthly data for year view
        for (let i = 0; i < 12; i++) {
            const monthStart = new Date(today.getFullYear(), i, 1);
            const monthEnd = new Date(today.getFullYear(), i + 1, 0);
            const monthName = monthStart.toLocaleDateString('id-ID', { month: 'short' });
            labels.push(monthName);

            const monthTotal = expenses
                .filter(e => {
                    const d = new Date(e.date);
                    return d >= monthStart && d <= monthEnd;
                })
                .reduce((sum, e) => sum + e.amount, 0);
            data.push(monthTotal);
        }
    } else {
        // Daily data
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            labels.push(date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));

            const dayTotal = expenses
                .filter(e => e.date === dateStr)
                .reduce((sum, e) => sum + e.amount, 0);
            data.push(dayTotal);
        }
    }

    if (APP_STATE.trendChart) {
        APP_STATE.trendChart.destroy();
    }

    APP_STATE.trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data,
                borderColor: '#6c63ff',
                backgroundColor: 'rgba(108, 99, 255, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#6c63ff',
                pointBorderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#6b6b80', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#6b6b80',
                        font: { size: 10 },
                        callback: (value) => value >= 1000000 ? (value / 1000000) + 'M' : value >= 1000 ? (value / 1000) + 'K' : value
                    }
                }
            }
        }
    });
};

// ==================== Delete Expense ====================
const initDeleteModal = () => {
    const modal = $('#deleteModal');
    const closeBtn = $('#closeDeleteModal');
    const cancelBtn = $('#cancelDelete');
    const confirmBtn = $('#confirmDelete');

    const closeModal = () => {
        modal.classList.add('hidden');
        APP_STATE.deleteExpenseId = null;
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    confirmBtn.addEventListener('click', () => {
        if (APP_STATE.deleteExpenseId) {
            APP_STATE.expenses = APP_STATE.expenses.filter(e => e.id !== APP_STATE.deleteExpenseId);
            saveExpenses();
            renderHistory();
            updateTodayTotal();
            showToast('Expense deleted');
        }
        closeModal();
    });
};

// ==================== CSV Export ====================
const initExportModal = () => {
    const exportBtn = $('#exportBtn');
    const modal = $('#exportModal');
    const closeBtn = $('#closeExportModal');
    const downloadBtn = $('#downloadCsvBtn');

    exportBtn.addEventListener('click', () => {
        $('#exportTotal').textContent = APP_STATE.expenses.length;
        modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    downloadBtn.addEventListener('click', () => {
        exportToCSV();
    });
};

const exportToCSV = () => {
    if (APP_STATE.expenses.length === 0) {
        showToast('No expenses to export', 'error');
        return;
    }

    const headers = ['Date', 'Amount', 'Category', 'Description'];
    const rows = APP_STATE.expenses.map(e => [
        e.date,
        e.amount,
        e.category,
        `"${e.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `SpendWise_Export_${timestamp}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Export successful! 📥');
    $('#exportModal').classList.add('hidden');
};



// ==================== Filter Event Listeners ====================
const initFilters = () => {
    $('#historyFilter').addEventListener('change', renderHistory);
    $('#statsPeriod').addEventListener('change', renderStats);
};

// ==================== App Initialization ====================
const initApp = () => {
    // Hide splash after animation
    setTimeout(() => {
        $('#splash').classList.add('hidden');
        $('#app').classList.remove('hidden');
    }, 2000);

    // Load data
    loadExpenses();

    // Initialize components
    initTabs();
    initCategorySelection();
    initForm();
    initDeleteModal();
    initExportModal();
    initFilters();

    // Initial render
    updateTodayTotal();
};

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW registration failed'));
    });
}
