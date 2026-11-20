# 테스트 기초 — doc-sorter 코드로

책(『프런트엔드 개발을 위한 테스트 입문』) 앞부분에 해당하는 내용을 이 저장소 코드로 옮긴 것.
책은 Jest를 쓰고 이 저장소는 `node:test`를 쓴다. 문법 대조표는 맨 아래에 있다.

---

## 1. 테스트는 왜 쓰는가

**버그를 찾으려고 쓰는 게 아니다.** 테스트는 내가 생각하지 못한 버그를 찾아주지 않는다.
생각한 것만 확인한다. 그래서 "테스트를 쓰면 버그가 없어진다"는 틀린 기대다.

진짜 이유는 하나다. **결정을 고정한다.**

`tests/save.test.js`에 이런 테스트가 있다.

```
test('저장 시작을 다시 눌러도 이미 저장된 파일은 다시 쓰지 않는다', ...)
```

이건 ADR 0011의 결정이다. 그런데 결정은 문서에만 있으면 조용히 뒤집힌다.
6개월 뒤에 `saveAll`을 고치다가 `if (item.save.phase === 'saved') continue` 한 줄을 지우면?
ADR은 아무 말도 안 한다. 이 테스트는 빨간불을 켠다.

> **테스트 = 이 결정을 바꾸려면 나한테 먼저 걸려라**

0단계에서 `reset`을 일부러 망가뜨렸을 때 본 그 빨간불이 전부다. 그 외의 기능은 없다.

---

## 2. 무엇을 테스트할 가치가 있는가

판단 기준 한 줄: **"이 줄이 틀리면 뭐가 잘못되나?"**
답이 시시하면 테스트하지 않는다.

### 이 저장소가 테스트한 것

| 대상 | 틀리면 |
|---|---|
| `uniqueName` (savePlan.js) | 사용자 파일이 **덮어써진다** |
| `toCsvField` (logCsv.js) | 쉼표 든 파일명에서 엑셀 열이 밀린다 |
| `quoteInText` (classifyContract.js) | AI가 **지어낸 문장**을 근거라고 보여준다 |
| `categoryIssues` (categories.js) | 화면은 통과시키고 서버는 400으로 막는다 |
| `saveAll`의 실패 격리 | 하나 실패했는데 성공분까지 날아간다 |

전부 **돈·파일·신뢰가 걸린 결정**이다.

### 이 저장소가 테스트하지 않은 것

`formatSize`, `extensionOf`, `isReadable` — 테스트에서 단 한 번도 언급되지 않는다.

왜 안 했나? `formatSize`가 틀리면 "1.2 MB"가 "1.3 MB"로 나온다. 그게 끝이다.
**틀렸을 때의 피해가 작으면 테스트 비용이 아깝다.**

라이브러리가 하는 일(pdf.js가 PDF를 읽는 것)과 화면 모양(CSS, SVG)도 안 쓴다.
전자는 남의 책임이고, 후자는 테스트보다 눈으로 보는 게 빠르다.

### 정리

```
피해가 큰가?  ─── 아니오 ──→ 쓰지 않는다
      │
     예
      │
내가 내린 결정인가? ── 아니오(라이브러리) ──→ 쓰지 않는다
      │
     예 ──→ 쓴다
```

---

## 3. 테스트가 안 써지면, 코드가 잘못 놓인 것이다

2026-09-22에 실제로 겪은 일이다.

"카테고리를 바꾸면 파일이 사라진다"를 테스트로 쓰려고 앉았는데 쓸 수가 없었다.
파일을 그룹으로 묶는 로직이 `ConfirmScreen.jsx:10` 안에 박혀 있어서 `import`가 안 됐다.

선택지는 둘이었다.

1. React를 띄워서 화면째로 테스트한다 → 무겁고 느리다
2. 로직을 테스트 파일에 복사한다 → **가짜 테스트**가 된다. 원본이 바뀌어도 테스트는 모른다

둘 다 나쁘다. 그래서 답은 셋째다. **로직을 꺼낸다.**

> 테스트가 안 써지는 건 테스트를 못 배워서가 아니라,
> **결정과 화면이 한 덩어리로 붙어 있어서**다.

이 저장소가 36개를 쉽게 쓸 수 있었던 이유도 같다.
`shared/`와 `src/lib/`이 화면과 분리돼 있어서 `import` 한 줄이면 됐다.
`ConfirmScreen`의 묶는 로직만 그 밖으로 빠져 있었고, 그게 결함 1번이 숨어 있던 자리다.

**테스트는 품질 측정기다.** 짜기 어려우면 설계가 이상한 것이지 실력이 모자란 게 아니다.

---

## 4. 가짜를 넣는 법 — 이 저장소는 mock을 안 쓴다

책에서 `jest.mock()`, `jest.fn()`이 나오면 여기와 대조해서 보면 된다.

저장소는 **진짜를 기본값으로 두고, 테스트에서 인자로 가짜를 밀어 넣는다.**

```js
// src/lib/save/saveFiles.js
export async function saveAll(items, { rootHandle, onRow, logName, date,
                                       log = appendLog,        // ← 기본값은 진짜
                                       write = writeDocument })
```

```js
// src/lib/state/runDocuments.js
export async function classifyDocuments(items, { dispatch,
                                                 classify = requestClassification,
                                                 extract = extractText, ... })
```

테스트는 `log`, `write`, `classify`에 원하는 가짜를 넣는다.
"세 번째 호출에서 실패하는 write"처럼 진짜로는 만들기 어려운 상황을 마음대로 만들 수 있다.

`tests/save.test.js`의 `makeRoot()`는 아예 **File System Access API 전체를 메모리로 흉내** 낸다.
브라우저 없이, 디스크 건드리지 않고, 폴더·파일·이어쓰기까지 다 검증한다.

> 이 방식의 이름은 **의존성 주입(Dependency Injection)**이다.
> mock 라이브러리보다 손은 더 가지만, 마법이 없어서 읽기 쉽다.

이미 공부한 "숨은 의존 찾아내기"와 이어지는 이야기다.
숨은 의존이 없으면 가짜를 넣을 자리가 생기고, 그래서 테스트가 써진다. 같은 이야기다.

---

## 부록: 책(Jest) ↔ 이 저장소(node:test) 대조표

| 책에서 | 이 저장소에서 |
|---|---|
| `describe('묶음', () => {...})` | 안 쓴다. `test`만 나열한다 |
| `it('...')` / `test('...')` | `test('...', () => {})` — 같다 |
| `expect(a).toBe(b)` | `assert.equal(a, b)` |
| `expect(a).toEqual(b)` | `assert.deepEqual(a, b)` |
| `expect(a).toBeTruthy()` | `assert.ok(a)` |
| `expect(fn).toThrow()` | `assert.throws(fn)` |
| `await expect(p).rejects...` | `await assert.rejects(p)` |
| `jest.fn()` / `jest.mock()` | 인자로 가짜를 넘긴다 (4번 참고) |
| `beforeEach(...)` | 헬퍼 함수를 만들어 각 테스트에서 부른다 |
| `npx jest` | `npm test` (= `node --test`) |

설치할 것도, 설정 파일도 없다. `node:test`는 Node에 들어 있다.

---

## 읽고 나서

책 앞 2~3장을 읽을 때 이 문서와 겹치는 대목이 나오면 건너뛰어도 된다.
겹치지 않는 대목이 나오면 그게 이 문서에 없는 내용이니 거기서 멈춰서 읽으면 된다.

다음 칸은 `LEARNING_ROADMAP.md`의 **1-3**이다.
