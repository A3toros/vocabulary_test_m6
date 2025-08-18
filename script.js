document.addEventListener('DOMContentLoaded', function() {
  // Main elements
  const registrationForm = document.getElementById('registration-form');
  const registrationStatus = document.getElementById('registration-status');
  const registrationSection = document.getElementById('registration-section');
  const questionnaireSection = document.getElementById('questionnaire-section');
  const questionnaireForm = document.getElementById('questionnaire-form');
  const questionnaireStatus = document.getElementById('questionnaire-status');

  // Track submission state
  let isSubmitting = false;
  let hiddenTimer = null;
  let countdownTimer = null;
  const TIMER_DURATION = 10 * 60; // 10 minutes in seconds

  // Timer display element
  let timerDisplay = document.createElement('div');
  timerDisplay.id = 'timer-display';
  timerDisplay.style.fontSize = '1.2rem';
  timerDisplay.style.fontWeight = 'bold';
  timerDisplay.style.marginTop = '10px';

  // Correct answers for each question
  const correctAnswers = {
    'question1': ['RAM', 'ram', 'Ram', 'Random Access Memory'],
    'question2': ['Broadband', 'broadband', 'broadband internet', 'Broadband Internet'],
    'question3': ['database', 'Database'],
    'question4': ['Spreadsheet', 'spreadsheet', 'spread sheet', 'Spread sheet', 'Spread Sheet'],
    'question5': ['Technical Support', 'technical support', 'Technical support', 'IT support', 'IT Support', 'it suppport'],
    'question6': ['Server', 'server', 'Remote server', 'remote server'],
    'question7': ['Software', 'software'],
    'question8': ['Processor', 'processor', 'CPU', 'cpu'],
    'question9': ['Web Browser', 'web browser', 'Browser', 'browser', 'Web browser', 'Web-browser', 'web-browser'],
    'question10': ['Web designer', 'web desiger', 'Web Designer', 'Web-Designer', 'web-designer', 'Web-designer', 'Web Designer']
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
    if (possibleAnswers.length === 0) return false;
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    return possibleAnswers.some(a => normalizedUserAnswer === a.trim().toLowerCase());
  }

  function calculateScore(answers) {
    let score = 0;
    for (const q in answers) {
      if (isAnswerCorrect(q, answers[q])) score++;
    }
    return score;
  }

  function startCountdown() {
    let remaining = TIMER_DURATION;
    if (!questionnaireSection.contains(timerDisplay)) questionnaireSection.appendChild(timerDisplay);

    countdownTimer = setInterval(() => {
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      timerDisplay.textContent = `Time Remaining: ${minutes}:${seconds < 10 ? '0'+seconds : seconds}`;
      remaining--;

      if (remaining < 0) {
        clearInterval(countdownTimer);
        submitQuestionnaire(true); // Auto-submit on timer end
      }
    }, 1000);
  }

  // Registration form submission
  if (registrationForm) {
    registrationForm.addEventListener('submit', async function(event) {
      event.preventDefault();
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
            startCountdown(); // Start 10-minute timer
          }, 300);
        }, 1000);
      } catch (error) {
        console.error("Registration error:", error);
        showStatus(registrationStatus, error.message || "Error submitting form. Please try again.", "error");
        disableForm(registrationForm, false);
      } finally {
        isSubmitting = false;
      }
    });

    ['nickname','number'].forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', function() {
          this.classList.remove('error-field');
          if (registrationStatus.classList.contains('error')) {
            registrationStatus.textContent = '';
            registrationStatus.className = 'status';
          }
        });
      }
    });
  }

  // Questionnaire form submission
  if (questionnaireForm) {
    questionnaireSection.style.opacity = '0';
    questionnaireSection.style.transform = 'translateY(20px)';

    for (let i = 1; i <= 10; i++) {
      const field = document.getElementById(`question${i}`);
      if (field) field.addEventListener('input', () => field.classList.remove('error-field'));
    }

    async function submitQuestionnaire(auto=false) {
      if (isSubmitting) return;
      const answers = {};
      const answersList = [];
      const nickname = localStorage.getItem('userNickname') || 'User';

      for (let i = 1; i <= 10; i++) {
        const questionId = `question${i}`;
        const field = document.getElementById(questionId);
        let answer = field && field.value.trim() ? field.value.trim() : "FAILED";
        if (field && field.value.trim()) answers[questionId] = answer;
        answersList.push({ question: `Question ${i}`, answer, nickname });
      }

      isSubmitting = true;
      disableForm(questionnaireForm, true);
      if (!auto) showStatus(questionnaireStatus, "Submitting...");

      try {
        const registrationId = localStorage.getItem('registrationId');
        if (!registrationId) throw new Error("Registration missing. Start over.");

        const score = calculateScore(answers);
        await sendRequest("/.netlify/functions/submit-questionnaire", {
          registrationId,
          answers: answersList,
          score
        });

        if (auto) {
          questionnaireForm.parentNode.innerHTML = `<div class="status error">Sorry, you are not allowed to leave the page or time ran out. Unfortunately you failed the test.</div>`;
        } else {
          const completionContainer = document.createElement('div');
          completionContainer.className = 'completion-container';
          const scoreClass = score >= 7 ? 'high-score' : (score >= 4 ? 'medium-score' : 'low-score');
          const scoreMessage = document.createElement('div');
          scoreMessage.className = `status score-message ${scoreClass}`;
          scoreMessage.innerHTML = `
            <div class="score-title">Quiz Results</div>
            <div class="score-value">${score} out of 10</div>
            <div class="score-name">${nickname}</div>
          `;
          completionContainer.appendChild(scoreMessage);
          questionnaireForm.style.opacity = '0';
          questionnaireForm.style.transform = 'translateY(-20px)';
          setTimeout(() => {
            questionnaireForm.parentNode.replaceChild(completionContainer, questionnaireForm);
            void completionContainer.offsetWidth;
            completionContainer.style.opacity = '1';
            completionContainer.style.transform = 'translateY(0)';
          }, 300);
        }
      } catch (error) {
        console.error("Questionnaire error:", error);
        showStatus(questionnaireStatus, error.message || "Error submitting questionnaire.", "error");
        disableForm(questionnaireForm, false);
      } finally {
        isSubmitting = false;
        clearInterval(countdownTimer); // stop timer if submitted
      }
    }

    questionnaireForm.addEventListener('submit', function(e) {
      e.preventDefault();
      submitQuestionnaire();
    });

    // Visibilitychange auto-submit
    document.addEventListener("visibilitychange", function() {
      if (document.visibilityState === "hidden") {
        hiddenTimer = setTimeout(() => submitQuestionnaire(true), 5000);
      } else {
        if (hiddenTimer) { clearTimeout(hiddenTimer); hiddenTimer = null; }
      }
    });
  }

  // Initialize page
  function init() {
    if (!document.getElementById('dynamic-styles')) {
      const style = document.createElement('style');
      style.id = 'dynamic-styles';
      style.textContent = `
        .error-field { border-color: #dc3545 !important; background-color: #fff8f8 !important; }
        .error-field:focus { box-shadow: 0 0 0 2px rgba(220,53,69,.25) !important; }
        @keyframes fadeIn { from {opacity:0; transform:translateY(20px);} to {opacity:1; transform:translateY(0);} }
        @keyframes fadeOut { from {opacity:1; transform:translateY(0);} to {opacity:0; transform:translateY(-20px);} }
        #questionnaire-section, #registration-section, .completion-container { transition: opacity 0.3s ease-out, transform 0.3s ease-out; }
        .status.info { background-color:#cff4fc; color:#055160; border-left:4px solid #0dcaf0; }
        .completion-container { opacity:0; transform:translateY(20px); }
        .score-message { padding:25px; margin:0; text-align:center; border-radius:8px; }
        .score-title { font-size:1.5rem; margin-bottom:15px; font-weight:bold; }
        .score-value { font-size:2.5rem; margin-bottom:10px; font-weight:bold; }
        .score-name { font-size:1.1rem; font-style:italic; }
        .high-score { background-color:#d4edda; color:#155724; border:2px solid #28a745; }
        .medium-score { background-color:#fff3cd; color:#856404; border:2px solid #ffc107; }
        .low-score { background-color:#f8d7da; color:#721c24; border:2px solid #dc3545; }
        #timer-display { text-align:center; color:#333; }
      `;
      document.head.appendChild(style);
    }
  }

  init();
});
