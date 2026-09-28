"""Traduce lenguajes de GitHub a identificadores de CodeQL."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SupportedLanguage:
    name: str
    codeql_name: str


LANGUAGE_MAP = {
    "Python": SupportedLanguage("Python", "python"),
    "JavaScript": SupportedLanguage("JavaScript", "javascript-typescript"),
    "TypeScript": SupportedLanguage("TypeScript", "javascript-typescript"),
    "Ruby": SupportedLanguage("Ruby", "ruby"),
}


def supported_languages(languages: list[str]) -> list[SupportedLanguage]:
    """Return supported CodeQL targets once, preserving stable display order."""
    found = {LANGUAGE_MAP[language].codeql_name: LANGUAGE_MAP[language] for language in languages if language in LANGUAGE_MAP}
    return sorted(found.values(), key=lambda language: language.name.casefold())
