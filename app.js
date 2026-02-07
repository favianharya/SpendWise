const APP_STATE = {
    expenses: [],
    categories: {},
    budgetGroups: [], // { id, name, icon, limit, categoryIds: [] }
    monthlyIncome: 0,
    selectedCategory: null,
    deleteExpenseId: null,
    deleteDate: null,
    categoryChart: null,
    trendChart: null,
    assetAllocationChart: null,
    statsGrouping: 'group', // 'group' or 'category'
    viewMonth: new Date().getMonth(),
    viewYear: new Date().getFullYear(),
    monthlySettings: {}, // { "YYYY-MM": { income: 0, limits: { groupId: 0 } } }
    assets: [], // { id, name, type, value, quantity, color }
    metalPrices: {
        gold: 0, // IDR per gram
        silver: 0, // IDR per gram
        lastUpdated: null
    },
    editingAssetId: null
};

// Default static categories
const DEFAULT_CATEGORIES = {
    food: { icon: '🍔', color: '#ff6b6b' },
    transport: { icon: '🚗', color: '#4ecdc4' },
    shopping: { icon: '🛍️', color: '#ffd93d' },
    entertainment: { icon: '🎮', color: '#ff8ed4' },
    bills: { icon: '📄', color: '#6bcb77' },
    health: { icon: '💊', color: '#4d96ff' },
    education: { icon: '📚', color: '#9b59b6' },
    other: { icon: '📦', color: '#95a5a6' }
};

const ASSET_TYPES = {
    stock: { icon: '📈', color: '#4d96ff', label: 'Stock' },
    gold: { icon: '🟡', color: '#ffd93d', label: 'Gold' },
    silver: { icon: '⚪', color: '#95a5a6', label: 'Silver' },
    crypto: { icon: '🪙', color: '#f7931a', label: 'Crypto' },
    cash: { icon: '💵', color: '#6bcb77', label: 'Cash / Savings' },
    property: { icon: '🏠', color: '#ff6b6b', label: 'Property' },
    deposit: { icon: '🏦', color: '#6c63ff', label: 'Deposit' },
    other: { icon: '📦', color: '#9b59b6', label: 'Other' }
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

const parseCurrency = (str) => {
    if (typeof str !== 'string') return parseFloat(str) || 0;
    // Remove everything EXCEPT digits. This handles '1,234,567' -> 1234567
    return parseFloat(str.replace(/[^0-9]/g, '')) || 0;
};

const handleCurrencyInput = (e) => {
    const input = e.target;
    // Get digits only
    let value = input.value.replace(/[^0-9]/g, '');
    if (value === '') {
        input.value = '';
        return;
    }
    // Convert to number and format with commas (en-US style)
    input.value = parseInt(value).toLocaleString('en-US');
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

const formatDateToYYYYMMDD = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getToday = () => {
    return formatDateToYYYYMMDD(new Date());
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

const loadBudgets = () => {
    try {
        const storedMonthly = localStorage.getItem('monthlySettings');
        const storedGroups = localStorage.getItem('budgetGroups');
        const storedIncome = localStorage.getItem('monthlyIncome');

        APP_STATE.monthlySettings = storedMonthly ? JSON.parse(storedMonthly) : {};

        // If we have no monthly settings yet, migrate old data into the current month
        const today = new Date();
        const periodKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

        if (Object.keys(APP_STATE.monthlySettings).length === 0 && (storedGroups || storedIncome)) {
            APP_STATE.monthlySettings[periodKey] = {
                income: storedIncome ? parseFloat(storedIncome) : 0,
                groups: storedGroups ? JSON.parse(storedGroups) : []
            };
        }

        // Initialize session state from the current month's settings or defaults
        const activeBudgetData = getActiveBudgetData();
        APP_STATE.budgetGroups = activeBudgetData.groups;
        APP_STATE.monthlyIncome = activeBudgetData.income;

    } catch (e) {
        console.error('Error loading budgets:', e);
        APP_STATE.budgetGroups = [];
        APP_STATE.monthlyIncome = 0;
        APP_STATE.monthlySettings = {};
    }
};

const saveBudgets = () => {
    const periodKey = `${APP_STATE.viewYear}-${(APP_STATE.viewMonth + 1).toString().padStart(2, '0')}`;

    // Extract limits from the current budgetGroups to save into monthlySettings
    const limits = {};
    APP_STATE.budgetGroups.forEach(g => {
        limits[g.id] = g.limit || 0;
    });

    APP_STATE.monthlySettings[periodKey] = {
        income: APP_STATE.monthlyIncome,
        groups: APP_STATE.budgetGroups,
        limits: limits
    };
    localStorage.setItem('monthlySettings', JSON.stringify(APP_STATE.monthlySettings));
};

// Helper to get budget data for the currently viewed period
const getActiveBudgetData = () => {
    const periodKey = `${APP_STATE.viewYear}-${(APP_STATE.viewMonth + 1).toString().padStart(2, '0')}`;
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

    // If we have data for this specific month, return it
    if (APP_STATE.monthlySettings[periodKey]) {
        return APP_STATE.monthlySettings[periodKey];
    }

    // Otherwise, inherit from Today's snapshot if it exists
    if (APP_STATE.monthlySettings[todayKey]) {
        return {
            income: APP_STATE.monthlySettings[todayKey].income,
            groups: JSON.parse(JSON.stringify(APP_STATE.monthlySettings[todayKey].groups)) // Deep clone
        };
    }

    // Final fallback: use the global defaults (which would be empty if nothing was ever saved)
    return {
        income: 0, // Default income
        groups: [] // Default groups
    };
};

const loadCategories = () => {
    try {
        const stored = localStorage.getItem('categories');
        const customCategories = stored ? JSON.parse(stored) : {};
        // Merge: Defaults first, then overwrite with custom ones
        const merged = { ...DEFAULT_CATEGORIES, ...customCategories };

        // Remove 'pocket_money' if it exists (cleanup from previous version)
        delete merged.pocket_money;

        APP_STATE.categories = merged;
    } catch (e) {
        APP_STATE.categories = { ...DEFAULT_CATEGORIES };
    }
};

const saveCategories = () => {
    localStorage.setItem('categories', JSON.stringify(APP_STATE.categories));
};

const saveAssets = () => {
    localStorage.setItem('assets', JSON.stringify(APP_STATE.assets));
};

const loadAssets = () => {
    try {
        const stored = localStorage.getItem('assets');
        APP_STATE.assets = stored ? JSON.parse(stored) : [];
    } catch (e) {
        APP_STATE.assets = [];
    }
};

// ==================== DOM Elements ====================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

let toastTimer;
const showToast = (message, type = 'success') => {
    const toast = $('#toast');
    const toastMessage = $('#toastMessage');

    clearTimeout(toastTimer);

    // Reset state: remove hidden if it exists, add show
    toast.classList.remove('hidden');
    // Force a reflow to ensure the transition from translateY(100px) to translateY(0) works
    void toast.offsetWidth;

    toast.className = 'toast show ' + type;
    toastMessage.textContent = message;

    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        // Add hidden back after the transition completes (0.25s is --transition-normal)
        setTimeout(() => {
            if (!toast.classList.contains('show')) {
                toast.classList.add('hidden');
            }
        }, 300);
    }, 5000);
};

// ==================== Tab Navigation ====================
const initTabs = () => {
    const tabs = $$('.nav-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            if (!tabId) return; // Skip buttons without data-tab (like Backup)

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
            } else if (tabId === 'budget') {
                renderBudget();
            } else if (tabId === 'assets') {
                renderAssets();
            }
        });
    });
};

// ==================== Category Selection & Rendering ====================
const renderCategoryGrid = () => {
    const grid = $('#categoryGrid');
    const categoryInput = $('#category');

    grid.innerHTML = Object.entries(APP_STATE.categories).map(([id, cat]) => `
        <button type="button" class="category-btn ${APP_STATE.selectedCategory === id ? 'selected' : ''}" data-category="${id}">
            <span class="category-icon">${cat.icon}</span>
            <span class="category-name">${getCategoryName(id)}</span>
        </button>
    `).join('');

    // Re-attach listeners after re-render
    const categoryBtns = $$('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;

            if (APP_STATE.selectedCategory === category) {
                btn.classList.remove('selected');
                APP_STATE.selectedCategory = null;
                categoryInput.value = '';
                return;
            }

            categoryBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            APP_STATE.selectedCategory = category;
            categoryInput.value = category;
        });
    });
};

const initCategorySelection = () => {
    renderCategoryGrid(); // Initial render
};



// ==================== Form Handling ====================
const initForm = () => {
    const form = $('#expenseForm');
    const categoryGrid = $('#categoryGrid');

    if (!form) return;

    // Set default date to today
    $('#date').valueAsDate = new Date();

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseCurrency($('#amount').value);
        const category = $('#category').value;
        const description = $('#description').value.trim();
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
        $('#date').value = getToday();
        $$('.category-btn').forEach(b => b.classList.remove('selected'));
        APP_STATE.selectedCategory = null;
        $('#category').value = '';

        // Global UI Refresh
        refreshApp();
        showToast('Expense added successfully! 💰');
    });
};

const refreshApp = () => {
    updateTodayTotal();
    updateHomeBudgetStatus();

    // Refresh active tab views
    const activeTab = $('.nav-tab.active')?.dataset.tab;
    if (activeTab === 'history') renderHistory();
    if (activeTab === 'stats') renderStats();
    if (activeTab === 'budget') renderBudget();
};

const getCategoryName = (category) => {
    // Use the stored category name if available, otherwise format the ID
    return APP_STATE.categories[category]?.name || category.charAt(0).toUpperCase() + category.slice(1);
};

// ==================== Today's Total ====================
const updateTodayTotal = () => {
    try {
        const todayStr = getToday();
        const todayExpenses = APP_STATE.expenses.filter(e => e.date === todayStr);
        const total = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

        const totalEl = $('#todayTotal');
        const dateEl = $('#todayDate');

        if (totalEl) totalEl.textContent = formatCurrency(total);
        if (dateEl) dateEl.textContent = formatDateFull(todayStr);
    } catch (e) {
        console.error('Error updating today total:', e);
    }
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
            <div class="date-header">
                <span>${formatDate(date)}</span>
                <button class="delete-day-btn" data-date="${date}" title="Delete all for this day">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Clear day
                </button>
            </div>
            ${expenses.map(expense => createExpenseItem(expense)).join('')}
        </div>
    `).join('');

    // Add delete event listeners for items
    $$('.expense-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            APP_STATE.deleteExpenseId = btn.dataset.id;
            APP_STATE.deleteDate = null;
            $('#deleteModal').classList.remove('hidden');
        });
    });

    // Add delete event listeners for full days
    $$('.delete-day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            APP_STATE.deleteDate = btn.dataset.date;
            APP_STATE.deleteExpenseId = null;
            $('#deleteModal').classList.remove('hidden');
        });
    });
};

const createExpenseItem = (expense) => {
    const cat = APP_STATE.categories[expense.category] || APP_STATE.categories.other || { icon: '📦' };
    return `
        <div class="expense-item" data-id="${expense.id}">
            <div class="expense-icon ${expense.category}">${cat.icon}</div>
            <div class="expense-details">
                <div class="expense-description">${expense.description}</div>
                <div class="expense-meta">
                    <span class="expense-category">${getCategoryName(expense.category)}</span>
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
        case 'all':
            if (filteredExpenses.length > 0) {
                const oldestDate = new Date(Math.min(...filteredExpenses.map(e => new Date(e.date))));
                daysInPeriod = Math.max(1, Math.ceil((today - oldestDate) / (1000 * 60 * 60 * 24)));
            } else {
                daysInPeriod = 1;
            }
            break;
        case 'custom':
            const startStr = $('#statsStartDate').value;
            const endStr = $('#statsEndDate').value;
            if (startStr && endStr) {
                const start = new Date(startStr);
                const end = new Date(endStr);
                // Reset times for accurate day count
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);

                filteredExpenses = filteredExpenses.filter(e => {
                    const d = new Date(e.date);
                    return d >= start && d <= end;
                });
                daysInPeriod = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
            } else {
                daysInPeriod = 1;
            }
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

    const totalAssetsValue = APP_STATE.assets.reduce((sum, a) => sum + a.value, 0);
    $('#statsTotalAssets').textContent = formatCurrency(totalAssetsValue);

    // Render charts
    $('.charts-grid')?.classList.toggle('no-assets', APP_STATE.assets.length === 0);
    renderCategoryChart(filteredExpenses);
    renderTrendChart(filteredExpenses, period);
    renderAssetAllocationChart();
};

const renderCategoryChart = (expenses) => {
    const ctx = $('#categoryChart').getContext('2d');
    const title = $('#categoryChartTitle');

    let labels = [];
    let data = [];
    let colors = [];

    if (APP_STATE.statsGrouping === 'group') {
        title.textContent = 'Spending by Budget Group';

        const groupTotals = {};
        // Initialize groups
        APP_STATE.budgetGroups.forEach(g => {
            groupTotals[g.id] = 0;
        });
        let othersTotal = 0;

        expenses.forEach(e => {
            const group = APP_STATE.budgetGroups.find(g => g.categoryIds.includes(e.category));
            if (group) {
                groupTotals[group.id] += e.amount;
            } else {
                othersTotal += e.amount;
            }
        });

        APP_STATE.budgetGroups.forEach(g => {
            if (groupTotals[g.id] > 0) {
                labels.push(`${g.icon} ${g.name}`);
                data.push(groupTotals[g.id]);
                // Use a default or generated color for groups since they don't have one
                colors.push(getGroupColor(g.id));
            }
        });

        if (othersTotal > 0) {
            labels.push('📦 Others');
            data.push(othersTotal);
            colors.push('#95a5a6');
        }
    } else {
        title.textContent = 'Spending by Category';

        const categoryTotals = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });

        labels = Object.keys(categoryTotals).map(c => {
            const cat = APP_STATE.categories[c];
            return `${cat?.icon || '📦'} ${getCategoryName(c)}`;
        });
        data = Object.values(categoryTotals);
        colors = Object.keys(categoryTotals).map(c => APP_STATE.categories[c]?.color || '#95a5a6');
    }

    if (APP_STATE.categoryChart) {
        APP_STATE.categoryChart.destroy();
    }

    // Helper for group colors
    function getGroupColor(id) {
        const groupColors = ['#6c63ff', '#ff6b6b', '#4ecdc4', '#ffd93d', '#ff8ed4', '#6bcb77', '#4d96ff', '#9b59b6'];
        const index = APP_STATE.budgetGroups.findIndex(g => g.id === id);
        return groupColors[index % groupColors.length];
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
                        font: { size: 10, family: 'Inter' },
                        padding: 10,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = Math.round((value / total) * 100);
                            return `${label}: ${formatCurrency(value)} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
};

const renderTrendChart = (expenses, period) => {
    const ctx = $('#trendChart').getContext('2d');
    const labels = [];
    const data = [];
    const today = new Date();

    if (period === 'year' || period === 'all') {
        const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));

        let startYear, startMonth, endYear, endMonth;

        if (period === 'all' && sortedExpenses.length > 0) {
            const firstDate = new Date(sortedExpenses[0].date);
            const lastDate = today;

            startYear = firstDate.getFullYear();
            startMonth = firstDate.getMonth();
            endYear = lastDate.getFullYear();
            endMonth = lastDate.getMonth();
        } else {
            // Default: Current Year (Jan to now)
            startYear = today.getFullYear();
            startMonth = 0;
            endYear = today.getFullYear();
            endMonth = today.getMonth();
        }

        for (let y = startYear; y <= endYear; y++) {
            const mFrom = (y === startYear) ? startMonth : 0;
            const mTo = (y === endYear) ? endMonth : 11;

            for (let m = mFrom; m <= mTo; m++) {
                const monthStart = new Date(y, m, 1);
                const monthEnd = new Date(y, m + 1, 0);
                const label = period === 'all'
                    ? monthStart.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
                    : monthStart.toLocaleDateString('id-ID', { month: 'short' });

                labels.push(label);

                const monthTotal = expenses
                    .filter(e => {
                        const d = new Date(e.date);
                        return d >= monthStart && d <= monthEnd;
                    })
                    .reduce((sum, e) => sum + e.amount, 0);
                data.push(monthTotal);
            }
        }
    } else {
        // Daily data for week, month, and custom
        let startDate;
        let endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);

        if (period === 'week') {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6);
        } else if (period === 'month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (period === 'custom') {
            const startStr = $('#statsStartDate').value;
            const endStr = $('#statsEndDate').value;
            if (startStr && endStr) {
                startDate = new Date(startStr);
                endDate = new Date(endStr);
            } else {
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 6);
            }
        } else {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6);
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        // Generate day points
        const diffMs = endDate - startDate;
        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        for (let i = 0; i <= diffDays; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            if (d > endDate && i > 0) break;

            const dateStr = formatDateToYYYYMMDD(d);
            labels.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));

            const dayTotal = expenses
                .filter(e => e.date === dateStr)
                .reduce((sum, e) => sum + e.amount, 0);
            data.push(dayTotal);
        }
    }

    const titleEl = $('#trendChartTitle');
    if (titleEl) {
        if (period === 'all') {
            titleEl.textContent = 'All Time Spending Trend';
        } else if (period === 'year') {
            titleEl.textContent = 'Monthly Spending Trend';
        } else {
            titleEl.textContent = 'Daily Spending Trend';
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

const renderAssetAllocationChart = () => {
    const canvas = $('#assetAllocationChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const container = $('#assetChartContainer');

    if (APP_STATE.assets.length === 0) {
        if (container) container.classList.add('hidden');
        return;
    }

    if (container) container.classList.remove('hidden');

    const typeTotals = {};
    APP_STATE.assets.forEach(asset => {
        let val = asset.value;
        if (asset.type === 'gold' && APP_STATE.metalPrices.gold > 0) {
            val = asset.quantity * APP_STATE.metalPrices.gold;
        } else if (asset.type === 'silver' && APP_STATE.metalPrices.silver > 0) {
            val = asset.quantity * APP_STATE.metalPrices.silver;
        } else if (asset.type === 'deposit') {
            const grossInterest = asset.value * (asset.interestRate / 100) * (asset.period / 12);
            const netInterest = grossInterest * (1 - (asset.taxRate || 0) / 100);
            val = asset.value + netInterest;
        }
        typeTotals[asset.type] = (typeTotals[asset.type] || 0) + val;
    });

    const labels = Object.keys(typeTotals).map(type => ASSET_TYPES[type].label);
    const data = Object.values(typeTotals);
    const colors = Object.keys(typeTotals).map(type => ASSET_TYPES[type].color);

    if (APP_STATE.assetAllocationChart) {
        APP_STATE.assetAllocationChart.destroy();
    }

    APP_STATE.assetAllocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#6b6b80',
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 11 }
                    }
                }
            },
            cutout: '70%'
        }
    });
};
// ==================== Budget Management ====================
// ==================== Budget Management ====================
const renderBudget = () => {
    const list = $('#budgetGroupsList');
    const incomeInput = $('#monthlyIncome');
    const emptyState = $('#emptyBudgetState');

    // Switch active state to the viewed month's data
    const activeData = getActiveBudgetData();
    APP_STATE.budgetGroups = activeData.groups;
    APP_STATE.monthlyIncome = activeData.income;

    // Set current date for budget period
    const displayMonth = new Date(APP_STATE.viewYear, APP_STATE.viewMonth, 1);
    const periodKey = `${APP_STATE.viewYear}-${(APP_STATE.viewMonth + 1).toString().padStart(2, '0')}`;

    $('#budgetPeriod').textContent = displayMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    // Set income value
    incomeInput.value = APP_STATE.monthlyIncome ? APP_STATE.monthlyIncome.toLocaleString('en-US') : '';

    if (APP_STATE.budgetGroups.length === 0) {
        list.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        list.innerHTML = APP_STATE.budgetGroups.map((group) => {
            const periodKey = `${APP_STATE.viewYear}-${(APP_STATE.viewMonth + 1).toString().padStart(2, '0')}`;
            const monthlyData = APP_STATE.monthlySettings[periodKey] || { income: APP_STATE.monthlyIncome, limits: {} };
            const limit = monthlyData.limits?.[group.id] ?? group.limit ?? 0;
            return `
            <div class="budget-category-item" data-group-id="${group.id}">
                <div class="budget-category-header" style="margin-bottom: var(--spacing-sm);">
                    <div class="budget-category-label">
                        <span style="font-size: 1.25rem;">${group.icon}</span>
                        <span style="font-weight: 600;">${group.name}</span>
                        <button class="remove-group-btn" data-id="${group.id}" title="Remove Group" style="margin-left: 8px; font-size: 0.7rem; background: none; border: none; color: var(--danger); cursor: pointer; opacity: 0.5;">✕</button>
                    </div>
                    <div class="budget-category-input-group">
                        <span class="currency-prefix">Rp</span>
                        <input type="text" 
                               class="group-budget-input" 
                               data-id="${group.id}" 
                               data-type="currency"
                               placeholder="0" 
                               value="${limit ? limit.toLocaleString('en-US') : ''}">
                    </div>
                </div>
                
                ${createGroupProgress(group)}

                <div class="budget-group-info" style="margin-top: var(--spacing-md);">
                    <div class="budget-group-title" style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 4px; font-weight: 500;">
                        Includes Categories <span style="font-weight: 400; font-size: 0.65rem;">(Select up to 3)</span>:
                    </div>
                    <div class="budget-category-chips" style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${Object.entries(APP_STATE.categories).map(([catId, cat]) => {
                const isActive = group.categoryIds.includes(catId);
                // Also check if this category is assigned to ANY OTHER group
                const isClaimedByOther = APP_STATE.budgetGroups.some(g => g.id !== group.id && g.categoryIds.includes(catId));

                return `
                                <div class="category-chip ${isActive ? 'active' : ''} ${isClaimedByOther ? 'disabled' : ''}" 
                                     data-group-id="${group.id}" 
                                     data-cat-id="${catId}"
                                     style="${isClaimedByOther ? 'opacity: 0.3; cursor: not-allowed;' : ''}">
                                    ${cat.icon} ${getCategoryName(catId)}
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }

    // Attach listeners for removing group
    $$('.remove-group-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            if (confirm('Delete this budget group?')) {
                APP_STATE.budgetGroups = APP_STATE.budgetGroups.filter(g => g.id !== id);
                saveBudgets();
                renderBudget();
                updateBudgetSummary();
                updateHomeBudgetStatus();
            }
        });
    });

    // Attach listeners for toggling categories in groups
    $$('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (chip.classList.contains('disabled')) return;

            const groupId = chip.dataset.groupId;
            const catId = chip.dataset.catId;
            const group = APP_STATE.budgetGroups.find(g => g.id === groupId);

            if (group.categoryIds.includes(catId)) {
                group.categoryIds = group.categoryIds.filter(id => id !== catId);
            } else if (group.categoryIds.length < 3) {
                group.categoryIds.push(catId);
            } else {
                showToast('Maximum 3 categories per group reached', 'error');
                return;
            }

            saveBudgets();
            renderBudget();
            updateBudgetSummary();
            updateHomeBudgetStatus();
        });
    });

    updateBudgetSummary();
    renderBudgetAlerts();
};

const createGroupProgress = (group) => {
    const periodKey = `${APP_STATE.viewYear}-${(APP_STATE.viewMonth + 1).toString().padStart(2, '0')}`;
    const monthlyData = APP_STATE.monthlySettings[periodKey] || { income: APP_STATE.monthlyIncome, limits: {} };
    const limit = monthlyData.limits[group.id] ?? group.limit ?? 0;

    const monthStart = new Date(APP_STATE.viewYear, APP_STATE.viewMonth, 1);
    const monthEnd = new Date(APP_STATE.viewYear, APP_STATE.viewMonth + 1, 0);

    const spent = APP_STATE.expenses
        .filter(e => {
            const d = new Date(e.date);
            return group.categoryIds.includes(e.category) && d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);

    if (limit === 0) {
        return `
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">
                Total Spent: ${formatCurrency(spent)} (No limit set)
            </div>
        `;
    }

    const percentage = Math.min((spent / limit) * 100, 100);
    const statusClass = percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : '';

    return `
        <div class="budget-progress-container" style="height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; margin-bottom: 6px;">
            <div class="budget-progress-bar ${statusClass}" style="width: ${percentage}%; height: 100%; transition: width 0.3s ease;"></div>
        </div>
        <div class="budget-stats-row" style="display: flex; justify-content: flex-end; font-size: 0.75rem;">
            <span style="color: ${percentage >= 100 ? 'var(--danger)' : 'var(--text-muted)'}">
                ${percentage >= 100 ? 'Limit Reached' : Math.round(100 - percentage) + '% left'}
            </span>
        </div>
    `;
};

const updateBudgetSummary = () => {
    const periodKey = `${APP_STATE.viewYear}-${(APP_STATE.viewMonth + 1).toString().padStart(2, '0')}`;
    const monthlyData = APP_STATE.monthlySettings[periodKey] || { income: APP_STATE.monthlyIncome, limits: {} };

    const monthStart = new Date(APP_STATE.viewYear, APP_STATE.viewMonth, 1);
    const monthEnd = new Date(APP_STATE.viewYear, APP_STATE.viewMonth + 1, 0);

    // Total spent across ALL expenses in the selected month
    const totalSpent = APP_STATE.expenses
        .filter(e => {
            const d = new Date(e.date);
            return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);

    const income = monthlyData.income || 0;
    const remaining = Math.max(income - totalSpent, 0);
    const progress = income > 0 ? (totalSpent / income) * 100 : 0;

    $('#totalPocketMoney').textContent = formatCurrency(income);
    $('#budgetSpent').textContent = formatCurrency(totalSpent);
    $('#budgetRemaining').textContent = formatCurrency(remaining);

    const bar = $('#budgetSummaryBar');
    if (bar) {
        bar.style.width = Math.min(progress, 100) + '%';
        bar.className = 'budget-progress-bar ' + (progress >= 100 ? 'danger' : progress >= 80 ? 'warning' : '');
    }
};

const initBudgetForm = () => {
    const form = $('#budgetForm');
    const addGroupBtn = $('#addBudgetGroupBtn');
    const newGroupForm = $('#newBudgetGroupForm');
    const saveNewGroupBtn = $('#saveNewGroupBtn');

    if (addGroupBtn) {
        addGroupBtn.addEventListener('click', () => {
            newGroupForm.classList.toggle('hidden');
        });
    }

    // Month Navigation
    const prevBtn = $('#prevMonth');
    const nextBtn = $('#nextMonth');
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            APP_STATE.viewMonth--;
            if (APP_STATE.viewMonth < 0) {
                APP_STATE.viewMonth = 11;
                APP_STATE.viewYear--;
            }
            renderBudget();
        });
        nextBtn.addEventListener('click', () => {
            APP_STATE.viewMonth++;
            if (APP_STATE.viewMonth > 11) {
                APP_STATE.viewMonth = 0;
                APP_STATE.viewYear++;
            }
            renderBudget();
        });
    }

    // Handle Icon Selection
    const iconOptions = $$('.icon-option');
    const iconInput = $('#newGroupIcon');
    iconOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            iconOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            iconInput.value = opt.dataset.icon;
        });
    });

    if (saveNewGroupBtn) {
        saveNewGroupBtn.addEventListener('click', () => {
            const icon = iconInput.value || '💰';
            const name = $('#newGroupName').value.trim();

            if (!name) {
                showToast('Please enter a group name', 'error');
                return;
            }

            const id = generateId();
            APP_STATE.budgetGroups.push({
                id,
                name,
                icon,
                limit: 0,
                categoryIds: []
            });

            saveBudgets();

            // Reset Form
            $('#newGroupName').value = '';
            iconInput.value = '💰';
            iconOptions.forEach(o => o.classList.remove('active'));
            $$('.icon-option[data-icon="💰"]').forEach(o => o.classList.add('active'));
            newGroupForm.classList.add('hidden');

            renderBudget();
            showToast(`Budget Group "${name}" created! 🎯`);
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const income = parseCurrency($('#monthlyIncome').value);

            // Calculate sum of all budget group limits
            let totalLimits = 0;
            const inputs = $$('.group-budget-input');
            inputs.forEach(input => {
                totalLimits += parseCurrency(input.value);
            });

            // Validation: Cannot proceed if total budget > monthly income
            if (totalLimits > income && income > 0) {
                showToast(`Total budget ${formatCurrency(totalLimits)} exceeds your monthly income!`, 'error');
                return;
            } else if (totalLimits > 0 && income === 0) {
                showToast('Please set your monthly income first.', 'error');
                return;
            }

            const periodKey = `${APP_STATE.viewYear}-${(APP_STATE.viewMonth + 1).toString().padStart(2, '0')}`;
            if (!APP_STATE.monthlySettings[periodKey]) {
                APP_STATE.monthlySettings[periodKey] = { income: 0, limits: {} };
            }

            APP_STATE.monthlyIncome = income;

            inputs.forEach(input => {
                const id = input.dataset.id;
                const limit = parseCurrency(input.value);
                const group = APP_STATE.budgetGroups.find(g => g.id === id);
                if (group) group.limit = limit;
            });

            saveBudgets();
            renderBudget();
            updateBudgetSummary();
            renderBudgetAlerts();
            updateHomeBudgetStatus();
            showToast('Budget saved for ' + $('#budgetPeriod').textContent + '!');
        });
    }
};

const renderBudgetAlerts = () => {
    const container = $('#budgetAlerts');
    if (!container) return;
    container.innerHTML = '';

    const periodKey = `${APP_STATE.viewYear}-${(APP_STATE.viewMonth + 1).toString().padStart(2, '0')}`;
    const monthlyData = APP_STATE.monthlySettings[periodKey] || { income: APP_STATE.monthlyIncome, limits: {} };

    const monthStart = new Date(APP_STATE.viewYear, APP_STATE.viewMonth, 1);
    const monthEnd = new Date(APP_STATE.viewYear, APP_STATE.viewMonth + 1, 0);

    APP_STATE.budgetGroups.forEach(group => {
        const limit = monthlyData.limits[group.id] ?? group.limit ?? 0;
        if (limit <= 0) return;

        const spent = APP_STATE.expenses
            .filter(e => {
                const d = new Date(e.date);
                return group.categoryIds.includes(e.category) && d >= monthStart && d <= monthEnd;
            })
            .reduce((sum, e) => sum + e.amount, 0);

        const percent = (spent / limit) * 100;

        if (percent >= 100) {
            createAlertElement(container, '🚨', `Exceeded: ${group.name}`, `Spent ${formatCurrency(spent)} (${formatCurrency(spent - limit)} over limit).`, 'danger');
        } else if (percent >= 80) {
            createAlertElement(container, '⚠️', `Near Limit: ${group.name}`, `${Math.round(percent)}% used of ${formatCurrency(limit)}.`, 'warning');
        }
    });


};

const createAlertElement = (container, icon, title, message, type) => {
    const div = document.createElement('div');
    div.className = `alert alert-${type}`;
    div.style.marginBottom = 'var(--spacing-md)';
    div.innerHTML = `
        <div class="alert-icon">${icon}</div>
        <div class="alert-content">
            <div class="alert-title">${title}</div>
            <div class="alert-message">${message}</div>
        </div>
    `;
    container.appendChild(div);
};

const updateHomeBudgetStatus = () => {
    const bar = $('#homeBudgetBar');
    const percentText = $('#homeBudgetPercent');
    if (!bar) return;

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const periodKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    const monthlyData = APP_STATE.monthlySettings[periodKey] || { income: APP_STATE.monthlyIncome, limits: {} };
    const income = monthlyData.income || APP_STATE.monthlyIncome || 0;

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const totalSpent = APP_STATE.expenses
        .filter(e => {
            const expDate = new Date(e.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + e.amount, 0);

    if (income > 0) {
        const percent = Math.min((totalSpent / income) * 100, 100);
        bar.style.width = percent + '%';
        bar.className = 'budget-progress-bar ' + (percent >= 100 ? 'danger' : percent >= 80 ? 'warning' : '');
        if (percentText) percentText.textContent = Math.round(percent) + '% of budget used';
    } else {
        bar.style.width = '0%';
        if (percentText) percentText.textContent = 'Set monthly income';
    }
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
            showToast('Expense deleted');
        } else if (APP_STATE.deleteDate) {
            APP_STATE.expenses = APP_STATE.expenses.filter(e => e.date !== APP_STATE.deleteDate);
            showToast('Day cleared');
        }

        saveExpenses();
        refreshApp(); // Use the unified refresh
        closeModal();
    });
};

// ==================== CSV Export ====================
const initExportModal = () => {
    const exportBtns = [$('#exportBtn'), $('#headerExportBtn')];
    const modal = $('#exportModal');
    const closeBtn = $('#closeExportModal');
    const downloadBtn = $('#downloadCsvBtn');

    exportBtns.forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            $('#exportTotal').textContent = APP_STATE.expenses.length;
            modal.classList.remove('hidden');
        });
    });

    const closeModal = () => {
        modal.classList.add('hidden');
        // On mobile/narrow screens, switch back to 'add' tab when closing backup
        if (window.innerWidth < 768) {
            $('[data-tab="add"]').click();
        }
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    downloadBtn.addEventListener('click', () => {
        exportToCSV();
    });

    const importBtn = $('#importCsvBtn');
    const importInput = $('#importCsvInput');

    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());

        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const csvData = event.target.result;
                processImportCSV(csvData);
                importInput.value = ''; // Reset input
            };
            reader.readAsText(file);
        });
    }

    // Assets Export/Import
    const downloadAssetsBtn = $('#downloadAssetsCsvBtn');
    if (downloadAssetsBtn) {
        downloadAssetsBtn.addEventListener('click', exportAssetsToCSV);
    }

    const importAssetsBtn = $('#importAssetsCsvBtn');
    const importAssetsInput = $('#importAssetsCsvInput');
    if (importAssetsBtn && importAssetsInput) {
        importAssetsBtn.addEventListener('click', () => importAssetsInput.click());
        importAssetsInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                processImportAssetsCSV(event.target.result);
                importAssetsInput.value = '';
            };
            reader.readAsText(file);
        });
    }
};

const processImportCSV = (csvContent) => {
    try {
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSV file is empty or missing data.');

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const required = ['date', 'amount', 'category', 'description'];

        // Find column indices
        const indices = {};
        required.forEach(col => {
            indices[col] = headers.indexOf(col);
        });

        if (indices.date === -1 || indices.amount === -1 || indices.category === -1 || indices.description === -1) {
            throw new Error('CSV must have columns: Date, Amount, Category, Description');
        }

        const newExpenses = [];
        for (let i = 1; i < lines.length; i++) {
            // Simple split, handling quotes for description
            const regex = /(".*?"|[^,]+)(?=\s*,|\s*$)/g;
            const values = lines[i].match(regex).map(v => v.replace(/^"|"$/g, '').trim());

            if (values.length < 4) continue;

            const date = values[indices.date];
            const amount = parseFloat(values[indices.amount]);
            const category = values[indices.category].toLowerCase();
            const description = values[indices.description];

            // Validation
            if (!date || isNaN(new Date(date).getTime())) continue;
            if (isNaN(amount)) continue;

            // Check if category exists, fallback to 'other'
            const finalCat = APP_STATE.categories[category] ? category : 'other';

            newExpenses.push({
                id: generateId(),
                date,
                amount,
                category: finalCat,
                description: description || ''
            });
        }

        if (newExpenses.length === 0) {
            throw new Error('No valid transactions found in CSV.');
        }

        if (confirm(`Import ${newExpenses.length} transactions? This will append to your current data.`)) {
            APP_STATE.expenses = [...APP_STATE.expenses, ...newExpenses];
            saveExpenses();
            renderHistory();
            updateTodayTotal();
            updateHomeBudgetStatus();
            showToast(`Successfully imported ${newExpenses.length} records! 📈`);
            $('#exportModal').classList.add('hidden');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
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
    link.setAttribute('href', url);
    link.setAttribute('download', `spendwise_expenses_${formatDateToYYYYMMDD(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Export successful! 📥');
    // For consistency, use the central closeModal function
    const modal = $('#exportModal');
    modal.classList.add('hidden');
    if (window.innerWidth < 768) {
        $('[data-tab="add"]').click();
    }
};

const exportAssetsToCSV = () => {
    if (APP_STATE.assets.length === 0) {
        showToast('No assets to export', 'error');
        return;
    }

    const headers = ['Name', 'Type', 'Value', 'Quantity', 'InterestRate', 'Period', 'TaxRate'];
    const rows = APP_STATE.assets.map(a => [
        `"${a.name.replace(/"/g, '""')}"`,
        a.type,
        a.value || 0,
        a.quantity || 0,
        a.interestRate || 0,
        a.period || 0,
        a.taxRate || 0
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `spendwise_assets_${formatDateToYYYYMMDD(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Assets exported! 📦');
    $('#exportModal').classList.add('hidden');
};

// ==================== QR Sync / Transfer ====================
let qrScanner = null;

const initQrSync = () => {
    const generateBtn = $('#generateQrBtn');
    const scanBtn = $('#scanQrBtn');
    const stopBtn = $('#stopScanBtn');

    generateBtn?.addEventListener('click', generateSyncQR);
    scanBtn?.addEventListener('click', startQRScanner);
    stopBtn?.addEventListener('click', stopQRScanner);
};

const generateSyncQR = () => {
    const canvas = $('#qrCanvas');
    const displayArea = $('#qrDisplayArea');
    const scannerArea = $('#qrScannerArea');

    // Super aggressive compression: Convert objects to arrays to remove key names
    // Expense format: [id, date, amount, category, description]
    const minExpenses = APP_STATE.expenses.map(e => [
        e.id,
        e.date,
        e.amount,
        e.category,
        e.description || ""
    ]);

    // Asset format: [id, name, type, value, quantity, interestRate, period, taxRate]
    const minAssets = APP_STATE.assets.map(a => [
        a.id,
        a.name,
        a.type,
        a.value || 0,
        a.quantity || 0,
        a.interestRate || 0,
        a.period || 0,
        a.taxRate || 0
    ]);

    const syncData = {
        v: 2, // New compressed version
        t: Date.now(),
        e: minExpenses,
        a: minAssets,
        m: APP_STATE.monthlySettings,
        c: APP_STATE.categories
    };

    const jsonStr = JSON.stringify(syncData);

    // QR limit for reliable scanning on screens is roughly 2300 chars
    console.log('Final QR Data length:', jsonStr.length);
    if (jsonStr.length > 2500) {
        showToast('Too many entries for QR scan! Please use "Backup to CSV" instead.', 'error');
        return;
    }

    QRCode.toCanvas(canvas, jsonStr, {
        width: 320,
        margin: 4,
        errorCorrectionLevel: 'L',
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, (error) => {
        if (error) {
            console.error(error);
            showToast('Failed to generate QR', 'error');
        } else {
            scannerArea.classList.add('hidden');
            displayArea.classList.toggle('hidden');
            if (!displayArea.classList.contains('hidden')) {
                displayArea.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
};

const startQRScanner = async () => {
    const scannerArea = $('#qrScannerArea');
    const displayArea = $('#qrDisplayArea');

    displayArea.classList.add('hidden');
    scannerArea.classList.remove('hidden');

    qrScanner = new Html5Qrcode("qrReader");

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
        await qrScanner.start({ facingMode: "environment" }, config, onScanSuccess);
        scannerArea.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error(err);
        showToast('Camera access denied or error', 'error');
        scannerArea.classList.add('hidden');
    }
};

const stopQRScanner = async () => {
    if (qrScanner) {
        await qrScanner.stop();
        qrScanner = null;
    }
    $('#qrScannerArea').classList.add('hidden');
};

const onScanSuccess = (decodedText) => {
    // Basic verification before stopping
    if (!decodedText || !decodedText.startsWith('{')) return;

    stopQRScanner();
    console.log('QR Code Scanned, length:', decodedText.length);

    try {
        const incomingData = JSON.parse(decodedText);

        // Handle both old and new (minified) data formats
        const expenses = incomingData.e || incomingData.expenses || [];
        const assets = incomingData.a || incomingData.assets || [];

        if (confirm(`Found ${expenses.length} expenses and ${assets.length} assets. Merge into this device?`)) {
            mergeSyncData(incomingData);
        }
    } catch (e) {
        console.error('Parse Error:', e);
        console.log('Raw content:', decodedText);
        showToast('Invalid or corrupted QR data. Try scanning again closer.', 'error');
    }
};

const mergeSyncData = (data) => {
    let incomingExpenses = [];
    let incomingAssets = [];

    // Handle Versioning
    if (data.v === 2) {
        // Decompress Array-of-Arrays format
        incomingExpenses = data.e.map(arr => ({
            id: arr[0],
            date: arr[1],
            amount: arr[2],
            category: arr[3],
            description: arr[4]
        }));
        incomingAssets = data.a.map(arr => ({
            id: arr[0],
            name: arr[1],
            type: arr[2],
            value: arr[3],
            quantity: arr[4],
            interestRate: arr[5],
            period: arr[6],
            taxRate: arr[7]
        }));
    } else {
        // Fallback for old format (v1 or legacy)
        incomingExpenses = data.e || data.expenses || [];
        incomingAssets = data.a || data.assets || [];
    }

    const monthlySettings = data.m || data.monthlySettings || {};
    const categories = data.c || data.categories || {};

    // 1. Merge Expenses (checking for duplicates by ID)
    const existingExpenseIds = new Set(APP_STATE.expenses.map(e => e.id));
    const newExpenses = incomingExpenses.filter(e => !existingExpenseIds.has(e.id));
    APP_STATE.expenses = [...APP_STATE.expenses, ...newExpenses];

    // 2. Merge Assets
    const existingAssetIds = new Set(APP_STATE.assets.map(a => a.id));
    const newAssets = incomingAssets.filter(a => !existingAssetIds.has(a.id));
    APP_STATE.assets = [...APP_STATE.assets, ...newAssets];

    // 3. Merge Monthly Settings (Budgets & Income)
    Object.keys(monthlySettings).forEach(key => {
        if (!APP_STATE.monthlySettings[key]) {
            APP_STATE.monthlySettings[key] = monthlySettings[key];
        } else {
            // If exists, merge nested limits
            const incomingLimits = monthlySettings[key].limits || {};
            APP_STATE.monthlySettings[key].limits = {
                ...APP_STATE.monthlySettings[key].limits,
                ...incomingLimits
            };
        }
    });

    // 4. Merge Categories
    APP_STATE.categories = { ...categories, ...APP_STATE.categories };

    // Save and Refresh
    saveExpenses();
    saveAssets();
    saveBudgets();
    saveCategories();

    renderHistory();
    renderAssets();
    updateTodayTotal();
    updateHomeBudgetStatus();

    showToast(`Merge complete! Added ${newExpenses.length} records.`);
    $('#exportModal').classList.add('hidden');
};

const processImportAssetsCSV = (csvContent) => {
    try {
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSV file is empty or missing data.');

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const indices = {};
        headers.forEach((h, i) => indices[h] = h.includes(' ') ? -1 : i); // Simple header mapping

        // Re-mapping for common headers if needed or just use strict names
        const required = ['name', 'type'];
        required.forEach(req => {
            if (indices[req] === undefined) {
                // Try to find it manually if headers have spaces etc
                indices[req] = headers.findIndex(h => h.includes(req));
            }
        });

        if (indices.name === -1 || indices.type === -1) {
            throw new Error('CSV must have Name and Type columns');
        }

        const newAssets = [];
        for (let i = 1; i < lines.length; i++) {
            const regex = /(".*?"|[^,]+)(?=\s*,|\s*$)/g;
            const matches = lines[i].match(regex);
            if (!matches) continue;
            const values = matches.map(v => v.replace(/^"|"$/g, '').trim());

            const name = values[indices.name];
            const typeToken = values[indices.type]?.toLowerCase();

            // Validate type
            if (!name || !typeToken || !ASSET_TYPES[typeToken]) continue;

            newAssets.push({
                id: generateId(),
                name,
                type: typeToken,
                value: parseFloat(values[indices.value]) || 0,
                quantity: parseFloat(values[indices.quantity]) || 0,
                interestRate: parseFloat(values[indices.interestrate]) || 0,
                period: parseInt(values[indices.period]) || 0,
                taxRate: parseFloat(values[indices.taxrate]) || 0
            });
        }

        if (newAssets.length === 0) throw new Error('No valid assets found in CSV.');

        if (confirm(`Import ${newAssets.length} assets? This will append to your current list.`)) {
            APP_STATE.assets = [...APP_STATE.assets, ...newAssets];
            saveAssets();
            renderAssets();
            showToast(`Imported ${newAssets.length} assets! 🚀`);
            $('#exportModal').classList.add('hidden');
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
};



// ==================== Asset Management ====================
const renderAssets = () => {
    const list = $('#assetsList');
    const totalEl = $('#totalAssetsValue');
    const allocationBar = $('#assetAllocationBar');
    if (!list) return;

    if (APP_STATE.assets.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="padding: var(--spacing-xl) 0;">
                <div class="empty-icon">🪙</div>
                <p style="color: var(--text-muted); font-size: 0.9rem;">No assets tracked yet. Add your first one above!</p>
            </div>
        `;
        totalEl.textContent = formatCurrency(0);
        if (allocationBar) allocationBar.innerHTML = '';
        return;
    }

    // Calculate dynamic values for Gold, Silver, and Deposit
    const assetsWithValues = APP_STATE.assets.map(asset => {
        let currentValue = asset.value;
        let earnedInterest = 0;

        if (asset.type === 'gold' && APP_STATE.metalPrices.gold > 0) {
            currentValue = asset.quantity * APP_STATE.metalPrices.gold;
        } else if (asset.type === 'silver' && APP_STATE.metalPrices.silver > 0) {
            currentValue = asset.quantity * APP_STATE.metalPrices.silver;
        } else if (asset.type === 'deposit') {
            // Gross Simple interest: P * r * t
            const grossInterest = asset.value * (asset.interestRate / 100) * (asset.period / 12);
            const netInterest = grossInterest * (1 - (asset.taxRate || 0) / 100);
            earnedInterest = netInterest;
            currentValue = asset.value + netInterest;
        }
        return { ...asset, displayValue: currentValue, earnedInterest };
    });

    const totalValue = assetsWithValues.reduce((sum, a) => sum + a.displayValue, 0);
    totalEl.textContent = formatCurrency(totalValue);

    // Update stats total card too if it exists
    const statsTotal = $('#statsTotalAssets');
    if (statsTotal) statsTotal.textContent = formatCurrency(totalValue);

    // Render list
    list.innerHTML = assetsWithValues.map(asset => {
        const type = ASSET_TYPES[asset.type] || ASSET_TYPES.other;
        const percent = ((asset.displayValue / totalValue) * 100).toFixed(1);
        const isMetal = asset.type === 'gold' || asset.type === 'silver';
        const isDeposit = asset.type === 'deposit';

        let extraInfo = '';
        let subLabel = `${type.label} • ${percent}%`;

        if (isMetal) {
            subLabel = `${type.label} • ${asset.quantity}g • ${percent}%`;
            if (APP_STATE.metalPrices[asset.type] > 0) {
                extraInfo = `<div style="font-size: 0.65rem; color: var(--accent-primary); opacity: 0.8;">@ ${formatCurrency(APP_STATE.metalPrices[asset.type])}/g</div>`;
            }
        } else if (isDeposit) {
            subLabel = `${type.label} • ${asset.period} Mo • ${asset.interestRate}% p.a (Tax: ${asset.taxRate}%) • ${percent}%`;
            extraInfo = `<div style="font-size: 0.65rem; color: var(--success); opacity: 0.9;">+ Net Interest: ${formatCurrency(asset.earnedInterest)}</div>`;
        }

        return `
            <div class="card asset-item" style="margin-bottom: var(--spacing-md); display: flex; align-items: center; justify-content: space-between; border-left: 4px solid ${type.color};">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 1.5rem;">${type.icon}</div>
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary); text-transform: capitalize;">${asset.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${subLabel}</div>
                        ${extraInfo}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 700; color: var(--text-primary);">${formatCurrency(asset.displayValue)}</div>
                    <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
                        <button class="edit-asset-btn" data-id="${asset.id}" style="background: none; border: none; color: var(--accent-primary); font-size: 0.75rem; cursor: pointer; opacity: 0.8; padding: 2px;">Edit</button>
                        <button class="remove-asset-btn" data-id="${asset.id}" style="background: none; border: none; color: var(--danger); font-size: 0.75rem; cursor: pointer; opacity: 0.6; padding: 2px;">Remove</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Update allocation bar
    if (allocationBar) {
        allocationBar.innerHTML = assetsWithValues.map(asset => {
            const type = ASSET_TYPES[asset.type] || ASSET_TYPES.other;
            const percent = (asset.displayValue / totalValue) * 100;
            return `<div style="width: ${percent}%; height: 100%; background: ${type.color};" title="${asset.name}: ${percent.toFixed(1)}%"></div>`;
        }).join('');
        allocationBar.style.display = 'flex';
        allocationBar.style.overflow = 'hidden';
        allocationBar.style.borderRadius = '4px';
    }

    // Remove buttons
    $$('.remove-asset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (confirm('Remove this asset?')) {
                APP_STATE.assets = APP_STATE.assets.filter(a => a.id !== id);
                if (APP_STATE.editingAssetId === id) resetAssetForm();
                saveAssets();
                renderAssets();
                showToast('Asset removed');
            }
        });
    });

    // Edit buttons
    $$('.edit-asset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const asset = APP_STATE.assets.find(a => a.id === id);
            if (asset) prepareAssetEdit(asset);
        });
    });
};

const prepareAssetEdit = (asset) => {
    APP_STATE.editingAssetId = asset.id;

    // Fill form
    $('#assetName').value = asset.name;
    $('#assetType').value = asset.type;
    $('#assetType').dispatchEvent(new Event('change')); // Trigger visibility logic

    if (asset.type === 'gold' || asset.type === 'silver') {
        $('#assetWeight').value = asset.quantity;
    } else if (asset.type === 'deposit') {
        $('#assetValue').value = asset.value;
        $('#assetRate').value = asset.interestRate;
        $('#assetPeriod').value = asset.period;
        $('#assetTax').value = asset.taxRate;
    } else {
        $('#assetValue').value = asset.value;
    }

    // Update UI
    $('#assetSubmitBtn').textContent = 'Update Asset';
    $('#cancelAssetEdit').classList.remove('hidden');

    // Scroll to form
    $('#assetForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const resetAssetForm = () => {
    const form = $('#assetForm');
    if (!form) return;

    APP_STATE.editingAssetId = null;
    form.reset();

    const assetSubmitBtn = $('#assetSubmitBtn');
    if (assetSubmitBtn) assetSubmitBtn.textContent = 'Add Asset';

    const cancelAssetEdit = $('#cancelAssetEdit');
    if (cancelAssetEdit) cancelAssetEdit.classList.add('hidden');

    $('#manualValueGroup').classList.remove('hidden');
    $('#weightGroup').classList.add('hidden');
    $('#depositGroup').classList.add('hidden');
    $('#assetValue').required = true;
    $('#assetWeight').required = false;
    $('#assetRate').required = false;
    $('#assetPeriod').required = false;
    $('#assetTax').required = false;
    $('#assetValueLabel').textContent = 'Current Value (Rp)';
};

const initCurrencyInputs = () => {
    document.addEventListener('input', (e) => {
        if (e.target.matches('[data-type="currency"]')) {
            handleCurrencyInput(e);
        }
    });

    // Formatting for initial loads or value resets
    $$('[data-type="currency"]').forEach(input => {
        if (input.value) {
            const val = parseCurrency(input.value);
            input.value = val.toLocaleString('en-US');
        }
    });
};

const initAssetForm = () => {
    const form = $('#assetForm');
    if (!form) return;

    $('#cancelAssetEdit').addEventListener('click', resetAssetForm);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = $('#assetName');
        const typeInput = $('#assetType');
        const valueInput = $('#assetValue');
        const weightInput = $('#assetWeight');
        const rateInput = $('#assetRate');
        const periodInput = $('#assetPeriod');
        const taxInput = $('#assetTax');

        const name = nameInput.value.trim();
        const type = typeInput.value;
        const isMetal = type === 'gold' || type === 'silver';
        const isDeposit = type === 'deposit';

        let value = 0;
        let quantity = 0;
        let rate = 0;
        let period = 0;
        let tax = 0;

        if (isMetal) {
            quantity = parseFloat(weightInput.value) || 0;
            if (quantity <= 0) {
                showToast('Please enter a valid weight in grams', 'error');
                return;
            }
        } else if (isDeposit) {
            value = parseCurrency(valueInput.value);
            rate = parseFloat(rateInput.value) || 0;
            period = parseInt(periodInput.value) || 0;
            tax = parseFloat(taxInput.value) || 20; // Default tax to 20% if not provided
            if (value <= 0) {
                showToast('Please enter a valid investment amount', 'error');
                return;
            }
        } else {
            value = parseCurrency(valueInput.value);
            if (value <= 0) {
                showToast('Please enter a valid value', 'error');
                return;
            }
        }

        if (APP_STATE.editingAssetId) {
            // Update existing
            const index = APP_STATE.assets.findIndex(a => a.id === APP_STATE.editingAssetId);
            if (index !== -1) {
                APP_STATE.assets[index] = {
                    ...APP_STATE.assets[index],
                    name,
                    type,
                    value: isMetal ? 0 : value,
                    quantity: isMetal ? quantity : 0,
                    interestRate: isDeposit ? rate : 0,
                    period: isDeposit ? period : 0,
                    taxRate: isDeposit ? tax : 0
                };
                showToast('Asset updated! ✨');
            }
        } else {
            // Add new
            const newAsset = {
                id: generateId(),
                name,
                type,
                value: isMetal ? 0 : value,
                quantity: isMetal ? quantity : 0,
                interestRate: isDeposit ? rate : 0,
                period: isDeposit ? period : 0,
                taxRate: isDeposit ? tax : 20 // Default tax to 20% if not provided
            };
            APP_STATE.assets.push(newAsset);
            showToast(`Asset "${name}" added! 🚀`);
        }

        saveAssets();
        renderAssets();
        resetAssetForm();
    });

    // Handle Asset Type Change
    const typeInput = $('#assetType');
    const manualGroup = $('#manualValueGroup');
    const weightGroup = $('#weightGroup');
    const depositGroup = $('#depositGroup');
    const valueInput = $('#assetValue');
    const weightInput = $('#assetWeight');
    const rateInput = $('#assetRate');
    const periodInput = $('#assetPeriod');

    if (typeInput) {
        typeInput.addEventListener('change', () => {
            const type = typeInput.value;
            const isMetal = type === 'gold' || type === 'silver';
            const isDeposit = type === 'deposit';

            // Reset visibility
            manualGroup.classList.remove('hidden');
            weightGroup.classList.add('hidden');
            depositGroup.classList.add('hidden');

            valueInput.required = true;
            weightInput.required = false;
            rateInput.required = false;
            periodInput.required = false;
            $('#assetTax').required = false;

            if (isMetal) {
                manualGroup.classList.add('hidden');
                weightGroup.classList.remove('hidden');
                valueInput.required = false;
                weightInput.required = true;
            } else if (isDeposit) {
                depositGroup.classList.remove('hidden');
                rateInput.required = true;
                periodInput.required = true;
                $('#assetTax').required = true;
                $('#assetValueLabel').textContent = 'Initial Principal / Investment (Rp)';
            } else {
                $('#assetValueLabel').textContent = 'Current Value (Rp)';
            }
        });
    }
};

const fetchMetalPrices = async () => {
    // Only fetch if not updated in the last hour
    if (APP_STATE.metalPrices.lastUpdated && (new Date() - new Date(APP_STATE.metalPrices.lastUpdated)) < 3600000) {
        return;
    }

    try {
        // 1. Get USD/IDR exchange rate
        const exRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const exData = await exRes.json();
        const usdToIdr = exData.rates.IDR;

        // 2. Get Gold and Silver prices (USD per Troy Ounce)
        // 1 Troy Ounce = 31.1035 grams
        const troyOunceToGram = 31.1035;

        const goldRes = await fetch('https://api.gold-api.com/price/XAU');
        const goldData = await goldRes.json();
        const goldUsdPerGram = goldData.price / troyOunceToGram;

        const silverRes = await fetch('https://api.gold-api.com/price/XAG');
        const silverData = await silverRes.json();
        const silverUsdPerGram = silverData.price / troyOunceToGram;

        APP_STATE.metalPrices = {
            gold: goldUsdPerGram * usdToIdr,
            silver: silverUsdPerGram * usdToIdr,
            lastUpdated: new Date().toISOString()
        };

        console.log('Metal prices updated:', APP_STATE.metalPrices);
        renderAssets(); // Re-render to show updated values
    } catch (e) {
        console.error('Error fetching metal prices:', e);
    }
};

// ==================== Filter Event Listeners ====================
const initFilters = () => {
    $('#historyFilter').addEventListener('change', renderHistory);

    const statsPeriod = $('#statsPeriod');
    const customRange = $('#statsCustomRange');
    const startInput = $('#statsStartDate');
    const endInput = $('#statsEndDate');

    // Set default range: Start of month to Today
    if (startInput && endInput) {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startInput.value = formatDateToYYYYMMDD(firstDay);
        endInput.value = formatDateToYYYYMMDD(now);
    }

    if (statsPeriod) {
        statsPeriod.addEventListener('change', () => {
            if (statsPeriod.value === 'custom') {
                customRange.classList.remove('hidden');
            } else {
                customRange.classList.add('hidden');
            }
            renderStats();
        });
    }

    if (startInput) startInput.addEventListener('change', renderStats);
    if (endInput) endInput.addEventListener('change', renderStats);

    const groupingSelect = $('#statsGrouping');
    if (groupingSelect) {
        groupingSelect.addEventListener('change', (e) => {
            APP_STATE.statsGrouping = e.target.value;
            renderStats();
        });
    }
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
    loadCategories();
    loadBudgets();
    loadAssets();

    // Initialize components
    initCurrencyInputs();
    initTabs();
    renderCategoryGrid();
    initForm();
    initBudgetForm();
    initAssetForm();
    initDeleteModal();
    initExportModal();
    initQrSync();
    initFilters();

    // Initial render
    updateTodayTotal();
    updateHomeBudgetStatus();
    renderAssets();
    fetchMetalPrices();
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
