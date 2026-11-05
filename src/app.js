import { algorithms, generateData, validateResult } from "./sorting.js";

const elements = {
  size: document.querySelector("#dataSize"), type: document.querySelector("#dataType"), speed: document.querySelector("#speed"),
  speedOutput: document.querySelector("#speedOutput"), generate: document.querySelector("#generateButton"), start: document.querySelector("#startButton"),
  pause: document.querySelector("#pauseButton"), reset: document.querySelector("#resetButton"), grid: document.querySelector("#sortGrid"),
  sample: document.querySelector("#sampleValues"), result: document.querySelector("#resultBody"), status: document.querySelector("#globalStatus"),
  detail: document.querySelector("#globalDetail")
};

let source = [];
let runId = 0;
let paused = false;
let running = false;
const panels = new Map();
const speedLabels = { 1: "0.25×", 2: "0.5×", 3: "1×", 4: "2×", 5: "4×" };
const delays = { 1: 150, 2: 80, 3: 35, 4: 14, 5: 4 };

function createPanels() {
  elements.grid.innerHTML = "";
  panels.clear();
  algorithms.forEach(algorithm => {
    const card = document.createElement("article");
    card.className = "sort-card";
    card.innerHTML = `<div class="card-head"><div><h3>${algorithm.name}</h3><span class="complexity">${algorithm.complexity}</span></div><span class="status-pill">대기</span></div><div class="chart" aria-label="${algorithm.name} 시각화"></div><div class="metrics"><div class="metric"><span>경과 시간</span><strong data-metric="elapsed">0.00 s</strong></div><div class="metric" title="비교·자리 바꿈·값 쓰기·기준 선택을 수행한 전체 단계 수"><span>반복</span><strong data-metric="iterations">0</strong></div><div class="metric" title="두 값의 크기나 순서를 확인한 횟수"><span>비교</span><strong data-metric="comparisons">0</strong></div><div class="metric" title="두 데이터의 위치를 서로 바꾼 횟수"><span>자리 바꿈</span><strong data-metric="swaps">0</strong></div><div class="metric" title="배열의 특정 위치에 값을 써 넣은 횟수"><span>값 쓰기</span><strong data-metric="writes">0</strong></div></div>`;
    elements.grid.append(card);
    panels.set(algorithm.id, { card, chart: card.querySelector(".chart"), status: card.querySelector(".status-pill"), metrics: Object.fromEntries([...card.querySelectorAll("[data-metric]")].map(node => [node.dataset.metric, node])) });
  });
}

function renderBars(panel, values, active = {}, sorted = new Set()) {
  const max = Math.max(...values, 1);
  if (panel.chart.children.length !== values.length) panel.chart.replaceChildren(...values.map(() => Object.assign(document.createElement("div"), { className: "bar" })));
  [...panel.chart.children].forEach((bar, index) => {
    bar.style.height = `${Math.max(4, values[index] / max * 100)}%`;
    bar.className = "bar";
    if (sorted.has(index)) bar.classList.add("sorted");
    if (active.indices?.includes(index)) bar.classList.add(active.type === "compare" ? "compare" : "write");
    if (active.index === index) bar.classList.add(active.type === "select" ? "select" : "write");
    bar.title = String(values[index]);
  });
}

function setPanelStatus(panel, text, className = "") { panel.status.textContent = text; panel.status.className = `status-pill ${className}`.trim(); }

function prepareData() {
  cancelRun();
  source = generateData(Number(elements.size.value), elements.type.value);
  elements.sample.textContent = source.join(" · ");
  panels.forEach(panel => {
    renderBars(panel, source);
    setPanelStatus(panel, "대기");
    panel.metrics.elapsed.textContent = "0.00 s";
    panel.metrics.iterations.textContent = "0";
    panel.metrics.comparisons.textContent = "0";
    panel.metrics.swaps.textContent = "0";
    panel.metrics.writes.textContent = "0";
  });
  elements.result.innerHTML = `<tr><td colspan="8" class="empty-result">정렬을 시작하면 결과가 표시됩니다.</td></tr>`;
  elements.status.textContent = "실행 준비";
  elements.detail.textContent = `${source.length}개의 ${elements.type.options[elements.type.selectedIndex].text} 데이터`;
}

function cancelRun() {
  runId++;
  running = false;
  paused = false;
  elements.start.disabled = false;
  elements.generate.disabled = false;
  elements.pause.disabled = true;
  elements.pause.textContent = "일시정지";
}

function wait(ms, currentRun) {
  return new Promise(resolve => {
    const begin = performance.now();
    function check() {
      if (currentRun !== runId) return resolve(false);
      if (paused) return requestAnimationFrame(check);
      if (performance.now() - begin >= ms) return resolve(true);
      requestAnimationFrame(check);
    }
    check();
  });
}

async function animate(algorithm, packageData, currentRun) {
  const panel = panels.get(algorithm.id);
  const values = [...source];
  const sorted = new Set();
  const visualStart = performance.now();
  setPanelStatus(panel, "실행 중", "running");
  for (const event of packageData.events) {
    if (currentRun !== runId) return null;
    if (event.type === "swap") [values[event.indices[0]], values[event.indices[1]]] = [values[event.indices[1]], values[event.indices[0]]];
    if (event.type === "write") values[event.index] = event.value;
    if (event.type === "sorted") sorted.add(event.index);
    if (event.type !== "complete") renderBars(panel, values, event, sorted);
    panel.metrics.elapsed.textContent = `${((performance.now() - visualStart) / 1000).toFixed(2)} s`;
    if (!["sorted", "complete"].includes(event.type) && !(await wait(delays[elements.speed.value], currentRun))) return null;
  }
  renderBars(panel, packageData.result, {}, new Set(packageData.result.map((_, i) => i)));
  const visualTime = performance.now() - visualStart;
  setPanelStatus(panel, "완료", "complete");
  panel.metrics.elapsed.textContent = `${(visualTime / 1000).toFixed(2)} s`;
  panel.metrics.iterations.textContent = packageData.stats.iterations.toLocaleString();
  panel.metrics.comparisons.textContent = packageData.stats.comparisons.toLocaleString();
  panel.metrics.swaps.textContent = packageData.stats.swaps.toLocaleString();
  panel.metrics.writes.textContent = packageData.stats.writes.toLocaleString();
  return { ...packageData, id: algorithm.id, name: algorithm.name, visualTime, valid: validateResult(source, packageData.result) };
}

async function startRun() {
  if (running) return;
  running = true; paused = false;
  const currentRun = ++runId;
  elements.start.disabled = true; elements.generate.disabled = true; elements.pause.disabled = false;
  elements.result.innerHTML = `<tr><td colspan="8" class="empty-result">모든 알고리즘을 실행하고 있습니다…</td></tr>`;
  elements.status.textContent = `${algorithms.length}개 알고리즘 실행 중`;
  elements.detail.textContent = "먼저 끝난 패널부터 완료 시간과 통계를 표시합니다.";

  await new Promise(requestAnimationFrame);
  const packages = algorithms.map(algorithm => algorithm.sort(source, true));
  const results = (await Promise.all(algorithms.map((algorithm, i) => animate(algorithm, packages[i], currentRun)))).filter(Boolean);
  if (currentRun !== runId) return;
  running = false; elements.start.disabled = false; elements.generate.disabled = false; elements.pause.disabled = true;
  showResults(results);
  elements.status.textContent = results.every(result => result.valid) ? "전체 정렬 완료" : "일부 검증 실패";
  elements.detail.textContent = `${results.length}개 알고리즘의 정렬과 결과 검증을 마쳤습니다.`;
}

function showResults(results) {
  const ranked = [...results].sort((a, b) => a.visualTime - b.visualTime);
  elements.result.innerHTML = ranked.map((result, index) => `<tr><td class="rank">${index + 1}</td><td><strong>${result.name}</strong></td><td>${(result.visualTime / 1000).toFixed(2)} s</td><td>${result.stats.iterations.toLocaleString()}</td><td>${result.stats.comparisons.toLocaleString()}</td><td>${result.stats.swaps.toLocaleString()}</td><td>${result.stats.writes.toLocaleString()}</td><td class="${result.valid ? "pass" : ""}">${result.valid ? "통과" : "실패"}</td></tr>`).join("");
}

elements.generate.addEventListener("click", prepareData);
elements.reset.addEventListener("click", prepareData);
elements.start.addEventListener("click", startRun);
elements.pause.addEventListener("click", () => { paused = !paused; elements.pause.textContent = paused ? "계속하기" : "일시정지"; elements.status.textContent = paused ? "일시정지" : `${algorithms.length}개 알고리즘 실행 중`; });
elements.speed.addEventListener("input", () => { elements.speedOutput.textContent = speedLabels[elements.speed.value]; });
elements.size.addEventListener("change", prepareData);
elements.type.addEventListener("change", prepareData);

createPanels();
prepareData();

