import {
  AlertCircle,
  FileSearch,
  FileText,
  Target,
  TrendingUp,
  Users,
  Search,
  FileBarChart,
} from 'lucide-react'

import type {
  CompanyOption,
  MemoFieldDefinition,
  MemoTemplate,
  MemoTemplateId,
} from '@/containers/memos/lib/types'

export const memoTemplates: MemoTemplate[] = [
  {
    id: 'vcp-screen',
    name: 'Going-in Value Creation Plan',
    description: 'Value-Compounder-Price screening analysis for Universe → Watchlist transition',
    icon: FileSearch,
  },
  {
    id: 'earnings-preview',
    name: 'Earnings Preview',
    description: 'Pre-earnings checklist and expectations',
    icon: TrendingUp,
  },
  {
    id: 'earnings-summary',
    name: 'Earnings Summary',
    description: 'Post-earnings recap and recommendations',
    icon: FileText,
  },
  {
    id: 'target-weight-change',
    name: 'Target Weight Change',
    description: 'Adjust portfolio weighting and rationale',
    icon: Target,
  },
  {
    id: 'meeting-owned',
    name: 'Company Meeting – Owned',
    description: 'Owned coverage meeting notes',
    icon: Users,
  },
  {
    id: 'meeting-watchlist',
    name: 'Company Meeting – Watchlist',
    description: 'Watchlist meeting takeaways',
    icon: Users,
  },
  {
    id: 'meeting-first',
    name: 'Company Meeting – First',
    description: 'Initial meeting summary',
    icon: Users,
  },
  {
    id: 'meeting-lesser',
    name: 'Company Meeting – Lesser',
    description: 'Lighter-touch meeting recap',
    icon: Users,
  },
  {
    id: 'drawdown-40',
    name: '40% Drawdown',
    description: 'Position review after significant decline',
    icon: AlertCircle,
  },
  {
    id: 'investment-memo',
    name: 'Investment Memo',
    description: 'Comprehensive investment analysis',
    icon: FileBarChart,
  },
  {
    id: 'screen',
    name: 'Screen',
    description: 'Initial company screening',
    icon: Search,
  },
]

export const companies: CompanyOption[] = [
  { id: 'aapl-001', ticker: 'AAPL', name: 'Apple Inc.' },
  { id: 'msft-001', ticker: 'MSFT', name: 'Microsoft Corporation' },
  { id: 'googl-001', ticker: 'GOOGL', name: 'Alphabet Inc.' },
  { id: 'amzn-001', ticker: 'AMZN', name: 'Amazon.com, Inc.' },
  { id: 'nvda-001', ticker: 'NVDA', name: 'NVIDIA Corporation' },
  { id: 'meta-001', ticker: 'META', name: 'Meta Platforms, Inc.' },
  { id: 'tsla-001', ticker: 'TSLA', name: 'Tesla, Inc.' },
  { id: 'nflx-001', ticker: 'NFLX', name: 'Netflix, Inc.' },
]

type TemplateFieldMap = Record<MemoTemplateId, MemoFieldDefinition[]>

/** Shared Raw Notes and Transcript fields used across meeting templates */
const MEETING_RAW_NOTES_AND_TRANSCRIPT_FIELDS: MemoFieldDefinition[] = [
  {
    id: 'rawNotes',
    label: 'Raw Notes',
    type: 'textarea',
    placeholder: 'Unstructured meeting notes…',
  },
  {
    id: 'transcript',
    label: 'Transcript',
    type: 'textarea',
    placeholder: 'Meeting transcript…',
  },
]

export const templateFields: TemplateFieldMap = {
  'vcp-screen': [
    {
      id: 'sourcing',
      label: 'Sourcing',
      type: 'textarea',
      required: false,
      placeholder: 'How did this company come onto our radar? Why now?',
      helperText:
        "e.g., Has been on watchlist for 2 years, didn't spend time due to valuation. Interested now because valuation has corrected.",
      maxWords: 150,
    },
    {
      id: 'situationOverview',
      label: 'Situation Overview',
      type: 'textarea',
      required: false,
      placeholder: 'High-level business model, competitive position, and investment thesis',
      helperText: 'Describe what the company does, competitive advantages, market position',
      maxWords: 200,
    },
    {
      id: 'nonObviousCompChecklistItems',
      label: 'Non-Obvious Compounder Checklist',
      type: 'textarea',
      required: false,
      placeholder:
        'ROIC, Cash Conversion, Reinvestment Rate, FCF Margins, Balance Sheet, Management Team',
      helperText:
        'If deficiency exists, articulate why proceeding. Cover: ROIC (>15%), Cash Conversion (>75%), Reinvestment Rate, FCF Margins (>20%), Balance Sheet health, Management stability',
      maxBullets: 6,
    },
    {
      id: 'mistakeAvoidanceChecklistItems',
      label: 'Mistake Avoidance Checklist',
      type: 'textarea',
      required: false,
      placeholder:
        'Customer/Supplier concentration, Infrastructure risks, Valuation risks, Management outlook, Earnings growth, External blame',
      helperText:
        'Address: Customer/Supplier Concentration, Infrastructure in growth regions, Near ATH multiples, Management best days, Earnings growth outlook, Management accountability',
      maxBullets: 6,
    },
    {
      id: 'trustBank',
      label: 'Trust Bank Account',
      type: 'textarea',
      required: false,
      placeholder:
        'e.g., Low. Only met CFO once. CEO is brand new... OR High. Met CEO 5 times, know CFO well...',
      helperText: 'Assessment of management credibility and relationship depth',
      maxWords: 100,
    },
    {
      id: 'historyInNumbers',
      label: 'History in Numbers - Key Takeaways',
      type: 'textarea',
      required: false,
      placeholder: 'Key observations from historical financial data...',
      helperText: 'Upload historical data separately. List 5 key takeaways here',
      maxBullets: 5,
    },
    {
      id: 'valueDrivers',
      label: 'Value Drivers',
      type: 'textarea',
      required: false,
      placeholder:
        'Revenue-Related:\n• Revenue growth assumptions\n• Customer acquisition\n\nCost-Related:\n• Margin expansion\n\nCash Flow-Related:\n• FCF conversion',
      helperText:
        'What needs to happen to support/exceed our hurdle rate (Revenue/Cost/Cash Flow measures)',
      maxBullets: 15,
    },
    {
      id: 'verificationSteps',
      label: 'Verification Steps',
      type: 'textarea',
      required: false,
      placeholder:
        'Revenue-Related:\n• Questions to answer\n\nCost-Related:\n• Data to gather\n\nCash Flow-Related:\n• Validation steps',
      helperText:
        'How will we validate/disprove the thesis? (To inform Airplane Mode) - Cover Revenue/Cost/Cash Flow questions',
      maxBullets: 15,
    },
    {
      id: 'thesisInCharts',
      label: 'Thesis in Charts Description (Optional)',
      type: 'textarea',
      placeholder: "Describe what charts you'll attach and what they demonstrate",
      helperText: 'Optional - What visual evidence will you provide?',
      maxWords: 100,
    },
    {
      id: 'currentMultiple',
      label: 'Current Valuation Multiple (Optional)',
      type: 'number',
      placeholder: '20.5',
      step: '0.1',
      helperText: 'Current EV/EBITDA or P/E',
    },
    {
      id: 'historicalRange',
      label: 'Historical Valuation Range (Optional)',
      type: 'user_multi',
      placeholder: 'e.g., 5yr range: 15x-35x, now at 20x',
      helperText: 'Historical valuation context',
    },
    {
      id: 'peerComparison',
      label: 'Peer Valuation Comparison (Optional)',
      type: 'textarea',
      placeholder: 'How does valuation compare to peers?',
      helperText: 'Valuation vs peers',
      maxWords: 100,
    },
    {
      id: 'outstandingQuestions',
      label: 'Outstanding Questions (Optional)',
      type: 'textarea',
      placeholder: 'Key areas requiring further work/exploration...',
      helperText: 'Areas that need more investigation',
      maxWords: 150,
    },
  ],
  'earnings-preview': [
    {
      id: 'whatMattersQual',
      label: 'What matters? (Qualitative)',
      type: 'textarea',
      required: true,
      placeholder: 'List up to 3 key qualitative items to watch…',
      maxBullets: 3,
    },
    {
      id: 'whatMattersQuant',
      label: 'What matters? (Quantitative)',
      type: 'textarea',
      required: true,
      placeholder: 'List up to 3 key quantitative items to watch…',
      maxBullets: 3,
    },
    {
      id: 'callTime',
      label: 'Call Time',
      type: 'datetime-local',
      required: true,
      disallowPastDates: true,
    },
    {
      id: 'webcastLink',
      label: 'Webcast Link',
      type: 'url',
      required: true,
      placeholder: 'https://…',
    },
    {
      id: 'consensusPosition',
      label: 'Consensus Position',
      type: 'select',
      required: true,
      selectOptions: ['Above Consensus', 'In Line with Consensus', 'Below Consensus'],
    },
    {
      id: 'consensusRationale',
      label: 'Consensus Rationale',
      type: 'textarea',
      required: true,
      placeholder: 'Brief explanation of position (1 bullet)…',
      maxBullets: 1,
    },
    {
      id: 'managementMeeting',
      label: 'Management Meeting Booked?',
      type: 'yesno',
      required: true,
    },
    {
      id: 'outstandingQuestions',
      label: 'Outstanding Questions (Optional)',
      type: 'textarea',
      placeholder: 'Key areas requiring further work/exploration…',
      helperText: 'Areas that need more investigation',
      maxWords: 150,
    },
  ],
  'earnings-summary': [
    {
      id: 'convictionChange',
      label: 'Conviction Change?',
      type: 'select',
      required: true,
      selectOptions: ['Increase', 'Decrease', 'No Change'],
    },
    {
      id: 'convictionReason',
      label: 'Reason for Conviction Change / Key Takeaways',
      type: 'textarea',
      required: true,
      placeholder: 'Brief explanation…',
      maxWords: 50,
    },
    {
      id: 'recommendation',
      label: 'Recommendation',
      type: 'select',
      required: true,
      selectOptions: ['Rebalance', 'Increase', 'Reduce', 'No Action'],
    },
    {
      id: 'estimateRevisions',
      label: 'Estimate Revisions (Optional)',
      type: 'textarea',
      placeholder: 'Changes to financial estimates…',
    },
    {
      id: 'iveRevisions',
      label: 'IVE Revisions (Optional)',
      type: 'textarea',
      placeholder: 'Changes to Intrinsic Value Estimate…',
    },
    {
      id: 'outstandingQuestions',
      label: 'Outstanding Questions (Optional)',
      type: 'textarea',
      placeholder: 'Unresolved questions for follow-up…',
      maxWords: 150,
    },
  ],
  'target-weight-change': [
    {
      id: 'dateRecommended',
      label: 'Date Recommended',
      type: 'date',
      required: true,
      disallowPastDates: true,
    },
    {
      id: 'recommendation',
      label: 'Recommendation',
      type: 'user_multi',
      required: true,
      placeholder: 'e.g., Increase weight from 5% to 7%',
    },
    {
      id: 'rationale',
      label: 'Rationale – Why Now?',
      type: 'textarea',
      required: true,
      placeholder: 'Explanation of timing and reasoning…',
      maxWords: 150,
    },
    {
      id: 'ive',
      label: 'IVE (Intrinsic Value Estimate)',
      type: 'number',
      required: true,
      placeholder: '0.00',
      step: '0.01',
    },
    {
      id: 'downsideTarget',
      label: 'Downside Target',
      type: 'number',
      required: true,
      placeholder: '0.00',
      step: '0.01',
    },
    {
      id: 'riskReward',
      label: 'Risk/Reward Ratio (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
    },
    {
      id: 'outstandingQuestions',
      label: 'Outstanding Questions (Optional)',
      type: 'textarea',
      placeholder: 'Key areas requiring further work/exploration…',
      helperText: 'Areas that need more investigation',
      maxWords: 150,
    },
  ],
  'meeting-owned': [
    {
      id: 'companyAttendees',
      label: 'Company Attendees',
      type: 'user_multi',
      required: true,
      placeholder: 'Names of company representatives…',
    },
    {
      id: 'firmAttendees',
      label: 'Firm Attendees',
      type: 'user_multi',
      required: true,
      placeholder: 'Type @ to add people from the directory…',
      helperText: 'Pick internal team members from the directory (same list as document authors).',
    },
    {
      id: 'keyTakeaways',
      label: 'Key Takeaways',
      type: 'textarea',
      required: true,
      placeholder: 'Summarise primary insights…',
      maxWords: 250,
    },
    {
      id: 'convictionChange',
      label: 'Conviction Change? (Optional)',
      type: 'textarea',
      placeholder: 'Describe any change in conviction…',
    },
    {
      id: 'iveChange',
      label: 'IVE Change? (Optional)',
      type: 'textarea',
      placeholder: 'Describe any change to Intrinsic Value Estimate…',
    },
    {
      id: 'estimatesChange',
      label: 'Estimates Change? (Optional)',
      type: 'textarea',
      placeholder: 'Changes to financial estimates…',
    },
    {
      id: 'meetingRanking',
      label: 'Meeting Ranking (Optional)',
      type: 'select',
      selectOptions: ['1', '2', '3', '4', '5'],
    },
    {
      id: 'toneOfMeeting',
      label: 'Tone of Meeting (Optional)',
      type: 'user_multi',
      placeholder: 'e.g., Positive, Cautious, Neutral',
    },
    {
      id: 'mentions',
      label: '@Mentions (Optional)',
      type: 'user_multi',
      placeholder: 'Type @ to tag people from the directory…',
      helperText: 'Tag team members from the org directory.',
    },
    {
      id: 'fullMemosAttached',
      label: 'Full Memos Attached? (Optional)',
      type: 'yesno',
    },
    {
      id: 'outstandingQuestions',
      label: 'Outstanding Questions (Optional)',
      type: 'textarea',
      placeholder: 'Key areas requiring further work/exploration…',
      helperText: 'Areas that need more investigation',
      maxWords: 150,
    },
    ...MEETING_RAW_NOTES_AND_TRANSCRIPT_FIELDS,
  ],
  'meeting-watchlist': [
    {
      id: 'companyAttendees',
      label: 'Company Attendees',
      type: 'user_multi',
      required: true,
      placeholder: 'Names of company representatives…',
    },
    {
      id: 'firmAttendees',
      label: 'Firm Attendees',
      type: 'user_multi',
      required: true,
      placeholder: 'Type @ to add people from the directory…',
      helperText: 'Pick internal team members from the directory (same list as document authors).',
    },
    {
      id: 'keyTakeaways',
      label: 'Key Takeaways',
      type: 'textarea',
      required: true,
      placeholder: 'Summarise primary insights…',
      maxWords: 200,
    },
    {
      id: 'toneOfMeeting',
      label: 'Tone of Meeting (Optional)',
      type: 'user_multi',
      placeholder: 'e.g., Positive, Cautious, Neutral',
    },
    {
      id: 'mentions',
      label: '@Mentions (Optional)',
      type: 'user_multi',
      placeholder: 'Type @ to tag people from the directory…',
      helperText: 'Tag team members from the org directory.',
    },
    {
      id: 'addToWatchlist',
      label: 'Add to Watchlist? (Optional)',
      type: 'yesno',
    },
    {
      id: 'preliminaryIRR',
      label: 'Preliminary IRR (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
      helperText: 'Initial IRR estimate (%)',
    },
    {
      id: 'outstandingQuestions',
      label: 'Outstanding Questions (Optional)',
      type: 'textarea',
      placeholder: 'Key areas requiring further work/exploration…',
      helperText: 'Areas that need more investigation',
      maxWords: 150,
    },
    ...MEETING_RAW_NOTES_AND_TRANSCRIPT_FIELDS,
  ],
  'meeting-first': [
    {
      id: 'companyAttendees',
      label: 'Company Attendees',
      type: 'user_multi',
      required: true,
      placeholder: 'Names of company representatives…',
    },
    {
      id: 'firmAttendees',
      label: 'Firm Attendees',
      type: 'user_multi',
      required: true,
      placeholder: 'Type @ to add people from the directory…',
      helperText: 'Pick internal team members from the directory (same list as document authors).',
    },
    {
      id: 'keyTakeaways',
      label: 'Key Takeaways',
      type: 'textarea',
      required: true,
      placeholder: 'Summarise primary insights…',
      maxWords: 200,
    },
    {
      id: 'mentions',
      label: '@Mentions (Optional)',
      type: 'user_multi',
      placeholder: 'Type @ to tag people from the directory…',
      helperText: 'Tag team members from the org directory.',
    },
    {
      id: 'addToWatchlist',
      label: 'Add to Watchlist? (Optional)',
      type: 'yesno',
    },
    {
      id: 'outstandingQuestions',
      label: 'Outstanding Questions (Optional)',
      type: 'textarea',
      placeholder: 'Key areas requiring further work/exploration…',
      helperText: 'Areas that need more investigation',
      maxWords: 150,
    },
    ...MEETING_RAW_NOTES_AND_TRANSCRIPT_FIELDS,
  ],
  'meeting-lesser': [
    {
      id: 'companyAttendees',
      label: 'Company Attendees',
      type: 'user_multi',
      required: true,
      placeholder: 'Names of company representatives…',
    },
    {
      id: 'keyTakeaways',
      label: 'Key Takeaways',
      type: 'textarea',
      required: true,
      placeholder: 'Summarise primary insights…',
      maxWords: 200,
    },
    {
      id: 'mentions',
      label: '@Mentions (Optional)',
      type: 'user_multi',
      placeholder: 'Type @ to tag people from the directory…',
      helperText: 'Tag team members from the org directory.',
    },
    {
      id: 'outstandingQuestions',
      label: 'Outstanding Questions (Optional)',
      type: 'textarea',
      placeholder: 'Key areas requiring further work/exploration…',
      helperText: 'Areas that need more investigation',
      maxWords: 150,
    },
    ...MEETING_RAW_NOTES_AND_TRANSCRIPT_FIELDS,
  ],
  'drawdown-40': [
    {
      id: 'whatHappened',
      label: 'What happened?',
      type: 'textarea',
      required: true,
      placeholder: 'Describe the catalyst or trigger…',
      maxWords: 100,
    },
    {
      id: 'drawdownCause',
      label: 'Primary Cause',
      type: 'textarea',
      required: true,
      placeholder: 'Identify the root cause…',
    },
    {
      id: 'iveChange',
      label: 'IVE Change (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
      helperText: 'Change in Intrinsic Value Estimate',
    },
    {
      id: 'targetWeightChange',
      label: 'Target Weight Change (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
      helperText: 'Change in target portfolio weight (%)',
    },
    {
      id: 'actualWeightChange',
      label: 'Actual Weight Change (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
      helperText: 'Change in actual portfolio weight (%)',
    },
    {
      id: 'irrChange',
      label: 'IRR Change (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
      helperText: 'Change in Internal Rate of Return (%)',
    },
    {
      id: 'riskRewardChange',
      label: 'Risk/Reward Change (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
      helperText: 'Change in Risk/Reward ratio',
    },
    {
      id: 'priceChange',
      label: 'Price Change (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
      helperText: 'Change in stock price',
    },
    {
      id: 'marketCapChange',
      label: 'Market Cap Change (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
      helperText: 'Change in market capitalization',
    },
    {
      id: 'consensusEarningsChange',
      label: 'Consensus Earnings Change (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
      helperText: 'Change in consensus earnings estimate',
    },
    {
      id: 'consensusEbitdaChange',
      label: 'Consensus EBITDA Change (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
      helperText: 'Change in consensus EBITDA estimate',
    },
    {
      id: 'consensusEpsChange',
      label: 'Consensus EPS Change (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
      helperText: 'Change in consensus EPS estimate',
    },
    {
      id: 'consensusPeChange',
      label: 'Consensus P/E Change (Optional)',
      type: 'number',
      placeholder: '0.00',
      step: '0.01',
      helperText: 'Change in consensus P/E ratio',
    },
    {
      id: 'thesisChange',
      label: 'Thesis Change (Optional)',
      type: 'textarea',
      placeholder: 'Describe any changes to the investment thesis…',
    },
    {
      id: 'outstandingQuestions',
      label: 'Outstanding Questions (Optional)',
      type: 'textarea',
      placeholder: 'Key areas requiring further work/exploration…',
      helperText: 'Areas that need more investigation',
      maxWords: 150,
    },
  ],
  screen: [
    // Dynamic Snapshot Section
    {
      id: 'ticker',
      label: 'TICKER',
      type: 'text',
      placeholder: 'AAPL',
    },
    {
      id: 'companyName',
      label: 'NAME',
      type: 'text',
      placeholder: 'Auto-fill from ticker',
    },
    {
      id: 'sectorIndustry',
      label: 'SECTOR/INDUSTRY',
      type: 'text',
      placeholder: 'Technology',
    },
    {
      id: 'country',
      label: 'COUNTRY',
      type: 'select',
      selectOptions: ['Select...', 'USA', 'UK', 'Germany', 'France', 'China', 'Japan'],
      placeholder: 'Select...',
    },
    {
      id: 'aof',
      label: 'AOF',
      type: 'text',
      placeholder: 'Auto-fill',
    },
    {
      id: 'investor',
      label: 'INVESTOR',
      type: 'text',
      placeholder: 'Enter investor',
    },
    // Financial Metrics - Currency and Units
    {
      id: 'currency',
      label: 'CURR',
      type: 'select',
      selectOptions: ['USD', 'EUR', 'GBP', 'JPY', 'CNY'],
    },
    {
      id: 'rating',
      label: 'RATING',
      type: 'select',
      selectOptions: ['Select...', 'Buy', 'Hold', 'Sell', 'Strong Buy', 'Strong Sell'],
    },
    {
      id: 'marketCap',
      label: 'MC (USD)',
      type: 'number',
      placeholder: '2.8B',
      step: '0.1',
    },
    {
      id: 'cash',
      label: 'CASH (USD)',
      type: 'number',
      placeholder: '500M',
      step: '0.1',
    },
    {
      id: 'debt',
      label: 'DEBT (USD)',
      type: 'number',
      placeholder: '200M',
      step: '0.1',
    },
    {
      id: 'ev',
      label: 'EV (USD)',
      type: 'number',
      placeholder: '2.5B',
      step: '0.1',
    },
    // Narrative Block
    {
      id: 'businessOverview',
      label: 'Business Overview',
      type: 'textarea',
      placeholder: 'What does the company do? Core business model, products, and services...',
      helperText: 'Describe the core business model and what the company does',
      maxWords: 250,
    },
    {
      id: 'variantPerception',
      label: 'Variant Perception',
      type: 'textarea',
      placeholder:
        'Our non-consensus view, what others are missing, why we believe the market is mispricing this opportunity...',
      helperText: 'What is the market missing? (Thesis)',
      maxWords: 250,
    },
    // Quantitative Market Analysis - TAM Logic
    {
      id: 'tamIndustry',
      label: 'INDUSTRY',
      type: 'text',
      placeholder: 'BPO Services',
    },
    {
      id: 'tamSize',
      label: 'SIZE',
      type: 'number',
      placeholder: '350',
      step: '1',
    },
    {
      id: 'tamUnit',
      label: '000s',
      type: 'select',
      selectOptions: ['M', 'B', 'T'],
    },
    {
      id: 'tamBaseYear',
      label: 'REF YEAR',
      type: 'number',
      placeholder: '2018',
      step: '1',
    },
    {
      id: 'growthLastYear',
      label: 'GROWTH LAST YEAR',
      type: 'text',
      placeholder: '3.8%',
    },
    {
      id: 'expectedSize',
      label: 'EXPECTED SIZE',
      type: 'number',
      placeholder: '416',
      step: '1',
    },
    {
      id: 'expectedUnit',
      label: 'EXP. UNIT',
      type: 'select',
      selectOptions: ['M', 'B', 'T'],
    },
    {
      id: 'expectedGrowth',
      label: 'EXPECTED GROWTH',
      type: 'text',
      placeholder: '10%',
    },
    {
      id: 'untilYear',
      label: 'UNTIL YEAR',
      type: 'number',
      placeholder: '2023',
      step: '1',
    },
    // CAGR Logic
    {
      id: 'cagrMode',
      label: 'CAGR MODE',
      type: 'select',
      selectOptions: ['Select...', 'Automatic', 'Manual'],
    },
    {
      id: 'cagr',
      label: 'CAGR',
      type: 'text',
      placeholder: '10.5%',
    },
    // Market Share
    {
      id: 'sales',
      label: 'SALES',
      type: 'number',
      placeholder: '25',
      step: '1',
    },
    {
      id: 'salesUnit',
      label: '000s',
      type: 'select',
      selectOptions: ['M', 'B', 'T'],
    },
    {
      id: 'region',
      label: 'REGION',
      type: 'text',
      placeholder: 'The World',
    },
    {
      id: 'marketShare',
      label: 'MARKET SHARE',
      type: 'text',
      placeholder: '2.5%',
    },
    {
      id: 'calculationMode',
      label: 'CALCULATION MODE',
      type: 'select',
      selectOptions: ['Automatic', 'Manual'],
    },
    {
      id: 'impliedShare',
      label: 'IMPLIED SHARE',
      type: 'text',
      placeholder: '--%',
    },
    // Momentum & Audit
    {
      id: 'takingMarketShare',
      label: 'DO THEY APPEAR TO BE TAKING MARKET SHARE?',
      type: 'select',
      selectOptions: ['Select...', 'Yes', 'No', 'Uncertain'],
    },
    // Generic Economics Data Grid (stored as JSON string)
    {
      id: 'economicsDataGrid',
      label: 'Generic Economics Data Grid',
      type: 'textarea',
      placeholder: 'Economic metrics data (auto-populated from grid)',
      helperText:
        'Data grid for economic metrics across time periods (Sales, Gross Margin %, EBITDA, EBIT, ROIC, FCF Conversion)',
    },
    // Supporting Charts (stored as JSON string)
    {
      id: 'supportingCharts',
      label: 'Supporting Charts',
      type: 'textarea',
      placeholder: 'Supporting charts data (auto-populated)',
      helperText: 'Upload charts and visualizations to support your analysis',
    },
    // Management & Risk
    {
      id: 'founderLed',
      label: 'Founder-led (Y/N)',
      type: 'select',
      selectOptions: ['Select...', 'Yes', 'No'],
    },
    {
      id: 'ceoName',
      label: 'CEO Name',
      type: 'text',
      required: false,
      placeholder: 'Tim Cook',
    },
    {
      id: 'ownershipPercent',
      label: 'Ownership %',
      type: 'number',
      placeholder: '5',
      step: '0.1',
    },
    // Moat Analysis
    {
      id: 'moatUniqueness',
      label: 'What, if anything, makes them unique?',
      type: 'textarea',
      placeholder: 'Describe competitive advantages, unique positioning, differentiation...',
    },
    {
      id: 'moatOrganization',
      label: 'How are their people organized (G&A, R&D, S&M % of sales)',
      type: 'textarea',
      placeholder: 'Describe organizational structure and spending allocation...',
    },
    {
      id: 'moatWidening',
      label: 'Is there moat widening or shrinking?',
      type: 'textarea',
      placeholder: 'Assess competitive position trajectory...',
    },
    {
      id: 'moatProven',
      label: 'Is this a proven company? Why/why not?',
      type: 'textarea',
      placeholder: 'Assess track record and business maturity...',
    },
    {
      id: 'moatConstraint',
      label: 'What has been the constraint to growth?',
      type: 'textarea',
      placeholder: 'Identify historical growth constraints...',
    },
    // Management Quality
    {
      id: 'founderLedAnalysis',
      label: 'Is it a founder led organization?',
      type: 'textarea',
      placeholder: '',
    },
    {
      id: 'managementIncentives',
      label: 'How is management incentivized?',
      type: 'textarea',
      placeholder: '',
    },
    {
      id: 'preMortem',
      label: 'Biggest Concerns',
      type: 'textarea',
      placeholder: '',
      maxWords: 300,
    },
    {
      id: 'capitalAllocation',
      label: 'Do they have a strong capital allocation track record?',
      type: 'textarea',
      placeholder: '',
    },
    // Analyzability Check
    {
      id: 'analyzabilityWebsite',
      label: 'Website',
      type: 'select',
      selectOptions: ['...', 'Yes', 'No'],
    },
    {
      id: 'analyzabilityInvestorDeck',
      label: 'Investor Pres.',
      type: 'select',
      selectOptions: ['...', 'Yes', 'No'],
    },
    {
      id: 'analyzabilityExternalData',
      label: 'Info Online',
      type: 'select',
      selectOptions: ['...', 'Yes', 'No'],
    },
    // Market Analysis - Analysis Section
    {
      id: 'industryGrowthAnalysis',
      label: 'How big is the industry and how fast has it been growing?',
      type: 'textarea',
      placeholder: '',
    },
    {
      id: 'marketStructure',
      label: 'Describe the market structure',
      type: 'textarea',
      placeholder: '',
    },
    {
      id: 'competitorMetrics',
      label: 'What sort of margins, returns and growth rates do the larger competitors earn?',
      type: 'textarea',
      placeholder: '',
    },
    {
      id: 'tamExpansion',
      label: 'Have they entered new markets/products that expanded the TAM in the last 5 years?',
      type: 'textarea',
      placeholder: '',
    },
  ],
  'investment-memo': [],
}

/**
 * Screen template section configurations (grouped fields for better UX)
 * Used by ScreenTemplateForm for data-driven rendering
 */
export const screenSections: Array<{
  title: string
  fields?: Array<{
    id: string
    label: string
    type: 'text' | 'textarea' | 'select' | 'number' | 'yesno'
    required?: boolean
    placeholder?: string
    helperText?: string
    selectOptions?: string[]
    step?: string
    maxWords?: number
  }>
  subsections?: Array<{
    title: string
    fields: Array<{
      id: string
      label: string
      type: 'text' | 'textarea' | 'select' | 'number' | 'yesno'
      required?: boolean
      placeholder?: string
      helperText?: string
      selectOptions?: string[]
      step?: string
      maxWords?: number
    }>
    layout?: 'grid-2' | 'grid-3' | 'grid-4' | 'full'
  }>
  layout?: 'grid-2' | 'grid-3' | 'grid-4' | 'full'
}> = [
  // Key Data Snapshot & Screening Score
  {
    title: 'Key Data Snapshot & Screening Score',
    layout: 'grid-3',
    fields: [
      { id: 'ticker', label: 'TICKER', type: 'text', placeholder: 'AAPL' },
      {
        id: 'companyName',
        label: 'NAME',
        type: 'text',
        placeholder: 'Company Name',
      },
      {
        id: 'sectorIndustry',
        label: 'CLASSIFICATION (SECTOR/INDUSTRY)',
        type: 'text',
        placeholder: 'e.g., Technology, Healthcare',
      },
      { id: 'country', label: 'COUNTRY', type: 'text', placeholder: 'USA' },
      {
        id: 'rating',
        label: 'RATING',
        type: 'select',
        selectOptions: ['Select...', 'Buy', 'Hold', 'Sell', 'Strong Buy', 'Strong Sell'],
      },
      {
        id: 'currency',
        label: 'CURR',
        type: 'select',
        selectOptions: ['USD', 'EUR', 'GBP', 'JPY', 'CNY'],
        helperText: 'Currency for financial metrics',
      },
      {
        id: 'units',
        label: 'UNITS',
        type: 'select',
        selectOptions: ['M', 'B', 'T'],
        helperText: 'M=Millions, B=Billions, T=Trillions',
      },
      {
        id: 'marketCap',
        label: 'MC (Market Cap)',
        type: 'number',
        placeholder: '2.5',
        step: '0.1',
      },
      {
        id: 'netCashDebt',
        label: 'CASH (Net Cash/Debt)',
        type: 'number',
        placeholder: '0.5',
        step: '0.1',
      },
      {
        id: 'ev',
        label: 'EV (Enterprise Value)',
        type: 'number',
        placeholder: '3.0',
        step: '0.1',
      },
    ],
  },

  // Business & Thesis
  {
    title: 'Business & Thesis',
    layout: 'full',
    fields: [
      {
        id: 'businessOverview',
        label: 'In 1-2 sentences - What do they do?',
        type: 'textarea',
        placeholder: 'What does the company do? Core business model, products, and services...',
        maxWords: 250,
      },
      {
        id: 'variantPerception',
        label: 'What is the thesis on how we make money?',
        type: 'textarea',
        placeholder:
          'Our non-consensus view, what others are missing, why we believe the market is mispricing this opportunity...',
        maxWords: 250,
        helperText: 'What is the market missing? (Thesis)',
      },
    ],
  },

  // Market Analysis
  {
    title: 'Market Analysis',
    layout: 'full',
    subsections: [
      {
        title: 'Size of the TAM and how fast is it growing?',
        layout: 'grid-4',
        fields: [
          {
            id: 'tamSize',
            label: 'SIZE',
            type: 'number',
            placeholder: '500',
            step: '1',
          },
          {
            id: 'tamUnit',
            label: 'UNIT (000s)',
            type: 'select',
            selectOptions: ['M', 'B', 'T'],
          },
          { id: 'tamBaseYear', label: 'REF YEAR', type: 'number', placeholder: '2024', step: '1' },
          {
            id: 'tamExpectedGrowth',
            label: 'EXPECTED GROWTH (%)',
            type: 'number',
            placeholder: '15',
            step: '0.1',
          },
        ],
      },
      {
        title: '',
        layout: 'grid-2',
        fields: [
          {
            id: 'cagrMode',
            label: 'CAGR MODE',
            type: 'select',
            selectOptions: ['Automatic', 'Manual'],
          },
          {
            id: 'cagrPercent',
            label: 'CAGR %',
            type: 'number',
            placeholder: 'Enter CAGR',
            step: '0.1',
          },
        ],
      },
      {
        title: 'What is their market share?',
        layout: 'grid-3',
        fields: [
          { id: 'currentSales', label: 'SALES', type: 'number', placeholder: '50', step: '0.1' },
          {
            id: 'marketSharePercent',
            label: 'MARKET SHARE %',
            type: 'number',
            placeholder: '10',
            step: '0.1',
          },
          {
            id: 'shareTrajectory',
            label: 'SHARE TRAJECTORY',
            type: 'select',
            selectOptions: ['Select...', 'Increasing', 'Stable', 'Decreasing'],
          },
        ],
      },
    ],
  },

  // Economics of the Business
  {
    title:
      'What are the economics of the business? (Gross Margin, EBIT Margin, ROIC, ROE, Unit Economics)',
    layout: 'full',
    fields: [
      {
        id: 'economicsDataGrid',
        label: 'Economic Metrics',
        type: 'textarea',
        placeholder:
          'Describe key economic metrics: Gross Margin, EBIT Margin, ROIC, ROE, Unit Economics...',
        helperText: 'Provide details on profitability metrics and unit economics',
      },
    ],
  },

  // Moat Analysis
  {
    title: 'Moat Analysis',
    layout: 'full',
    fields: [
      {
        id: 'moatUniqueness',
        label: 'What, if anything, makes them unique?',
        type: 'textarea',
        placeholder: 'Describe competitive advantages, unique positioning, differentiation...',
      },
      {
        id: 'moatOrganization',
        label: 'How are their people organized (G&A, R&D, S&M % of sales)',
        type: 'textarea',
        placeholder: 'Describe organizational structure and spending allocation...',
      },
      {
        id: 'moatWidening',
        label: 'Is there moat widening or shrinking?',
        type: 'textarea',
        placeholder: 'Assess competitive position trajectory...',
      },
      {
        id: 'moatProven',
        label: 'Is this a proven company? Why/why not?',
        type: 'textarea',
        placeholder: 'Assess track record and business maturity...',
      },
      {
        id: 'moatConstraint',
        label: 'What has been the constraint to growth?',
        type: 'textarea',
        placeholder: 'Identify historical growth constraints...',
      },
    ],
  },

  // Management Quality
  {
    title: 'Management Quality',
    layout: 'full',
    subsections: [
      {
        title: '',
        layout: 'grid-3',
        fields: [
          {
            id: 'founderLed',
            label: 'Is it a founder led organization?',
            type: 'select',
            selectOptions: ['Select...', 'Yes', 'No'],
          },
          {
            id: 'ceoName',
            label: 'CEO Name',
            type: 'text',
            required: false,
            placeholder: 'Tim Cook',
          },
          {
            id: 'ownershipPercent',
            label: 'Ownership %',
            type: 'number',
            placeholder: '5',
            step: '0.1',
          },
        ],
      },
      {
        title: '',
        layout: 'full',
        fields: [
          {
            id: 'managementIncentives',
            label: 'How is management incentivized?',
            type: 'textarea',
            placeholder: 'Describe compensation structure and incentives...',
          },
        ],
      },
    ],
  },

  // Biggest Concerns
  {
    title: 'Biggest Concerns',
    layout: 'full',
    fields: [
      {
        id: 'preMortem',
        label: 'Pre-Mortem - What could go wrong?',
        type: 'textarea',
        placeholder:
          'What could go wrong? Key risks, potential failure modes, reasons the investment thesis might not play out...',
        maxWords: 300,
        helperText: 'Biggest Concerns / Why we lose money',
      },
      {
        id: 'capitalAllocation',
        label: 'Do they have a strong capital allocation track record?',
        type: 'textarea',
        placeholder: 'Assess historical capital allocation decisions...',
      },
    ],
  },

  // Analyzability
  {
    title: 'Is it Analyzable?',
    layout: 'grid-3',
    fields: [
      {
        id: 'analyzabilityWebsite',
        label: 'Website',
        type: 'select',
        selectOptions: ['...', 'Yes', 'No'],
      },
      {
        id: 'analyzabilityInvestorDeck',
        label: 'Investor Pres.',
        type: 'select',
        selectOptions: ['...', 'Yes', 'No'],
      },
      {
        id: 'analyzabilityExternalData',
        label: 'Info Online',
        type: 'select',
        selectOptions: ['...', 'Yes', 'No'],
      },
    ],
  },
]

export const analystName = 'Sarah Miller'

export function generateMemoTitle(
  template: MemoTemplate | undefined,
  companyIdsOrTickers: string | string[] | undefined,
  customCompanies?: CompanyOption[]
): string {
  if (!template) {
    return ''
  }

  // Use custom companies if provided, otherwise use hardcoded companies
  const companiesList = customCompanies || companies

  // Handle both single string (backward compatibility) and array
  const idsArray = Array.isArray(companyIdsOrTickers)
    ? companyIdsOrTickers
    : companyIdsOrTickers
      ? [companyIdsOrTickers]
      : []

  // Find companies by ID
  const selectedCompanies = idsArray
    .map(
      (id) =>
        companiesList.find((item) => item.id === id) ||
        companiesList.find((item) => item.ticker === id)
    )
    .filter(Boolean)

  const date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Generate title based on number of companies
  if (selectedCompanies.length === 0) {
    return `${template.name} – [Select Company] – ${date}`
  } else if (selectedCompanies.length === 1) {
    return `${template.name} – ${selectedCompanies[0]?.name ?? '[Select Company]'} – ${date}`
  } else {
    // Multiple companies: show first company + count
    return `${template.name} – ${selectedCompanies[0]?.name} +${selectedCompanies.length - 1} – ${date}`
  }
}
