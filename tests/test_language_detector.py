from miner.language.detector import supported_languages


def test_supported_languages_deduplicates_javascript_and_typescript():
    languages = supported_languages(["Go", "TypeScript", "Python", "JavaScript"])

    assert [(language.name, language.codeql_name) for language in languages] == [
        ("JavaScript", "javascript-typescript"),
        ("Python", "python"),
    ]
