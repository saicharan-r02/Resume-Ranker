const mk = (name, w, ...res) => ({
  name,
  w,
  res: res.map((r) => new RegExp(r.source, r.flags.includes('g') ? r.flags : r.flags + 'g')),
});
const grp = (group, term) => ({ ...term, group });

export const LCA_CONCEPTS = [
  mk('Life Cycle Assessment', 3, /\blife[\s-]?cycle\s+(?:assessment|analysis|analyses)s?\b/i),
  mk('LCA', 3, /\bLCAs?\b/),
  mk('Life Cycle Inventory (LCI)', 3, /\blife[\s-]?cycle\s+inventor(?:y|ies)\b/i, /\bLCI\b/),
  mk('Impact assessment (LCIA)', 2, /\blife[\s-]?cycle\s+impact\s+assessment\b/i, /\bLCIA\b/),
  mk('EPD', 3, /\benvironmental\s+product\s+declarations?\b/i, /\bEPDs?\b/),
  mk('Carbon footprint', 2, /\b(?:product\s+|corporate\s+|organi[sz]ational\s+)?carbon\s+footprint(?:ing)?\b/i, /\bPCF\b/),
  mk('System boundary / functional unit', 2, /\b(?:cradle[\s-]to[\s-](?:gate|grave|cradle)|gate[\s-]to[\s-]gate|system\s+boundar(?:y|ies)|functional\s+unit)\b/i),
  mk('Impact methods (ReCiPe/TRACI/CML/PEF)', 1.5, /\b(?:ReCiPe|TRACI|PEF)\b/, /\bCML(?:-?\w+)?\b/, /\bglobal\s+warming\s+potential\b/i, /\bimpact\s+categor(?:y|ies)\b/i),
  mk('GHG / carbon accounting', 1.5, /\b(?:GHG|greenhouse\s+gas(?:es)?|carbon\s+accounting|emission\s+factors?|net[\s-]zero|decarboni[sz]ation)\b/i, /\bscope\s*[123]\b/i),
  mk('Environmental impact assessment', 1, /\benvironmental\s+(?:impacts?|assessment|performance|management)\b/i),
  mk('Circular economy / eco-design', 1, /\b(?:circular\s+economy|eco[\s-]?design|design\s+for\s+environment|material\s+flow\s+analysis|end[\s-]of[\s-]life)\b/i),
  mk('ESG / sustainability reporting', 1, /\b(?:ESG|BRSR|GRI|CDP|SBTi|CSRD)\b/, /\bsustainability\s+report\w*/i),
  mk('Sustainability (general)', 0.5, /\bsustainab\w+\b/i),
];

export const LCA_SOFTWARE = [
  mk('GaBi', 10, /\bgabi\b/i),
  mk('SimaPro', 10, /\bsima\s?pro\b/i),
  mk('openLCA', 5, /\bopen\s?LCA\b/i),
  mk('Umberto', 5, /\bumberto\b/i),
  mk('One Click LCA', 5, /\bone\s*click\s*LCA\b/i),
  mk('ecoinvent', 3, /\becoinvent\b/i),
  mk('Other LCA tools', 3, /\b(?:brightway|athena\s+impact|GREET|Ecochain|Mobius|CCaLC|Sphera|eToolLCD)\b/i),
];
export const SOFTWARE_LEVEL = {
  GaBi: 1,
  SimaPro: 1,
  openLCA: 0.5,
  Umberto: 0.5,
  'One Click LCA': 0.5,
  ecoinvent: 0.3,
  'Other LCA tools': 0.3,
};

export const LCA_STANDARDS = [
  mk('ISO 14040', 4, /\b14040\b/),
  mk('ISO 14044', 4, /\b14044\b/),
  mk('ISO 14067', 2, /\b14067\b/),
  mk('ISO 14025 (EPD)', 2, /\b14025\b/),
  mk('ISO 14064', 1.5, /\b14064\b/),
  mk('EN 15804 / 15978', 2, /\bEN[\s-]*15(?:804|978)\b/i),
  mk('GHG Protocol / PAS 2050', 2, /\bGHG\s+protocol\b/i, /\bPAS\s*2050\b/i),
  mk('ISO 14001', 0.5, /\b14001\b/),
];

export const LCA_SUPPORT = [
  mk('Data collection', 1, /\bdata\s+(?:collection|gathering|compilation)\b/i),
  mk('Data validation / QC', 1, /\b(?:data\s+(?:validation|quality|verification)|quality\s+(?:control|assurance))\b/i),
  mk('Benchmarking', 1, /\bbenchmark\w*\b/i),
  mk('Stakeholder / client management', 1, /\b(?:stakeholder|client\s+(?:management|interaction|engagement)|customer\s+relationship)\w*/i),
  mk('Cross-functional work', 1, /\bcross[\s-]functional\b/i),
  mk('Supply chain / logistics', 1, /\b(?:supply\s+chain|logistics|transportation|supplier\w*)\b/i),
  mk('Energy / resource data', 1, /\b(?:energy\s+(?:audit|use|consumption|efficiency)|resource\s+efficiency|water\s+footprint|material\s+efficiency)\b/i),
  mk('Manufacturing / construction', 1, /\b(?:manufacturing|plant[\s-]level|construction|building\s+materials?)\b/i),
  mk('Assumptions / documentation', 1, /\b(?:assumptions?|audit[\s-]ready|traceab\w+|technical\s+report\w*)\b/i),
  mk('Research / literature', 1, /\b(?:literature\s+review|research\s+papers?|journal|publication)\w*/i),
  mk('Excel / data analysis', 1, /\b(?:excel|data\s+analysis|python|power\s*bi)\b/i),
  mk('Relocation / travel / Chennai', 1, /\b(?:relocat\w+|willing(?:ness)?\s+to\s+travel|travel\s+extensively|chennai)\b/i),
];

export const UX_TOOLS = [
  mk('Figma', 10, /\bfigma\b/i),
  mk('FigJam', 1.5, /\bfig\s?jam\b/i),
  mk('Adobe XD', 4, /\badobe\s*XD\b/i, /\bXD\b/),
  mk('Sketch', 4, /\bSketch\b/),
  mk('InVision', 3, /\binvision\b/i),
  mk('Framer', 3, /\bframer\b/i),
  mk('ProtoPie', 3, /\bprotopie\b/i),
  mk('Axure', 3, /\baxure\b/i),
  mk('Balsamiq', 3, /\bbalsamiq\b/i),
  mk('Zeplin / Penpot / UXPin', 2, /\b(?:zeplin|penpot|uxpin)\b/i),
  mk('Illustrator', 2, /\billustrator\b/i),
  mk('Photoshop', 2, /\bphotoshop\b/i),
  mk('After Effects / Lottie', 1.5, /\b(?:after\s+effects|lottie)\b/i),
  mk('InDesign / Canva', 1, /\b(?:indesign|canva)\b/i),
  mk('Miro / Whimsical / Maze', 1.5, /\b(?:miro|whimsical|maze|usabilityhub|lyssna|hotjar|optimal\s*workshop)\b/i),
  mk('Webflow / HTML / CSS', 1.5, /\bwebflow\b/i, /\bHTML5?\b/i, /\bCSS3?\b/i),
  mk('Jira / Notion / Analytics', 1, /\b(?:jira|notion|google\s+analytics|mixpanel)\b/i),
];

export const UX_METHODS = [
  mk('User research', 3, /\b(?:user|ux|design|usability|market)\s+research\b/i, /\buser\s+(?:interviews?|surveys?|studies)\b/i),
  mk('Usability testing', 3, /\busability\s+(?:testing|tests?|studies|evaluation)\b/i, /\buser\s+testing\b/i, /\bheuristic\s+evaluation\b/i),
  mk('Personas', 2, /\bpersonas?\b/i),
  mk('Wireframing', 2, /\bwire[\s-]?fram\w+\b/i),
  mk('Prototyping', 2, /\bprototyp\w+\b/i),
  mk('User flows / journey maps', 2, /\buser\s+(?:flows?|journeys?)\b/i, /\b(?:journey|empathy|experience)\s+maps?\w*\b/i, /\bstoryboard\w*\b/i),
  mk('Information architecture', 2, /\binformation\s+architecture\b/i, /\bcard\s+sorting\b/i, /\bsitemaps?\b/i),
  mk('Human-centered design / design thinking', 3, /\bhuman[\s-]?cent(?:er|re)d\b/i, /\bdesign\s+thinking\b/i, /\buser[\s-]cent(?:er|re)d\b/i),
  mk('Design systems', 2, /\bdesign\s+systems?\b/i, /\bstyle\s+guides?\b/i, /\bcomponent\s+librar\w+\b/i),
  mk('UX / UI design', 2, /\bUX\b/, /\bUI\s*\/\s*UX\b/, /\bUI\s+design\w*/i, /\buser\s+(?:experience|interface)\b/i, /\binteraction\s+design\b/i),
  mk('Visual design', 2, /\bvisual\s+design\b/i, /\bgraphic\s+design\b/i),
  mk('Accessibility', 1.5, /\baccessibilit\w+\b/i, /\bWCAG\b/),
  mk('A/B testing', 1, /\ba\/?b\s+test\w*\b/i),
  mk('Responsive / mobile-first', 1.5, /\bresponsive\b/i, /\bmobile[\s-]first\b/i, /\bcross[\s-]platform\b/i),
  mk('User psychology / HCI', 2, /\b(?:user|consumer|cognitive|behaviou?ral)\s+(?:psychology|behaviou?r|science|bias(?:es)?|load)\b/i, /\b(?:user|consumer|cognitive|behaviou?ral)\s+psycholog\w*\b/i, /\bHCI\b/, /\bhuman[\s-]computer\s+interaction\b/i, /\bgestalt\b/i),
  mk('Competitive analysis / UX audit', 1, /\b(?:competitive|competitor)\s+analysis\b/i, /\bux\s+audit\b/i),
  mk('Design handoff / agile', 0.5, /\b(?:developer|design)\s+handoff\b/i, /\b(?:agile|scrum)\b/i),
];

export const UX_EXTRAS = [
  grp('craft', mk('Typography', 1, /\btypograph\w+\b/i)),
  grp('craft', mk('Colour theory', 1, /\bcolou?r\s+(?:theory|palette|schemes?|psychology)\b/i)),
  grp('craft', mk('Branding / identity', 1, /\b(?:brand(?:ing)?\s+(?:identity|design|guidelines?)|logo\s+design|visual\s+identity)\b/i, /\bbranding\b/i)),
  grp('craft', mk('Illustration / iconography', 1, /\b(?:illustration|iconography|icon\s+design)\b/i)),
  grp('craft', mk('Motion / animation', 1, /\b(?:motion\s+(?:design|graphics)|animation|micro[\s-]?interactions?)\b/i)),
  grp('craft', mk('Layout / grid systems', 1, /\b(?:grid\s+systems?|layout\s+design|poster|print\s+design)\b/i)),
  grp('sustain', mk('Sustainability interest', 1, /\b(?:sustainab\w+|climate|environment\w*|ESG|social\s+impact)\b/i)),
  grp('domain', mk('Web / app / job-board design', 1, /\b(?:job\s+board|landing\s+page|website|web\s+design|web\s+app\w*|mobile\s+app\w*|e-?commerce|dashboard|SaaS)\b/i)),
];

export const LCA_REL = /\b(?:life[\s-]?cycle|LCAs?|LCI|LCIA|EPDs?|carbon\s+footprint\w*|gabi|sima\s?pro|openLCA|ecoinvent|14040|14044|environmental\s+product\s+declaration|cradle[\s-]to)\b/i;
export const UX_REL = /\b(?:ux|ui\s*\/\s*ux|ui\s+(?:design\w*|designer\w*|screens?|interfaces?)|user\s+experience\s+(?:design\w*|designer\w*|research\w*)|user\s+interface\s+design\w*|figma|wire[\s-]?fram\w+|high[\s-]fidelity|usability\s+(?:testing|tests?|evaluation|study|studies)|user\s+testing|user\s+research|user\s+flows?|information\s+architecture|prototype\w*|interaction\s+design\w*|digital\s+product\s+design\w*|web\s+design\w*|app\s+design\w*|interface\s+design\w*|(?:ux|ui|product)\s+design\s+intern\w*)\b/i;

export const SECTION_HEADERS = {
  summary: /^(?:professional |career |executive )?(?:summary|profile|objective|about(?: me)?|career objective|personal statement)$/,
  experience: /^(?:(?:work|professional|relevant|industry|internship|employment|career) )?(?:experience|experiences|employment(?: history)?|history|internships?)(?: (?:&|and) (?:internships?|projects?|training))?$|^work$|^internships?$/,
  education: /^(?:educational? )?(?:education(?:al)?(?: (?:qualifications?|background|details))?|academics?|academic (?:background|qualifications?|details)|qualifications?)$/,
  skills: /^(?:(?:technical|core|key|soft|professional|design|software|hard|digital|relevant) )?(?:skills?(?: set)?|competenc(?:y|ies)|expertise|tools(?: (?:&|and) (?:technologies|skills))?|software(?: skills| proficiency)?|technical proficiency|areas of expertise)$/,
  projects: /^(?:(?:academic|key|selected|personal|major|relevant|design|notable|featured) )?(?:projects?|case studies|portfolio)(?:\s*(?:\/|&|and)\s*(?:deliverables?|case studies?|portfolio))?$/,
  certifications: /^(?:licen[cs]es (?:&|and) )?(?:certifications?|certificates?|courses?|training(?: programs?)?|licen[cs]es)(?: (?:&|and) (?:courses?|training|certifications?|workshops?))?$/,
  publications: /^(?:publications?|research(?: papers| publications)?|papers)$/,
  awards: /^(?:awards?|achievements?|honou?rs|accomplishments?|extra[\s-]?curricular(?: activities)?)(?: (?:&|and) \w+)?$/,
  other: /^(?:interests|hobbies|languages|references|declaration|personal (?:details|information)|volunteer\w*|activities)$/,
};

export const CITIES = ['Chennai', 'Pune', 'Mumbai', 'Bengaluru', 'Bangalore', 'Hyderabad', 'Delhi', 'New Delhi', 'Gurgaon', 'Gurugram', 'Noida', 'Kolkata', 'Ahmedabad', 'Coimbatore', 'Kochi', 'Jaipur', 'Chandigarh', 'Nagpur', 'Indore', 'Vadodara', 'Thiruvananthapuram', 'Visakhapatnam', 'Bhubaneswar', 'Lucknow', 'Madurai', 'Trichy'];

export const UX_CERT_RE = /(google\s+ux|ux\s+design\s+(?:certificate|certification|professional)|interaction\s+design\s+foundation|\bIxDF\b|nielsen\s+norman|\bNN\/g\b|designlab|careerfoundry|figma\s+(?:academy|certified)|human[\s-]computer\s+interaction|coursera.*(?:ux|design)|udemy.*(?:ux|ui|figma|design))/i;
export const LCA_CERT_RE = /(gabi|simapro|lca\b|life\s+cycle|14040|14044|epd|carbon\s+footprint|ghg\s+protocol|sustainab)/i;
