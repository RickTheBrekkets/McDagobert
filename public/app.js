async function loadData() {
  const res = await fetch('price-list.json');
  return res.json();
}

function createPerson(id, items) {
  const div = document.createElement('div');
  div.className = 'person';
  div.innerHTML = `<label>Name: <input type="text" class="pname"></label>
  <div class="items"></div>
  <button class="add-item">Add Item</button>`;
  div.dataset.id = id;
  div.querySelector('.add-item').addEventListener('click', () => addItemRow(div, items));
  return div;
}

function addItemRow(personDiv, items) {
  const container = personDiv.querySelector('.items');
  const row = document.createElement('div');
  const select = document.createElement('select');
  Object.keys(items).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
  const qty = document.createElement('input');
  qty.type = 'number';
  qty.value = 1;
  qty.min = 1;
  row.appendChild(select);
  row.appendChild(qty);
  container.appendChild(row);
}

function gatherOrders(root) {
  const orders = [];
  root.querySelectorAll('.person').forEach(div => {
    const name = div.querySelector('.pname').value || 'Anonymous';
    const items = {};
    div.querySelectorAll('.items > div').forEach(row => {
      const item = row.querySelector('select').value;
      const qty = parseInt(row.querySelector('input').value, 10);
      items[item] = (items[item] || 0) + qty;
    });
    orders.push({name, items});
  });
  return orders;
}

function aggregateRequirements(orders) {
  const req = {};
  orders.forEach(o => {
    Object.entries(o.items).forEach(([item, qty]) => {
      req[item] = (req[item] || 0) + qty;
    });
  });
  return req;
}

function reqKey(req) {
  const keys = Object.keys(req).sort();
  return keys.map(k => k + ':' + req[k]).join(',');
}

function cloneMap(m) {
  const out = {};
  Object.entries(m).forEach(([k,v]) => out[k] = v);
  return out;
}

function optimize(req, data, memo = {}) {
  const key = reqKey(req);
  if (key in memo) return memo[key];
  const allZero = Object.values(req).every(q => q === 0);
  if (allZero) return memo[key] = {cost:0, combos:{}, singles:{}};
  let best = {cost: Infinity};

  for (const combo of data.combos) {
    const newReq = cloneMap(req);
    let applicable = true;
    for (const item of combo.items) {
      if (!newReq[item] || newReq[item] <= 0) { applicable = false; break; }
      newReq[item] -= 1;
    }
    if (applicable) {
      const sol = optimize(newReq, data, memo);
      const cost = sol.cost + combo.price;
      if (cost < best.cost) {
        best = {
          cost,
          combos: cloneMap(sol.combos),
          singles: cloneMap(sol.singles)
        };
        best.combos[combo.name] = (best.combos[combo.name] || 0) + 1;
      }
    }
  }

  for (const [item, qty] of Object.entries(req)) {
    if (qty > 0) {
      const newReq = cloneMap(req);
      newReq[item] -= 1;
      const sol = optimize(newReq, data, memo);
      const cost = sol.cost + data.items[item];
      if (cost < best.cost) {
        best = {
          cost,
          combos: cloneMap(sol.combos),
          singles: cloneMap(sol.singles)
        };
        best.singles[item] = (best.singles[item] || 0) + 1;
      }
    }
  }

  memo[key] = best;
  return best;
}

function buildSupply(solution, data) {
  const supply = {};
  Object.keys(data.items).forEach(i => supply[i] = []);
  Object.entries(solution.combos).forEach(([comboName, count]) => {
    const combo = data.combos.find(c => c.name === comboName);
    for (let i=0;i<count;i++) {
      combo.items.forEach(item => {
        supply[item].push('Combo: ' + comboName);
      });
    }
  });
  Object.entries(solution.singles).forEach(([item, count]) => {
    for (let i=0;i<count;i++) supply[item].push('Single');
  });
  return supply;
}

function allocateToPersons(orders, supply) {
  const allocations = [];
  orders.forEach(o => {
    const details = [];
    Object.entries(o.items).forEach(([item, qty]) => {
      for (let i=0;i<qty;i++) {
        const source = supply[item].pop() || 'Single';
        details.push(`${item} via ${source}`);
      }
    });
    allocations.push({name: o.name, details});
  });
  return allocations;
}

function displayResult(outputEl, solution, allocations, baseCost) {
  const saved = baseCost - solution.cost;
  let text = `Total price: €${solution.cost.toFixed(2)}\n`;
  text += `Savings vs individual items: €${saved.toFixed(2)}\n\n`;
  allocations.forEach(a => {
    text += `${a.name}:\n`;
    a.details.forEach(d => { text += `  - ${d}\n`; });
    text += '\n';
  });
  outputEl.textContent = text;
}

async function init() {
  const data = await loadData();
  const root = document.getElementById('orders');
  let personCount = 0;

  document.getElementById('add-person').addEventListener('click', () => {
    const div = createPerson(personCount++, data.items);
    root.appendChild(div);
    addItemRow(div, data.items);
  });

  document.getElementById('compute').addEventListener('click', () => {
    const orders = gatherOrders(root);
    const req = aggregateRequirements(orders);
    const baseCost = Object.entries(req).reduce((acc, [item, qty]) => acc + data.items[item]*qty, 0);
    const solution = optimize(req, data);
    const supply = buildSupply(solution, data);
    const allocations = allocateToPersons(orders, supply);
    const output = document.getElementById('output');
    displayResult(output, solution, allocations, baseCost);
  });

  // add initial person
  document.getElementById('add-person').click();
}

window.addEventListener('DOMContentLoaded', init);
