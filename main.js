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
     * [수정] 이차함수 표준형 등 복잡한 수식의 괄호 거듭제곱 및 암시적 곱셈 오류 해결
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
        // 괄호가 포함된 밑(base)과 지수(exponent)를 올바르게 파싱하기 위한 커스텀 함수
        const replacePower = (s) => {
            let i = s.indexOf('^');
            while (i !== -1) {
                let baseStart = i - 1;
                let base = "";
                // 밑(base)이 괄호로 묶여 있는 경우
                if (s[baseStart] === ')') {
                    let parenCount = 1;
                    baseStart--;
                    while (baseStart >= 0 && parenCount > 0) {
                        if (s[baseStart] === ')') parenCount++;
                        else if (s[baseStart] === '(') parenCount--;
                        baseStart--;
                    }
                    // 함수 이름(예: sin, abs)이 괄호 앞에 있는 경우 포함
                    while (baseStart >= 0 && /[a-z]/i.test(s[baseStart])) {
                        baseStart--;
                    }
                    baseStart++;
                } else {
                    // 숫자, 변수(x) 등 괄호가 없는 단일 밑
                    while (baseStart >= 0 && /[a-z0-9.]/i.test(s[baseStart])) {
                        baseStart--;
                    }
                    baseStart++;
                }
                base = s.substring(baseStart, i);

                let expEnd = i + 1;
                let exp = "";
                // 지수(exponent)가 괄호로 묶여 있는 경우
                if (s[expEnd] === '(') {
                    let parenCount = 1;
                    expEnd++;
                    while (expEnd < s.length && parenCount > 0) {
                        if (s[expEnd] === '(') parenCount++;
                        else if (s[expEnd] === ')') parenCount--;
                        expEnd++;
                    }
                } else {
                    if (s[expEnd] === '-') expEnd++; // 음수 지수 허용
                    while (expEnd < s.length && /[a-z0-9.]/i.test(s[expEnd])) {
                        expEnd++;
                    }
                }
                exp = s.substring(i + 1, expEnd);

                // Javascript 내장 Math.pow 형태로 치환
                s = s.substring(0, baseStart) + `Math.pow(${base},${exp})` + s.substring(expEnd);
                i = s.indexOf('^');
            }
            return s;
        };

        f = replacePower(f);

        // 3. 생략된 곱셈(*) 삽입 (예: 2(x-3) -> 2*(x-3), 2x -> 2*x)
        // 대소문자 구분을 없애(a-zA-Z) 대문자 'M'을 가진 Math.pow 앞에도 곱셈(*)이 올바르게 삽입되도록 수정
        f = f.replace(/(\d|x|\))(?=[x(|a-zA-Z])/g, '$1*');

        // 4. 수학 함수 접두사 (abs -> Math.abs 등)
        const mathFunctions = ['abs', 'sin', 'cos', 'tan', 'sqrt', 'log', 'exp'];
        mathFunctions.forEach(fn => {
            const reg = new RegExp(`\\b${fn}\\(`, 'g');
            f = f.replace(reg, `Math.${fn}(`);
        });

        // 5. 수학 상수 지원 (pi, e)
        f = f.replace(/\bpi\b/g, 'Math.PI');
        f = f.replace(/\be\b/g, 'Math.E');

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
