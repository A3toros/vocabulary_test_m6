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
    Array.from(form.elements).forEach(element => {
      element.disabled = disable;
    });
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
    } catch (error) {
      throw error;
    }
  }
  
  function isAnswerCorrect(questionId, userAnswer) {
    const possibleAnswers = correctAnswers[questionId] || [];
    if (possibleAnswers.length === 0) return false;
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    return possibleAnswers.some(correctAnswer => 
      normalizedUserAnswer === correctAnswer.trim().toLowerCase()
    );
  }
  
  function calculateScore(answers) {
    let score = 0;
    for (const questionId in answers) {
      if (isAnswerCorrect(questionId, answers[questionId])) {
        score++;
      }
    }
    return score;
  }
  
  // Registration form
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
        const result = await sendRequest("/.netlify/functions/submit-registration", { 
          nickname: nickname,
          number: number
        });
        localStorage.setItem('registrationId', result.id);
        localStorage.setItem('userNickname', nickname);
        showStatus(registrationStatus, "Good luck", "success");
        
        setTimeout(function() {
          registrationSection.style.opacity = '0';
          registrationSection.style.transform = 'translateY(-20px)';
          setTimeout(function() {
            registrationSection.style.display = 'none';
            questionnaireSection.style.display = 'block';
            void questionnaireSection.offsetWidth;
            questionnaireSection.style.opacity = '1';
            questionnaireSection.style.transform = 'translateY(0)';
          }, 300);
        }, 1000);
        
      } catch (error) {
        showStatus(registrationStatus, error.message || "Error submitting form. Please try again.", "error");
        disableForm(registrationForm, false);
      } finally {
        isSubmitting = false;
      }
    });
    
    ['nickname', 'number'].forEach(fieldId => {
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
  
  // Questionnaire form
  if (questionnaireForm) {
    questionnaireSection.style.opacity = '0';
    questionnaireSection.style.transform = 'translateY(20px)';
    
    for (let i = 1; i <= 10; i++) {
      const questionField = document.getElementById(`question${i}`);
      if (questionField) {
        questionField.addEventListener('input', function() {
          this.classList.remove('error-field');
        });
      }
    }
    
    questionnaireForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      if (isSubmitting) return;
      
      const answers = {};
      const answersList = [];
      let allAnswered = true;
      let firstEmptyField = null;
      
      for (let i = 1; i <= 10; i++) {
        const questionId = `question${i}`;
        const questionField = document.getElementById(questionId);
        if (!questionField) continue;
        
        const answer = questionField.value.trim();
        questionField.classList.remove('error-field');
        
        if (!answer) {
          allAnswered = false;
          questionField.classList.add('error-field');
          if (!firstEmptyField) firstEmptyField = questionField;
        } else {
          answers[questionId] = answer;
          answersList.push({ question: `Question ${i}`, answer: answer });
        }
      }
      
      if (!allAnswered) {
        showStatus(questionnaireStatus, "Please answer all questions", "error");
        if (firstEmptyField) firstEmptyField.focus();
        return;
      }
      
      isSubmitting = true;
      disableForm(questionnaireForm, true);
      showStatus(questionnaireStatus, "Submitting...");
      
      try {
        const registrationId = localStorage.getItem('registrationId');
        if (!registrationId) throw new Error("Registration information missing. Please start over.");
        
        const score = calculateScore(answers);
        
        await sendRequest("/.netlify/functions/submit-questionnaire", { 
          registrationId: registrationId,
          answers: answersList,
          score: score
        });
        
        const nickname = localStorage.getItem('userNickname') || 'User';
        const completionContainer = document.createElement('div');
        completionContainer.className = 'completion-container';
        
        const scoreMessage = document.createElement('div');
        const scoreClass = score >= 7 ? 'high-score' : (score >= 4 ? 'medium-score' : 'low-score');
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
        
      } catch (error) {
        showStatus(questionnaireStatus, error.message || "Error submitting questionnaire. Please try again.", "error");
        disableForm(questionnaireForm, false);
      } finally {
        isSubmitting = false;
      }
    });
  }
  
  // Init styles
  function init() {
    if (!document.getElementById('dynamic-styles')) {
      const style = document.createElement('style');
      style.id = 'dynamic-styles';
      style.textContent = `
        .error-field { border-color: #dc3545 !important; background-color: #fff8f8 !important; }
        .error-field:focus { box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25) !important; }
        #questionnaire-section, #registration-section, .completion-container {
          transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        }
        .status.info { background-color: #cff4fc; color: #055160; border-left: 4px solid #0dcaf0; }
        .completion-container { opacity: 0; transform: translateY(20px); }
        .score-message { padding: 25px; margin: 0; text-align: center; border-radius: 8px; }
        .score-title { font-size: 1.5rem; margin-bottom: 15px; font-weight: bold; }
        .score-value { font-size: 2.5rem; margin-bottom: 10px; font-weight: bold; }
        .score-name { font-size: 1.1rem; font-style: italic; }
        .high-score { background-color: #d4edda; color: #155724; border: 2px solid #28a745; }
        .medium-score { background-color: #fff3cd; color: #856404; border: 2px solid #ffc107; }
        .low-score { background-color: #f8d7da; color: #721c24; border: 2px solid #dc3545; }
      `;
      document.head.appendChild(style);
    }
  }
  init();

  // 🚨 New: visibilitychange detection & auto-submit after 5s
  let hiddenTimer = null;

  document.addEventListener("visibilitychange", async function () {
    if (document.visibilityState === "hidden") {
      hiddenTimer = setTimeout(async () => {
        if (isSubmitting) return;
        if (!questionnaireForm) return;

        const answersList = [];
        for (let i = 1; i <= 10; i++) {
          const field = document.getElementById(`question${i}`);
          let answer = field && field.value.trim() ? field.value.trim() : "FAILED";
          answersList.push({ question: `Question ${i}`, answer });
        }

        try {
          const registrationId = localStorage.getItem("registrationId") || "unknown";
          await sendRequest("/.netlify/functions/submit-questionnaire", {
            registrationId: registrationId,
            answers: answersList,
            score: 0 // force fail
          });
        } catch (e) {
          console.error("Auto-submit failed", e);
        }

        // Replace UI with fail message
        if (questionnaireForm) {
          const failMsg = document.createElement("div");
          failMsg.className = "status error";
          failMsg.textContent = "Sorry, you are not allowed to leave the page due to security reasons. Unfortunately you failed the test.";
          questionnaireForm.parentNode.replaceChild(failMsg, questionnaireForm);
        }
      }, 5000);
    } else {
      if (hiddenTimer) {
        clearTimeout(hiddenTimer);
        hiddenTimer = null;
      }
    }
  });

});
