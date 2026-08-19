import os
import logging
import requests
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)


class WebSearch:
    def __init__(self):
        self.google_key = os.getenv("GOOGLE_SEARCH_KEY", "")
        self.google_cx = os.getenv("GOOGLE_CX", "")
        self.enabled = True

        if self.google_key and self.google_cx:
            logger.info("Google Search API configurada")
        else:
            logger.info("Google Search não configurada — usando DuckDuckGo")

    def search(self, query: str, max_results: int = 3) -> str:
        if not self.enabled:
            return ""

        results = []

        if self.google_key and self.google_cx:
            results = self._google_search(query, max_results)

        if not results:
            results = self._duckduckgo_search(query, max_results)

        if not results:
            return ""

        context = "Informações encontradas na internet:\n"
        for i, r in enumerate(results, 1):
            context += f"[{i}] {r['title']}: {r['snippet']}\n"

        logger.info(f"Busca: {len(results)} resultados para '{query[:50]}'")
        return context

    def _google_search(self, query: str, max_results: int) -> list:
        try:
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                "key": self.google_key,
                "cx": self.google_cx,
                "q": query,
                "num": max_results,
                "hl": "pt-BR",
            }

            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()

            results = []
            for item in data.get("items", [])[:max_results]:
                results.append({
                    "title": item.get("title", ""),
                    "snippet": item.get("snippet", ""),
                    "url": item.get("link", ""),
                })

            logger.info(f"Google: {len(results)} resultados")
            return results

        except Exception as e:
            logger.warning(f"Google Search erro: {e}")
            return []

    def _duckduckgo_search(self, query: str, max_results: int) -> list:
        try:
            from duckduckgo_search import DDGS

            with DDGS() as ddgs:
                results_raw = list(ddgs.text(query, max_results=max_results))

            results = []
            for r in results_raw:
                results.append({
                    "title": r.get("title", ""),
                    "snippet": r.get("body", ""),
                    "url": r.get("href", ""),
                })

            logger.info(f"DuckDuckGo: {len(results)} resultados")
            return results

        except Exception as e:
            logger.warning(f"DuckDuckGo erro: {e}")
            return []


web_search = WebSearch()
