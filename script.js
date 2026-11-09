const subjects = [
  'Lógica Computacional',
  'Linguagem Python',
  'Estrutura de Dados',
  'Arquitetura e Organização de Computadores',
  'Redes Locais (LAN)',
  'Inteligência Artificial',
  'Tecnologia da Informação e Comunicação',
  'Banco de Dados',
  'Segurança da Informação',
  'Raciocínio Lógico',
  'Gestão de Projetos e Empreendedorismo (EAD)',
];

const grades = subjects.map(() => ({ p1: '', p2: '', at: '' }));
const customCourses = [];
let editorEvaluations = [
  { name: 'P1', weight: '40' },
  { name: 'P2', weight: '40' },
  { name: 'AT', weight: '20' },
];

const averageRows = document.querySelector('#average-rows');
const neededRows = document.querySelector('#needed-rows');
const numberFormat = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const storageKey = 'simulador-media-ciencia-dados-ia-v1';

function loadSavedData() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!saved || typeof saved !== 'object') return;
    if (Array.isArray(saved.grades)) {
      saved.grades.slice(0, grades.length).forEach((row, index) => {
        ['p1', 'p2', 'at'].forEach((key) => {
          if (typeof row?.[key] === 'string' && (row[key] === '' || readNumber(row[key]).valid)) {
            grades[index][key] = row[key];
          }
        });
      });
    }
    if (Array.isArray(saved.customCourses)) {
      saved.customCourses.forEach((course) => {
        if (typeof course?.name !== 'string' || !course.name.trim() || !Array.isArray(course.evaluations) || !course.evaluations.length) return;
        const evaluations = course.evaluations.filter((item) => typeof item?.name === 'string'
          && Number.isFinite(item.weight) && item.weight > 0 && item.weight <= 100
          && typeof item.grade === 'string' && (item.grade === '' || readNumber(item.grade).valid));
        if (evaluations.length !== course.evaluations.length) return;
        if (Math.abs(evaluations.reduce((sum, item) => sum + item.weight, 0) - 100) >= 0.001) return;
        customCourses.push({
          name: course.name,
          evaluations: evaluations.map((item) => ({ name: item.name, weight: item.weight, grade: item.grade })),
        });
      });
    }
  } catch {
    // Storage may be unavailable in private browsing or when opened from a local file.
  }
}

function saveData() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ grades, customCourses }));
  } catch {
    // Keep the simulator usable even when browser storage is unavailable.
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function makeInput(index, grade, subject) {
  const labels = {
    p1: `P1 de ${subject}`,
    p2: `P2 de ${subject}`,
    at: `AT de ${subject}`,
  };
  return `<input class="grade-input" type="text" inputmode="decimal" autocomplete="off" maxlength="6" placeholder="—" aria-label="${escapeHtml(labels[grade])}" data-course="${index}" data-grade="${grade}">`;
}

function buildTables() {
  averageRows.innerHTML = subjects.map((subject, index) => `
    <tr>
      <td class="subject-name">${escapeHtml(subject)}</td>
      <td>${makeInput(index, 'p1', subject)}</td>
      <td>${makeInput(index, 'p2', subject)}</td>
      <td>${makeInput(index, 'at', subject)}</td>
      <td class="result-cell">
        <span class="result-value" id="average-${index}" aria-live="polite">—</span>
        <span class="result-hint" id="average-hint-${index}"></span>
      </td>
    </tr>`).join('');

  neededRows.innerHTML = subjects.map((subject, index) => `
    <tr>
      <td class="subject-name">${escapeHtml(subject)}</td>
      <td>${makeInput(index, 'p1', subject)}</td>
      <td>${makeInput(index, 'at', subject)}</td>
      <td class="result-cell">
        <span class="result-value" id="needed-${index}" aria-live="polite">—</span>
        <span class="result-hint" id="needed-hint-${index}"></span>
      </td>
    </tr>`).join('');
}

function readNumber(raw, maximum = 10) {
  const text = raw.trim();
  if (text === '') return { blank: true, valid: true, value: null };
  if (!/^(?:\d+(?:[.,]\d{0,2})?|[.,]\d{1,2})$/.test(text)) {
    return { blank: false, valid: false, value: null };
  }
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > maximum) {
    return { blank: false, valid: false, value: null };
  }
  return { blank: false, valid: true, value };
}

function showResult(element, hint, text, state = '', detail = '') {
  element.textContent = text;
  element.className = `result-value${state ? ` ${state}` : ''}`;
  hint.textContent = detail;
}

function updateFixedResults() {
  grades.forEach((entry, index) => {
    const p1 = readNumber(entry.p1);
    const p2 = readNumber(entry.p2);
    const at = readNumber(entry.at);
    const scores = [p1, p2, at];

    document.querySelectorAll(`[data-course="${index}"]`).forEach((input) => {
      const valid = readNumber(input.value).valid;
      input.classList.toggle('is-invalid', !valid);
      input.setAttribute('aria-invalid', String(!valid));
    });

    const average = document.querySelector(`#average-${index}`);
    const averageHint = document.querySelector(`#average-hint-${index}`);
    if (scores.some((score) => !score.valid)) {
      showResult(average, averageHint, 'Corrija a nota', 'is-impossible');
    } else {
      const entered = scores.filter((score) => !score.blank);
      if (entered.length === 0) {
        showResult(average, averageHint, '—');
      } else {
        const weightedSum = p1.value * 0.4 + p2.value * 0.4 + at.value * 0.2;
        const enteredWeight = (!p1.blank ? 0.4 : 0) + (!p2.blank ? 0.4 : 0) + (!at.blank ? 0.2 : 0);
        const value = weightedSum / enteredWeight;
        const complete = entered.length === 3;
        const passed = value >= 5;
        showResult(
          average,
          averageHint,
          numberFormat.format(value),
          passed ? 'is-pass' : 'is-below',
          complete ? (passed ? 'Média final atingida' : 'Média final abaixo de 5') : 'Média parcial',
        );
      }
    }

    const needed = document.querySelector(`#needed-${index}`);
    const neededHint = document.querySelector(`#needed-hint-${index}`);
    if (!p1.valid || !at.valid) {
      showResult(needed, neededHint, 'Corrija a nota', 'is-impossible');
    } else if (p1.blank || at.blank) {
      showResult(needed, neededHint, '—');
    } else {
      const rawNeeded = (5 - p1.value * 0.4 - at.value * 0.2) / 0.4;
      if (rawNeeded > 10 + 1e-9) {
        showResult(needed, neededHint, 'Acima de 10', 'is-impossible', 'Não é possível fechar média 5.');
      } else if (rawNeeded <= 0) {
        showResult(needed, neededHint, '0,0', 'is-pass', 'A média 5 já é alcançada com P2 zero.');
      } else {
        const tenths = Math.ceil((rawNeeded - 1e-9) * 10) / 10;
        showResult(needed, neededHint, numberFormat.format(tenths), 'is-pass', 'Nota mínima para média ≥ 5.');
      }
    }
  });
}

function syncCourseInput(courseIndex, grade, value) {
  document.querySelectorAll(`[data-course="${courseIndex}"][data-grade="${grade}"]`).forEach((input) => {
    if (input !== document.activeElement) input.value = value;
  });
}

function handleFixedGradeInput(event) {
  const input = event.target.closest('.grade-input[data-course]');
  if (!input) return;
  const courseIndex = Number(input.dataset.course);
  const grade = input.dataset.grade;
  grades[courseIndex][grade] = input.value;
  syncCourseInput(courseIndex, grade, input.value);
  updateFixedResults();
  saveData();
}

function clearGrades(mode) {
  grades.forEach((entry) => {
    entry.p1 = '';
    entry.at = '';
    if (mode === 'average') entry.p2 = '';
  });
  document.querySelectorAll('.grade-input[data-course]').forEach((input) => {
    if (input.dataset.grade !== 'p2' || mode === 'average') input.value = '';
  });
  updateFixedResults();
  saveData();
}

function setTab(name, focus = false) {
  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focus) tab.focus();
  });
  document.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
    panel.hidden = panel.id !== `panel-${name}`;
  });
}

function renderEvaluationEditor() {
  const editor = document.querySelector('#evaluation-editor');
  editor.innerHTML = editorEvaluations.map((evaluation, index) => `
    <div class="evaluation-row" data-editor-row="${index}">
      <label>
        <span class="sr-only">Nome da avaliação ${index + 1}</span>
        <input class="text-field evaluation-name" type="text" maxlength="50" value="${escapeHtml(evaluation.name)}" placeholder="Nome da avaliação" aria-label="Nome da avaliação ${index + 1}" data-evaluation-name="${index}">
      </label>
      <label class="weight-field">
        <span class="sr-only">Peso da avaliação ${index + 1} em porcentagem</span>
        <input class="text-field weight-input" type="text" inputmode="decimal" maxlength="6" value="${escapeHtml(evaluation.weight)}" placeholder="Peso" aria-label="Peso da avaliação ${index + 1} em porcentagem" data-evaluation-weight="${index}">
        <span>%</span>
      </label>
      <button class="remove-evaluation" type="button" aria-label="Remover avaliação ${index + 1}" data-remove-evaluation="${index}" ${editorEvaluations.length === 1 ? 'disabled' : ''}>Remover</button>
    </div>`).join('');
  updateWeightSummary();
}

function updateWeightSummary() {
  const values = editorEvaluations.map((evaluation) => readNumber(evaluation.weight, 100));
  const valid = values.every((value) => value.valid && !value.blank && value.value > 0);
  const total = valid ? values.reduce((sum, value) => sum + value.value, 0) : null;
  const namesValid = editorEvaluations.every((evaluation) => evaluation.name.trim().length > 0);
  const closesAtHundred = total !== null && Math.abs(total - 100) < 0.001;

  document.querySelector('#weight-total').textContent = total === null
    ? 'Peso total: —'
    : `Peso total: ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(total)}%`;
  const status = document.querySelector('#weight-status');
  status.textContent = closesAtHundred && namesValid ? 'Pronto para criar' : 'Ajuste os nomes e pesos para somar 100%';
  status.classList.toggle('is-valid', closesAtHundred && namesValid);
  status.classList.toggle('is-invalid-text', !closesAtHundred || !namesValid);
}

function handleEditorInput(event) {
  const nameInput = event.target.closest('[data-evaluation-name]');
  const weightInput = event.target.closest('[data-evaluation-weight]');
  if (nameInput) editorEvaluations[Number(nameInput.dataset.evaluationName)].name = nameInput.value;
  if (weightInput) editorEvaluations[Number(weightInput.dataset.evaluationWeight)].weight = weightInput.value;
  updateWeightSummary();
}

function createCustomCourse(event) {
  event.preventDefault();
  const name = document.querySelector('#custom-subject-name').value.trim();
  const error = document.querySelector('#form-error');
  const evaluations = editorEvaluations.map((evaluation) => ({
    name: evaluation.name.trim(),
    parsedWeight: readNumber(evaluation.weight, 100),
  }));
  const allWeightsValid = evaluations.every((evaluation) => evaluation.parsedWeight.valid
    && !evaluation.parsedWeight.blank && evaluation.parsedWeight.value > 0);
  const totalWeight = allWeightsValid
    ? evaluations.reduce((sum, evaluation) => sum + evaluation.parsedWeight.value, 0)
    : 0;

  let message = '';
  if (!name) message = 'Digite o nome da matéria.';
  else if (evaluations.some((evaluation) => !evaluation.name)) message = 'Dê um nome para cada avaliação.';
  else if (!allWeightsValid) message = 'Informe pesos válidos, maiores que 0%.';
  else if (Math.abs(totalWeight - 100) >= 0.001) message = `Os pesos somam ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(totalWeight)}%. Ajuste para totalizar 100%.`;

  if (message) {
    error.textContent = message;
    error.hidden = false;
    return;
  }

  customCourses.push({
    name,
    evaluations: evaluations.map((evaluation) => ({
      name: evaluation.name,
      weight: evaluation.parsedWeight.value,
      grade: '',
    })),
  });
  error.hidden = true;
  error.textContent = '';
  document.querySelector('#custom-subject-name').value = '';
  editorEvaluations = [
    { name: 'P1', weight: '40' },
    { name: 'P2', weight: '40' },
    { name: 'AT', weight: '20' },
  ];
  renderEvaluationEditor();
  renderCustomCourses();
  saveData();
}

function renderCustomCourses() {
  const list = document.querySelector('#custom-course-list');
  if (customCourses.length === 0) {
    list.innerHTML = '<p class="empty-state">Suas matérias criadas aparecerão aqui.</p>';
    return;
  }

  list.innerHTML = customCourses.map((course, courseIndex) => `
    <article class="custom-course" data-custom-card="${courseIndex}">
      <div class="custom-course-heading">
        <div>
          <h3>${escapeHtml(course.name)}</h3>
          <p>${course.evaluations.length} avaliações · peso total 100%</p>
        </div>
        <button class="remove-course" type="button" data-delete-course="${courseIndex}" aria-label="Excluir ${escapeHtml(course.name)}">Excluir matéria</button>
      </div>
      <div class="table-scroll">
        <table class="custom-grade-table">
          <caption class="sr-only">Notas das avaliações de ${escapeHtml(course.name)}</caption>
          <thead><tr><th scope="col">Avaliação</th><th scope="col">Peso</th><th scope="col">Nota</th></tr></thead>
          <tbody>${course.evaluations.map((evaluation, evaluationIndex) => `
            <tr>
              <td class="subject-name">${escapeHtml(evaluation.name)}</td>
              <td>${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(evaluation.weight)}%</td>
              <td><input class="grade-input" type="text" inputmode="decimal" autocomplete="off" maxlength="6" value="${escapeHtml(evaluation.grade)}" placeholder="—" aria-label="Nota de ${escapeHtml(evaluation.name)} em ${escapeHtml(course.name)}" data-custom-course="${courseIndex}" data-custom-evaluation="${evaluationIndex}"></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="custom-result">
        <span>Média</span>
        <strong class="result-value" id="custom-average-${courseIndex}" aria-live="polite">—</strong>
        <span class="result-hint" id="custom-hint-${courseIndex}"></span>
      </div>
    </article>`).join('');
}

function updateCustomResult(courseIndex) {
  const course = customCourses[courseIndex];
  const parsed = course.evaluations.map((evaluation) => readNumber(evaluation.grade));
  document.querySelectorAll(`[data-custom-course="${courseIndex}"]`).forEach((input) => {
    const valid = readNumber(input.value).valid;
    input.classList.toggle('is-invalid', !valid);
    input.setAttribute('aria-invalid', String(!valid));
  });
  customCourses.forEach((_, courseIndex) => updateCustomResult(courseIndex));

  const result = document.querySelector(`#custom-average-${courseIndex}`);
  const hint = document.querySelector(`#custom-hint-${courseIndex}`);
  if (parsed.some((grade) => !grade.valid)) {
    showResult(result, hint, 'Corrija a nota', 'is-impossible');
    return;
  }
  const entered = parsed.flatMap((grade, index) => grade.blank ? [] : [{
    grade: grade.value,
    weight: course.evaluations[index].weight,
  }]);
  if (entered.length === 0) {
    showResult(result, hint, '—');
    return;
  }

  const enteredWeight = entered.reduce((sum, item) => sum + item.weight, 0);
  const weightedScore = entered.reduce((sum, item) => sum + item.grade * item.weight, 0);
  const average = weightedScore / enteredWeight;
  const complete = entered.length === course.evaluations.length;
  showResult(
    result,
    hint,
    numberFormat.format(average),
    average >= 5 ? 'is-pass' : 'is-below',
    complete ? 'Média final' : `Média parcial · ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(enteredWeight)}% avaliado`,
  );
}

function handleCustomGradeInput(event) {
  const input = event.target.closest('[data-custom-course]');
  if (!input) return;
  const courseIndex = Number(input.dataset.customCourse);
  const evaluationIndex = Number(input.dataset.customEvaluation);
  customCourses[courseIndex].evaluations[evaluationIndex].grade = input.value;
  updateCustomResult(courseIndex);
  saveData();
}

function deleteCustomCourse(courseIndex) {
  customCourses.splice(courseIndex, 1);
  renderCustomCourses();
  saveData();
}

loadSavedData();
buildTables();
renderEvaluationEditor();
updateFixedResults();

document.querySelector('#panel-average').addEventListener('input', handleFixedGradeInput);
document.querySelector('#panel-needed').addEventListener('input', handleFixedGradeInput);
document.querySelectorAll('[data-clear]').forEach((button) => {
  button.addEventListener('click', () => clearGrades(button.dataset.clear));
});
document.querySelectorAll('[role="tab"]').forEach((tab) => {
  tab.addEventListener('click', () => setTab(tab.dataset.tab));
  tab.addEventListener('keydown', (event) => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const current = tabs.indexOf(tab);
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0
        : event.key === 'End' ? tabs.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setTab(tabs[next].dataset.tab, true);
    }
  });
});

document.querySelector('#evaluation-editor').addEventListener('input', handleEditorInput);
document.querySelector('#evaluation-editor').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-evaluation]');
  if (!button || editorEvaluations.length === 1) return;
  editorEvaluations.splice(Number(button.dataset.removeEvaluation), 1);
  renderEvaluationEditor();
});
document.querySelector('#add-assessment').addEventListener('click', () => {
  editorEvaluations.push({ name: `Avaliação ${editorEvaluations.length + 1}`, weight: '' });
  renderEvaluationEditor();
  document.querySelector(`[data-evaluation-name="${editorEvaluations.length - 1}"]`).focus();
});
document.querySelector('#custom-course-form').addEventListener('submit', createCustomCourse);
document.querySelector('#custom-course-list').addEventListener('input', handleCustomGradeInput);
document.querySelector('#custom-course-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-course]');
  if (button) deleteCustomCourse(Number(button.dataset.deleteCourse));
});
document.querySelector('#clear-all').addEventListener('click', () => {
  if (!window.confirm('Apagar notas e matérias salvas neste navegador?')) return;
  grades.forEach((entry) => { entry.p1 = ''; entry.p2 = ''; entry.at = ''; });
  customCourses.splice(0, customCourses.length);
  document.querySelectorAll('.grade-input[data-course]').forEach((input) => { input.value = ''; });
  updateFixedResults();
  renderCustomCourses();
  try { localStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
});
