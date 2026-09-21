import { normalizeAmount, roundMoney } from './money.js';

function toCents(value) {
  return Math.round(roundMoney(value) * 100);
}

function fromCents(cents) {
  return roundMoney(cents / 100);
}

function validateParticipants(participants) {
  if (!Array.isArray(participants) || participants.length < 2) {
    throw new RangeError('At least two participants are required.');
  }
  if (participants.length > 6) {
    throw new RangeError('A maximum of six participants is supported.');
  }

  const ids = new Set();
  return participants.map((participant, index) => {
    const id = String(participant?.id ?? '').trim();
    if (!id) throw new TypeError(`Participant ${index + 1} needs an id.`);
    if (ids.has(id)) throw new RangeError(`Duplicate participant id: ${id}`);
    ids.add(id);

    const weight = normalizeAmount(participant?.weight ?? 1);
    if (weight <= 0) throw new RangeError('Participant weight must be greater than zero.');

    return {
      id,
      name: String(participant?.name ?? id).trim() || id,
      weight,
      sharedPaidCents: 0,
      personalPaidCents: 0,
      shareCents: 0,
    };
  });
}

function allocateCents(totalCents, participantIds, participantMap) {
  const selected = participantIds.map((id) => participantMap.get(id));
  if (selected.some((participant) => !participant)) {
    throw new RangeError('A shared participant id is unknown.');
  }

  const weightTotal = selected.reduce((sum, participant) => sum + participant.weight, 0);
  if (weightTotal <= 0) throw new RangeError('Split weights must add up to more than zero.');

  const raw = selected.map((participant, index) => {
    const exact = totalCents * participant.weight / weightTotal;
    const floor = Math.floor(exact);
    return { participant, index, floor, fraction: exact - floor };
  });

  let remainder = totalCents - raw.reduce((sum, item) => sum + item.floor, 0);
  raw.sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; i < remainder; i += 1) raw[i].floor += 1;
  raw.sort((a, b) => a.index - b.index);

  for (const item of raw) item.participant.shareCents += item.floor;
}

function buildSettlements(participants) {
  const creditors = participants
    .filter((participant) => participant.balanceCents > 0)
    .map((participant) => ({ id: participant.id, cents: participant.balanceCents }));
  const debtors = participants
    .filter((participant) => participant.balanceCents < 0)
    .map((participant) => ({ id: participant.id, cents: -participant.balanceCents }));

  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const cents = Math.min(debtor.cents, creditor.cents);

    if (cents > 0) {
      settlements.push({ from: debtor.id, to: creditor.id, amount: fromCents(cents) });
      debtor.cents -= cents;
      creditor.cents -= cents;
    }

    if (debtor.cents === 0) debtorIndex += 1;
    if (creditor.cents === 0) creditorIndex += 1;
  }

  return settlements;
}

export function calculateProjectBudget({ participants = [], transactions = [] } = {}) {
  const normalizedParticipants = validateParticipants(participants);
  const participantMap = new Map(normalizedParticipants.map((participant) => [participant.id, participant]));

  let totalSpendCents = 0;
  let sharedSpendCents = 0;
  let personalSpendCents = 0;

  for (const transaction of transactions) {
    const amount = normalizeAmount(transaction?.amount ?? 0);
    const rate = normalizeAmount(transaction?.rate ?? 1, { allowBlank: false });
    if (rate <= 0) throw new RangeError('Conversion rate must be greater than zero.');

    const payerId = String(transaction?.payerId ?? '').trim();
    const payer = participantMap.get(payerId);
    if (!payer) throw new RangeError('Transaction payer must match a participant.');

    const referenceCents = toCents(amount * rate);
    totalSpendCents += referenceCents;

    const shared = transaction?.shared !== false;
    if (!shared) {
      personalSpendCents += referenceCents;
      payer.personalPaidCents += referenceCents;
      continue;
    }

    sharedSpendCents += referenceCents;
    payer.sharedPaidCents += referenceCents;

    const sharedWith = transaction?.sharedWith == null
      ? normalizedParticipants.map((participant) => participant.id)
      : transaction.sharedWith;
    if (!Array.isArray(sharedWith) || sharedWith.length === 0) {
      throw new RangeError('Shared transactions need at least one participant.');
    }
    if (new Set(sharedWith).size !== sharedWith.length) {
      throw new RangeError('Shared participant ids must be unique.');
    }

    allocateCents(referenceCents, sharedWith, participantMap);
  }

  for (const participant of normalizedParticipants) {
    participant.balanceCents = participant.sharedPaidCents - participant.shareCents;
  }

  return {
    totalSpend: fromCents(totalSpendCents),
    sharedSpend: fromCents(sharedSpendCents),
    personalSpend: fromCents(personalSpendCents),
    participants: normalizedParticipants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      weight: participant.weight,
      sharedPaid: fromCents(participant.sharedPaidCents),
      personalPaid: fromCents(participant.personalPaidCents),
      share: fromCents(participant.shareCents),
      balance: fromCents(participant.balanceCents),
    })),
    settlements: buildSettlements(normalizedParticipants),
  };
}
