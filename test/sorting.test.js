import test from "node:test";
import assert from "node:assert/strict";
import { algorithms, benchmark, generateData, median, validateResult } from "../src/sorting.js";

const cases = [
  [], [1], [2, 1], [5, 1, 4, 2, 8, 3], [3, 3, 1, 2, 1], [-2, 7, 0, -2, 4],
  Array.from({ length: 30 }, (_, i) => 30 - i), Array.from({ length: 30 }, (_, i) => i + 1)
];

for (const algorithm of algorithms) {
  test(`${algorithm.name}: 다양한 입력을 오름차순으로 정렬한다`, () => {
    for (const input of cases) {
      const original = [...input];
      const output = algorithm.sort(input);
      assert.deepEqual(output.result, [...input].sort((a, b) => a - b));
      assert.equal(validateResult(input, output.result), true);
      assert.deepEqual(input, original, "원본 배열을 변경하면 안 된다");
      assert.equal(output.events.at(-1)?.type, "complete");
      assert.ok(output.stats.iterations >= 0);
      assert.ok(output.stats.comparisons >= 0);
      assert.ok(output.stats.swaps >= 0);
      assert.ok(output.stats.writes >= 0);
    }
  });
}

test("데이터 생성기는 요청한 크기와 유형을 지킨다", () => {
  const types = ["random", "ascending", "descending", "nearly", "duplicates"];
  types.forEach(type => assert.equal(generateData(25, type, () => 0.42).length, 25));
  assert.deepEqual(generateData(5, "ascending"), [1, 2, 3, 4, 5]);
  assert.deepEqual(generateData(5, "descending"), [5, 4, 3, 2, 1]);
});

test("결과 검증기는 정렬 오류와 값 손실을 찾는다", () => {
  assert.equal(validateResult([3, 1, 2], [1, 2, 3]), true);
  assert.equal(validateResult([3, 1, 2], [1, 3, 2]), false);
  assert.equal(validateResult([3, 1, 2], [1, 2]), false);
  assert.equal(validateResult([1, 1, 2], [1, 2, 2]), false);
});

test("중앙값과 벤치마크가 유효한 측정값을 반환한다", () => {
  assert.equal(median([9, 1, 5]), 5);
  assert.equal(median([1, 3, 7, 9]), 5);
  let tick = 0;
  const time = benchmark(algorithms[0], [3, 2, 1], 3, () => tick++);
  assert.equal(time, 1);
});

