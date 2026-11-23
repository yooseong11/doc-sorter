from typing import Protocol


class AIProvider(Protocol):
    @property
    def provider_name(self) -> str: ...

    @property
    def model_name(self) -> str: ...

    def generate(self, message: str) -> str: ...