import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

type Node = { id: string; label?: string; degree?: number }
type Link = { source: string; target: string; weight?: number }

// Simple community grouping using degree quantiles to emulate hierarchy for bundling
function buildHierarchy(nodes: Node[]): { id: string; parent: string | null }[] {
  const degs = nodes.map(d => d.degree || 0)
  const q1 = d3.quantile(degs.sort(d3.ascending), 0.33) || 0
  const q2 = d3.quantile(degs, 0.66) || 0
  const rows: { id: string; parent: string | null }[] = [{ id: 'root', parent: null }, { id: 'low', parent: 'root' }, { id: 'mid', parent: 'root' }, { id: 'high', parent: 'root' }]
  for (const n of nodes) {
    const d = n.degree || 0
    const bucket = d <= q1 ? 'low' : d <= q2 ? 'mid' : 'high'
    rows.push({ id: n.id, parent: bucket })
  }
  return rows
}

export default function EdgeBundledGraph({ endpoint }: { endpoint: string }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let destroyed = false
    const container = d3.select(ref.current!)
    container.selectAll('*').remove()
    const width = ref.current?.clientWidth ?? 600
    const height = 520
    const radius = Math.min(width, height) / 2 - 40
    const svg = container.append('svg').attr('class', 'viz').attr('viewBox', `0 0 ${width} ${height}`)
    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`)
    const tooltip = d3.select('body').append('div').style('position', 'fixed').style('background', '#111').style('color', '#fff').style('padding', '6px 8px').style('borderRadius', '4px').style('fontSize', '12px').style('pointerEvents', 'none').style('opacity', 0)

    const fetchData = async () => {
      const res = await fetch(endpoint)
      const data: { nodes: Node[]; links: Link[] } = await res.json()
      if (destroyed) return

      const hierarchyRows = buildHierarchy(data.nodes)
      const strat = d3.stratify<{ id: string; parent: string | null }>().id(d => d.id).parentId(d => d.parent!)
      const root = strat(hierarchyRows)
      const tree = d3.cluster().size([2 * Math.PI, radius])
      tree(root)

      const nodeById = new Map<string, d3.HierarchyPointNode<any>>()
      root.descendants().forEach(d => nodeById.set(d.id, d))

      const line = d3.lineRadial().curve(d3.curveBundle.beta(0.85)).radius((d: any) => d.y).angle((d: any) => d.x)

      const leaves = root.leaves()
      const leafSet = new Set(leaves.map(d => d.id))
      const links = data.links.filter(l => leafSet.has(l.source) && leafSet.has(l.target))
      const paths = g.append('g').attr('fill', 'none').attr('stroke', '#aaa').attr('stroke-opacity', 0.6)
        .selectAll('path').data(links).enter().append('path')
        .attr('d', d => line((nodeById.get(d.source)!.path(nodeById.get(d.target)!)) as any)!)
        .attr('stroke-width', d => Math.max(0.5, Math.min(3, (d.weight || 1) ** 0.5)))
        .on('mousemove', function (event, d) {
          tooltip.style('opacity', 1).html(`<b>Edge</b><br/>${d.source} → ${d.target}<br/>w=${d.weight || 1}`)
            .style('left', event.clientX + 12 + 'px').style('top', event.clientY + 12 + 'px')
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      const node = g.append('g').selectAll('g').data(leaves).enter().append('g')
        .attr('transform', d => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`)

      node.append('circle').attr('r', 3).attr('fill', '#6366f1')
        .on('mousemove', function (event, d: any) {
          tooltip.style('opacity', 1).html(`<b>${d.id}</b> (deg bucket)`).style('left', event.clientX + 12 + 'px').style('top', event.clientY + 12 + 'px')
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      node.append('text')
        .attr('dy', '0.31em')
        .attr('x', (d: any) => (d.x < Math.PI ? 6 : -6))
        .attr('text-anchor', (d: any) => (d.x < Math.PI ? 'start' : 'end'))
        .attr('transform', (d: any) => (d.x >= Math.PI ? 'rotate(180)' : null))
        .text((d: any) => d.id)
        .style('font-size', '10px')

      svg.append('text').attr('x', 10).attr('y', 20).attr('font-weight', 700).text('Hierarchical Edge Bundling (Citation Network)')
    }

    fetchData()
    return () => { destroyed = true; tooltip.remove() }
  }, [endpoint])

  return <div ref={ref} />
}


