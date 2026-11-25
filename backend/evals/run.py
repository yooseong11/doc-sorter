"""분류 평가셋 채점. 실행: backend에서 python -m evals.run

backend/.env의 AI_PROVIDER로 고른 provider로 cases.json을 분류하고 세 지표를 낸다.
- 정답률: 모델이 고른 카테고리가 허용 답(expected) 안에 든 비율
- 미분류 비율: 미분류를 고른 비율
- 인용 통과율: 모델이 낸 인용문 중 원문 검증(0018)을 통과해 살아남은 비율
"""
import argparse
import json
from datetime import datetime
from pathlib import Path

from app.providers.base import BaseProvider
from app.providers.errors import AIProviderError
from app.schemas import Category, ClassificationInput
from app.services.classification_service import UNCLASSIFIED, classify_document

EVAL_DIR = Path(__file__).resolve().parent
CASES_PATH = EVAL_DIR / 'cases.json'
RESULTS_DIR = EVAL_DIR / 'results'


class RecordingProvider(BaseProvider):
    """classify_document가 지운 인용문도 셀 수 있게 모델의 원래 응답을 남긴다."""

    def __init__(self, inner: BaseProvider) -> None:
        super().__init__(inner.provider_name, inner.model_name)
        self._inner = inner
        self.last_answer = None

    def generate(self, message: str, schema: dict | None = None) -> str:
        self.last_answer = None
        self.last_answer = self._inner.generate(message, schema)
        return self.last_answer


def raw_quote(answer) -> str:
    try:
        value = json.loads(answer).get('quote')
    except (ValueError, TypeError, AttributeError):
        return ''
    return value.strip() if isinstance(value, str) else ''


def load_cases(path: Path = CASES_PATH):
    data = json.loads(path.read_text(encoding='utf-8'))
    categories = [Category(**item) for item in data['categories']]
    return categories, data['cases']


def run_cases(categories, cases, provider: BaseProvider) -> list[dict]:
    recorder = RecordingProvider(provider)
    rows = []
    for case in cases:
        row = {'name': case['name'], 'expected': case['expected'], 'category': None,
               'raw_quote': '', 'quote': '', 'error': None}
        body = ClassificationInput(name=case['name'], text=case['text'], categories=categories)
        try:
            result = classify_document(body, recorder)
            row.update(category=result.category, quote=result.quote)
        except AIProviderError as exc:
            row['error'] = type(exc).__name__
        row['raw_quote'] = raw_quote(recorder.last_answer)
        row['correct'] = row['category'] in case['expected']
        rows.append(row)
    return rows


def ratio(part: int, whole: int):
    return round(part / whole, 3) if whole else None


def score(rows: list[dict]) -> dict:
    done = [row for row in rows if row['error'] is None]
    quoted = [row for row in done if row['raw_quote']]
    return {
        'cases': len(rows),
        'errors': len(rows) - len(done),
        # 오류도 오답으로 센다. 분모를 줄이면 실패가 많을수록 점수가 좋아 보인다.
        'accuracy': ratio(sum(row['correct'] for row in rows), len(rows)),
        'unclassified_rate': ratio(sum(row['category'] == UNCLASSIFIED for row in done), len(done)),
        'quote_pass_rate': ratio(sum(bool(row['quote']) for row in quoted), len(quoted)),
    }


def percent(value) -> str:
    return '-' if value is None else f'{value * 100:.0f}%'


def report(provider: BaseProvider, rows: list[dict], metrics: dict) -> str:
    lines = [f'provider: {provider.provider_name} / model: {provider.model_name}', '']
    for row in rows:
        mark = 'O' if row['correct'] else 'X'
        got = row['error'] or row['category']
        quote = '통과' if row['quote'] else ('탈락' if row['raw_quote'] else '없음')
        lines.append(f"{mark} {row['name']}: {got} (허용 {', '.join(row['expected'])}) 인용 {quote}")
    lines += ['',
              f"정답률 {percent(metrics['accuracy'])} · 미분류 {percent(metrics['unclassified_rate'])}"
              f" · 인용 통과 {percent(metrics['quote_pass_rate'])} · 오류 {metrics['errors']}/{metrics['cases']}"]
    return '\n'.join(lines)


def save(provider: BaseProvider, rows: list[dict], metrics: dict) -> Path:
    RESULTS_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    model = ''.join(ch if ch.isalnum() or ch in '-.' else '_' for ch in provider.model_name)
    path = RESULTS_DIR / f'{stamp}_{provider.provider_name}_{model}.json'
    payload = {'provider': provider.provider_name, 'model': provider.model_name,
               'metrics': metrics, 'rows': rows}
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description='분류 평가셋을 채점한다.')
    parser.add_argument('--cases', type=Path, default=CASES_PATH)
    args = parser.parse_args()

    from app.providers.factory import create_provider
    categories, cases = load_cases(args.cases)
    with create_provider() as provider:
        rows = run_cases(categories, cases, provider)
    metrics = score(rows)
    print(report(provider, rows, metrics))
    print(f'\n저장: {save(provider, rows, metrics)}')


if __name__ == '__main__':
    main()
