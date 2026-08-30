let globalMarketData = null;
let currentChartInstances = [];

document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Timeframe Selector Logic
    document.getElementById('timeframe-selector').addEventListener('change', (e) => {
        if(globalMarketData) {
            renderData(globalMarketData, e.target.value);
        }
    });

    // Fetch and render data
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch('market_data.json?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Network response was not ok');
        globalMarketData = await response.json();

        // Update last updated text
        document.getElementById('last-updated').textContent = `Last updated: ${globalMarketData.last_updated}`;

        // Initial render with selected timeframe
        const tf = document.getElementById('timeframe-selector').value;
        renderData(globalMarketData, tf);

    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('last-updated').textContent = 'Error loading data';
        document.querySelector('.pulse-dot').style.display = 'none';
        document.getElementById('last-updated').style.color = '#ef4444';
    }
}

function sliceData(item, timeframe) {
    let days = 252; // default 1y
    if (timeframe === '3m') days = 63;
    if (timeframe === '6m') days = 126;
    if (timeframe === '1y') days = 252;
    if (timeframe === '3y') days = 756;
    if (timeframe === '5y') days = 9999; // whole array

    // Create a deep copy to avoid mutating global data
    const slicedItem = JSON.parse(JSON.stringify(item));
    
    const totalLen = slicedItem.history.data.length;
    const sliceLen = Math.min(days, totalLen);
    
    slicedItem.history.labels = slicedItem.history.labels.slice(-sliceLen);
    slicedItem.history.data = slicedItem.history.data.slice(-sliceLen);
    
    // Recalculate stats based on sliced data
    const dataArr = slicedItem.history.data;
    if(dataArr.length > 0) {
        slicedItem.current = dataArr[dataArr.length - 1];
        
        slicedItem.stats.high = Math.max(...dataArr);
        slicedItem.stats.low = Math.min(...dataArr);
        
        const sum = dataArr.reduce((a,b) => a+b, 0);
        slicedItem.stats.mean = sum / dataArr.length;
        
        const sorted = [...dataArr].sort((a,b) => a-b);
        const mid = Math.floor(sorted.length / 2);
        slicedItem.stats.median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        
        // 동적 재정규화 (Dynamic Re-normalization) for Custom Indices
        if (item.name.startsWith('V1') || item.name.startsWith('V2') || item.name.startsWith('V3')) {
            const scale = 100 / slicedItem.stats.mean;
            slicedItem.history.data = dataArr.map(val => val * scale);
            
            // Recalculate stats for the scaled data
            const newDataArr = slicedItem.history.data;
            slicedItem.current = newDataArr[newDataArr.length - 1];
            slicedItem.stats.high = Math.max(...newDataArr);
            slicedItem.stats.low = Math.min(...newDataArr);
            slicedItem.stats.mean = 100; // By definition
            
            const sortedNew = [...newDataArr].sort((a,b) => a-b);
            slicedItem.stats.median = sortedNew.length % 2 !== 0 ? sortedNew[mid] : (sortedNew[mid - 1] + sortedNew[mid]) / 2;
        }
    }
    
    return slicedItem;
}

function renderData(data, timeframe) {
    // Destroy old charts to prevent memory leaks
    currentChartInstances.forEach(chart => chart.destroy());
    currentChartInstances = [];

    // Clear existing grids
    document.getElementById('exchange-rates-grid').innerHTML = '';
    document.getElementById('indices-grid').innerHTML = '';
    document.getElementById('custom-indices-v1-grid').innerHTML = '';
    document.getElementById('custom-indices-v2-grid').innerHTML = '';
    document.getElementById('custom-indices-v3-grid').innerHTML = '';
    
    document.querySelector('.pulse-dot').style.display = 'none';
    document.getElementById('last-updated').style.color = 'var(--text-primary)';

    // Render Exchange Rates
    const exchangeGrid = document.getElementById('exchange-rates-grid');
    if(data.exchange_rates) {
        data.exchange_rates.forEach(item => {
            createCard(sliceData(item, timeframe), exchangeGrid);
        });
    }

    // Render Indices
    const indicesGrid = document.getElementById('indices-grid');
    if(data.indices) {
        data.indices.forEach(item => {
            createCard(sliceData(item, timeframe), indicesGrid);
        });
    }
    
    // Render Custom Indices V1
    if(data.custom_indices_v1) {
        const grid = document.getElementById('custom-indices-v1-grid');
        data.custom_indices_v1.forEach(item => createCard(sliceData(item, timeframe), grid));
    }
    // Render Custom Indices V2
    if(data.custom_indices_v2) {
        const grid = document.getElementById('custom-indices-v2-grid');
        data.custom_indices_v2.forEach(item => createCard(sliceData(item, timeframe), grid));
    }
    // Render Custom Indices V3
    if(data.custom_indices_v3) {
        const grid = document.getElementById('custom-indices-v3-grid');
        data.custom_indices_v3.forEach(item => createCard(sliceData(item, timeframe), grid));
    }
}

function createCard(item, container) {
    const template = document.getElementById('card-template');
    const clone = template.content.cloneNode(true);

    // Populate data
    clone.querySelector('.card-title').textContent = item.name;
    clone.querySelector('.card-symbol').textContent = item.symbol;
    
    // Format appropriately (avoid .00 for large numbers, but keep precision for small)
    const currentVal = item.current < 10 ? item.current.toFixed(4) : item.current.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    clone.querySelector('.card-current').textContent = currentVal;
    
    const changeEl = clone.querySelector('.card-change');
    const changeText = item.change_percent > 0 ? `▲ +${item.change_percent}%` : `▼ ${item.change_percent}%`;
    changeEl.textContent = changeText;
    changeEl.classList.add(item.change_percent > 0 ? 'up' : 'down');

    // Return the actual div.card element (save reference before appending)
    const cardEl = clone.firstElementChild;
    const canvas = cardEl.querySelector('canvas');
    
    // **CRITICAL FIX**: Append to DOM BEFORE creating Chart.js
    container.appendChild(clone);

    const isUp = item.change_percent > 0;

    // Populate stats
    if (item.stats) {
        const p = item.current < 10 ? 4 : 2;
        cardEl.querySelector('.stat-mean').textContent = item.stats.mean.toLocaleString(undefined, {minimumFractionDigits: p, maximumFractionDigits: p});
        cardEl.querySelector('.stat-median').textContent = item.stats.median.toLocaleString(undefined, {minimumFractionDigits: p, maximumFractionDigits: p});
        cardEl.querySelector('.stat-high').textContent = item.stats.high.toLocaleString(undefined, {minimumFractionDigits: p, maximumFractionDigits: p});
        cardEl.querySelector('.stat-low').textContent = item.stats.low.toLocaleString(undefined, {minimumFractionDigits: p, maximumFractionDigits: p});
    }

    // Korean style colors
    const color = isUp ? '#ef4444' : '#3b82f6'; 
    const bgColor = isUp ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)';

    const chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: item.history.labels,
            datasets: [{
                data: item.history.data,
                borderColor: color,
                backgroundColor: bgColor,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#94a3b8',
                    bodyColor: '#f8fafc',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: { display: false },
                y: { 
                    display: false,
                    // Dynamic min/max to make the trend more pronounced
                    min: Math.min(...item.history.data) * 0.98,
                    max: Math.max(...item.history.data) * 1.02
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
    currentChartInstances.push(chart);
}
