import { normalizeAmount } from './money.js';
import { calculateProjectBudget } from './project-budget.js';

const PARTICIPANT_SLOTS = 6;
const CATEGORIES = ['transport', 'lodging', 'food', 'activities', 'shopping', 'other'];

function noopController() {
  return {
    getState: () => null,
    restoreState() {},
    reset() {},
    render() {},
  };
}

export function initProjectTool({ money, onStateChange = () => {} } = {}) {
  const panel = document.querySelector('#panel-project');
  if (!panel) return noopController();

  const plannedBudget = document.querySelector('#project-budget');
  const projectTitle = document.querySelector('#project-title');
  const payerSelect = document.querySelector('#project-transaction-payer');
  const transactionForm = document.querySelector('#project-transaction-form');
  const transactionBody = document.querySelector('#project-transactions-body');
  const participantBody = document.querySelector('#project-participant-summary');
  const settlementsList = document.querySelector('#project-settlements');
  const categoriesList = document.querySelector('#project-categories');
  const errorBox = document.querySelector('#project-error');
  let transactions = [];

  const participantInputs = Array.from({ length: PARTICIPANT_SLOTS }, (_, index) => ({
    id: `p${index + 1}`,
    name: document.querySelector(`#project-participant-${index + 1}-name`),
    weight: document.querySelector(`#project-participant-${index + 1}-weight`),
  }));

  function participants() {
    return participantInputs.flatMap(({ id, name, weight }) => {
      const participantName = name.value.trim();
      if (!participantName) return [];
      return [{
        id,
        name: participantName,
        weight: weight.value.trim() === '' ? 1 : normalizeAmount(weight.value),
      }];
    });
  }

  function updatePayerOptions() {
    const current = payerSelect.value;
    payerSelect.replaceChildren();
    for (const participant of participants()) {
      const option = document.createElement('option');
      option.value = participant.id;
      option.textContent = participant.name;
      payerSelect.append(option);
    }
    if ([...payerSelect.options].some((option) => option.value === current)) {
      payerSelect.value = current;
    }
  }

  function transactionLabel(transaction) {
    return transaction.description || CATEGORIES.includes(transaction.category)
      ? (transaction.description || transaction.category)
      : 'Expense';
  }

  function renderTransactions() {
    transactionBody.replaceChildren();
    transactions.forEach((transaction, index) => {
      const row = document.createElement('tr');
      const payer = participants().find((participant) => participant.id === transaction.payerId);
      for (const text of [
        transactionLabel(transaction),
        `${transaction.amount.toFixed(2)} ${transaction.currency}`,
        transaction.rate.toFixed(4),
        payer?.name ?? transaction.payerId,
        transaction.shared ? 'Shared' : 'Personal',
      ]) {
        const cell = document.createElement('td');
        cell.textContent = text;
        row.append(cell);
      }
      const actionCell = document.createElement('td');
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'link-button';
      removeButton.dataset.removeTransaction = String(index);
      removeButton.textContent = 'Remove';
      actionCell.append(removeButton);
      row.append(actionCell);
      transactionBody.append(row);
    });
  }

  function renderSummary(result) {
    document.querySelector('#project-total').textContent = money(result.totalSpend);
    document.querySelector('#project-shared').textContent = money(result.sharedSpend);
    document.querySelector('#project-personal').textContent = money(result.personalSpend);
    const remaining = document.querySelector('#project-remaining');
    remaining.textContent = money(result.budgetRemaining);
    remaining.dataset.status = result.budgetStatus;

    participantBody.replaceChildren();
    for (const participant of result.participants) {
      const row = document.createElement('tr');
      const nameCell = document.createElement('th');
      nameCell.scope = 'row';
      nameCell.textContent = participant.name;
      row.append(nameCell);
      for (const value of [participant.sharedPaid, participant.personalPaid, participant.share, participant.balance]) {
        const cell = document.createElement('td');
        cell.textContent = money(value);
        row.append(cell);
      }
      participantBody.append(row);
    }

    settlementsList.replaceChildren();
    if (result.settlements.length === 0) {
      const item = document.createElement('li');
      item.textContent = 'No reimbursement needed.';
      settlementsList.append(item);
    } else {
      const byId = new Map(result.participants.map((participant) => [participant.id, participant.name]));
      for (const settlement of result.settlements) {
        const item = document.createElement('li');
        item.textContent = `${byId.get(settlement.from)} pays ${byId.get(settlement.to)} ${money(settlement.amount)}`;
        settlementsList.append(item);
      }
    }

    categoriesList.replaceChildren();
    for (const [category, amount] of Object.entries(result.byCategory)) {
      const item = document.createElement('li');
      item.textContent = `${category}: ${money(amount)}`;
      categoriesList.append(item);
    }
  }

  function showError(message = '') {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  function render() {
    updatePayerOptions();
    renderTransactions();
    const currentParticipants = participants();
    if (currentParticipants.length < 2) {
      showError('Add at least two participants to calculate the split.');
      return;
    }

    try {
      const result = calculateProjectBudget({
        plannedBudget: normalizeAmount(plannedBudget.value),
        participants: currentParticipants,
        transactions,
      });
      showError();
      renderSummary(result);
    } catch (error) {
      showError(error.message);
    }
  }

  function notify() {
    render();
    onStateChange();
  }

  for (const { name, weight } of participantInputs) {
    name.addEventListener('input', notify);
    weight.addEventListener('input', notify);
  }
  plannedBudget.addEventListener('input', notify);
  projectTitle.addEventListener('input', onStateChange);

  transactionForm.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const amount = normalizeAmount(document.querySelector('#project-transaction-amount').value, { allowBlank: false });
      const rate = normalizeAmount(document.querySelector('#project-transaction-rate').value, { allowBlank: false });
      if (rate <= 0) throw new RangeError('Conversion rate must be greater than zero.');
      if (!payerSelect.value) throw new RangeError('Choose who paid the expense.');

      transactions.push({
        description: document.querySelector('#project-transaction-description').value.trim(),
        category: document.querySelector('#project-transaction-category').value,
        amount,
        currency: document.querySelector('#project-transaction-currency').value,
        rate,
        payerId: payerSelect.value,
        shared: document.querySelector('#project-transaction-type').value === 'shared',
      });

      transactionForm.reset();
      document.querySelector('#project-transaction-rate').value = '1';
      document.querySelector('#project-transaction-type').value = 'shared';
      notify();
    } catch (error) {
      showError(error.message);
    }
  });

  transactionBody.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-transaction]');
    if (!button) return;
    transactions.splice(Number(button.dataset.removeTransaction), 1);
    notify();
  });

  document.querySelector('#project-clear-transactions').addEventListener('click', () => {
    transactions = [];
    notify();
  });

  function getState() {
    return {
      title: projectTitle.value,
      plannedBudget: plannedBudget.value,
      participants: participantInputs.map(({ name, weight }) => ({ name: name.value, weight: weight.value })),
      transactions,
    };
  }

  function restoreState(state) {
    if (!state || typeof state !== 'object') return;
    projectTitle.value = typeof state.title === 'string' ? state.title : '';
    plannedBudget.value = typeof state.plannedBudget === 'string' ? state.plannedBudget : '';
    if (Array.isArray(state.participants)) {
      participantInputs.forEach(({ name, weight }, index) => {
        const saved = state.participants[index];
        name.value = typeof saved?.name === 'string' ? saved.name : '';
        weight.value = typeof saved?.weight === 'string' ? saved.weight : '';
      });
    }
    transactions = Array.isArray(state.transactions)
      ? state.transactions.filter((transaction) => transaction && typeof transaction === 'object')
      : [];
    render();
  }

  function reset() {
    projectTitle.value = '';
    plannedBudget.value = '';
    participantInputs.forEach(({ name, weight }, index) => {
      name.value = index < 2 ? `Person ${index + 1}` : '';
      weight.value = index < 2 ? '1' : '';
    });
    transactions = [];
    transactionForm.reset();
    document.querySelector('#project-transaction-rate').value = '1';
    document.querySelector('#project-transaction-type').value = 'shared';
    render();
  }

  render();
  return { getState, restoreState, reset, render };
}
