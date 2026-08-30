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



    // Fetch and render data
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch('market_data.json?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Update last updated text
        document.getElementById('last-updated').textContent = `Last updated: ${data.last_updated}`;

        // Render Exchange Rates
        const exchangeGrid = document.getElementById('exchange-rates-grid');
        data.exchange_rates.forEach(item => {
            createCard(item, exchangeGrid);
        });

        // Render Indices
        const indicesGrid = document.getElementById('indices-grid');
        data.indices.forEach(item => {
            createCard(item, indicesGrid);
        });
        
        // Render Custom Indices V1
        if(data.custom_indices_v1) {
            const grid = document.getElementById('custom-indices-v1-grid');
            data.custom_indices_v1.forEach(item => createCard(item, grid));
        }
        // Render Custom Indices V2
        if(data.custom_indices_v2) {
            const grid = document.getElementById('custom-indices-v2-grid');
            data.custom_indices_v2.forEach(item => createCard(item, grid));
        }
        // Render Custom Indices V3
        if(data.custom_indices_v3) {
            const grid = document.getElementById('custom-indices-v3-grid');
            data.custom_indices_v3.forEach(item => createCard(item, grid));
        }

    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('last-updated').textContent = `Error: ${error.message}`;
        document.getElementById('last-updated').style.color = 'var(--positive)';
        document.querySelector('.pulse-dot').style.display = 'none';
    }
}

function createCard(item, container) {
    const template = document.getElementById('card-template');
    const clone = template.content.cloneNode(true);

    // Populate data
    clone.querySelector('.card-title').textContent = item.name;
    clone.querySelector('.card-symbol').textContent = item.symbol;
    clone.querySelector('.card-current').textContent = item.current.toLocaleString();
    
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
        cardEl.querySelector('.stat-mean').textContent = item.stats.mean.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        cardEl.querySelector('.stat-median').textContent = item.stats.median.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        cardEl.querySelector('.stat-high').textContent = item.stats.high.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        cardEl.querySelector('.stat-low').textContent = item.stats.low.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    // Korean style colors
    const color = isUp ? '#ef4444' : '#3b82f6'; 
    const bgColor = isUp ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)';

    new Chart(canvas, {
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
}
