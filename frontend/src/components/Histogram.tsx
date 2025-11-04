import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

type HistData = { raw: number[]; bins: Record<string, number> } | null

export default function Histogram({ data }: { data: HistData }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = d3.select(ref.current!)
    container.selectAll('*').remove()
    const width = ref.current?.clientWidth ?? 600
    const height = 380
    const margin = { top: 24, right: 16, bottom: 30, left: 44 }
    const svg = container.append('svg').attr('class', 'smallviz').attr('viewBox', `0 0 ${width} ${height}`)

    if (!data) {
      svg.append('text').attr('x', width / 2 - 40).attr('y', height / 2).text('No data')
      return
    }

    const entries = Object.entries(data.bins)
    const x = d3.scaleBand<string>().domain(entries.map(d => d[0])).range([margin.left, width - margin.right]).padding(0.2)
    const y = d3.scaleLinear().domain([0, d3.max(entries, d => d[1]) || 1]).nice().range([height - margin.bottom, margin.top])

    const g = svg.append('g')
    g.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
    g.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y))

    g.append('g').selectAll('rect').data(entries).enter().append('rect')
      .attr('x', d => (x(d[0]) ?? 0))
      .attr('y', d => y(d[1]))
      .attr('width', x.bandwidth())
      .attr('height', d => y(0) - y(d[1]))
      .attr('fill', '#10b981')

    svg.append('text').attr('x', 10).attr('y', 18).attr('font-weight', 700).text('Patent Citation Distribution')
  }, [data])

  return <div ref={ref} />
}


