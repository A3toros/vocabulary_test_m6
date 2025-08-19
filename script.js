document.addEventListener('DOMContentLoaded', () => {
  let currentUser = null;
  let isSubmitting = false;
  let countdownInterval;
  let visibilityTimeout;

  // ======== Login form handling ========
  const loginForm = document.getElementById('login-form');
  const loginStatus = document.getElementById('login-status');
  const loginSection = document.getElementById('login-section');
  const questionnaireSection = document.getElementById('questionnaire-section');

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    try {
      const response = await fetch('/.netlify/functions/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();
      console.log("Login result:", result); // Debug

      if (!result.success) {
        loginStatus.textContent = result.error || "Invalid username or password";
        loginStatus.className = "status error";
        return;
      }

      currentUser = result.user;
      localStorage.setItem('userId', currentUser.id);
      localStorage.setItem('userNickname', currentUser.nickname);

      loginSection.style.display = 'none';
      questionnaireSection.style.display = 'block';

      if (currentUser.submitted) {
        await showCompletion(currentUser.score, false);
      } else {
        startTimer(600); // 10 minutes
      }
    } catch (err) {
      console.error(err);
      loginStatus.textContent = "Login failed. Try again.";
      loginStatus.className = "status error";
    }
  });

  // ======== Questionnaire logic ========
  const questionnaireForm = document.getElementById('questionnaire-form');
  const questionnaireStatus = document.getElementById('questionnaire-status');
  const timerElement = document.getElementById('timer');

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

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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

  function buildCompletionHTML(score, nickname, answers, showFailedNotice = false) {
    const scoreClass = score >= 7 ? 'high-score' : (score >= 4 ? 'medium-score' : 'low-score');
    const breakdown = buildResultsSummaryHTML(answers);
    return `
      <div class="status score-message ${scoreClass}">
        <div class="score-title">Quiz Results</div>
        <div class="score-value">${score} out of 10</div>
        <div class="score-name">${escapeHTML(nickname)}</div>
        ${showFailedNotice ? `<div class="score-failed-message">
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
    setTimeout(() => {
      questionnaireForm.parentNode.replaceChild(completionContainer, questionnaireForm);
      completionContainer.style.opacity = '1';
    }, 300);
  }

  async function submitToServer(showFailedNotice = false) {
    if (isSubmitting) return;
    isSubmitting = true;
    disableForm(questionnaireForm, true);
    showStatus(questionnaireStatus, "Submitting...");

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error("User missing. Please restart.");

      const { answers, answersList } = gatherAnswers();
      const score = calculateScore(answers);

      const response = await fetch('/.netlify/functions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, answers: answersList, score })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Submission failed");

      await showCompletion(score, showFailedNotice);
      clearInterval(countdownInterval);
    } catch (err) {
      console.error(err);
      showStatus(questionnaireStatus, err.message || "Submission failed", "error");
      disableForm(questionnaireForm, false);
      isSubmitting = false;
    }
  }

  if (questionnaireForm) {
    questionnaireForm.addEventListener('submit', async e => {
      e.preventDefault();
      await submitToServer(false);
    });
  }

  // Auto-submit on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      visibilityTimeout = setTimeout(() => submitToServer(true), 5000);
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
      if (timeRemaining <= 0) {
        clearInterval(countdownInterval);
        submitToServer(true);
      }
      timeRemaining--;
    }, 1000);
  }

  // Dynamic styles
  function initStyles() {
    if (!document.getElementById('dynamic-styles')) {
      const style = document.createElement('style');
      style.id = 'dynamic-styles';
      style.textContent = `
        /* same styles you already had */
      `;
      document.head.appendChild(style);
    }
  }

  initStyles();
});
