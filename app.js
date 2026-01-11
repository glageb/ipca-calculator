// ===================================
// IPCA Investment Calculator
// ===================================

// Configuration
const CONFIG = {
    API_BASE_URL: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados',
    SERIES: {
        IPCA: 433,
        SELIC: 4390
    },
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
 * Fetch series data from Banco Central API
 */
async function fetchSeriesData(seriesCode, startDate, endDate) {
    const startDateFormatted = formatDateForAPI(startDate);
    const endDateFormatted = formatDateForAPI(endDate);

    // Replace placeholder with actual code
    const baseUrl = CONFIG.API_BASE_URL.replace('{code}', seriesCode);
    const url = `${baseUrl}?formato=json&dataInicial=${startDateFormatted}&dataFinal=${endDateFormatted}`;

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
        console.error(`Erro ao buscar dados da série ${seriesCode}:`, error);
        throw new Error('Não foi possível obter os dados. Verifique sua conexão e tente novamente.');
    }
}

// ===================================
// Calculation Functions
// ===================================

/**
 * Calculate cumulative variation for a series
 * Uses compound formula: (1 + rate1/100) * (1 + rate2/100) * ... - 1
 */
function calculateCumulativeRate(seriesData) {
    let cumulativeFactor = 1;

    for (const item of seriesData) {
        const monthlyRate = parseFloat(item.valor);
        cumulativeFactor *= (1 + monthlyRate / 100);
    }

    // Return percentage variation
    return (cumulativeFactor - 1) * 100;
}

/**
 * Calculate investment value adjusted by series rate + fixed rate
 * Fixed rate is applied monthly as (annualRate / 12)
 * For "Fixed Only" scenario, series rate is effectively 0
 */
function calculateCompoundValue(initialValue, seriesData, annualFixedRate, useSeriesRate = true) {
    let adjustedValue = initialValue;
    const monthlyFixedRate = annualFixedRate / 12; // Convert annual to monthly

    for (const item of seriesData) {
        const monthlySeriesRate = useSeriesRate ? parseFloat(item.valor) : 0;
        // Compound both Series rate and fixed rate
        adjustedValue *= (1 + monthlySeriesRate / 100) * (1 + monthlyFixedRate / 100);
    }

    return adjustedValue;
}

/**
 * Calculate investment evolution over time
 * Returns both Series-only and Series+fixed values for comparison
 */

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
function displayResults(initialValue, finalValue, totalVariation, startDate, endDate, fixedRate, seriesLabel, isProjection = false, averageRate = 0) {
    // Update result values
    document.getElementById('initialValue').textContent = formatCurrency(initialValue);
    document.getElementById('finalValue').textContent = formatCurrency(finalValue);

    // Update label to reflect IPCA/SELIC/None
    const variationLabel = document.getElementById('resultVariationLabel') ||
        document.getElementById('totalVariation').previousElementSibling;
    variationLabel.textContent = seriesLabel ? `Variação Total (${seriesLabel})` : 'Variação do Índice';

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
    document.getElementById('infoStartDate').textContent = startDateFormatted;
    document.getElementById('infoFinal').textContent = formatCurrency(finalValue);
    document.getElementById('infoEndDate').textContent = endDateFormatted;

    // Handle Projection Warning
    const existingWarning = document.getElementById('projectionWarning');
    if (existingWarning) existingWarning.remove();

    if (isProjection) {
        const resultsCard = document.getElementById('resultsCard');
        const warningDiv = document.createElement('div');
        warningDiv.id = 'projectionWarning';
        warningDiv.className = 'warning-box';
        warningDiv.innerHTML = `
            <p class="warning-text">
                ⚠️ <strong>Atenção:</strong> O período selecionado avança para o futuro. 
                Para os meses sem dados oficiais, foi utilizada uma projeção baseada na média dos últimos 12 meses do ${seriesLabel || 'índice'} 
                (<strong>${averageRate.toFixed(2)}% ao mês</strong>).
            </p>
        `;
        resultsCard.insertBefore(warningDiv, resultsCard.lastElementChild);
    }

    // Show results card
    const resultsCard = document.getElementById('resultsCard');
    resultsCard.style.display = 'block';
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Create or update chart with dual lines showing Series and fixed rate contributions
 */

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
    const scenarioType = document.getElementById('scenarioType').value;

    try {
        // Validate inputs
        validateForm(amount, startDate, endDate);

        // Show loading state
        setLoadingState(true);

        // Determine series code based on scenario
        let seriesCode = CONFIG.SERIES.IPCA;
        let seriesLabel = 'IPCA';
        let useSeriesRate = true;

        if (scenarioType === 'selic_fixed') {
            seriesCode = CONFIG.SERIES.SELIC;
            seriesLabel = 'SELIC';
        } else if (scenarioType === 'fixed_only') {
            // still fetch IPCA to get timeline/dates
            seriesCode = CONFIG.SERIES.IPCA;
            seriesLabel = null; // No series label for fixed only
            useSeriesRate = false;
        }

        // Fetch Data
        const seriesData = await fetchSeriesData(seriesCode, startDate, endDate);

        // Check if we need to project future data
        const lastDataDate = parseAPIDate(seriesData[seriesData.length - 1].data);
        const endDateTime = new Date(endDate + 'T00:00:00'); // Ensure time component doesn't mess up comparison

        let finalSeriesData = seriesData;
        let isProjection = false;
        let averageRate = 0;

        if (endDateTime > lastDataDate) {
            isProjection = true;
            averageRate = calculateAverageRate(seriesData);
            const futureData = generateFutureData(lastDataDate, endDateTime, averageRate);
            finalSeriesData = [...seriesData, ...futureData];
        }

        const totalVariation = calculateCumulativeRate(finalSeriesData);
        const finalValue = calculateCompoundValue(amount, finalSeriesData, fixedRate, useSeriesRate);
        const evolution = calculateInvestmentEvolution(amount, finalSeriesData, fixedRate, useSeriesRate);

        const displayVariation = useSeriesRate ? totalVariation : 0;

        displayResults(amount, finalValue, displayVariation, startDate, endDate, fixedRate, seriesLabel, isProjection, averageRate);
        updateChart(evolution, amount, fixedRate, seriesLabel);

    } catch (error) {
        console.error('Erro no cálculo:', error);
        showError(error.message);
    } finally {
        setLoadingState(false);
    }
}

function calculateAverageRate(seriesData) {
    // Take up to the last 12 months
    const slice = seriesData.slice(-12);
    if (slice.length === 0) return 0;

    const sum = slice.reduce((acc, item) => acc + parseFloat(item.valor), 0);
    return sum / slice.length;
}

function generateFutureData(startDate, endDate, rate) {
    const futureData = [];
    let currentDate = new Date(startDate);

    // Move to next month first
    currentDate.setMonth(currentDate.getMonth() + 1);

    while (currentDate <= endDate) {
        futureData.push({
            data: formatDateForAPI(currentDate.toISOString().split('T')[0]),
            valor: rate.toFixed(4),
            isProjection: true
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return futureData;
}

function calculateInvestmentEvolution(initialValue, seriesData, annualFixedRate, useSeriesRate = true) {
    const evolution = [];
    let currentValueSeries = initialValue;
    let currentValueCombined = initialValue;
    const monthlyFixedRate = annualFixedRate / 12;

    for (const item of seriesData) {
        const monthlySeriesRate = useSeriesRate ? parseFloat(item.valor) : 0;

        currentValueSeries *= (1 + monthlySeriesRate / 100);
        currentValueCombined *= (1 + monthlySeriesRate / 100) * (1 + monthlyFixedRate / 100);

        evolution.push({
            date: parseAPIDate(item.data),
            valueSeries: currentValueSeries,
            valueCombined: currentValueCombined,
            dateString: item.data,
            isProjection: !!item.isProjection,
            monthlyRate: monthlySeriesRate
        });
    }

    return evolution;
}

function updateChart(evolution, initialValue, fixedRate, seriesLabel) {
    const ctx = document.getElementById('investmentChart');

    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = evolution.map(item => item.dateString);
    const valuesSeries = evolution.map(item => item.valueSeries);
    const valuesCombined = evolution.map(item => item.valueCombined);

    // Gradients
    const gradientSeries = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradientSeries.addColorStop(0, 'rgba(67, 233, 123, 0.3)');
    gradientSeries.addColorStop(1, 'rgba(67, 233, 123, 0.05)');

    const gradientCombined = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradientCombined.addColorStop(0, 'rgba(79, 172, 254, 0.5)');
    gradientCombined.addColorStop(1, 'rgba(0, 242, 254, 0.1)');

    const datasets = [];

    // Helper for segment styling
    const segmentStyle = (ctx, colorSolid, colorDashed) => {
        return ctx.p0DataIndex < evolution.findIndex(e => e.isProjection) || evolution.every(e => !e.isProjection)
            ? undefined // default style (solid)
            : [6, 6]; // dashed
    };

    // Series Line (IPCA/SELIC)
    datasets.push({
        label: seriesLabel ? `Somente ${seriesLabel}` : 'Valor Base',
        data: valuesSeries,
        borderColor: '#43e97b',
        backgroundColor: gradientSeries,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        segment: {
            borderDash: (ctx) => evolution[ctx.p0DataIndex]?.isProjection ? [5, 5] : undefined,
            borderColor: (ctx) => evolution[ctx.p0DataIndex]?.isProjection ? '#81e6d9' : '#43e97b'
        },
        pointHoverBackgroundColor: '#43e97b',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2
    });

    // Combined Line
    if (fixedRate > 0 && seriesLabel) {
        datasets.push({
            label: `${seriesLabel} + ${fixedRate.toFixed(2)}% a.a.`,
            data: valuesCombined,
            borderColor: '#4facfe',
            backgroundColor: gradientCombined,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            segment: {
                borderDash: (ctx) => evolution[ctx.p0DataIndex]?.isProjection ? [5, 5] : undefined,
                borderColor: (ctx) => evolution[ctx.p0DataIndex]?.isProjection ? '#90cdf4' : '#4facfe'
            },
            pointHoverBackgroundColor: '#4facfe',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2
        });
    }

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
                mode: 'index',
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#a0aec0',
                        font: {
                            family: "'Inter', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(21, 25, 50, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#a0aec0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        title: (context) => {
                            const index = context[0].dataIndex;
                            const item = evolution[index];
                            let title = `Data: ${item.dateString}`;
                            if (item.isProjection) {
                                title += ' (Projeção)';
                            }
                            return title;
                        },
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        },
                        afterBody: (context) => {
                            const index = context[0].dataIndex;
                            const item = evolution[index];
                            const rateLabel = seriesLabel || 'Taxa';
                            return `\n${rateLabel}: ${item.monthlyRate.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#718096'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#718096',
                        callback: function (value) {
                            return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
