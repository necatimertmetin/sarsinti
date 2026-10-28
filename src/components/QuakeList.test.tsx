import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import QuakeList from './QuakeList'
import type { Quake } from '../lib/types'

const quakes: Quake[] = [
  { id: 'a', time: Date.now() - 120_000, lat: 38.45, lon: 38.2, depth: 7, mag: 4.3, magType: 'ML', agency: 'AFAD', region: 'EASTERN TURKEY', source: 'emsc' },
  { id: 'b', time: Date.now() - 7_200_000, lat: 39.93, lon: 32.86, depth: 10, mag: 2.1, magType: 'ML', agency: 'KOERI', region: 'CENTRAL TURKEY', source: 'emsc' },
]

describe('QuakeList', () => {
  it('renders rows with Turkish place names and magnitudes', () => {
    render(<QuakeList quakes={quakes} selectedId={null} onSelect={() => {}} />)
    expect(screen.getByText(/Malatya'nın \d+ km kuzeybatısı/)).toBeInTheDocument()
    expect(screen.getByText('Ankara merkez')).toBeInTheDocument()
    expect(screen.getByText('4,3')).toBeInTheDocument()
    expect(screen.getByText(/2 dk önce/)).toBeInTheDocument()
  })

  it('reports the clicked event', () => {
    const onSelect = vi.fn()
    render(<QuakeList quakes={quakes} selectedId={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Ankara merkez'))
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('shows distance to the user', () => {
    render(<QuakeList quakes={quakes} selectedId={null} onSelect={() => {}} user={{ lat: 39.93, lon: 32.86 }} />)
    expect(screen.getByText(/sana 0,0 km/)).toBeInTheDocument()
  })

  it('shows an empty message', () => {
    render(<QuakeList quakes={[]} selectedId={null} onSelect={() => {}} empty="Hiç yok" />)
    expect(screen.getByText('Hiç yok')).toBeInTheDocument()
  })
})
