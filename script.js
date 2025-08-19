document.addEventListener('DOMContentLoaded', function() { 
const response = await fetch('/.netlify/functions/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const result = await response.json();
if (result.success) {
  // store user info locally
  localStorage.setItem('loggedInUser', JSON.stringify(result.user));
} else {
  showLoginError("Invalid credentials");
}


  let currentUser = null;

  // ======== Login form handling ========
  const loginForm = document.getElementById('login-form');
  const loginStatus = document.getElementById('login-status');
  const loginSection = document.getElementById('login-section');
  const questionnaireSection = document.getElementById('questionnaire-section');

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    const user = usersDB.find(u => u.username === username && u.password === password);

    if (!user) {
      loginStatus.textContent = "Invalid username or password";
      loginStatus.className = "status error";
      return;
    }

    currentUser = user;
    localStorage.setItem('userId', user.username); // Mock for DB id
    localStorage.setItem('userNickname', user.nickname);

    // Hide login, show questionnaire
    loginSection.style.display = 'none';
    questionnaireSection.style.display = 'block';

    // Check if already submitted
    if (currentUser.submitted) {
      await showCompletion(currentUser.score, false);
    } else {
      startTimer(600); // 10 minutes
    }
  });

  // ======== Questionnaire logic ========
  const questionnaireForm = document.getElementById('questionnaire-form');
  const questionnaireStatus = document.getElementById('questionnaire-status');
  const timerElement = document.getElementById('timer');

  let isSubmitting = false;
  let countdownInterval;
  let visibilityTimeout;

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
      answers[`question${i}`] = rawAnswer;
      const dbAnswer = rawAnswer === "" ? "FAILED" : rawAnswer;
      answersList.push({ question: `Question ${i}`, answer: dbAnswer });
    }
    return { answers, answersList };
  }

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
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error("User missing. Please restart.");

      const { answers, answersList } = gatherAnswers();
      const score = calculateScore(answers);

      // Save to DB (for now mock)
      currentUser.submitted = true;
      currentUser.answers = answersList;
      currentUser.score = score;

      await showCompletion(score, true);
      clearInterval(countdownInterval);
    } catch (error) {
      console.error(error);
      showStatus(questionnaireStatus, error.message || "Auto-submit failed", "error");
      disableForm(questionnaireForm, false);
      isSubmitting = false;
    }
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
        const userId = localStorage.getItem('userId');
        if (!userId) throw new Error("User missing. Please restart.");

        const { answers, answersList } = gatherAnswers();
        const score = calculateScore(answers);

        // Save to DB (mock)
        currentUser.submitted = true;
        currentUser.answers = answersList;
        currentUser.score = score;

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
        #questionnaire-section, #login-section, .completion-container {
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
