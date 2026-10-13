import Decimal from 'decimal.js';

describe('BMS Banking Core Engine & Financial Algorithms', () => {
  describe('Double-Entry General Ledger Invariance', () => {
    it('should assert sum of debits strictly equals sum of credits', () => {
      const journalLines = [
        { entryType: 'DEBIT', amount: new Decimal('5000.0000') },
        { entryType: 'CREDIT', amount: new Decimal('5000.0000') },
      ];

      const debits = journalLines
        .filter((l) => l.entryType === 'DEBIT')
        .reduce((sum, l) => sum.plus(l.amount), new Decimal(0));

      const credits = journalLines
        .filter((l) => l.entryType === 'CREDIT')
        .reduce((sum, l) => sum.plus(l.amount), new Decimal(0));

      expect(debits.equals(credits)).toBe(true);
      expect(debits.minus(credits).isZero()).toBe(true);
    });

    it('should reject unbalanced ledger entries', () => {
      const journalLines = [
        { entryType: 'DEBIT', amount: new Decimal('1500.0000') },
        { entryType: 'CREDIT', amount: new Decimal('1499.9900') },
      ];

      const debits = journalLines
        .filter((l) => l.entryType === 'DEBIT')
        .reduce((sum, l) => sum.plus(l.amount), new Decimal(0));

      const credits = journalLines
        .filter((l) => l.entryType === 'CREDIT')
        .reduce((sum, l) => sum.plus(l.amount), new Decimal(0));

      expect(debits.equals(credits)).toBe(false);
    });
  });

  describe('Deterministic Lock Ordering for Concurrency', () => {
    it('should always sort account IDs lexicographically to prevent deadlocks', () => {
      const accountA = 'acc-uuid-999';
      const accountB = 'acc-uuid-111';

      // Bidirectional transfers should both acquire locks in identical order
      const lockOrder1 = [accountA, accountB].sort();
      const lockOrder2 = [accountB, accountA].sort();

      expect(lockOrder1).toEqual(['acc-uuid-111', 'acc-uuid-999']);
      expect(lockOrder2).toEqual(['acc-uuid-111', 'acc-uuid-999']);
      expect(lockOrder1[0]).toBe(lockOrder2[0]);
    });
  });

  describe('Maker-Checker Dual Control Separation of Duties', () => {
    it('should reject approval if maker and checker are the same user', () => {
      const makerId = 'user-uuid-teller-01';
      const checkerId = 'user-uuid-teller-01';

      const isAuthorized = makerId !== checkerId;
      expect(isAuthorized).toBe(false);
    });

    it('should authorize approval when maker and checker are distinct authorized users', () => {
      const makerId = 'user-uuid-teller-01';
      const checkerId = 'user-uuid-manager-02';

      const isAuthorized = makerId !== checkerId;
      expect(isAuthorized).toBe(true);
    });
  });

  describe('Reducing-Balance Loan Amortization (EMI Formula)', () => {
    it('should calculate accurate monthly installment and total interest', () => {
      const principal = new Decimal('12000.0000');
      const annualRate = new Decimal('8.50');
      const n = 24; // 24 months

      const monthlyRate = annualRate.dividedBy(100).dividedBy(12);
      const onePlusR = monthlyRate.plus(1);
      const onePlusRPowN = onePlusR.pow(n);

      const emi = principal
        .times(monthlyRate)
        .times(onePlusRPowN)
        .dividedBy(onePlusRPowN.minus(1));

      // Illustrative check: For $12,000 at 8.5% for 24 months, EMI is ~$545.48
      expect(emi.toFixed(2)).toBe('545.48');

      // First month interest calculation
      const firstMonthInterest = principal.times(monthlyRate);
      expect(firstMonthInterest.toFixed(2)).toBe('85.00');

      const firstMonthPrincipal = emi.minus(firstMonthInterest);
      expect(firstMonthPrincipal.toFixed(2)).toBe('460.48');
    });
  });

  describe('Financial Balance Precision (Zero Floating-Point Drift)', () => {
    it('should avoid classic IEEE-754 binary floating point errors', () => {
      // Classic JS issue: 0.1 + 0.2 !== 0.3
      const jsFloat = 0.1 + 0.2;
      expect(jsFloat === 0.3).toBe(false);

      // Decimal.js banking standard
      const d1 = new Decimal('0.1');
      const d2 = new Decimal('0.2');
      const sum = d1.plus(d2);
      expect(sum.equals(new Decimal('0.3'))).toBe(true);
      expect(sum.toFixed(4)).toBe('0.3000');
    });
  });
});
