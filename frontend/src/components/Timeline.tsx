import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

type TimelinePoint = { year: number; count: number }

export default function Timeline({ data, selectedYear, onSelectYear }: { data: TimelinePoint[]; selectedYear: number | null; onSelectYear: (y: number) => void }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = d3.select(ref.current!)
    container.selectAll('*').remove()
    const width = ref.current?.clientWidth ?? 600
    const height = 380
    const margin = { top: 24, right: 16, bottom: 30, left: 44 }
    const svg = container.append('svg').attr('class', 'smallviz').attr('viewBox', `0 0 ${width} ${height}`)

    const x = d3.scaleBand<number>().domain(data.map(d => d.year)).range([margin.left, width - margin.right]).padding(0.1)
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count) || 1]).nice().range([height - margin.bottom, margin.top])

    const g = svg.append('g')
    g.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickFormat(d => String(d)))
    g.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y))

    const bars = g.append('g').selectAll('rect').data(data).enter().append('rect')
      .attr('x', d => (x(d.year) ?? 0))
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => y(0) - y(d.count))
      .attr('fill', d => d.year === selectedYear ? '#ef4444' : '#3b82f6')
      .style('cursor', 'pointer')
      .on('click', (_, d) => onSelectYear(d.year))

    svg.append('text').attr('x', 10).attr('y', 18).attr('font-weight', 700).text('Papers per Year')

  }, [data, selectedYear, onSelectYear])

  return <div ref={ref} />
}


