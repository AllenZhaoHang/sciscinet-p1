import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

type Node = { id: string; label?: string; name?: string; degree?: number; year?: number; patent_count?: number; affiliation?: string }
type Link = { source: string; target: string; weight?: number }

export default function Graph({ endpoint, title }: { endpoint: string; title: string }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let destroyed = false
    const container = d3.select(ref.current!)
    container.selectAll('*').remove()
    const width = ref.current?.clientWidth ?? 600
    const height = 520

    const svg = container.append('svg').attr('class', 'viz').attr('viewBox', `0 0 ${width} ${height}`)
    const g = svg.append('g')
    const tooltip = d3.select('body').append('div').style('position', 'fixed').style('background', '#111').style('color', '#fff').style('padding', '6px 8px').style('borderRadius', '4px').style('fontSize', '12px').style('pointerEvents', 'none').style('opacity', 0)

    const fetchData = async () => {
      const res = await fetch(endpoint)
      const data: { nodes: Node[]; links: Link[] } = await res.json()
      if (destroyed) return

      const nodeById = new Map<string, Node>(data.nodes.map(d => [d.id, d]))
      const links = data.links.map(d => ({ ...d }))
      const nodes = data.nodes.map(d => ({ ...d }))

      const scaleR = d3.scaleSqrt<number, number>().domain([0, d3.max(nodes, d => d.degree || 1) || 1]).range([3, 14])
      const scaleW = d3.scaleLinear<number, number>().domain([1, d3.max(links, d => d.weight || 1) || 1]).range([0.5, 3])

      const sim = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(40).strength(0.08))
        .force('charge', d3.forceManyBody().strength(-40))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .alphaDecay(0.03)
        .velocityDecay(0.3)

      const link = g.append('g').attr('stroke', '#999').attr('stroke-opacity', 0.6)
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke-width', d => scaleW(d.weight || 1))
        .on('mousemove', function (event, d) {
          const s = nodeById.get(d.source as unknown as string)
          const t = nodeById.get(d.target as unknown as string)
          tooltip.style('opacity', 1).html(`<b>Edge</b><br/>${s?.label || s?.name || s?.id} → ${t?.label || t?.name || t?.id}<br/>w=${d.weight || 1}`)
            .style('left', event.clientX + 12 + 'px').style('top', event.clientY + 12 + 'px')
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      const node = g.append('g').attr('stroke', '#fff').attr('stroke-width', 1.0)
        .selectAll('circle')
        .data(nodes)
        .enter().append('circle')
        .attr('r', d => scaleR(d.degree || 1))
        .attr('fill', '#4f46e5')
        .call(drag(sim) as any)
        .on('mousemove', function (event, d) {
          const title = d.label || d.name || d.id
          const extra = d.year != null ? `Year: ${d.year}<br/>` : ''
          const pat = d.patent_count != null ? `Patent_Count: ${d.patent_count}<br/>` : ''
          const aff = d.affiliation ? `Affiliation: ${d.affiliation}<br/>` : ''
          tooltip.style('opacity', 1).html(`<b>${title}</b><br/>${extra}${pat}${aff}Degree: ${d.degree ?? ''}`)
            .style('left', event.clientX + 12 + 'px').style('top', event.clientY + 12 + 'px')
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      sim.on('tick', () => {
        link
          .attr('x1', (d: any) => (d.source.x))
          .attr('y1', (d: any) => (d.source.y))
          .attr('x2', (d: any) => (d.target.x))
          .attr('y2', (d: any) => (d.target.y))
        node
          .attr('cx', (d: any) => d.x)
          .attr('cy', (d: any) => d.y)
      })

      // Titles
      svg.append('text').attr('x', 10).attr('y', 20).attr('font-weight', 700).text(title)
    }

    fetchData()

    return () => { destroyed = true; tooltip.remove() }
  }, [endpoint, title])

  return <div ref={ref} />
}

function drag(sim: d3.Simulation<any, any>) {
  function dragstarted(event: any) {
    if (!event.active) sim.alphaTarget(0.2).restart()
    event.subject.fx = event.subject.x
    event.subject.fy = event.subject.y
  }

  function dragged(event: any) {
    event.subject.fx = event.x
    event.subject.fy = event.y
  }

  function dragended(event: any) {
    if (!event.active) sim.alphaTarget(0)
    event.subject.fx = null
    event.subject.fy = null
  }

  return d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended)
}


