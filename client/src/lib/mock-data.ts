export const platformStats = {
  totalInvoicesFactored: 1247,
  totalVolume: 84_300_000,
  activeFactors: 38,
  avgSettlementHours: 4.2,
};

export const recentActivity = [
  {
    id: '1',
    type: 'factored' as const,
    amount: 250_000,
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
    hash: 'at1qz3...k7f2',
  },
  {
    id: '2',
    type: 'settled' as const,
    amount: 180_000,
    timestamp: new Date(Date.now() - 1000 * 60 * 23),
    hash: 'at1xr9...m4p1',
  },
  {
    id: '3',
    type: 'factored' as const,
    amount: 420_000,
    timestamp: new Date(Date.now() - 1000 * 60 * 51),
    hash: 'at1wd5...n8c6',
  },
  {
    id: '4',
    type: 'settled' as const,
    amount: 95_000,
    timestamp: new Date(Date.now() - 1000 * 60 * 74),
    hash: 'at1jk2...v3t9',
  },
  {
    id: '5',
    type: 'factored' as const,
    amount: 310_000,
    timestamp: new Date(Date.now() - 1000 * 60 * 102),
    hash: 'at1nb7...s5h3',
  },
];
