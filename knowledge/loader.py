import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class KnowledgeLoader:
    def __init__(self, json_path: str):
        self.data = {}
        self.all_items = []
        self.vectorizer = TfidfVectorizer(
            stop_words=None,
            ngram_range=(1, 2),
            max_features=5000,
        )
        self._load(json_path)
        self._build_index()

    def _load(self, path: str):
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        categorias = raw.get("categorias", {})
        for cat_key, cat_val in categorias.items():
            for item in cat_val.get("itens", []):
                item["_categoria"] = cat_val.get("titulo", cat_key)
                self.all_items.append(item)
        self.data = raw

    def _build_index(self):
        corpus = []
        for item in self.all_items:
            text = item.get("conteudo", "")
            tags = " ".join(item.get("tags", []))
            corpus.append(f"{text} {tags}")

        if corpus:
            self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
        else:
            self.tfidf_matrix = None

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        if not self.all_items or self.tfidf_matrix is None:
            return []

        query_vec = self.vectorizer.transform([query])
        scores = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)

        results = []
        for idx, score in ranked[:top_k]:
            if score > 0.01:
                item = self.all_items[idx].copy()
                item["_relevancia"] = round(float(score), 4)
                results.append(item)
        return results

    def format_context(self, results: list[dict]) -> str:
        if not results:
            return "Nenhuma informação encontrada na base de conhecimento."

        lines = []
        for i, r in enumerate(results, 1):
            cat = r.get("_categoria", "")
            lines.append(f"[{i}] ({cat}) {r.get('conteudo', '')}")
        return "\n".join(lines)
