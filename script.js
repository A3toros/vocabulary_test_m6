document.addEventListener('DOMContentLoaded', function() { 
// ======== User database ========
const usersDB = [
  { username: 'user1', password: '1', nickname: '', number: '1', submitted: false, answers: [], score: 0 },
  { username: 'user2', password: '2', nickname: '', number: '2', submitted: false, answers: [], score: 0 },
  { username: 'user3', password: '3', nickname: '', number: '3', submitted: false, answers: [], score: 0 },
  { username: 'user4', password: '4', nickname: '', number: '4', submitted: false, answers: [], score: 0 },
  { username: 'user5', password: '5', nickname: '', number: '5', submitted: false, answers: [], score: 0 },
  { username: 'user6', password: '6', nickname: '', number: '6', submitted: false, answers: [], score: 0 },
  { username: 'user7', password: '7', nickname: '', number: '7', submitted: false, answers: [], score: 0 },
  { username: 'user8', password: '8', nickname: '', number: '8', submitted: false, answers: [], score: 0 },
  { username: 'user9', password: '9', nickname: '', number: '9', submitted: false, answers: [], score: 0 },
  { username: 'user10', password: '10', nickname: '', number: '10', submitted: false, answers: [], score: 0 },
  { username: 'user11', password: '11', nickname: '', number: '11', submitted: false, answers: [], score: 0 },
  { username: 'user12', password: '12', nickname: '', number: '12', submitted: false, answers: [], score: 0 },
  { username: 'user13', password: '13', nickname: '', number: '13', submitted: false, answers: [], score: 0 },
  { username: 'user14', password: '14', nickname: '', number: '14', submitted: false, answers: [], score: 0 },
  { username: 'user15', password: '15', nickname: '', number: '15', submitted: false, answers: [], score: 0 },
  { username: 'user16', password: '16', nickname: '', number: '16', submitted: false, answers: [], score: 0 },
];


let currentUser = null;

// Login form handling
const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');

loginForm.addEventListener('submit', async e => {
  e.preventDefault();

  const nickname = document.getElementById('login-nickname').value.trim();
  const number = document.getElementById('login-number').value.trim();

  const user = usersDB.find(u => u.nickname === nickname && u.number === number);

  if (!user) {
    loginStatus.textContent = "Invalid nickname or number";
    loginStatus.className = "status error";
    return;
  }

  currentUser = user;

  // Hide login form, show questionnaire
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('questionnaire-section').style.display = 'block';

  // If already submitted → show results
  if (currentUser.submitted) {
    await showCompletion(currentUser.score, false);
  } else {
    startTimer(600); // 10 minutes
  }
});

  const registrationForm = document.getElementById('registration-form');
  const registrationStatus = document.getElementById('registration-status');
  const registrationSection = document.getElementById('registration-section');
  const questionnaireSection = document.getElementById('questionnaire-section');
  const questionnaireForm = document.getElementById('questionnaire-form');
  const questionnaireStatus = document.getElementById('questionnaire-status');
  const timerElement = document.getElementById('timer');

  // Track submission state
  let isSubmitting = false;
  let countdownInterval;
  let visibilityTimeout;

  // Correct answers
  const correctAnswers = {
    'question1': ['pitch', 'sales pitch'],
    'question2': ['launch', 'to launch'],
    'question3': ['server'],
    'question4': ['cover letter'],
    'question5': ['compensate', 'to compensate'],
    'question6': ['challenging'],
    'question7': ['appropriate'],
    'question8': ['criticism'],
    'question9': ['request', 'to request'],
    'question10': ['portfolio']
  };

  // Utility functions
  function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status ${type || ''}`;
    if (type === 'error') {
      setTimeout(() => { element.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
    }
  }

  function disableForm(form, disable = true) {
    Array.from(form.elements).forEach(el => el.disabled = disable);
  }

  async function sendRequest(url, data) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result.error || result.details || `Server responded with status ${response.status}`;
        throw new Error(errorMessage);
      }
      return result;
    } catch (error) { throw error; }
  }

  function isAnswerCorrect(questionId, userAnswer) {
    const possibleAnswers = correctAnswers[questionId] || [];
    const normalizedUserAnswer = (userAnswer || '').trim().toLowerCase();
    return possibleAnswers.some(ans => normalizedUserAnswer === ans.trim().toLowerCase());
  }

  function calculateScore(answers) {
    let score = 0;
    for (const q in answers) {
      if (isAnswerCorrect(q, answers[q])) score++;
    }
    return score;
  }

function gatherAnswers() {
  const answers = {};
  const answersList = [];
  for (let i = 1; i <= 10; i++) {
    const field = document.getElementById(`question${i}`);
    const rawAnswer = field ? field.value.trim() : "";
    // What user actually typed (used for UI + scoring)
    answers[`question${i}`] = rawAnswer;
    // What we send to DB (replace blanks with FAILED)
    const dbAnswer = rawAnswer === "" ? "FAILED" : rawAnswer;
    answersList.push({ question: `Question ${i}`, answer: dbAnswer });
  }
  return { answers, answersList };
}

  // Build results breakdown HTML (user answers + correctness + all correct answers when wrong)
  function buildResultsSummaryHTML(answers) {
    let html = `<div id="results-summary"><h2>Results Breakdown</h2>`;
    Object.keys(correctAnswers).forEach((qKey, idx) => {
      const userAns = (answers[qKey] ?? "").toString();
      const correctList = correctAnswers[qKey] || [];
      const correctAll = correctList.join(' / ');

      const correct = isAnswerCorrect(qKey, userAns);
      const itemClass = correct ? 'correct' : 'incorrect';
      const displayUser = userAns === '' ? '(no answer)' : userAns;

      html += `
        <div class="answer-row">
          <span class="${itemClass}"><strong>${idx + 1}.</strong> ${escapeHTML(displayUser)}</span>
          ${correct ? '' : `<span class="correct-answer">→ ${escapeHTML(correctAll || '—')}</span>`}
        </div>
      `;
    });
    html += `</div>`;
    return html;
  }

  // Escape HTML
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function buildCompletionHTML(score, nickname, answers, showFailedNotice = false) {
    const scoreClass = score >= 7 ? 'high-score' : (score >= 4 ? 'medium-score' : 'low-score');
    const breakdown = buildResultsSummaryHTML(answers);
    return `
      <div class="status score-message ${scoreClass}">
        <div class="score-title">Quiz Results</div>
        <div class="score-value">${score} out of 10</div>
        <div class="score-name">${escapeHTML(nickname)}</div>
        ${showFailedNotice ? `
          <div class="score-failed-message">
            Sorry, you are not allowed to leave the page due to security reasons. Unfortunately you failed the test.
          </div>` : ``}
      </div>
      ${breakdown}
    `;
  }

  async function showCompletion(score, showFailedNotice = false) {
    const nickname = localStorage.getItem('userNickname') || 'User';
    const completionContainer = document.createElement('div');
    completionContainer.className = 'completion-container';

    const { answers } = gatherAnswers();
    completionContainer.innerHTML = buildCompletionHTML(score, nickname, answers, showFailedNotice);

    questionnaireForm.style.opacity = '0';
    questionnaireForm.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      questionnaireForm.parentNode.replaceChild(completionContainer, questionnaireForm);
      void completionContainer.offsetWidth;
      completionContainer.style.opacity = '1';
      completionContainer.style.transform = 'translateY(0)';
    }, 300);
  }

  async function autoSubmitQuestionnaire() {
    if (isSubmitting) return;
    isSubmitting = true;
    disableForm(questionnaireForm, true);
    showStatus(questionnaireStatus, "Auto-submitting...", "error");

    try {
      const registrationId = localStorage.getItem('registrationId');
      if (!registrationId) throw new Error("Registration missing. Please restart.");

      const { answers, answersList } = gatherAnswers();
      const score = calculateScore(answers);

      await sendRequest("/.netlify/functions/submit-questionnaire", {
        registrationId,
        answers: answersList,
        score
      });

      await showCompletion(score, true);
      clearInterval(countdownInterval);
    } catch (error) {
      console.error(error);
      showStatus(questionnaireStatus, error.message || "Auto-submit failed", "error");
      disableForm(questionnaireForm, false);
      isSubmitting = false;
    }
  }

  // Registration submission
  if (registrationForm) {
    registrationForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (isSubmitting) return;

      const nickname = document.getElementById('nickname').value.trim();
      const number = document.getElementById('number').value.trim();
      if (!nickname || !number) {
        showStatus(registrationStatus, "Please fill in all fields", "error");
        if (!nickname) document.getElementById('nickname').classList.add('error-field');
        if (!number) document.getElementById('number').classList.add('error-field');
        return;
      }

      document.getElementById('nickname').classList.remove('error-field');
      document.getElementById('number').classList.remove('error-field');

      isSubmitting = true;
      disableForm(registrationForm, true);
      showStatus(registrationStatus, "Submitting...");

      try {
        const result = await sendRequest("/.netlify/functions/submit-registration", { nickname, number });
        localStorage.setItem('registrationId', result.id);
        localStorage.setItem('userNickname', nickname);
        showStatus(registrationStatus, "Good luck", "success");

        setTimeout(() => {
          registrationSection.style.opacity = '0';
          registrationSection.style.transform = 'translateY(-20px)';
          setTimeout(() => {
            registrationSection.style.display = 'none';
            questionnaireSection.style.display = 'block';
            void questionnaireSection.offsetWidth;
            questionnaireSection.style.opacity = '1';
            questionnaireSection.style.transform = 'translateY(0)';
            startTimer(600); // 10 minutes
          }, 300);
        }, 1000);
      } catch (err) {
        console.error(err);
        showStatus(registrationStatus, err.message || "Error submitting form", "error");
        disableForm(registrationForm, false);
      } finally { isSubmitting = false; }
    });
  }

  // Questionnaire submission
  if (questionnaireForm) {
    questionnaireForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (isSubmitting) return;

      isSubmitting = true;
      disableForm(questionnaireForm, true);
      showStatus(questionnaireStatus, "Submitting...");

      try {
        const registrationId = localStorage.getItem('registrationId');
        if (!registrationId) throw new Error("Registration missing. Please restart.");

        const { answers, answersList } = gatherAnswers();
        const score = calculateScore(answers);

        await sendRequest("/.netlify/functions/submit-questionnaire", {
          registrationId,
          answers: answersList,
          score
        });

        await showCompletion(score, false);
        clearInterval(countdownInterval);
      } catch (err) {
        console.error(err);
        showStatus(questionnaireStatus, err.message || "Submission failed", "error");
        disableForm(questionnaireForm, false);
        isSubmitting = false;
      } finally { isSubmitting = false; }
    });
  }

  // Visibility detection
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      visibilityTimeout = setTimeout(autoSubmitQuestionnaire, 5000);
    } else {
      clearTimeout(visibilityTimeout);
    }
  });

  // Countdown timer
  function startTimer(duration) {
    let timeRemaining = duration;
    countdownInterval = setInterval(() => {
      const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
      const seconds = (timeRemaining % 60).toString().padStart(2, '0');
      if (timerElement) timerElement.textContent = `${minutes}:${seconds}`;
      if (timeRemaining <= 0) { clearInterval(countdownInterval); autoSubmitQuestionnaire(); }
      timeRemaining--;
    }, 1000);
  }

  // Init styles
  function initStyles() {
    if (!document.getElementById('dynamic-styles')) {
      const style = document.createElement('style');
      style.id = 'dynamic-styles';
      style.textContent = `
        .error-field { border-color: #dc3545 !important; background-color: #fff8f8 !important; }
        .error-field:focus { box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25) !important; }
        #questionnaire-section, #registration-section, .completion-container {
          transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        }
        .matrix-timer {
          font-family: 'Courier New', monospace;
          font-size: 2rem;
          color: #0c3c96ff;
          text-align: center;
          margin: 10px 0 20px 0;
          letter-spacing: 3px;
          text-shadow: 0 0 5px #7e6f85ff, 0 0 10px #603492ff;
        }
        @media(max-width: 480px) {
          .matrix-timer { font-size: 1.5rem; letter-spacing: 2px; margin: 5px 0 15px 0; }
        }
        #results-summary { margin-top: 20px; font-size: 1rem; }
        #results-summary h2 { margin: 0 0 10px; font-size: 1.25rem; }
        .answer-row {
          margin: 6px 0;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .answer-row .correct {
          background-color: #57eb57ff;
          color: #000000ff;
          padding: 5px 10px;
          border-radius: 5px;
        }
        .answer-row .incorrect {
          background-color: #eb5353ff;
          color: #000000ff;
          padding: 5px 10px;
          border-radius: 5px;
        }
        .answer-row .correct-answer {
          color: #00ff00;
          font-weight: bold;
        }
        @media(max-width: 480px) {
          #results-summary { font-size: 0.95rem; }
          .answer-row { padding: 5px; gap: 8px; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  initStyles();
});
