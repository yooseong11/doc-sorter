import json
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.config import ConfigError
from app.main import app
from app.providers.errors import ProviderTimeoutError, ProviderResponseError


class ClassificationTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.body = {'name': '휴가.txt', 'text': '연차 신청서\n신청합니다.',
                     'categories': [{'name': '근태', 'hint': ''}]}
        self.mock = patch('app.services.classification_service.OpenAIProvider')
        self.provider = self.mock.start().return_value.__enter__.return_value
        self.addCleanup(self.mock.stop)

    def answer(self, value):
        self.provider.generate.return_value = json.dumps(value, ensure_ascii=False)
        return self.client.post('/api/classify', json=self.body)

    def test_classification_and_whitespace_quote(self):
        response = self.answer({'category': '근태', 'quote': '연차신청서'})
        self.assertEqual(response.json(), {'category': '근태', 'quote': '연차신청서'})
        prompt = self.provider.generate.call_args.args[0]
        self.assertIn('휴가.txt', prompt)
        self.assertIn('근태', prompt)
        schema = self.provider.generate.call_args.args[1]
        self.assertEqual(schema['properties']['category']['enum'], ['근태', '미분류'])
        self.assertFalse(schema['additionalProperties'])

    def test_invented_quote_preserves_category(self):
        self.assertEqual(self.answer({'category': '근태', 'quote': '계약 체결'}).json(),
                         {'category': '근태', 'quote': ''})

    def test_unknown_category(self):
        self.assertEqual(self.answer({'category': '계약서', 'quote': '연차'}).json(),
                         {'category': '미분류', 'quote': ''})

    def test_nonstring_quote(self):
        self.assertEqual(self.answer({'category': '근태', 'quote': None}).json()['quote'], '')

    def test_quote_limit(self):
        self.body['text'] = '가' * 200
        self.assertEqual(len(self.answer({'category': '근태', 'quote': '가' * 200}).json()['quote']), 120)

    def test_invalid_requests_do_not_call_provider(self):
        for changes in ({'text': 'x' * 3001}, {'categories': []},
                        {'categories': [{'name': '미분류', 'hint': ''}]},
                        {'categories': [{'name': '근태', 'hint': ''}] * 2}, {'extra': True}):
            with self.subTest(changes=changes):
                self.assertEqual(self.client.post('/api/classify', json=self.body | changes).status_code, 422)
        self.provider.generate.assert_not_called()

    def test_malformed_model_response(self):
        self.provider.generate.return_value = 'not json'
        self.assertEqual(self.client.post('/api/classify', json=self.body).status_code, 502)
        self.assertEqual(self.answer({'category': [] , 'quote': ''}).status_code, 502)

    def test_provider_errors(self):
        for error, status in ((ProviderTimeoutError(), 504), (ProviderResponseError(), 502)):
            self.provider.generate.side_effect = error
            self.assertEqual(self.client.post('/api/classify', json=self.body).status_code, status)

    def test_missing_configuration(self):
        with patch('app.services.classification_service.OpenAIProvider', side_effect=ConfigError('secret')):
            response = self.client.post('/api/classify', json=self.body)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('secret', response.text)

    def test_unexpected_runtime_error_is_not_config_error(self):
        self.provider.generate.side_effect = RuntimeError('bug')
        client = TestClient(app, raise_server_exceptions=False)
        self.assertEqual(client.post('/api/classify', json=self.body).status_code, 500)


class OpenAIProviderTests(unittest.TestCase):
    def test_sdk_request_and_close(self):
        from app.providers.openai_provider import OpenAIProvider
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key', 'OPENAI_MODEL': 'test-model'}), patch('openai.OpenAI') as sdk:
            sdk.return_value.responses.create.return_value.output_text = '{"category":"근태","quote":"연차"}'
            with OpenAIProvider() as provider:
                schema = {'type': 'object', 'properties': {}, 'required': [], 'additionalProperties': False}
                self.assertIn('근태', provider.generate('문서', schema))
            sdk.assert_called_once_with(api_key='test-key', timeout=35.0, max_retries=0)
            request = sdk.return_value.responses.create.call_args.kwargs
            self.assertEqual(request['text']['format']['type'], 'json_schema')
            self.assertIs(request['text']['format']['schema'], schema)
            self.assertFalse(request['store'])
            sdk.return_value.close.assert_called_once()

    def test_sdk_timeout_and_empty_output(self):
        import httpx
        import openai
        from app.providers.openai_provider import OpenAIProvider
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key', 'OPENAI_MODEL': 'test-model'}), patch('openai.OpenAI') as sdk:
            with OpenAIProvider() as provider:
                sdk.return_value.responses.create.side_effect = openai.APITimeoutError(request=httpx.Request('POST', 'https://api.openai.com'))
                with self.assertRaises(ProviderTimeoutError):
                    provider.generate('문서')
                sdk.return_value.responses.create.side_effect = None
                sdk.return_value.responses.create.return_value.output_text = ''
                with self.assertRaises(ProviderResponseError):
                    provider.generate('문서')


    def test_status_error_keeps_status_in_log(self):
        import httpx
        import openai
        from app.providers.openai_provider import OpenAIProvider
        from app.providers.errors import ProviderUpstreamError
        response = httpx.Response(401, request=httpx.Request('POST', 'https://api.openai.com'))
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key', 'OPENAI_MODEL': 'test-model'}), patch('openai.OpenAI') as sdk:
            sdk.return_value.responses.create.side_effect = openai.AuthenticationError('bad key', response=response, body=None)
            with OpenAIProvider() as provider, self.assertLogs('app.providers.base', 'ERROR') as logs:
                with self.assertRaises(ProviderUpstreamError):
                    provider.generate('문서')
        self.assertIn('OpenAI HTTP 401', logs.output[0])
        self.assertIn('AuthenticationError', logs.output[0])
