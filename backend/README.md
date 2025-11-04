# Backend (Flask) for SciSciNet Visualizations

## Data expectation
Place preprocessed slices under `backend/data/`:

- `papers.csv` or `papers.parquet`
  - columns: `paper_id,title,year,field,institution,authors,patent_count`
  - `authors`: semicolon-separated `author_id|author_name` entries (e.g., `a1|Alice;a2|Bob`)
- `citations.csv` or `citations.parquet`
  - columns: `source,target,year` (paper_id to paper_id)
- `authorships.csv` or `authorships.parquet` (optional)
  - columns: `paper_id,author_id,author_name,institution`

Filter logic is applied by query params (university, field, since).

## Run locally

```bash
# from repository root
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/app.py  # runs on port 5001
```

## API
- `GET /api/citations?university=...&field=...&since=YYYY&limit_nodes=500&sampling=degree`
- `GET /api/collaborations?university=...&field=...&since=YYYY&limit_nodes=500`
- `GET /api/timeline?university=...&field=...&years=10`
- `GET /api/patent_histogram?university=...&field=...&year=YYYY`

All endpoints return JSON suitable for D3 rendering.

