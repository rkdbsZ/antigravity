/**
 * 거듭제곱 오류가 수정된 정밀 좌표계 시스템 (main.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    const formulaInput = document.getElementById('formula-input');
    const equationDisplay = document.getElementById('equation-display');
    const functionLine = document.getElementById('function-line');
    const labelsGroup = document.getElementById('labels');
    const gridGroup = document.getElementById('grid-lines');
    
    const rangeMin = document.getElementById('range-min');
    const rangeMax = document.getElementById('range-max');
    const symButtons = document.querySelectorAll('.sym-btn');
    const clearBtn = document.getElementById('clear-btn');
    const resetRangeBtn = document.getElementById('reset-range-btn');

    const size = 400;
    const center = size / 2;
    const scale = 20;

    const drawGrid = () => {
        gridGroup.innerHTML = '';
        for (let i = -10; i <= 10; i++) {
            const pos = center + (i * scale);
            const isMainGrid = i % 5 === 0;
            const gridColor = isMainGrid ? "rgba(30, 41, 59, 0.4)" : "rgba(71, 85, 105, 0.2)";
            const vLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            vLine.setAttribute("x1", pos); vLine.setAttribute("y1", 0);
            vLine.setAttribute("x2", pos); vLine.setAttribute("y2", size);
            vLine.setAttribute("stroke", gridColor); vLine.setAttribute("stroke-width", isMainGrid ? "1.8" : "1");
            gridGroup.appendChild(vLine);
            const hLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            hLine.setAttribute("x1", 0); hLine.setAttribute("y1", pos);
            hLine.setAttribute("x2", size); hLine.setAttribute("y2", pos);
            hLine.setAttribute("stroke", gridColor); hLine.setAttribute("stroke-width", isMainGrid ? "1.8" : "1");
            gridGroup.appendChild(hLine);
        }
    };

    const createLabels = () => {
        labelsGroup.innerHTML = ''; 
        for (let i = -10; i <= 10; i++) {
            if (i === 0) continue; 
            const pos = center + (i * scale);
            const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            xLabel.setAttribute("x", pos); xLabel.setAttribute("y", center + 24);
            xLabel.setAttribute("text-anchor", "middle"); xLabel.textContent = i;
            labelsGroup.appendChild(xLabel);
            const yPos = center - (i * scale);
            const yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            yLabel.setAttribute("x", center - 14); yLabel.setAttribute("y", yPos + 5);
            yLabel.setAttribute("text-anchor", "end"); yLabel.textContent = i;
            labelsGroup.appendChild(yLabel);
        }
        const originLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        originLabel.setAttribute("x", center - 12); originLabel.setAttribute("y", center + 24);
        originLabel.textContent = "0";
        labelsGroup.appendChild(originLabel);
    };

    /**
     * [수정] 거듭제곱을 Math.pow()로 변환하여 음수 부호 오류 해결
     */
    const parseFormula = (str) => {
        let f = str.toLowerCase().replace(/\s+/g, '');

        // 1. 절대값 변환 (|x| -> abs(x))
        let prev;
        do {
            prev = f;
            f = f.replace(/\|([^|]+)\|/g, 'abs($1)');
        } while (f !== prev);

        // 2. 거듭제곱 변환 (x^n -> Math.pow(x, n))
        // [수정] ** 기호 대신 Math.pow 함수를 사용하여 음수 계수(-x^2) 충돌 방지
        f = f.replace(/([x\d\)]+)\^(\d+)/g, 'Math.pow($1,$2)');

        // 3. 생략된 곱셈(*) 삽입
        f = f.replace(/(\d|x|\))(?=[x(|a-z])/g, '$1*');

        // 4. 수학 함수 접두사 (abs -> Math.abs 등)
        // 이미 Math.pow로 바뀐 것은 제외하고 처리
        const mathFunctions = ['abs', 'sin', 'cos', 'tan', 'sqrt', 'log', 'exp'];
        mathFunctions.forEach(fn => {
            const reg = new RegExp(`\\b${fn}\\(`, 'g');
            f = f.replace(reg, `Math.${fn}(`);
        });

        return f;
    };

    const drawGraph = () => {
        const rawFormula = formulaInput.value;
        if (!rawFormula.trim()) {
            functionLine.setAttribute('d', '');
            formulaInput.style.borderColor = "#f1f5f9";
            equationDisplay.textContent = "f(x) = ";
            equationDisplay.style.color = "var(--accent-color)";
            return;
        }

        const jsFormula = parseFormula(rawFormula);
        const minX = rangeMin.value === "" ? -10 : parseFloat(rangeMin.value);
        const maxX = rangeMax.value === "" ? 10 : parseFloat(rangeMax.value);

        equationDisplay.textContent = `f(x) = ${rawFormula}`;
        equationDisplay.style.color = "var(--accent-color)";

        try {
            const computeY = new Function('x', `return ${jsFormula};`);
            let pathData = "";
            const step = 0.05;
            let isFirstPoint = true;

            for (let x = minX; x <= maxX + 0.01; x += step) {
                const currentX = Math.round(x * 100) / 100;
                if (currentX > maxX) break;
                
                const y = computeY(currentX);
                
                if (isNaN(y) || !isFinite(y)) {
                    isFirstPoint = true;
                    continue;
                }

                const svgX = center + (currentX * scale);
                const svgY = center - (y * scale);

                if (isFirstPoint) {
                    pathData += `M ${svgX} ${svgY}`;
                    isFirstPoint = false;
                } else {
                    pathData += ` L ${svgX} ${svgY}`;
                }
            }
            functionLine.setAttribute('d', pathData);
            formulaInput.style.borderColor = "#f1f5f9";
        } catch (e) {
            console.error("그래프 렌더링 오류:", e);
            formulaInput.style.borderColor = "#f87171";
            functionLine.setAttribute('d', '');
            equationDisplay.textContent = "⚠️ 수식에 오류가 있습니다";
            equationDisplay.style.color = "#f87171";
        }
    };

    [rangeMin, rangeMax].forEach(el => el.addEventListener('input', drawGraph));
    formulaInput.addEventListener('input', drawGraph);

    symButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const symbol = btn.getAttribute('data-symbol');
            const start = formulaInput.selectionStart;
            const end = formulaInput.selectionEnd;
            const text = formulaInput.value;
            
            let insertion = "";
            let offset = 0;
            if (symbol === "^2") { insertion = "^2"; offset = 2; }
            else if (symbol === "||") { insertion = "||"; offset = 1; }

            formulaInput.value = text.substring(0, start) + insertion + text.substring(end);
            formulaInput.setSelectionRange(start + offset, start + offset);
            formulaInput.focus();
            drawGraph();
        });
    });

    clearBtn.addEventListener('click', () => {
        formulaInput.value = "";
        rangeMin.value = ""; rangeMax.value = "";
        drawGraph();
    });

    resetRangeBtn.addEventListener('click', () => {
        rangeMin.value = ""; rangeMax.value = "";
        drawGraph();
    });

    drawGrid();
    createLabels();
    drawGraph();
});
