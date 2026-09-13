// js/dashboard/charts.js — High Performance Canvas & SVG Analytics Renderer

export class DashboardCharts {
    /**
     * Render a smooth 60fps Canvas Multi-Axis Run-Rate Chart (Sales vs Expenses)
     */
    static renderRunRateChart(canvasId, data = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        ctx.clearRect(0, 0, width, height);

        // Dummy/Real time series data points
        const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
        const sales = data.salesPoints || [180000, 240000, 310000, 290000, 420000, data.sales || 480000];
        const expenses = data.expensePoints || [120000, 160000, 210000, 195000, 280000, data.expenses || 310000];

        const padding = { top: 30, right: 20, bottom: 30, left: 50 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const maxVal = Math.max(...sales, ...expenses, 500000) * 1.15;

        // Draw gridlines
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
        ctx.lineWidth = 1;
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'right';

        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const y = padding.top + chartH - (i / gridSteps) * chartH;
            const val = Math.round((maxVal / gridSteps) * i);
            
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            ctx.fillText(`₹${(val / 1000).toFixed(0)}k`, padding.left - 8, y + 4);
        }

        // Draw X-axis labels
        ctx.textAlign = 'center';
        const stepX = chartW / (months.length - 1);
        months.forEach((m, i) => {
            const x = padding.left + i * stepX;
            ctx.fillText(m, x, height - 8);
        });

        // Function to draw smooth line curve
        function drawCurve(points, strokeColor, fillColor) {
            ctx.beginPath();
            points.forEach((pt, i) => {
                const x = padding.left + i * stepX;
                const y = padding.top + chartH - (pt / maxVal) * chartH;
                if (i === 0) ctx.moveTo(x, y);
                else {
                    const prevX = padding.left + (i - 1) * stepX;
                    const prevY = padding.top + chartH - (points[i - 1] / maxVal) * chartH;
                    const cpX1 = prevX + (x - prevX) / 2;
                    const cpX2 = prevX + (x - prevX) / 2;
                    ctx.bezierCurveTo(cpX1, prevY, cpX2, y, x, y);
                }
            });

            // Gradient fill
            const lastX = padding.left + (points.length - 1) * stepX;
            const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
            gradient.addColorStop(0, fillColor);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.lineTo(lastX, height - padding.bottom);
            ctx.lineTo(padding.left, height - padding.bottom);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            // Stroke line
            ctx.beginPath();
            points.forEach((pt, i) => {
                const x = padding.left + i * stepX;
                const y = padding.top + chartH - (pt / maxVal) * chartH;
                if (i === 0) ctx.moveTo(x, y);
                else {
                    const prevX = padding.left + (i - 1) * stepX;
                    const prevY = padding.top + chartH - (points[i - 1] / maxVal) * chartH;
                    const cpX1 = prevX + (x - prevX) / 2;
                    const cpX2 = prevX + (x - prevX) / 2;
                    ctx.bezierCurveTo(cpX1, prevY, cpX2, y, x, y);
                }
            });
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw data points
            points.forEach((pt, i) => {
                const x = padding.left + i * stepX;
                const y = padding.top + chartH - (pt / maxVal) * chartH;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }

        // Draw Expense curve first, then Sales curve
        drawCurve(expenses, '#FF3B30', 'rgba(255, 59, 48, 0.15)');
        drawCurve(sales, '#00B386', 'rgba(0, 179, 134, 0.20)');
    }

    /**
     * Render 7-Day Floor Capacity Heatmap Grid
     */
    static renderCapacityHeatmap(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const shifts = ['Shift A (Morning)', 'Shift B (Evening)', 'Shift C (Night)'];
        
        // Heatmap utilization values %
        const matrix = [
            [85, 92, 78, 95, 88, 60, 40],
            [90, 88, 84, 91, 93, 75, 30],
            [65, 70, 72, 80, 85, 50, 20]
        ];

        function getColor(val) {
            if (val >= 90) return 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/40'; // Heavy bottleneck risk
            if (val >= 75) return 'bg-[#00B386]/20 text-[#00B386] border-[#00B386]/40'; // Optimal utilization
            if (val >= 50) return 'bg-[#FF9F0A]/20 text-[#FF9F0A] border-[#FF9F0A]/40'; // Moderate load
            return 'bg-surface-variant text-secondary border-outline-variant/30';     // Low load
        }

        let html = `<div class="grid grid-cols-8 gap-2 text-center text-[12px] font-semibold">`;
        html += `<div class="text-left text-secondary text-[11px] self-center">Shift</div>`;
        days.forEach(d => html += `<div class="text-secondary text-[11px]">${d}</div>`);

        shifts.forEach((shift, r) => {
            html += `<div class="text-left text-[11px] font-medium text-on-surface truncate self-center">${shift}</div>`;
            days.forEach((_, c) => {
                const val = matrix[r][c];
                const colorClass = getColor(val);
                html += `
                <div class="h-9 rounded-xl border flex items-center justify-center font-mono text-[12px] font-bold ${colorClass} transition-all hover:scale-105" title="${shift} - ${val}% Load">
                    ${val}%
                </div>`;
            });
        });

        html += `</div>`;
        container.innerHTML = html;
    }
}
