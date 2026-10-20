```javascript
const evaluations = [];

const examples = {
    "capital of australia": {
        answer: "Canberra is the capital of Australia.",
        supported: "Canberra is the capital of Australia. The demonstration reference states that Canberra is Australia's national capital.",
        without: 82,
        with: 98
    },
    "capital of france": {
        answer: "Paris is the capital of France.",
        supported: "Paris is the capital of France. This response is consistent with the demonstration reference information.",
        without: 90,
        with: 99
    },
    "water boil": {
        answer: "Water boils at approximately 100°C at standard atmospheric pressure.",
        supported: "At standard atmospheric pressure, water boils at approximately 100°C. The demonstration reference supports this value.",
        without: 85,
        with: 98
    }
};

let chart = null;

function scrollToExperiment() {
    document.getElementById("experiment").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    setTimeout(() => document.getElementById("question").focus(), 400);
}

function getSample(question, dataset) {
    const normalized = question.toLowerCase();

    const match = Object.entries(examples).find(([key]) =>
        normalized.includes(key)
    );

    if (match) {
        const item = match[1];

        return {
            answer: item.answer,
            supported: item.supported,
            without: item.without,
            with: item.with
        };
    }

    const samples = {
        "General Knowledge": [65, 85],
        "Science": [72, 88],
        "Technology": [68, 86],
        "History": [63, 84]
    };

    const scores = samples[dataset] || samples["General Knowledge"];

    return {
        answer:
            "Illustrative model response for: " + question +
            "\n\nA real language model is not connected. This text is a placeholder for demonstrating the evaluation interface.",

        supported:
            "Illustrative retrieval-supported response for: " + question +
            "\n\nIn a real system, this answer would be generated using relevant retrieved documents. No documents were retrieved in this demo.",

        without: scores[0],
        with: scores[1]
    };
}

function evaluateQuestion() {
    const question = document.getElementById("question").value.trim();
    const button = document.getElementById("evaluateButton");
    const message = document.getElementById("message");

    if (!question) {
        message.textContent = "Please enter a research question first.";
        document.getElementById("question").focus();
        return;
    }

    if (question.length > 2000) {
        message.textContent = "Please keep your question under 2,000 characters.";
        return;
    }

    button.disabled = true;
    button.textContent = "Evaluating...";
    message.textContent = "Preparing illustrative results...";

    setTimeout(() => {
        const dataset = document.getElementById("dataset").value;
        const model = document.getElementById("model").value;
        const metric = document.getElementById("metric").value;
        const result = getSample(question, dataset);

        const item = {
            question,
            model,
            dataset,
            metric,
            without: result.without,
            with: result.with,
            difference: result.with - result.without,
            answer: result.answer,
            supported: result.supported,
            time: new Date().toLocaleTimeString()
        };

        evaluations.unshift(item);

        renderResult(item);
        renderHistory();
        renderMetrics();
        updateChart();

        message.textContent =
            "Demo finished. The responses and scores are simulated, not verified AI outputs.";

        button.disabled = false;
        button.innerHTML = 'Run evaluation <span>→</span>';
    }, 350);
}

function renderResult(item) {
    document.getElementById("withoutAnswer").textContent = item.answer;
    document.getElementById("withAnswer").textContent = item.supported;

    document.getElementById("withoutAccuracy").textContent = item.without + "%";
    document.getElementById("withAccuracy").textContent = item.with + "%";

    document.getElementById("withoutBar").style.width = item.without + "%";
    document.getElementById("withBar").style.width = item.with + "%";
}

function renderMetrics() {
    document.getElementById("totalEvaluations").textContent = evaluations.length;

    const averageWithout = average(evaluations.map(item => item.without));
    const averageWith = average(evaluations.map(item => item.with));

    document.getElementById("withoutScore").textContent =
        averageWithout + "%";

    document.getElementById("withScore").textContent =
        averageWith + "%";

    const difference = averageWith - averageWithout;

    document.getElementById("improvement").textContent =
        (difference > 0 ? "+" : "") + difference + " pts";
}

function average(values) {
    if (!values.length) return 0;

    return Math.round(
        values.reduce((total, value) => total + value, 0) / values.length
    );
}

function renderHistory() {
    const body = document.getElementById("historyBody");

    document.getElementById("historyCount").textContent =
        evaluations.length + (evaluations.length === 1 ? " record" : " records");

    if (!evaluations.length) {
        body.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    No evaluations yet. Run your first experiment above.
                </td>
            </tr>
        `;
        return;
    }

    body.innerHTML = evaluations.map(item => `
        <tr>
            <td>${escapeHTML(shorten(item.question, 75))}</td>
            <td>${escapeHTML(item.model)}</td>
            <td>${item.without}%</td>
            <td>${item.with}%</td>
            <td>${item.difference > 0 ? "+" : ""}${item.difference} pts</td>
        </tr>
    `).join("");
}

function updateChart() {
    const canvas = document.getElementById("accuracyChart");
    if (!canvas || typeof Chart === "undefined") return;

    const recent = evaluations.slice(0, 8).reverse();

    const labels = recent.map((item, index) =>
        "Test " + (index + 1)
    );

    const withoutScores = recent.map(item => item.without);
    const withScores = recent.map(item => item.with);

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = withoutScores;
        chart.data.datasets[1].data = withScores;
        chart.update();
        return;
    }

    chart = new Chart(canvas, {
        type: "bar",

        data: {
            labels,

            datasets: [
                {
                    label: "Without Retrieval",
                    data: withoutScores,
                    backgroundColor: "#a78bfa",
                    borderRadius: 5,
                    maxBarThickness: 24
                },
                {
                    label: "With Retrieval",
                    data: withScores,
                    backgroundColor: "#67d9f5",
                    borderRadius: 5,
                    maxBarThickness: 24
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: getComputedStyle(document.body)
                            .getPropertyValue("--muted").trim(),
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 7,
                        padding: 18,
                        font: { size: 10 }
                    }
                },

                tooltip: {
                    callbacks: {
                        label: context =>
                            context.dataset.label + ": " + context.raw + "%"
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: getComputedStyle(document.body)
                            .getPropertyValue("--muted").trim(),
                        font: { size: 10 }
                    },
                    grid: { display: false }
                },

                y: {
                    min: 0,
                    max: 100,

                    ticks: {
                        stepSize: 20,
                        color: getComputedStyle(document.body)
                            .getPropertyValue("--muted").trim(),
                        callback: value => value + "%"
                    },

                    grid: {
                        color: "#64748b20"
                    }
                }
            }
        }
    });
}

function clearHistory() {
    if (!evaluations.length) return;

    const confirmed = window.confirm(
        "Clear all evaluation records from this session?"
    );

    if (!confirmed) return;

    evaluations.length = 0;

    document.getElementById("withoutAnswer").innerHTML =
        '<div class="empty-response"><span>◈</span><p>Waiting for an evaluation</p><small>Your sample response will appear here.</small></div>';

    document.getElementById("withAnswer").innerHTML =
        '<div class="empty-response"><span>⌘</span><p>Waiting for an evaluation</p><small>Your sample response will appear here.</small></div>';

    document.getElementById("withoutAccuracy").textContent = "--";
    document.getElementById("withAccuracy").textContent = "--";
    document.getElementById("withoutBar").style.width = "0";
    document.getElementById("withBar").style.width = "0";

    document.getElementById("totalEvaluations").textContent = "0";
    document.getElementById("withoutScore").textContent = "--";
    document.getElementById("withScore").textContent = "--";
    document.getElementById("improvement").textContent = "--";

    document.getElementById("message").textContent =
        "Session history cleared.";

    renderHistory();
    updateChart();
}

function exportHistory() {
    if (!evaluations.length) {
        document.getElementById("message").textContent =
            "Run an evaluation before exporting history.";
        return;
    }

    const headers = [
        "Question",
        "Model",
        "Dataset",
        "Metric",
        "Without Retrieval (%)",
        "With Retrieval (%)",
        "Difference (percentage points)",
        "Time"
    ];

    const rows = evaluations.map(item => [
        item.question,
        item.model,
        item.dataset,
        item.metric,
        item.without,
        item.with,
        item.difference,
        item.time
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(csvCell).join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "hallucination-evaluation-demo.csv";
    link.click();

    URL.revokeObjectURL(url);
}

function csvCell(value) {
    let safeValue = String(value ?? "");

    // Prevent spreadsheet formula execution in exported text fields.
    if (/^[\s]*[=+\-@]/.test(safeValue)) {
        safeValue = "'" + safeValue;
    }

    return '"' + safeValue.replace(/"/g, '""') + '"';
}

function shorten(value, limit) {
    return value.length > limit
        ? value.slice(0, limit) + "..."
        : value;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("light-theme");

    const button = document.getElementById("themeToggle");

    button.textContent = document.body.classList.contains("light-theme")
        ? "☾"
        : "☼";

    if (chart) {
        chart.destroy();
        chart = null;
        updateChart();
    }
});

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link").forEach(item =>
            item.classList.remove("active")
        );

        link.classList.add("active");
    });
});

renderHistory();
updateChart();
```
