// ===================================
// IPCA Investment Calculator
// ===================================

// Configuration
const CONFIG = {
    API_BASE_URL: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados',
    IPCA_SERIES_CODE: 433,
    DATE_FORMAT: 'dd/MM/yyyy'
};

// Global state
let chartInstance = null;

// ===================================
// Utility Functions
// ===================================

/**
 * Format a number as Brazilian Real currency
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Format a number as percentage
 */
function formatPercentage(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100);
}

/**
 * Format date to dd/MM/yyyy for API
 */
function formatDateForAPI(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Format date for display
 */
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

/**
 * Parse API date format (dd/MM/yyyy) to Date object
 */
function parseAPIDate(dateString) {
    const [day, month, year] = dateString.split('/');
    return new Date(year, month - 1, day);
}

// ===================================
// API Functions
// ===================================

/**
 * Fetch IPCA data from Banco Central API
 */
async function fetchIPCAData(startDate, endDate) {
    const startDateFormatted = formatDateForAPI(startDate);
    const endDateFormatted = formatDateForAPI(endDate);

    const url = `${CONFIG.API_BASE_URL}?formato=json&dataInicial=${startDateFormatted}&dataFinal=${endDateFormatted}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            throw new Error('Nenhum dado disponível para o período selecionado');
        }

        return data;
    } catch (error) {
        console.error('Erro ao buscar dados do IPCA:', error);
        throw new Error('Não foi possível obter os dados do IPCA. Verifique sua conexão e tente novamente.');
    }
}

// ===================================
// Calculation Functions
// ===================================

/**
 * Calculate cumulative IPCA variation
 * Uses compound formula: (1 + rate1/100) * (1 + rate2/100) * ... - 1
 */
function calculateCumulativeIPCA(ipcaData) {
    let cumulativeFactor = 1;

    for (const item of ipcaData) {
        const monthlyRate = parseFloat(item.valor);
        cumulativeFactor *= (1 + monthlyRate / 100);
    }

    // Return percentage variation
    return (cumulativeFactor - 1) * 100;
}

/**
 * Calculate investment value adjusted by IPCA + fixed rate
 * Fixed rate is applied monthly as (annualRate / 12)
 */
function calculateAdjustedValue(initialValue, ipcaData, annualFixedRate) {
    let adjustedValue = initialValue;
    const monthlyFixedRate = annualFixedRate / 12; // Convert annual to monthly

    for (const item of ipcaData) {
        const monthlyIPCA = parseFloat(item.valor);
        // Compound both IPCA and fixed rate: (1 + IPCA/100) * (1 + fixedRate/100)
        adjustedValue *= (1 + monthlyIPCA / 100) * (1 + monthlyFixedRate / 100);
    }

    return adjustedValue;
}

/**
 * Calculate investment evolution over time with fixed rate
 * Returns both IPCA-only and IPCA+fixed values for comparison
 */
function calculateInvestmentEvolution(initialValue, ipcaData, annualFixedRate) {
    const evolution = [];
    let currentValueIPCA = initialValue; // IPCA only
    let currentValueCombined = initialValue; // IPCA + fixed rate
    const monthlyFixedRate = annualFixedRate / 12;

    for (const item of ipcaData) {
        const monthlyIPCA = parseFloat(item.valor);

        // Calculate IPCA-only value
        currentValueIPCA *= (1 + monthlyIPCA / 100);

        // Calculate combined value (IPCA + fixed rate)
        currentValueCombined *= (1 + monthlyIPCA / 100) * (1 + monthlyFixedRate / 100);

        evolution.push({
            date: parseAPIDate(item.data),
            valueIPCA: currentValueIPCA,
            valueCombined: currentValueCombined,
            dateString: item.data
        });
    }

    return evolution;
}

// ===================================
// UI Functions
// ===================================

/**
 * Show error message
 */
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';

    // Hide after 5 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

/**
 * Hide error message
 */
function hideError() {
    const errorElement = document.getElementById('errorMessage');
    errorElement.style.display = 'none';
}

/**
 * Show loading state
 */
function setLoadingState(isLoading) {
    const btn = document.getElementById('calculateBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');

    if (isLoading) {
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';
    } else {
        btn.disabled = false;
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
    }
}

/**
 * Display results
 */
function displayResults(initialValue, finalValue, totalVariation, startDate, endDate, fixedRate) {
    // Update result values
    document.getElementById('initialValue').textContent = formatCurrency(initialValue);
    document.getElementById('finalValue').textContent = formatCurrency(finalValue);
    document.getElementById('totalVariation').textContent = formatPercentage(totalVariation);
    document.getElementById('fixedRateDisplay').textContent = formatPercentage(fixedRate) + ' a.a.';

    // Calculate total gain
    const totalGainPercent = ((finalValue - initialValue) / initialValue) * 100;
    document.getElementById('totalGain').textContent = formatPercentage(totalGainPercent);

    const startDateFormatted = formatDateForDisplay(startDate);
    const endDateFormatted = formatDateForDisplay(endDate);
    document.getElementById('period').textContent = `${startDateFormatted} - ${endDateFormatted}`;

    // Update info box
    document.getElementById('infoInitial').textContent = formatCurrency(initialValue);
    document.getElementById('infoFinal').textContent = formatCurrency(finalValue);
    document.getElementById('infoStartDate').textContent = startDateFormatted;
    document.getElementById('infoEndDate').textContent = endDateFormatted;

    // Show results card
    const resultsCard = document.getElementById('resultsCard');
    resultsCard.style.display = 'block';
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Create or update chart with dual lines showing IPCA and fixed rate contributions
 */
function updateChart(evolution, initialValue, fixedRate) {
    const ctx = document.getElementById('investmentChart');

    // Destroy existing chart if it exists
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Prepare data
    const labels = evolution.map(item => {
        const date = item.date;
        return new Intl.DateTimeFormat('pt-BR', {
            year: 'numeric',
            month: 'short'
        }).format(date);
    });

    const valuesIPCA = evolution.map(item => item.valueIPCA);
    const valuesCombined = evolution.map(item => item.valueCombined);

    // Create gradients
    const gradientIPCA = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradientIPCA.addColorStop(0, 'rgba(67, 233, 123, 0.3)');
    gradientIPCA.addColorStop(1, 'rgba(67, 233, 123, 0.05)');

    const gradientCombined = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradientCombined.addColorStop(0, 'rgba(79, 172, 254, 0.5)');
    gradientCombined.addColorStop(1, 'rgba(0, 242, 254, 0.1)');

    // Prepare datasets
    const datasets = [];

    // Always show IPCA line
    datasets.push({
        label: 'Somente IPCA',
        data: valuesIPCA,
        borderColor: '#43e97b',
        backgroundColor: gradientIPCA,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#43e97b',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2
    });

    // Only show combined line if there's a fixed rate
    if (fixedRate > 0) {
        datasets.push({
            label: `IPCA + ${fixedRate.toFixed(2)}% a.a.`,
            data: valuesCombined,
            borderColor: '#4facfe',
            backgroundColor: gradientCombined,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#4facfe',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2
        });
    }

    // Create chart
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#a0aec0',
                        font: {
                            size: 12,
                            family: 'Inter'
                        },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'line'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(21, 25, 50, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#a0aec0',
                    borderColor: 'rgba(79, 172, 254, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return 'Valor: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#718096',
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#718096',
                        callback: function (value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });

    // Show chart card
    const chartCard = document.getElementById('chartCard');
    chartCard.style.display = 'block';
}

// ===================================
// Form Validation
// ===================================

/**
 * Validate form inputs
 */
function validateForm(amount, startDate, endDate) {
    // Validate amount
    if (!amount || amount <= 0) {
        throw new Error('Por favor, insira um valor de investimento válido (maior que zero).');
    }

    // Validate dates
    if (!startDate || !endDate) {
        throw new Error('Por favor, selecione as datas inicial e final.');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check if start date is before end date
    if (start >= end) {
        throw new Error('A data inicial deve ser anterior à data final.');
    }

    // Check if dates are not in the future
    const today = new Date();
    if (end > today) {
        throw new Error('A data final não pode ser no futuro.');
    }

    // Check if date range is reasonable (IPCA data available from 1980)
    const minDate = new Date('1980-01-01');
    if (start < minDate) {
        throw new Error('A data inicial deve ser posterior a janeiro de 1980.');
    }

    return true;
}

// ===================================
// Main Application Logic
// ===================================

/**
 * Handle form submission
 */
async function handleCalculation(event) {
    event.preventDefault();

    // Hide previous errors
    hideError();

    // Get form values
    const amount = parseFloat(document.getElementById('investmentAmount').value);
    const fixedRate = parseFloat(document.getElementById('fixedRate').value) || 0;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    try {
        // Validate inputs
        validateForm(amount, startDate, endDate);

        // Show loading state
        setLoadingState(true);

        // Fetch IPCA data
        const ipcaData = await fetchIPCAData(startDate, endDate);

        // Calculate results
        const totalVariation = calculateCumulativeIPCA(ipcaData);
        const finalValue = calculateAdjustedValue(amount, ipcaData, fixedRate);
        const evolution = calculateInvestmentEvolution(amount, ipcaData, fixedRate);

        // Display results
        displayResults(amount, finalValue, totalVariation, startDate, endDate, fixedRate);

        // Update chart
        updateChart(evolution, amount, fixedRate);

    } catch (error) {
        console.error('Erro no cálculo:', error);
        showError(error.message);
    } finally {
        // Hide loading state
        setLoadingState(false);
    }
}

// ===================================
// Initialize Application
// ===================================

/**
 * Set default dates (last year)
 */
function setDefaultDates() {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    // Format dates for input (yyyy-MM-dd)
    const formatForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    document.getElementById('startDate').value = formatForInput(oneYearAgo);
    document.getElementById('endDate').value = formatForInput(today);
}

/**
 * Initialize the application
 */
function init() {
    // Set default dates
    setDefaultDates();

    // Add form submit listener
    const form = document.getElementById('calculatorForm');
    form.addEventListener('submit', handleCalculation);

    console.log('IPCA Calculator initialized');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
