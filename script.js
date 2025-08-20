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
  
  // Check if user is already logged in on page load
  function checkExistingSession() {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const userNickname = localStorage.getItem('userNickname');
    
    if (token && userId && userNickname) {
      // Restore user session
      currentUser = {
        id: userId,
        nickname: userNickname,
        submitted: localStorage.getItem('userSubmitted') === 'true',
        score: localStorage.getItem('userScore') ? parseInt(localStorage.getItem('userScore')) : null,
        answers: localStorage.getItem('userAnswers') ? JSON.parse(localStorage.getItem('userAnswers')) : null
      };
      
      // Show appropriate section
      if (currentUser.submitted) {
        loginSection.style.display = 'none';
        questionnaireSection.style.display = 'block';
        showCompletion(currentUser.score, false);
      } else {
        loginSection.style.display = 'none';
        questionnaireSection.style.display = 'block';
        startTimer(600);
        restoreFormData();
      }
    }
  }

  // Restore form data from localStorage
  function restoreFormData() {
    const savedAnswers = localStorage.getItem('formAnswers');
    if (savedAnswers) {
      try {
        const answers = JSON.parse(savedAnswers);
        Object.keys(answers).forEach(questionId => {
          const field = document.getElementById(questionId);
          if (field) {
            field.value = answers[questionId];
          }
        });
      } catch (e) {
        console.error('Error restoring form data:', e);
      }
    }
  }

  // Save form data to localStorage
  function saveFormData() {
    const answers = {};
    for (let i = 1; i <= 10; i++) {
      const field = document.getElementById(`question${i}`);
      if (field) {
        answers[`question${i}`] = field.value;
      }
    }
    localStorage.setItem('formAnswers', JSON.stringify(answers));
  }

  // Add input event listeners to save form data as user types
  function setupFormDataPersistence() {
    for (let i = 1; i <= 10; i++) {
      const field = document.getElementById(`question${i}`);
      if (field) {
        field.addEventListener('input', saveFormData);
      }
    }
  }

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
      
      // Store user data in localStorage
      localStorage.setItem('userId', currentUser.id);
      localStorage.setItem('userNickname', currentUser.nickname);
      localStorage.setItem('userSubmitted', currentUser.submitted);
      localStorage.setItem('userScore', currentUser.score);
      localStorage.setItem('userAnswers', JSON.stringify(currentUser.answers));
      
      // Generate and store a simple token (you might want to implement proper JWT tokens)
      const token = btoa(`${currentUser.id}:${Date.now()}`);
      localStorage.setItem('token', token);

      loginSection.style.display = 'none';
      questionnaireSection.style.display = 'block';

      if (currentUser.submitted === true) {
        await showCompletion(currentUser.score, false);
      } else {
        startTimer(600);
        setupFormDataPersistence();
        restoreFormData();
      }
    } catch (err) {
      console.error(err);
      loginStatus.textContent = "Login failed. Try again.";
      loginStatus.className = "status error";
    }
    console.log("User after login:", currentUser);
    console.log("Type of submitted:", currentUser.submitted, typeof currentUser.submitted);
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
    
    // Check if user has already submitted
    if (currentUser && currentUser.submitted) {
      console.log("User already submitted, skipping auto-submission");
      return;
    }
    
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

      // Update user state to prevent multiple submissions
      if (currentUser) {
        currentUser.submitted = true;
        currentUser.score = score;
        currentUser.answers = answers;
        localStorage.setItem('userSubmitted', 'true');
        localStorage.setItem('userScore', score.toString());
        localStorage.setItem('userAnswers', JSON.stringify(answers));
      }

      await showCompletion(score, showFailedNotice);
      clearInterval(countdownInterval);
    } catch (err) {
        console.error(err);
        showStatus(questionnaireStatus, err.message || "Submission failed", "error");
        disableForm(questionnaireForm, false);
        isSubmitting = false; // Reset the isSubmitting flag
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
      // Only set timeout if user hasn't submitted yet
      if (!currentUser || !currentUser.submitted) {
        visibilityTimeout = setTimeout(async () => {
          if (!currentUser || !currentUser.submitted) {
            try {
              console.log("Visibility check triggered - auto-submitting...");
              await submitToServer(true);
            } catch (error) {
              console.error("Auto-submission failed:", error);
              // Show user-friendly message about what happened
              if (questionnaireStatus) {
                showStatus(questionnaireStatus, "Auto-submission failed. You can manually submit your answers.", "error");
              }
            }
          }
        }, 5000);
      }
    } else {
      clearTimeout(visibilityTimeout);
    }
  });

  // Countdown timer
  function startTimer(duration) {
    let timeRemaining = duration;
    countdownInterval = setInterval(async () => {
      const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
      const seconds = (timeRemaining % 60).toString().padStart(2, '0');
      if (timerElement) timerElement.textContent = `${minutes}:${seconds}`;
      if (timeRemaining <= 0) {
        clearInterval(countdownInterval);
        if (!currentUser || !currentUser.submitted) {
          try {
            console.log("Timer expired - auto-submitting...");
            await submitToServer(true);
          } catch (error) {
            console.error("Timer auto-submission failed:", error);
            // Show user-friendly message
            if (questionnaireStatus) {
              showStatus(questionnaireStatus, "Time's up! Auto-submission failed. You can manually submit your answers.", "error");
            }
          }
        }
      }
      timeRemaining--;
    }, 1000);
  }

  // Add logout functionality
  function logout() {
    // Clear all stored data
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userNickname');
    localStorage.removeItem('userSubmitted');
    localStorage.removeItem('userScore');
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('formAnswers');
    
    // Reset state
    currentUser = null;
    isSubmitting = false;
    
    // Clear timers
    if (countdownInterval) clearInterval(countdownInterval);
    if (visibilityTimeout) clearTimeout(visibilityTimeout);
    
    // Show login form
    loginSection.style.display = 'block';
    questionnaireSection.style.display = 'none';
    
    // Clear form
    if (questionnaireForm) {
      questionnaireForm.reset();
    }
    
    // Clear status messages
    if (loginStatus) loginStatus.textContent = '';
    if (questionnaireStatus) questionnaireStatus.textContent = '';
  }

  // Add logout button to questionnaire section
  function addLogoutButton() {
    if (!document.getElementById('logout-btn')) {
      const logoutBtn = document.createElement('button');
      logoutBtn.id = 'logout-btn';
      logoutBtn.textContent = 'Logout';
      logoutBtn.className = 'logout-btn';
      logoutBtn.onclick = logout;
      
      // Insert at the beginning of questionnaire section
      const firstChild = questionnaireSection.firstChild;
      questionnaireSection.insertBefore(logoutBtn, firstChild);
    }
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
  checkExistingSession(); // Call checkExistingSession on page load
  addLogoutButton(); // Add logout button on page load

  // Handle visibility check failure gracefully
  function handleVisibilityFailure() {
    if (currentUser && !currentUser.submitted) {
      // Show a message to the user about what happened
      const failureMessage = document.createElement('div');
      failureMessage.className = 'status error visibility-failure';
      failureMessage.innerHTML = `
        <h3>Page Visibility Check Failed</h3>
        <p>Your test was automatically submitted due to page visibility changes.</p>
        <p>If you believe this was an error, you can:</p>
        <button onclick="restartTest()" class="restart-btn">Restart Test</button>
        <button onclick="continueWithSubmission()" class="continue-btn">Continue with Submission</button>
      `;
      
      // Replace the form with the failure message
      questionnaireForm.style.opacity = '0';
      setTimeout(() => {
        questionnaireForm.parentNode.replaceChild(failureMessage, questionnaireForm);
        failureMessage.style.opacity = '1';
      }, 300);
    }
  }

  // Restart test function
  window.restartTest = function() {
    // Clear form data
    localStorage.removeItem('formAnswers');
    
    // Reset form
    if (questionnaireForm) {
      questionnaireForm.reset();
    }
    
    // Show form again
    const failureMessage = document.querySelector('.visibility-failure');
    if (failureMessage) {
      failureMessage.style.opacity = '0';
      setTimeout(() => {
        failureMessage.parentNode.replaceChild(questionnaireForm, failureMessage);
        questionnaireForm.style.opacity = '1';
      }, 300);
    }
    
    // Restart timer
    if (countdownInterval) clearInterval(countdownInterval);
    startTimer(600);
    
    // Setup form persistence again
    setupFormDataPersistence();
  };

  // Continue with submission function
  window.continueWithSubmission = function() {
    submitToServer(true);
  };
});
