"""알려진 명시적 지시 패턴만 탐지한다. 의미 기반 탐지나 완전한 방어가 아니다."""
import re
import unicodedata

# 명령형 어미만 본다. '분류해 보관한다', '무시한 경우'처럼 서술하는 문장은 잡지 않는다.
ORDER = r'(?:하라|하세요|하시오|하십시오|할것|해라)'


def normalize(value: str) -> str:
    # 호환 문자와 zero-width 문자로 나뉜 지시도 같은 규칙으로 검사한다.
    value = unicodedata.normalize('NFKC', value).casefold()
    return ''.join(char for char in value if unicodedata.category(char) != 'Cf')


def has_classification_instruction(value: str, category_names: list[str]) -> bool:
    # 카테고리는 사용자가 편집하므로 요청에 실린 이름으로 패턴을 만든다.
    names = [normalize(name) for name in [*category_names, '미분류']]
    compact_names = '|'.join(re.escape(''.join(name.split())) for name in names)
    spaced_names = '|'.join(re.escape(' '.join(name.split())) for name in names)
    text = normalize(value)

    # 한국어는 OCR이 글자마다 띄어 쓰므로 줄마다 공백을 모두 지우고 본다. 줄을 넘겨 잇지 않는다.
    korean = (
        r'(?:이전|위|앞|앞선|상기|모든)의?(?:모든)?(?:지시|명령|규칙|프롬프트)(?:사항)?(?:을|를|은|는)?'
        r'(?:무시(?:하라|하세요|하시오|하십시오|해라)|잊(?:어라|으세요|으십시오))',
        rf'(?:카테고리|분류결과)(?:는|를|을|:|=)(?:반드시)?.{{0,20}}?(?:로|으로)'
        rf'(?:지정|설정|반환|출력|응답)(?:해야|{ORDER})',
        rf'(?:{compact_names})(?:로|으로)분류{ORDER}',
    )
    lines = [''.join(line.split()) for line in text.splitlines()]
    if any(re.search(pattern, line) for pattern in korean for line in lines):
        return True

    # 영어는 공백을 지우면 'asset category'가 'setcategory'가 되므로 공백을 하나로만 줄이고 단어 경계로 본다.
    english = (
        r'\b(?:ignore|disregard|forget) (?:all )?(?:(?:the|any|your) )?'
        r'(?:previous|prior|above|earlier|system) (?:instructions|prompts?|rules)\b',
        rf'\b(?:classify|categorize)\b.{{0,40}}?\b(?:as|into) ["\']?(?:{spaced_names})',
        r'\b(?:set|return|output) (?:the )?category ?(?:to|as|:|=)',
    )
    spaced = ' '.join(text.split())
    return any(re.search(pattern, spaced) for pattern in english)
