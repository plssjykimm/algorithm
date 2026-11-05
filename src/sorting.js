const definitions = [
  { id: "bubble", name: "버블 정렬", complexity: "평균 O(n²)", sort: bubbleSort },
  { id: "selection", name: "선택 정렬", complexity: "평균 O(n²)", sort: selectionSort },
  { id: "insertion", name: "삽입 정렬", complexity: "평균 O(n²)", sort: insertionSort },
  { id: "merge", name: "병합 정렬", complexity: "O(n log n)", sort: mergeSort },
  { id: "quick", name: "퀵 정렬", complexity: "평균 O(n log n)", sort: quickSort },
  { id: "heap", name: "힙 정렬", complexity: "O(n log n)", sort: heapSort },
  { id: "shell", name: "셸 정렬", complexity: "간격에 따라 다름", sort: shellSort },
  { id: "comb", name: "빗질 정렬", complexity: "최악 O(n²)", sort: combSort },
  { id: "cocktail", name: "칵테일 정렬", complexity: "평균 O(n²)", sort: cocktailSort },
  { id: "counting", name: "계수 정렬", complexity: "O(n + k)", sort: countingSort },
  { id: "radix", name: "기수 정렬", complexity: "O(d(n + b))", sort: radixSort }
];

function context(input, captureEvents) {
  const values = [...input];
  const events = [];
  const stats = { iterations: 0, comparisons: 0, swaps: 0, writes: 0 };
  const emit = (type, payload = {}) => {
    if (["compare", "swap", "write", "select"].includes(type)) stats.iterations++;
    if (captureEvents) events.push({ type, ...payload });
  };
  const compare = (i, j) => { stats.comparisons++; emit("compare", { indices: [i, j] }); };
  const swap = (i, j) => {
    [values[i], values[j]] = [values[j], values[i]];
    stats.swaps++;
    stats.writes += 2;
    emit("swap", { indices: [i, j] });
  };
  const write = (i, value) => { values[i] = value; stats.writes++; emit("write", { index: i, value }); };
  return { values, events, stats, emit, compare, swap, write };
}

function finish(ctx) {
  ctx.emit("complete");
  return { result: ctx.values, events: ctx.events, stats: ctx.stats };
}

function bubbleSort(input, captureEvents = true) {
  const c = context(input, captureEvents);
  for (let end = c.values.length - 1; end > 0; end--) {
    let changed = false;
    for (let i = 0; i < end; i++) {
      c.compare(i, i + 1);
      if (c.values[i] > c.values[i + 1]) { c.swap(i, i + 1); changed = true; }
    }
    c.emit("sorted", { index: end });
    if (!changed) break;
  }
  if (c.values.length) c.emit("sorted", { index: 0 });
  return finish(c);
}

function selectionSort(input, captureEvents = true) {
  const c = context(input, captureEvents);
  for (let i = 0; i < c.values.length; i++) {
    let min = i;
    c.emit("select", { index: min });
    for (let j = i + 1; j < c.values.length; j++) { c.compare(min, j); if (c.values[j] < c.values[min]) min = j; }
    if (min !== i) c.swap(i, min);
    c.emit("sorted", { index: i });
  }
  return finish(c);
}

function insertionSort(input, captureEvents = true) {
  const c = context(input, captureEvents);
  for (let i = 1; i < c.values.length; i++) {
    const key = c.values[i];
    let j = i - 1;
    c.emit("select", { index: i });
    while (j >= 0) {
      c.compare(j, j + 1);
      if (c.values[j] <= key) break;
      c.write(j + 1, c.values[j]);
      j--;
    }
    c.write(j + 1, key);
  }
  for (let i = 0; i < c.values.length; i++) c.emit("sorted", { index: i });
  return finish(c);
}

function mergeSort(input, captureEvents = true) {
  const c = context(input, captureEvents);
  function split(left, right) {
    if (right - left <= 1) return;
    const middle = Math.floor((left + right) / 2);
    split(left, middle); split(middle, right);
    const merged = [];
    let i = left, j = middle;
    while (i < middle && j < right) { c.compare(i, j); merged.push(c.values[i] <= c.values[j] ? c.values[i++] : c.values[j++]); }
    while (i < middle) merged.push(c.values[i++]);
    while (j < right) merged.push(c.values[j++]);
    merged.forEach((value, offset) => c.write(left + offset, value));
  }
  split(0, c.values.length);
  for (let i = 0; i < c.values.length; i++) c.emit("sorted", { index: i });
  return finish(c);
}

function quickSort(input, captureEvents = true) {
  const c = context(input, captureEvents);
  function partition(low, high) {
    const pivot = c.values[high];
    c.emit("select", { index: high });
    let i = low;
    for (let j = low; j < high; j++) {
      c.compare(j, high);
      if (c.values[j] <= pivot) { if (i !== j) c.swap(i, j); i++; }
    }
    if (i !== high) c.swap(i, high);
    c.emit("sorted", { index: i });
    return i;
  }
  function sort(low, high) {
    if (low > high) return;
    if (low === high) { c.emit("sorted", { index: low }); return; }
    const pivot = partition(low, high);
    sort(low, pivot - 1); sort(pivot + 1, high);
  }
  sort(0, c.values.length - 1);
  return finish(c);
}

function heapSort(input, captureEvents = true) {
  const c = context(input, captureEvents);
  function heapify(size, root) {
    let largest = root;
    const left = root * 2 + 1, right = left + 1;
    if (left < size) { c.compare(left, largest); if (c.values[left] > c.values[largest]) largest = left; }
    if (right < size) { c.compare(right, largest); if (c.values[right] > c.values[largest]) largest = right; }
    if (largest !== root) { c.swap(root, largest); heapify(size, largest); }
  }
  for (let i = Math.floor(c.values.length / 2) - 1; i >= 0; i--) heapify(c.values.length, i);
  for (let end = c.values.length - 1; end > 0; end--) { c.swap(0, end); c.emit("sorted", { index: end }); heapify(end, 0); }
  if (c.values.length) c.emit("sorted", { index: 0 });
  return finish(c);
}

function shellSort(input, captureEvents = true) {
  const c = context(input, captureEvents);
  for (let gap = Math.floor(c.values.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < c.values.length; i++) {
      const value = c.values[i];
      let j = i;
      c.emit("select", { index: i });
      while (j >= gap) {
        c.compare(j - gap, j);
        if (c.values[j - gap] <= value) break;
        c.write(j, c.values[j - gap]);
        j -= gap;
      }
      c.write(j, value);
    }
  }
  for (let i = 0; i < c.values.length; i++) c.emit("sorted", { index: i });
  return finish(c);
}

function combSort(input, captureEvents = true) {
  const c = context(input, captureEvents);
  let gap = c.values.length;
  let swapped = true;
  while (gap > 1 || swapped) {
    gap = Math.max(1, Math.floor(gap / 1.3));
    swapped = false;
    for (let i = 0; i + gap < c.values.length; i++) {
      c.compare(i, i + gap);
      if (c.values[i] > c.values[i + gap]) { c.swap(i, i + gap); swapped = true; }
    }
  }
  for (let i = 0; i < c.values.length; i++) c.emit("sorted", { index: i });
  return finish(c);
}

function cocktailSort(input, captureEvents = true) {
  const c = context(input, captureEvents);
  let start = 0, end = c.values.length - 1, swapped = true;
  while (swapped && start < end) {
    swapped = false;
    for (let i = start; i < end; i++) {
      c.compare(i, i + 1);
      if (c.values[i] > c.values[i + 1]) { c.swap(i, i + 1); swapped = true; }
    }
    c.emit("sorted", { index: end-- });
    if (!swapped) break;
    swapped = false;
    for (let i = end; i > start; i--) {
      c.compare(i - 1, i);
      if (c.values[i - 1] > c.values[i]) { c.swap(i - 1, i); swapped = true; }
    }
    c.emit("sorted", { index: start++ });
  }
  for (let i = start; i <= end; i++) c.emit("sorted", { index: i });
  return finish(c);
}

function countingSort(input, captureEvents = true) {
  const c = context(input, captureEvents);
  if (!c.values.length) return finish(c);
  let min = c.values[0], max = c.values[0];
  for (let i = 1; i < c.values.length; i++) {
    c.compare(i, 0);
    if (c.values[i] < min) min = c.values[i];
    if (c.values[i] > max) max = c.values[i];
  }
  const counts = Array(max - min + 1).fill(0);
  for (const value of c.values) counts[value - min]++;
  let index = 0;
  counts.forEach((count, offset) => {
    for (let n = 0; n < count; n++) { c.write(index, offset + min); c.emit("sorted", { index: index++ }); }
  });
  return finish(c);
}

function radixSort(input, captureEvents = true) {
  const c = context(input, captureEvents);
  if (!c.values.length) return finish(c);
  let min = c.values[0], max = c.values[0];
  for (let i = 1; i < c.values.length; i++) {
    c.compare(i, 0);
    if (c.values[i] < min) min = c.values[i];
    if (c.values[i] > max) max = c.values[i];
  }
  const offset = min < 0 ? -min : 0;
  const shiftedMax = max + offset;
  for (let exponent = 1; Math.floor(shiftedMax / exponent) > 0; exponent *= 10) {
    const buckets = Array.from({ length: 10 }, () => []);
    c.values.forEach((value, index) => {
      const digit = Math.floor((value + offset) / exponent) % 10;
      buckets[digit].push(value);
      c.emit("select", { index });
    });
    let index = 0;
    buckets.forEach(bucket => bucket.forEach(value => c.write(index++, value)));
  }
  for (let i = 0; i < c.values.length; i++) c.emit("sorted", { index: i });
  return finish(c);
}

export const algorithms = definitions;

export function generateData(size, type = "random", random = Math.random) {
  const base = Array.from({ length: size }, (_, i) => i + 1);
  if (type === "ascending") return base;
  if (type === "descending") return base.reverse();
  if (type === "duplicates") return Array.from({ length: size }, () => 1 + Math.floor(random() * Math.max(3, Math.ceil(size / 5))));
  if (type === "nearly") {
    const swaps = Math.max(1, Math.floor(size / 8));
    for (let n = 0; n < swaps; n++) { const i = Math.floor(random() * size), j = Math.floor(random() * size); [base[i], base[j]] = [base[j], base[i]]; }
    return base;
  }
  for (let i = base.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  return base;
}

export function validateResult(input, output) {
  if (input.length !== output.length) return false;
  for (let i = 1; i < output.length; i++) if (output[i - 1] > output[i]) return false;
  const expected = [...input].sort((a, b) => a - b);
  return expected.every((value, index) => value === output[index]);
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function benchmark(algorithm, input, repetitions = 9, clock = () => performance.now()) {
  const times = [];
  for (let i = 0; i < repetitions; i++) {
    const start = clock();
    algorithm.sort(input, false);
    times.push(clock() - start);
  }
  return median(times);
}

