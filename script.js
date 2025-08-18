document.addEventListener('DOMContentLoaded', function() {
  // Main elements
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
    'question1': ['pitch', 'Pitch', 'Sales Pitch', 'sales pitch', 'Sales pitch'],
    'question2': ['Launch', 'launch'],
    'question3': ['server', 'Server',],
    'question4': ['cover letter', 'Cover letter', 'Cover-Letter', 'cover-letter', 'Cover-letter', 'Cover Letter'],
    'question5': ['compensation', 'Compensation', 'compensate', 'Compensate'],
    'question6': ['Challenging', 'challenging'],
    'question7': ['Appropriate', 'appropriate'],
    'question8': ['Criticism', 'criticism'],
    'question9': ['Request', 'request'],
    'question10': ['portfolio', 'Portfolio']
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
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
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
      const answer = field ? field.value.trim() : '';
      answers[`question${i}`] = answer || "FAILED";
      answersList.push({ question: `Question ${i}`, answer: answer || "FAILED" });
    }
    return { answers, answersList };
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

      const nickname = localStorage.getItem('userNickname') || 'User';
      const completionContainer = document.createElement('div');
      completionContainer.className = 'completion-container';
      const scoreClass = score >= 7 ? 'high-score' : (score >= 4 ? 'medium-score' : 'low-score');

      completionContainer.innerHTML = `
        <div class="status score-message ${scoreClass}">
          <div class="score-title">Quiz Results</div>
          <div class="score-value">${score} out of 10</div>
          <div class="score-name">${nickname}</div>
          <div class="score-failed-message">Sorry, you are not allowed to leave the page due to security reasons. Unfortunately you failed the test.</div>
        </div>
      `;

      questionnaireForm.style.opacity = '0';
      questionnaireForm.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        questionnaireForm.parentNode.replaceChild(completionContainer, questionnaireForm);
        void completionContainer.offsetWidth;
        completionContainer.style.opacity = '1';
        completionContainer.style.transform = 'translateY(0)';
      }, 300);

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
            startTimer(600); // 10-minute countdown
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

        const nickname = localStorage.getItem('userNickname') || 'User';
        const completionContainer = document.createElement('div');
        completionContainer.className = 'completion-container';
        const scoreClass = score >= 7 ? 'high-score' : (score >= 4 ? 'medium-score' : 'low-score');

        completionContainer.innerHTML = `
          <div class="status score-message ${scoreClass}">
            <div class="score-title">Quiz Results</div>
            <div class="score-value">${score} out of 10</div>
            <div class="score-name">${nickname}</div>
          </div>
        `;

        questionnaireForm.style.opacity = '0';
        questionnaireForm.style.transform = 'translateY(-20px)';
        setTimeout(() => {
          questionnaireForm.parentNode.replaceChild(completionContainer, questionnaireForm);
          void completionContainer.offsetWidth;
          completionContainer.style.opacity = '1';
          completionContainer.style.transform = 'translateY(0)';
        }, 300);

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

  // Countdown timer function
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

  // Initialize dynamic styles for errors and Matrix timer
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
      `;
      document.head.appendChild(style);
    }
  }

  initStyles();
});
