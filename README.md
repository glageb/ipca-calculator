# IPCA Investment Calculator

A modern web application that calculates investment returns adjusted by Brazil's IPCA (Índice Nacional de Preços ao Consumidor Amplo) inflation index.

![IPCA Calculator](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 📊 Overview

This application allows users to:
- Enter an initial investment amount in Brazilian Reais (BRL)
- Select a start date and end date for the investment period
- Calculate the inflation-adjusted value based on official IPCA data
- Visualize the investment growth over time with an interactive chart

## 🚀 Features

### Funcionalidades

*   **Simulação de Cenários**:
    *   **IPCA + Taxa Fixa**: Corrige o investimento pela inflação (IPCA) e aplica uma taxa de juros fixa. Ideal para Tesouro IPCA+.
    *   **SELIC + Taxa Fixa**: Utiliza a taxa SELIC acumulada mensalmente mais uma taxa fixa.
    *   **Apenas Taxa Fixa**: Simula um investimento prefixado, sem correção por índice econômico.
*   **Dados Reais**: Consulta automática ao Banco Central para obter as séries históricas:
    *   IPCA (Série 433)
    *   SELIC (Série 4390 - Acumulada no mês)
*   **Cálculo Preciso**: Utiliza juros compostos mês a mês para máxima precisão.
*   **Visualização Gráfica**: Gráfico interativo que compara o crescimento do índice puro vs. o investimento total.
*   **Resultados Detalhados**: Mostra valor final, ganho real, variação total do índice e taxa efetiva aplicada.
- **Real-time IPCA Data**: Fetches official data from Banco Central do Brasil API
- **Accurate Calculations**: Uses compound interest formula for precise inflation adjustment
- **Interactive Visualization**: Beautiful Chart.js line chart showing investment evolution
- **Modern UI**: Premium dark theme with glassmorphism effects and smooth animations
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Form Validation**: Comprehensive input validation with user-friendly error messages
- **No Backend Required**: Pure client-side application

## 🛠️ Technology Stack

- **HTML5**: Semantic structure with SEO optimization
- **CSS3**: Modern design system with custom properties, gradients, and animations
- **JavaScript (ES6+)**: Vanilla JS with async/await for API calls
- **Chart.js**: Interactive data visualization
- **Banco Central do Brasil API**: Official IPCA data source

## 📖 How to Use

1. **Open the Application**
   - Simply open `index.html` in a modern web browser
   - No installation or build process required

2. **Enter Investment Details**
   - Input the initial investment amount in BRL
   - Select the start date (when the investment began)
   - Select the end date (when you want to calculate the value)

3. **Calculate**
   - Click the "Calcular" button
   - The app will fetch IPCA data and display results

4. **View Results**
   - See the inflation-adjusted value
   - View total IPCA variation for the period
   - Explore the interactive chart showing value evolution

## 🔧 Running Locally

### Option 1: Direct File Access
```bash
# Clone or download the repository
cd IPCA

# Open in browser
open index.html  # macOS
# or
start index.html  # Windows
# or
xdg-open index.html  # Linux
```

### Option 2: Local Server (Recommended)
```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js
npx http-server -p 8000

# Then open http://localhost:8000 in your browser
```

## 📊 IPCA Data Source

The application uses the official Banco Central do Brasil API:

- **Endpoint**: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados`
- **Series Code**: 433 (IPCA monthly variation %)
- **Format**: JSON
- **Date Range**: Supports custom date ranges from 1980 to present
- **Authentication**: None required (public API)

## 🧮 Calculation Methodology

The IPCA adjustment uses the compound interest formula:

```
Adjusted Value = Initial Value × (1 + rate₁/100) × (1 + rate₂/100) × ... × (1 + rateₙ/100)
```

Where:
- `Initial Value` is the investment amount
- `rate₁, rate₂, ..., rateₙ` are the monthly IPCA variations for each month in the period

**Total IPCA Variation**:
```
Total Variation = [(1 + rate₁/100) × (1 + rate₂/100) × ... × (1 + rateₙ/100) - 1] × 100
```

## 🎨 Design Features

- **Dark Theme**: Easy on the eyes with vibrant accent colors
- **Glassmorphism**: Modern frosted glass effect on cards
- **Smooth Animations**: Micro-interactions for enhanced user experience
- **Responsive Layout**: Mobile-first design with breakpoints for all devices
- **Custom Typography**: Inter font family for clean, modern look
- **Interactive Charts**: Hover effects and tooltips for data exploration

## 🌐 Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Contact

For questions or support, please open an issue in the repository.

---

**Note**: This application is for educational and informational purposes only. Always consult with a financial advisor for investment decisions.
