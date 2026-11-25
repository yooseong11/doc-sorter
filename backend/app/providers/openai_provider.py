from app.config import required_env
from app.providers.base import BaseProvider
from app.providers.errors import (
    ProviderConnectionError, ProviderResponseError, ProviderTimeoutError, ProviderUpstreamError,
)


class OpenAIProvider(BaseProvider):
    def __init__(self) -> None:
        from openai import OpenAI
        super().__init__('openai', required_env('OPENAI_MODEL'))
        self._client = OpenAI(api_key=required_env('OPENAI_API_KEY'), timeout=35.0, max_retries=0)

    def close(self) -> None:
        self._client.close()

    def _generate(self, message: str, schema: dict | None) -> str:
        from openai import APIConnectionError, APITimeoutError, APIStatusError, OpenAIError
        try:
            options = {}
            if schema is not None:
                options['text'] = {'format': {
                    'type': 'json_schema', 'name': 'structured_output', 'strict': True, 'schema': schema,
                }}
            response = self._client.responses.create(model=self._model, input=message, store=False, **options)
        except APITimeoutError as exc:
            raise ProviderTimeoutError() from exc
        except APIConnectionError as exc:
            raise ProviderConnectionError() from exc
        except APIStatusError as exc:
            raise ProviderUpstreamError(f'OpenAI HTTP {exc.status_code}') from exc
        except OpenAIError as exc:
            raise ProviderUpstreamError() from exc
        answer = response.output_text
        if not isinstance(answer, str) or not answer.strip():
            raise ProviderResponseError()
        return answer

