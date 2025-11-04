import React, { useEffect, useMemo, useState } from 'react'
import Graph from './components/Graph'
import EdgeBundledGraph from './components/EdgeBundledGraph'
import Timeline from './components/Timeline'
import Histogram from './components/Histogram'

type TimelinePoint = { year: number; count: number }

const DEFAULT_UNIV = 'Northeastern University'
const DEFAULT_FIELD = 'computer science'

export default function App() {
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [histData, setHistData] = useState<{ raw: number[]; bins: Record<string, number> } | null>(null)
  const [params, setParams] = useState({ since: new Date().getFullYear() - 4, limit: 500, sampling: 'degree' })

  const fetchTimeline = async () => {
    const res = await fetch(`/api/timeline?university=${encodeURIComponent(DEFAULT_UNIV)}&field=${encodeURIComponent(DEFAULT_FIELD)}&years=10`)
    const data = await res.json()
    setTimeline(data)
    if (data.length) {
      setSelectedYear(data[data.length - 1].year)
    }
  }

  const fetchHistogram = async (year: number | null) => {
    const url = new URL('/api/patent_histogram', window.location.origin)
    url.searchParams.set('university', DEFAULT_UNIV)
    url.searchParams.set('field', DEFAULT_FIELD)
    if (year != null) url.searchParams.set('year', String(year))
    const res = await fetch(url.toString().replace(window.location.origin, ''))
    const data = await res.json()
    setHistData(data)
  }

  useEffect(() => { fetchTimeline() }, [])
  useEffect(() => { fetchHistogram(selectedYear) }, [selectedYear])

  const explanation = useMemo(() => (
    `Scalability solutions: (1) server-side filtering by university, field, and years; (2) node/edge sampling via degree or PageRank with configurable limits; (3) aggregation into bins for patent histogram; (4) force simulation parameters tuned and capped iterations; (5) progressive rendering with D3 selections and lightweight SVG, and drag interaction only on visible nodes.`
  ), [])

  return (
    <div className="container">
      <h2>SciSciNet: NU CS Networks & Dashboards</h2>
      <p className="para">
        Data source: SciSciNet open data lake. See SciSciNet description in Scientific Data: 
        <a href="https://www.nature.com/articles/s41597-023-02198-9" target="_blank" rel="noreferrer">SciSciNet: A large-scale open data lake for the science of science research</a>.
      </p>
      <div className="row">
        <div className="card">
          <div className="title">T1: Paper Citation Network (NU CS, last 5 years)</div>
          <div className="controls">
            <label>Since
              <input
                type="number"
                value={params.since}
                onChange={(e) => setParams(s => ({ ...s, since: Number(e.target.value) }))}
                style={{ marginLeft: 6, width: 100 }}
              />
            </label>
            <label>Limit
              <input
                type="number"
                value={params.limit}
                onChange={(e) => setParams(s => ({ ...s, limit: Number(e.target.value) }))}
                style={{ marginLeft: 6, width: 80 }}
              />
            </label>
            <label>Sampling
              <select value={params.sampling} onChange={(e) => setParams(s => ({ ...s, sampling: e.target.value }))} style={{ marginLeft: 6 }}>
                <option value="degree">degree</option>
                <option value="pagerank">pagerank</option>
                <option value="head">head</option>
              </select>
            </label>
          </div>
          <Graph
            title="Citation Network"
            endpoint={`/api/citations?university=${encodeURIComponent(DEFAULT_UNIV)}&field=${encodeURIComponent(DEFAULT_FIELD)}&since=${params.since}&limit_nodes=${params.limit}&sampling=${params.sampling}`}
          />
          <div className="legend">Legend: node size ~ degree; edge width ~ weight; hover to see title, year, patent count.</div>
        </div>
        <div className="card">
          <div className="title">T1: Author Collaboration Network (NU CS, last 5 years)</div>
          <Graph
            title="Collaboration Network"
            endpoint={`/api/collaborations?university=${encodeURIComponent(DEFAULT_UNIV)}&field=${encodeURIComponent(DEFAULT_FIELD)}&since=${params.since}&limit_nodes=${params.limit}`}
          />
          <div className="legend">Legend: node size ~ degree; edge width ~ coauthorship count; hover to see author details.</div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="title">T2: Timeline of NU CS Papers (10 years)</div>
          <Timeline data={timeline} selectedYear={selectedYear} onSelectYear={setSelectedYear} />
        </div>
        <div className="card">
          <div className="title">T2: Patent Citation Distribution (Patent_Count)</div>
          <Histogram data={histData} />
        </div>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="title">T3: Refined Network (Hierarchical Edge Bundling on Citation Network)</div>
          <EdgeBundledGraph
            endpoint={`/api/citations?university=${encodeURIComponent(DEFAULT_UNIV)}&field=${encodeURIComponent(DEFAULT_FIELD)}&since=${params.since}&limit_nodes=${params.limit}&sampling=${params.sampling}`}
          />
          <div className="legend">Bundled edges improve readability; clusters are more distinct via tuned forces.</div>
        </div>
        <div className="card">
          <div className="title">Scalability Strategy</div>
          <p className="para">{explanation}</p>
        </div>
      </div>
    </div>
  )
}


