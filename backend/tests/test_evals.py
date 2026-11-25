import json
import unittest
from unittest.mock import Mock

from app.providers.base import BaseProvider
from app.providers.errors import ProviderTimeoutError
from app.schemas import Category
from evals.run import load_cases, run_cases, score


class EvalTests(unittest.TestCase):
    def setUp(self):
        self.categories = [Category(name='근태', hint='연차'), Category(name='계약서', hint='계약')]
        self.cases = [
            {'name': 'a.pdf', 'expected': ['근태'], 'text': '연차 신청서'},
            {'name': 'b.pdf', 'expected': ['계약서', '근태'], 'text': '용역 계약서'},
            {'name': 'c.pdf', 'expected': ['미분류'], 'text': '보험료 고지서'},
            {'name': 'd.pdf', 'expected': ['근태'], 'text': '출근부'},
        ]
        self.provider = Mock(spec=BaseProvider, provider_name='fake', model_name='fake-model')

    def answers(self, *values):
        self.provider.generate.side_effect = [
            value if isinstance(value, Exception) else json.dumps(value, ensure_ascii=False) for value in values]
        return run_cases(self.categories, self.cases, self.provider)

    def test_scores_accuracy_unclassified_and_quote(self):
        rows = self.answers(
            {'category': '근태', 'quote': '연차 신청서'},        # 정답, 인용 통과
            {'category': '근태', 'quote': '지어낸 문장'},        # 허용 답 중 하나, 인용 탈락
            {'category': '미분류', 'quote': ''},                # 정답, 인용 없음
            ProviderTimeoutError(),                             # 오류
        )
        self.assertEqual([row['correct'] for row in rows], [True, True, True, False])
        self.assertEqual(rows[1]['raw_quote'], '지어낸 문장')
        self.assertEqual(rows[1]['quote'], '')
        self.assertEqual(rows[3]['error'], 'ProviderTimeoutError')
        self.assertEqual(rows[3]['raw_quote'], '')
        self.assertEqual(score(rows), {'cases': 4, 'errors': 1, 'accuracy': 0.75,
                                       'unclassified_rate': 0.333, 'quote_pass_rate': 0.5})

    def test_no_quotes_gives_no_pass_rate(self):
        rows = self.answers(*[{'category': '미분류', 'quote': ''}] * 4)
        self.assertIsNone(score(rows)['quote_pass_rate'])

    def test_cases_file_matches_contract(self):
        categories, cases = load_cases()
        names = {item.name for item in categories} | {'미분류'}
        for case in cases:
            self.assertTrue(set(case['expected']) <= names, case['name'])
            self.assertTrue(0 < len(case['text']) <= 3000, case['name'])


if __name__ == '__main__':
    unittest.main()
