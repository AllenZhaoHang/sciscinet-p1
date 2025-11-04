# SciSciNet P1: NU CS Networks & Dashboards

This project builds interactive D3 visualizations backed by Flask using SciSciNet-derived data slices.

Reference: [SciSciNet: A large-scale open data lake for the science of science research](https://www.nature.com/articles/s41597-023-02198-9).

## Prerequisites
- Python 3.10+
- Node 18+

## Setup
1) Prepare data slices under `backend/data/`:
- `papers.(csv|parquet)` with columns `paper_id,title,year,field,institution,authors,patent_count`
- `citations.(csv|parquet)` with `source,target,year`
- Optional `authorships.(csv|parquet)` with `paper_id,author_id,author_name,institution`

Filter target: institution contains "Northeastern University", field contains "computer science".

2) Run backend
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/app.py  # http://localhost:5001
```

3) Run frontend
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173 (proxies /api)
```

## What you get
- T1: Two interactive force-directed graphs (citation, collaboration) with drag + tooltips
- T2: Coordinated timeline and histogram (click a bar updates histogram)
- T3: Refined citation network with hierarchical edge bundling and tuned forces
- Clear titles/legends and a paragraph describing scalability strategies

