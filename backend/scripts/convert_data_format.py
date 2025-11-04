"""
转换现有数据格式为后端期望的格式
"""
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# 读取原始数据
print("Reading original data files...")
papers = pd.read_csv(DATA_DIR / "papers.csv")
citations = pd.read_csv(DATA_DIR / "citations.csv")
authors = pd.read_csv(DATA_DIR / "authors.csv")

# 转换 papers.csv
print("Converting papers.csv...")
papers_out = pd.DataFrame()
papers_out["paper_id"] = papers["paper_id"].astype(str)
papers_out["title"] = papers["title"].fillna("")
papers_out["year"] = papers["year"].fillna(0).astype(int)
# 从 primary_topic 或 concepts 推断 field
papers_out["field"] = "computer science"  # 默认，因为数据已过滤为 CS
# 从 authors.csv 推断 institution（需要构建 authorships 后）
papers_out["institution"] = "Northeastern University"  # 默认，因为数据已过滤
# patent_count 从 cited_by_count 估算或设为 0
papers_out["patent_count"] = papers.get("cited_by_count", pd.Series([0] * len(papers))).fillna(0).astype(int)

# 转换 citations.csv
print("Converting citations.csv...")
citations_out = pd.DataFrame()
citations_out["source"] = citations["citing_paper_id"].astype(str)
citations_out["target"] = citations["cited_paper_id"].astype(str)
# 从 papers 获取年份
year_map = dict(zip(papers["paper_id"].astype(str), papers["year"]))
citations_out["year"] = citations_out["source"].map(year_map).fillna(0).astype(int)

# 构建 authorships.csv
print("Building authorships.csv...")
authorships_rows = []
for _, author_row in authors.iterrows():
    paper_ids_str = author_row.get("paper_ids", "")
    if pd.isna(paper_ids_str):
        continue
    paper_ids = [pid.strip() for pid in str(paper_ids_str).split("|") if pid.strip()]
    institutions = str(author_row.get("institutions", "")).split("|") if not pd.isna(author_row.get("institutions")) else []
    
    for pid in paper_ids:
        if pid not in papers_out["paper_id"].values:
            continue
        inst = institutions[0] if institutions else "Northeastern University"
        authorships_rows.append({
            "paper_id": pid,
            "author_id": str(author_row["author_id"]),
            "author_name": author_row["author_name"],
            "institution": inst
        })

authorships_out = pd.DataFrame(authorships_rows)

# 构建 papers 的 authors 字段
print("Building authors field in papers...")
def build_authors_str(g):
    return ";".join(f"{aid}|{aname}" for aid, aname in zip(g["author_id"], g["author_name"]))
authors_by_paper = authorships_out.groupby("paper_id")[["author_id", "author_name"]].apply(build_authors_str).reset_index(name="authors")
papers_out = papers_out.merge(authors_by_paper, on="paper_id", how="left")
papers_out["authors"] = papers_out["authors"].fillna("")

# 确保只保留 citations 中的有效论文
valid_ids = set(papers_out["paper_id"].astype(str))
citations_out = citations_out[
    citations_out["source"].isin(valid_ids) & citations_out["target"].isin(valid_ids)
]

# 保存
print("Saving converted files...")
papers_out.to_csv(DATA_DIR / "papers.csv", index=False)
citations_out.to_csv(DATA_DIR / "citations.csv", index=False)
authorships_out.to_csv(DATA_DIR / "authorships.csv", index=False)

print(f"✅ Converted:")
print(f"   - papers.csv: {len(papers_out)} rows")
print(f"   - citations.csv: {len(citations_out)} rows")
print(f"   - authorships.csv: {len(authorships_out)} rows")

