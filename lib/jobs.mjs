export const JOBS = {
  lca: {
    id: 'lca',
    short: 'LCA Consultant',
    title: 'LCA Consultant',
    meta: 'Chennai, onsite (relocation supported) - sustainability consultancy client',
    summary:
      'Builds Life Cycle Inventory datasets, runs LCA studies in GaBi or SimaPro, documents assumptions so models are audit-ready, and benchmarks results against industry peers.',
    musts: [
      '2-3 years running LCA projects independently (listing header says 4-6 years)',
      'Hands-on GaBi or SimaPro',
      'At least 3 completed LCA projects',
      'Follows ISO 14040 and ISO 14044',
      "Bachelor's or Master's (environmental domain preferred)",
    ],
    nice: ['EPD (Environmental Product Declaration) experience', 'Basic business finance and accounting', 'Willing to relocate to Chennai and travel across India'],
    rubric: [
      { key: 'concepts', label: 'LCA knowledge & terminology', max: 30, how: 'The 30 points are split: core LCA methodology (LCA, LCI/LCIA, EPD, product carbon footprint, system boundary, functional unit and impact methods) earns up to 24; adjacent sustainability terms (GHG, ESG, circular economy) earn up to 6. General ESG terms cannot replace evidence of LCA methods.' },
      { key: 'software', label: 'LCA software (GaBi / SimaPro)', max: 20, how: 'GaBi or SimaPro in work/project context = 100%; only in a skills list = 80%; openLCA/Umberto/One Click LCA = 50%; ecoinvent/others = 30%.' },
      { key: 'experience', label: 'Relevant LCA experience', max: 20, how: 'Years of dated roles whose text mentions LCA work (overlaps merged), or years the resume states. 0y=0, 1y=30%, 2y=70%, 3y=85%, 4y+=100%.' },
      { key: 'standards', label: 'ISO standards & project history', max: 10, how: 'Up to 6 for standards (ISO 14040/14044 weigh most) + up to 4 for LCA projects completed (3+ = full).' },
      { key: 'education', label: 'Education (environmental preferred)', max: 10, how: 'Environmental field 8, engineering/science 6, other 3-4; +2 for a Master\'s/PhD, +1 for a Bachelor\'s.' },
      { key: 'support', label: 'Data, benchmarking & stakeholder work', max: 10, how: 'Mentions of data collection, QC, benchmarking, stakeholders, supply chain, documentation, relocation. 6 weighted points = full marks.' },
    ],
  },
  ux: {
    id: 'ux',
    short: 'UI/UX Intern',
    title: 'UI/UX Design Intern',
    meta: 'Remote - Growth For Impact (LinkedIn for sustainability) - stipend 10-15k / month',
    summary:
      'First member of the design team: designs the website and job board, runs user research, and builds high-fidelity Figma prototypes. 0-1 years of experience is fine.',
    musts: ['Figma and prototyping tools', 'Understanding of user psychology and behaviour', 'Human-centred design methods', 'An eye for detail and strong aesthetic sense', 'Open to 0-1 year of experience'],
    nice: ['Portfolio / case studies', 'Interest in sustainability', 'Web and job-board design context'],
    rubric: [
      { key: 'tools', label: 'Design & prototyping tools (Figma first)', max: 25, how: 'Figma is worth the most, then Adobe XD/Sketch/InVision/Framer, then Illustrator/Photoshop, Miro etc. 16 weighted points = full marks.' },
      { key: 'methods', label: 'UX methods, research & psychology', max: 25, how: 'User research, usability testing, personas, wireframes, user flows, IA, design thinking, design systems, accessibility, psychology/HCI. 14 weighted points = full marks.' },
      { key: 'portfolio', label: 'Portfolio & design projects', max: 20, how: 'Portfolio link 8 (mention only 4) + 4 per design project/case study, up to 3.' },
      { key: 'experience', label: 'Experience fit (0-1 yr internship)', max: 10, how: 'Up to 1 yr = full marks (fresher with design signals too); then declines - over-qualified candidates score lower for a 10-15k stipend internship.' },
      { key: 'education', label: 'Education & design courses', max: 10, how: 'Design/HCI field 8, computing 6, other 4; +2 for Master\'s, +1 Bachelor\'s, +2 for a UX certificate/course.' },
      { key: 'extras', label: 'Aesthetic craft & domain fit', max: 10, how: 'Typography, colour, branding, illustration, motion (5) + sustainability interest (3) + web/app/job-board context (2).' },
    ],
  },
};