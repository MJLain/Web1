const STORAGE_KEY = "lab1";

let selectedX = null;
let selectedR = null;
let results = loadResults();

const form = document.getElementById("point-form");
const yInput = document.getElementById("y-input");
const xButtons = document.querySelectorAll(".x-button");
const rButtons = document.querySelectorAll(".r-button");
const clearButton = document.getElementById("clear-button");
const resultsBody = document.getElementById("results-body");
const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");
const errorMessage = document.getElementById("error-message");

xButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        xButtons.forEach(function (item) {
            item.classList.remove("selected");
        });

        button.classList.add("selected");
        selectedX = Number(button.dataset.value);
    });
});

rButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        rButtons.forEach(function (item) {
            item.classList.remove("selected");
        });

        button.classList.add("selected");
        selectedR = Number(button.dataset.value);
        drawGraph(selectedR, null);
    });
});

form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearError();

    if (selectedX === null) {
        showError("Выберите значение X.");
        return;
    }

    if (selectedR === null || selectedR <= 0) {
        showError("Выберите значение R.");
        return;
    }

    const yText = yInput.value.trim();

    if (yText === "") {
        showError("Введите значение Y.");
        return;
    }

    if (!/^-?\d+([.,]\d+)?$/.test(yText)) {
        showError("Y должен быть числом.");
        return;
    }

    const y = Number(yText.replace(",", "."));

    const normalizedY = yText.replace(",", ".");

    if (!isYInRange(normalizedY)) {
        showError("Y должен находиться в диапазоне от -3 до 3.");
        return;
    }

    const hit = checkPoint(selectedX, normalizedY, selectedR);

    const result = {
        x: selectedX,
        y: normalizedY,
        r: selectedR,
        hit: hit,
        time: new Date().toISOString()
    };

    results.push(result);

    if (!saveResults()) {
        results.pop();
        return;
    }

    showResults();
    drawGraph(selectedR, result);
});

clearButton.addEventListener("click", function () {
    if (confirm("Очистить все результаты?")) {
        try {
            localStorage.removeItem(STORAGE_KEY);
            results = [];
            showResults();
            drawGraph(selectedR === null ? 2 : selectedR, null);
        } catch (error) {
            showError("Не удалось очистить LocalStorage");
        }
    }
});

function isYInRange(yText) {
    const digits = decimalPlaces(yText);

    const y = toScaledInteger(yText, digits);
    const limit = toScaledInteger("3", digits);

    return y >= -limit && y <= limit;
}

function decimalPlaces(value) {
    const parts = value.replace(",", ".").split(".");

    if (parts.length === 1) {
        return 0;
    }

    return parts[1].length;
}

function toScaledInteger(value, digits) {
    let text = value.replace(",", ".");
    let negative = false;

    if (text.startsWith("-")) {
        negative = true;
        text = text.substring(1);
    }

    const parts = text.split(".");
    const integerPart = parts[0];
    let fractionPart = parts.length > 1 ? parts[1] : "";

    while (fractionPart.length < digits) {
        fractionPart += "0";
    }

    let result = BigInt(integerPart + fractionPart);

    if (negative) {
        result = -result;
    }

    return result;
}

function showError(text) {
    errorMessage.textContent = text;
}

function clearError() {
    errorMessage.textContent = "";
}

function checkPoint(xValue, yValue, rValue) {
    const xText = String(xValue);
    const yText = String(yValue);
    const rText = String(rValue);

    const digits = Math.max(
        decimalPlaces(xText),
        decimalPlaces(yText),
        decimalPlaces(rText)
    );

    const x = toScaledInteger(xText, digits);
    const y = toScaledInteger(yText, digits);
    const r = toScaledInteger(rText, digits);

    const circle =
        x <= 0n &&
        y >= 0n &&
        x * x + y * y <= r * r;

    const rectangle =
        2n * x >= -r &&
        x <= 0n &&
        y >= -r &&
        y <= 0n;

    const triangle =
        x >= 0n &&
        y >= 0n &&
        x + 2n * y <= r;

    return circle || rectangle || triangle;
}

function saveResults() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
        return true;
    } catch (error) {
        showError("Не удалось сохранить результаты в LocalStorage.");
        return false;
    }
}

function loadResults() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved === null) {
            return [];
        }

        const data = JSON.parse(saved);

        if (Array.isArray(data)) {
            return data;
        }
    } catch (error) {
        console.log("Ошибка чтения LocalStorage");
    }

    return [];
}

function showResults() {
    resultsBody.innerHTML = "";

    results.forEach(function (result) {
        const row = resultsBody.insertRow(0);

        row.insertCell().textContent = result.x;
        row.insertCell().textContent = result.y;
        row.insertCell().textContent = result.r;
        row.insertCell().textContent = result.hit ? "Да" : "Нет";
        row.insertCell().textContent = new Date(result.time).toLocaleString("ru-RU");
    });
}

function drawGraph(r, point) {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 45;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#3b99fc";

    // Четверть круга
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX - r * scale, centerY);
    ctx.arc(centerX, centerY, r * scale, Math.PI, 1.5 * Math.PI);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(
        centerX - r * scale / 2,
        centerY,
        r * scale / 2,
        r * scale
    );

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY - r * scale / 2);
    ctx.lineTo(centerX + r * scale, centerY);
    ctx.closePath();
    ctx.fill();

    drawAxes(centerX, centerY, r, scale, width, height);

    if (point !== null) {
        const pointX = centerX + Number(point.x) * scale;
        const pointY = centerY - Number(point.y) * scale;

        ctx.beginPath();
        ctx.arc(pointX, pointY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = point.hit ? "green" : "red";
        ctx.fill();
    }
}

function drawAxes(centerX, centerY, r, scale, width, height) {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.lineWidth = 1;
    ctx.font = "14px Arial";

    ctx.beginPath();
    ctx.moveTo(10, centerY);
    ctx.lineTo(width - 10, centerY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - 10, centerY);
    ctx.lineTo(width - 20, centerY - 5);
    ctx.moveTo(width - 10, centerY);
    ctx.lineTo(width - 20, centerY + 5);
    ctx.stroke();
    ctx.fillText("X", width - 15, centerY - 10);

    ctx.beginPath();
    ctx.moveTo(centerX, height - 10);
    ctx.lineTo(centerX, 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX, 10);
    ctx.lineTo(centerX - 5, 20);
    ctx.moveTo(centerX, 10);
    ctx.lineTo(centerX + 5, 20);
    ctx.stroke();
    ctx.fillText("Y", centerX + 7, 15);

    drawXMark(centerX - r * scale, centerY, "-R");
    drawXMark(centerX - r * scale / 2, centerY, "-R/2");
    drawXMark(centerX + r * scale / 2, centerY, "R/2");
    drawXMark(centerX + r * scale, centerY, "R");

    drawYMark(centerX, centerY - r * scale, "R");
    drawYMark(centerX, centerY - r * scale / 2, "R/2");
    drawYMark(centerX, centerY + r * scale / 2, "-R/2");
    drawYMark(centerX, centerY + r * scale, "-R");
}

function drawXMark(x, y, text) {
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y + 4);
    ctx.stroke();
    ctx.fillText(text, x - 12, y - 8);
}

function drawYMark(x, y, text) {
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x + 4, y);
    ctx.stroke();
    ctx.fillText(text, x + 7, y + 5);
}

showResults();

window.addEventListener("focus", showResults);

if (results.length > 0) {
    const lastResult = results[results.length - 1];
    drawGraph(lastResult.r, lastResult);
} else {
    drawGraph(2, null);
}
