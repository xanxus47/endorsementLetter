import type { EndorsementInput, Item } from './schemas'

const item = (name: string, inQty: string, outQty: string, notes = '', used = ''): Item => ({
  item: name,
  inQty,
  used,
  outQty,
  notes,
})

export const standardSections: EndorsementInput['sections'] = [
  {
    name: 'Ambulance',
    items: [
      item('BVM (Adult)', '1', '1'),
      item('BVM (Infant)', '1', '1'),
      item('SPIDER STRAP', '2', '2'),
      item('SPLINT', '1 set', '1 set'),
      item('KIDNEY BASIN', '2', '2'),
      item('ARM SLING', '5', '5'),
      item('FOLDABLE SPLINT', '1', '1'),
      item('FIRE BLANKET', '1', '1'),
      item('C-COLLAR', '2', '2'),
      item('SPINE BOARD', '1', '1'),
      item('HARD HAT', '5', '5'),
      item('PPE', '4', '4'),
      item('Scoop Stretcher', '1', '1'),
      item('Oxygen Tank', '1', '1', 'Empty'),
      item('Stretcher', '1', '1'),
      item('Vest', '3', '3'),
      item('Nasal Cannula', '14', '14'),
      item('Stethoscope', '1', '1'),
      item('Cadaver bag', '0', '0'),
      item('BP Apparatus', '1', '1'),
      item('Mobile Radio Base', '1', '1'),
      item('Electronic Blood Pressure Monitor', '1', '1'),
    ],
  },
  {
    name: 'Adventure',
    items: [item('SPINE BOARD', '1', '1'), item('SPIDER STRAP', '1', '1')],
  },
]

export const sampleEndorsement: EndorsementInput = {
  title: 'Endorsement of Rescue Equipment and Medical Supplies',
  team: 'Team Charlie',
  date: 'October 05, 2026',
  time: '8:00 am – 8:00 pm',
  sections: standardSections,
  preparedBy: {
    name: 'Reginald Christian V. Balaygan',
    position: 'Team Alpha - Team Leader',
  },
  receivedBy: {
    name: 'Marvin Eguillon',
    position: 'Team Bravo - Team Leader',
  },
}

export const blankTemplate = (): EndorsementInput => ({
  title: 'Endorsement of Rescue Equipment and Medical Supplies',
  team: '',
  date: new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date()),
  time: '',
  sections: structuredClone(standardSections),
  preparedBy: { name: '', position: '' },
  receivedBy: { name: '', position: '' },
})
