const APP_STATE = {
    expenses: [],
    categories: {},
    budgetGroups: [], // { id, name, icon, limit, categoryIds: [] }
    monthlyIncome: 0,
    selectedCategory: null,
    deleteExpenseId: null,
    categoryChart: null,
    trendChart: null,
    statsGrouping: 'group', // 'group' or 'category'
    viewMonth: new Date().getMonth(),
    viewYear: new Date().getFullYear()
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

const loadBudgets = () => {
    try {
        const storedGroups = localStorage.getItem('budgetGroups');
        const storedIncome = localStorage.getItem('monthlyIncome');
        APP_STATE.budgetGroups = storedGroups ? JSON.parse(storedGroups) : [];
        APP_STATE.monthlyIncome = storedIncome ? parseFloat(storedIncome) : 0;
    } catch (e) {
        APP_STATE.budgetGroups = [];
        APP_STATE.monthlyIncome = 0;
    }
};

const saveBudgets = () => {
    localStorage.setItem('budgetGroups', JSON.stringify(APP_STATE.budgetGroups));
    localStorage.setItem('monthlyIncome', APP_STATE.monthlyIncome.toString());
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
        updateHomeBudgetStatus();
        showToast('Expense added successfully! 💰');
    });
};

const getCategoryName = (category) => {
    // Use the stored category name if available, otherwise format the ID
    return APP_STATE.categories[category]?.name || category.charAt(0).toUpperCase() + category.slice(1);
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

    // Get date range
    const labels = [];
    const data = [];
    const today = new Date(); // Define today here for scope

    if (period === 'year' || period === 'all') {
        // Monthly data for year or all-time view
        const currentYear = today.getFullYear();
        const startYear = period === 'all' && expenses.length > 0
            ? new Date(Math.min(...expenses.map(e => new Date(e.date)))).getFullYear()
            : currentYear;

        for (let y = startYear; y <= currentYear; y++) {
            const startMonth = 0;
            const endMonth = (y === currentYear) ? today.getMonth() : 11;

            for (let m = startMonth; m <= endMonth; m++) {
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

        // Limit labels if too many for "all" period
        if (period === 'all' && labels.length > 12) {
            // Keep last 12-24 months for clarity or we could show all
            // For now, let's show all but Chart.js will handle the scale
        }
    } else {
        // Daily data
        let days;
        if (period === 'week') days = 7;
        else if (period === 'month') days = today.getDate(); // Days passed in current month
        else days = 7; // Default to week if not specified or unknown

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
// ==================== Budget Management ====================
// ==================== Budget Management ====================
const renderBudget = () => {
    const list = $('#budgetGroupsList');
    const incomeInput = $('#monthlyIncome');
    const emptyState = $('#emptyBudgetState');

    // Set current date for budget period
    const displayMonth = new Date(APP_STATE.viewYear, APP_STATE.viewMonth, 1);
    $('#budgetPeriod').textContent = displayMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    // Set income value
    incomeInput.value = APP_STATE.monthlyIncome || '';

    if (APP_STATE.budgetGroups.length === 0) {
        list.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        list.innerHTML = APP_STATE.budgetGroups.map((group) => `
            <div class="budget-category-item" data-group-id="${group.id}">
                <div class="budget-category-header" style="margin-bottom: var(--spacing-sm);">
                    <div class="budget-category-label">
                        <span style="font-size: 1.25rem;">${group.icon}</span>
                        <span style="font-weight: 600;">${group.name}</span>
                        <button class="remove-group-btn" data-id="${group.id}" title="Remove Group" style="margin-left: 8px; font-size: 0.7rem; background: none; border: none; color: var(--danger); cursor: pointer; opacity: 0.5;">✕</button>
                    </div>
                    <div class="budget-category-input-group">
                        <span class="currency-prefix">Rp</span>
                        <input type="number" 
                               class="group-budget-input" 
                               data-id="${group.id}" 
                               placeholder="0" 
                               value="${group.limit || ''}" 
                               min="0" step="1000">
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
        `).join('');
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
    const limit = group.limit || 0;
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
    const monthStart = new Date(APP_STATE.viewYear, APP_STATE.viewMonth, 1);
    const monthEnd = new Date(APP_STATE.viewYear, APP_STATE.viewMonth + 1, 0);

    // Total spent across ALL expenses in the selected month
    const totalSpent = APP_STATE.expenses
        .filter(e => {
            const d = new Date(e.date);
            return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);

    const income = APP_STATE.monthlyIncome || 0;
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

            const income = parseFloat($('#monthlyIncome').value) || 0;

            // Calculate sum of all budget group limits
            let totalLimits = 0;
            const inputs = $$('.group-budget-input');
            inputs.forEach(input => {
                totalLimits += parseFloat(input.value) || 0;
            });

            // Validation: Cannot proceed if total budget > monthly income
            if (totalLimits > income && income > 0) {
                showToast(`Total budget ${formatCurrency(totalLimits)} exceeds your monthly income!`, 'error');
                return;
            } else if (totalLimits > 0 && income === 0) {
                showToast('Please set your monthly income first.', 'error');
                return;
            }

            APP_STATE.monthlyIncome = income;

            inputs.forEach(input => {
                const id = input.dataset.id;
                const limit = parseFloat(input.value) || 0;
                const group = APP_STATE.budgetGroups.find(g => g.id === id);
                if (group) group.limit = limit;
            });

            saveBudgets();
            renderBudget();
            updateBudgetSummary();
            renderBudgetAlerts();
            updateHomeBudgetStatus();
            showToast('Budget settings saved successfully!');
        });
    }
};

const renderBudgetAlerts = () => {
    const container = $('#budgetAlerts');
    if (!container) return;
    container.innerHTML = '';

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    APP_STATE.budgetGroups.forEach(group => {
        if (group.limit <= 0) return;

        const spent = APP_STATE.expenses
            .filter(e => group.categoryIds.includes(e.category) && new Date(e.date) >= monthStart)
            .reduce((sum, e) => sum + e.amount, 0);

        const percent = (spent / group.limit) * 100;

        if (percent >= 100) {
            createAlertElement(container, '🚨', `Exceeded: ${group.name}`, `Spent ${formatCurrency(spent)} (${formatCurrency(spent - group.limit)} over limit).`, 'danger');
        } else if (percent >= 80) {
            createAlertElement(container, '⚠️', `Near Limit: ${group.name}`, `${Math.round(percent)}% used of ${formatCurrency(group.limit)}.`, 'warning');
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
    const totalSpent = APP_STATE.expenses
        .filter(e => new Date(e.date) >= monthStart)
        .reduce((sum, e) => sum + e.amount, 0);

    if (APP_STATE.monthlyIncome > 0) {
        const percent = Math.min((totalSpent / APP_STATE.monthlyIncome) * 100, 100);
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
    // For consistency, use the central closeModal function
    const modal = $('#exportModal');
    modal.classList.add('hidden');
    if (window.innerWidth < 768) {
        $('[data-tab="add"]').click();
    }
};



// ==================== Filter Event Listeners ====================
const initFilters = () => {
    $('#historyFilter').addEventListener('change', renderHistory);
    $('#statsPeriod').addEventListener('change', renderStats);

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

    // Initialize components
    initTabs();
    renderCategoryGrid();
    initForm();
    initBudgetForm();
    initDeleteModal();
    initExportModal();
    initFilters();

    // Initial render
    updateTodayTotal();
    updateHomeBudgetStatus();
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
