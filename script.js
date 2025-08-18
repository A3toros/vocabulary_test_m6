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
  let countdownInterval = null;

  // Timer display
  let timerDisplay = document.createElement('div');
  timerDisplay.id = 'timer-display';
  timerDisplay.style.fontSize = '1.2rem';
  timerDisplay.style.fontWeight = 'bold';
  timerDisplay.style.marginTop = '10px';

  // Correct answers
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
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }

  function disableForm(form, disable = true) {
    Array.from(form.elements).forEach(el => el.disabled = disable);
  }

  async function sendRequest(url, data) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result.error || result.details || `Server responded with status ${response.status}`;
        throw new Error(errorMessage);
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  function isAnswerCorrect(qId, userAnswer) {
    const possibleAnswers = correctAnswers[qId] || [];
    const normAnswer = userAnswer.trim().toLowerCase();
    return possibleAnswers.some(ans => normAnswer === ans.trim().toLowerCase());
  }

  function calculateScore(answers) {
    let score = 0;
    for (const qId in answers) {
      if (isAnswerCorrect(qId, answers[qId])) score++;
    }
    return score;
  }

  // Countdown timer
  function startCountdown(duration = 10 * 60) {
    let timeLeft = duration;
    timerDisplay.textContent = formatTime(timeLeft);
    countdownInterval = setInterval(() => {
      timeLeft--;
      timerDisplay.textContent = formatTime(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        submitQuestionnaire(true); // Force submit when time runs out
      }
    }, 1000);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  // Handle registration
  if (registrationForm) {
    registrationForm.addEventListener('submit', async function(e) {
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
        const result = await sendRequest("/.netlify/functions/submit-registration", {nickname, number});
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
            // Append timer
            if (!questionnaireSection.contains(timerDisplay)) {
              questionnaireSection.appendChild(timerDisplay);
            }
            startCountdown();
          }, 300);
        }, 1000);
      } catch (error) {
        showStatus(registrationStatus, error.message || "Error submitting form.", "error");
        disableForm(registrationForm, false);
      } finally {
        isSubmitting = false;
      }
    });
  }

  // Visibilitychange detection
  let visibilityTimer = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      visibilityTimer = setTimeout(() => {
        submitQuestionnaire(true, "Sorry, you are not allowed to leave the page due to security reasons. Unfortunately you failed the test");
      }, 5000);
    } else {
      clearTimeout(visibilityTimer);
    }
  });

  // Handle questionnaire submission
  if (questionnaireForm) {
    questionnaireForm.addEventListener('submit', function(e) {
      e.preventDefault();
      submitQuestionnaire(false);
    });
  }

  async function submitQuestionnaire(forceFail = false, failMessage = null) {
    if (isSubmitting) return;
    isSubmitting = true;
    disableForm(questionnaireForm, true);
    showStatus(questionnaireStatus, "Submitting...");
    clearInterval(countdownInterval);

    // Get registration ID
    const registrationId = localStorage.getItem('registrationId');
    if (!registrationId) {
      showStatus(questionnaireStatus, "Registration info missing", "error");
      return;
    }

    const answers = {};
    const answersList = [];
    for (let i = 1; i <= 10; i++) {
      const questionId = `question${i}`;
      const field = document.getElementById(questionId);
      const value = field ? field.value.trim() : "";
      const finalValue = (!value || forceFail) ? "FAILED" : value;
      answers[questionId] = finalValue;
      answersList.push({question: `Question ${i}`, answer: finalValue});
    }

    const score = calculateScore(answers);

    try {
      await sendRequest("/.netlify/functions/submit-questionnaire", {
        registrationId: registrationId,
        answers: answersList,
        score: score
      });

      // Completion display
      const nickname = localStorage.getItem('userNickname') || 'User';
      const completionContainer = document.createElement('div');
      completionContainer.className = 'completion-container';

      const scoreMessage = document.createElement('div');
      const scoreClass = score >= 7 ? 'high-score' : (score >= 4 ? 'medium-score' : 'low-score');
      scoreMessage.className = `status score-message ${scoreClass}`;
      scoreMessage.innerHTML = `
        <div class="score-title">${failMessage || 'Quiz Results'}</div>
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
    } catch (err) {
      showStatus(questionnaireStatus, err.message || "Error submitting", "error");
      disableForm(questionnaireForm, false);
    } finally {
      isSubmitting = false;
    }
  }

  // Initialize page
  function init() {
    if (!document.getElementById('dynamic-styles')) {
      const style = document.createElement('style');
      style.id = 'dynamic-styles';
      style.textContent = `
        .error-field {border-color: #dc3545 !important; background-color: #fff8f8 !important;}
        .error-field:focus {box-shadow:0 0 0 2px rgba(220,53,69,0.25) !important;}
        #questionnaire-section, #registration-section, .completion-container {transition: opacity 0.3s, transform 0.3s;}
        .status.info {background-color: #cff4fc; color: #055160; border-left:4px solid #0dcaf0;}
        .completion-container {opacity:0; transform:translateY(20px);}
        .score-message {padding:25px; margin:0; text-align:center; border-radius:8px;}
        .score-title {font-size:1.5rem; margin-bottom:15px; font-weight:bold;}
        .score-value {font-size:2.5rem; margin-bottom:10px; font-weight:bold;}
        .score-name {font-size:1.1rem; font-style:italic;}
        .high-score {background-color:#d4edda;color:#155724;border:2px solid #28a745;}
        .medium-score {background-color:#fff3cd;color:#856404;border:2px solid #ffc107;}
        .low-score {background-color:#f8d7da;color:#721c24;border:2px solid #dc3545;}
        #timer-display {margin-top:10px;}
      `;
      document.head.appendChild(style);
    }
  }

  init();
});
