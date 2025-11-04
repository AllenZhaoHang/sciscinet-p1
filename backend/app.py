from __future__ import annotations

import os
import json
from typing import Dict, Any, List, Tuple

import pandas as pd
import numpy as np
import networkx as nx
from flask import Flask, jsonify, request
from flask_cors import CORS


DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _read_dataframe(path: str) -> pd.DataFrame:
    if path.endswith(".parquet"):
        return pd.read_parquet(path)
    if path.endswith(".csv"):
        return pd.read_csv(path)
    raise ValueError(f"Unsupported file type for: {path}")


def load_data() -> Dict[str, pd.DataFrame]:
    """
    Expected files in backend/data (you may supply either CSV or Parquet):
      - papers.(csv|parquet): columns [paper_id,title,year,field,institution,authors,patent_count]
        - authors: semicolon-separated author_id|author_name (e.g., "a1|Alice;a2|Bob")
      - citations.(csv|parquet): columns [source,target,year] (paper_id to paper_id)
      - authorships.(csv|parquet) [optional alternative to authors string]:
        columns [paper_id,author_id,author_name,institution]
    """
    files = {f: os.path.join(DATA_DIR, f) for f in os.listdir(DATA_DIR) if not f.startswith('.')}
    data: Dict[str, pd.DataFrame] = {}
    for key in ("papers", "citations", "authorships"):
        fpath_csv = os.path.join(DATA_DIR, f"{key}.csv")
        fpath_parquet = os.path.join(DATA_DIR, f"{key}.parquet")
        if os.path.exists(fpath_parquet):
            data[key] = _read_dataframe(fpath_parquet)
        elif os.path.exists(fpath_csv):
            data[key] = _read_dataframe(fpath_csv)
    if "papers" not in data:
        raise FileNotFoundError("Missing papers.(csv|parquet) in backend/data")
    return data


def filter_university_field_years(df: pd.DataFrame, university: str | None, field: str | None, since: int | None) -> pd.DataFrame:
    out = df.copy()
    if university:
        out = out[out["institution"].str.contains(university, case=False, na=False)]
    if field:
        out = out[out["field"].str.contains(field, case=False, na=False)]
    if since:
        out = out[out["year"] >= int(since)]
    return out


def build_citation_network(papers: pd.DataFrame, citations: pd.DataFrame, limit_nodes: int = 500, sampling: str = "degree") -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    # Build graph
    g = nx.DiGraph()
    # Ensure only citations among selected papers
    valid_ids = set(papers["paper_id"].astype(str))
    citations = citations[citations["source"].astype(str).isin(valid_ids) & citations["target"].astype(str).isin(valid_ids)]

    # Add nodes with attributes
    for _, row in papers.iterrows():
        g.add_node(str(row["paper_id"]), label=row.get("title", ""), year=int(row.get("year", 0)), patent_count=int(row.get("patent_count", 0)))

    # Add edges
    for _, row in citations.iterrows():
        s = str(row["source"])
        t = str(row["target"])
        if s != t:
            if g.has_edge(s, t):
                g[s][t]["weight"] += 1
            else:
                g.add_edge(s, t, weight=1)

    # Sampling for scalability
    if g.number_of_nodes() > limit_nodes:
        if sampling == "degree":
            degrees = dict(g.degree())
            top_nodes = set(sorted(degrees, key=degrees.get, reverse=True)[:limit_nodes])
            g = g.subgraph(top_nodes).copy()
        elif sampling == "pagerank":
            pr = nx.pagerank_scipy(g, alpha=0.85) if g.number_of_edges() > 0 else {n: 1.0 for n in g.nodes()}
            top_nodes = set(sorted(pr, key=pr.get, reverse=True)[:limit_nodes])
            g = g.subgraph(top_nodes).copy()
        else:
            nodes_list = list(g.nodes())[:limit_nodes]
            g = g.subgraph(nodes_list).copy()

    nodes = [
        {
            "id": n,
            "label": g.nodes[n].get("label", ""),
            "year": g.nodes[n].get("year", None),
            "patent_count": g.nodes[n].get("patent_count", 0),
            "degree": int(g.degree(n)),
        }
        for n in g.nodes()
    ]
    links = [
        {"source": u, "target": v, "weight": int(d.get("weight", 1))}
        for u, v, d in g.edges(data=True)
    ]
    return nodes, links


def build_collaboration_network(papers: pd.DataFrame, authorships: pd.DataFrame | None, limit_nodes: int = 500) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    # Build undirected co-authorship graph
    g = nx.Graph()

    if authorships is not None and not authorships.empty:
        # Use explicit authorships table
        use_df = authorships[authorships["paper_id"].astype(str).isin(papers["paper_id"].astype(str))].copy()
        # normalize
        use_df["author_id"] = use_df["author_id"].astype(str)
        # group by paper and connect authors
        for pid, group in use_df.groupby("paper_id"):
            authors = group[["author_id", "author_name", "institution"]].drop_duplicates().to_dict("records")
            # add nodes
            for a in authors:
                g.add_node(a["author_id"], name=a.get("author_name", ""), affiliation=a.get("institution", ""))
            # add edges for all pairs
            for i in range(len(authors)):
                for j in range(i + 1, len(authors)):
                    u = authors[i]["author_id"]
                    v = authors[j]["author_id"]
                    if u == v:
                        continue
                    if g.has_edge(u, v):
                        g[u][v]["weight"] += 1
                    else:
                        g.add_edge(u, v, weight=1)
    else:
        # Fallback: parse authors column in papers
        for _, row in papers.iterrows():
            authors_str = row.get("authors", "") or ""
            parts = [p for p in authors_str.split(";") if p]
            authors: List[Tuple[str, str]] = []
            for p in parts:
                if "|" in p:
                    aid, aname = p.split("|", 1)
                    authors.append((aid.strip(), aname.strip()))
                else:
                    authors.append((p.strip(), p.strip()))
            for aid, aname in authors:
                g.add_node(aid, name=aname, affiliation=row.get("institution", ""))
            for i in range(len(authors)):
                for j in range(i + 1, len(authors)):
                    u, _ = authors[i]
                    v, _ = authors[j]
                    if u == v:
                        continue
                    if g.has_edge(u, v):
                        g[u][v]["weight"] += 1
                    else:
                        g.add_edge(u, v, weight=1)

    # Limit nodes by degree
    if g.number_of_nodes() > limit_nodes:
        degrees = dict(g.degree())
        top_nodes = set(sorted(degrees, key=degrees.get, reverse=True)[:limit_nodes])
        g = g.subgraph(top_nodes).copy()

    nodes = [
        {
            "id": n,
            "name": g.nodes[n].get("name", ""),
            "affiliation": g.nodes[n].get("affiliation", ""),
            "degree": int(g.degree(n)),
        }
        for n in g.nodes()
    ]
    links = [
        {"source": u, "target": v, "weight": int(d.get("weight", 1))}
        for u, v, d in g.edges(data=True)
    ]
    return nodes, links


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    data = load_data()
    papers = data["papers"].copy()
    citations = data.get("citations", pd.DataFrame(columns=["source", "target", "year"]))
    authorships = data.get("authorships", None)

    # Normalize types
    for col in ("year", "patent_count"):
        if col in papers.columns:
            papers[col] = pd.to_numeric(papers[col], errors="coerce").fillna(0).astype(int)

    @app.get("/api/citations")
    def api_citations():
        university = request.args.get("university")
        field = request.args.get("field")
        since = request.args.get("since", type=int)
        limit_nodes = request.args.get("limit_nodes", default=500, type=int)
        sampling = request.args.get("sampling", default="degree")

        p = filter_university_field_years(papers, university, field, since)
        if citations is None or citations.empty:
            return jsonify({"nodes": [], "links": []})
        nodes, links = build_citation_network(p, citations, limit_nodes=limit_nodes, sampling=sampling)
        return jsonify({"nodes": nodes, "links": links})

    @app.get("/api/collaborations")
    def api_collaborations():
        university = request.args.get("university")
        field = request.args.get("field")
        since = request.args.get("since", type=int)
        limit_nodes = request.args.get("limit_nodes", default=500, type=int)

        p = filter_university_field_years(papers, university, field, since)
        nodes, links = build_collaboration_network(p, authorships, limit_nodes=limit_nodes)
        return jsonify({"nodes": nodes, "links": links})

    @app.get("/api/timeline")
    def api_timeline():
        university = request.args.get("university")
        field = request.args.get("field")
        years = request.args.get("years", default=10, type=int)
        max_year = int(papers["year"].max()) if "year" in papers.columns else None
        min_year = max_year - years + 1 if max_year is not None else None
        p = filter_university_field_years(papers, university, field, min_year)
        out = p.groupby("year").size().reset_index(name="count").sort_values("year")
        return jsonify(out.to_dict(orient="records"))

    @app.get("/api/patent_histogram")
    def api_patent_histogram():
        university = request.args.get("university")
        field = request.args.get("field")
        year = request.args.get("year", type=int)
        p = filter_university_field_years(papers, university, field, year)
        if year is not None:
            p = p[p["year"] == year]
        counts = p["patent_count"].dropna().astype(int)
        # Return raw counts and suggested bins (0,1,2-3,4-7,8+)
        bins = {
            "0": int((counts == 0).sum()),
            "1": int((counts == 1).sum()),
            "2-3": int(((counts >= 2) & (counts <= 3)).sum()),
            "4-7": int(((counts >= 4) & (counts <= 7)).sum()),
            "8+": int((counts >= 8).sum()),
        }
        return jsonify({"raw": counts.tolist(), "bins": bins})

    @app.get("/api/health")
    def api_health():
        return jsonify({"status": "ok"})

    return app


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app = create_app()
    app.run(host="0.0.0.0", port=port, debug=True)


