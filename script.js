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
  
  // Utility functions
  function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status ${type || ''}`;
    
    // Ensure the status message is visible (scroll to it if needed)
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      // Parse response as JSON
      const result = await response.json();
      
      // Handle non-2xx responses
      if (!response.ok) {
        const errorMessage = result.error || result.details || `Server responded with status ${response.status}`;
        throw new Error(errorMessage);
      }
      
      return result;
    } catch (error) {
      // Re-throw network or parsing errors
      throw error;
    }
  }
  
  // Handle registration form submission
  if (registrationForm) {
    registrationForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      // Prevent double submission
      if (isSubmitting) return;
      
      // Get form values
      const nickname = document.getElementById('nickname').value.trim();
      const number = document.getElementById('number').value.trim();
      
      // Validate all fields are filled
      if (!nickname || !number) {
        showStatus(registrationStatus, "Please fill in all fields", "error");
        
        // Highlight empty fields
        if (!nickname) document.getElementById('nickname').classList.add('error-field');
        if (!number) document.getElementById('number').classList.add('error-field');
        
        return;
      }
      
      // Clear any previous validation styling
      document.getElementById('nickname').classList.remove('error-field');
      document.getElementById('number').classList.remove('error-field');
      
      // Set submitting state
      isSubmitting = true;
      disableForm(registrationForm, true);
      showStatus(registrationStatus, "Submitting...");
      
      try {
        console.log('Submitting registration:', { nickname, number });
        
        // Submit registration data
        const result = await sendRequest("/.netlify/functions/submit-registration", { 
          nickname: nickname,
          number: number
        });
        
        console.log('Registration successful:', result);
        
        // Store registration ID
        localStorage.setItem('registrationId', result.id);
        // Also store nickname for use in the submission complete message
        localStorage.setItem('userNickname', nickname);
        
        // Show success message
        showStatus(registrationStatus, "Good luck", "success");
        
        // Transition to questionnaire with animation
        setTimeout(function() {
          registrationSection.style.opacity = '0';
          registrationSection.style.transform = 'translateY(-20px)';
          
          setTimeout(function() {
            registrationSection.style.display = 'none';
            questionnaireSection.style.display = 'block';
            
            // Trigger a reflow before setting the opacity to ensure animation works
            void questionnaireSection.offsetWidth;
            
            questionnaireSection.style.opacity = '1';
            questionnaireSection.style.transform = 'translateY(0)';
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
    
    // Add input event listeners to clear error styling on input
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
  
  // Handle questionnaire form submission
  if (questionnaireForm) {
    // Initial setup
    questionnaireSection.style.opacity = '0';
    questionnaireSection.style.transform = 'translateY(20px)';
    
    // Add validation for all question fields
    for (let i = 1; i <= 10; i++) {
      const questionField = document.getElementById(`question${i}`);
      if (questionField) {
        // Clear error styling on input
        questionField.addEventListener('input', function() {
          this.classList.remove('error-field');
        });
      }
    }
    
    questionnaireForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      // Prevent double submission
      if (isSubmitting) return;
      
      // Check if all questions are answered
      const answers = [];
      let allAnswered = true;
      let firstEmptyField = null;
      
      // Validate each question field
      for (let i = 1; i <= 10; i++) {
        const questionField = document.getElementById(`question${i}`);
        if (!questionField) continue;
        
        const answer = questionField.value.trim();
        questionField.classList.remove('error-field');
        
        if (!answer) {
          allAnswered = false;
          questionField.classList.add('error-field');
          
          if (!firstEmptyField) {
            firstEmptyField = questionField;
          }
        } else {
          answers.push({
            question: `Question ${i}`,
            answer: answer
          });
        }
      }
      
      // Show error if not all questions answered
      if (!allAnswered) {
        showStatus(questionnaireStatus, "Please answer all questions", "error");
        
        // Focus on first empty field
        if (firstEmptyField) {
          firstEmptyField.focus();
        }
        
        return;
      }
      
      // Set submitting state
      isSubmitting = true;
      disableForm(questionnaireForm, true);
      showStatus(questionnaireStatus, "Submitting...");
      
      try {
        // Get registration ID
        const registrationId = localStorage.getItem('registrationId');
        
        if (!registrationId) {
          throw new Error("Registration information missing. Please start over.");
        }
        
        console.log('Submitting questionnaire:', { registrationId, answerCount: answers.length });
        
        // Submit questionnaire data
        const result = await sendRequest("/.netlify/functions/submit-questionnaire", { 
          registrationId: registrationId,
          answers: answers
        });
        
        console.log('Questionnaire submission successful:', result);
        
        // Get the user's nickname from localStorage
        const nickname = localStorage.getItem('userNickname') || 'User';
        
        // Create a completion container to replace the form
        const completionContainer = document.createElement('div');
        completionContainer.className = 'completion-container';
        
        // Add the success message with the user's nickname
        const successMessage = document.createElement('div');
        successMessage.className = 'status success completion-message';
        successMessage.textContent = `Hope you didn't fail, ${nickname}!`;
        completionContainer.appendChild(successMessage);
        
        // Add restart button
        const restartButton = document.createElement('button');
        restartButton.type = 'button';
        restartButton.textContent = 'Start a New Submission';
        restartButton.className = 'restart-button';
        
        restartButton.addEventListener('click', function() {
          // Clear localStorage
          localStorage.removeItem('registrationId');
          localStorage.removeItem('userNickname');
          
          // Reload the page
          window.location.reload();
        });
        
        completionContainer.appendChild(restartButton);
        
        // Replace the form with the completion container
        questionnaireForm.style.opacity = '0';
        questionnaireForm.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
          // Replace the form with the completion container
          questionnaireForm.parentNode.replaceChild(completionContainer, questionnaireForm);
          
          // Add animation to the completion container
          void completionContainer.offsetWidth; // Force reflow
          completionContainer.style.opacity = '1';
          completionContainer.style.transform = 'translateY(0)';
        }, 300);
        
      } catch (error) {
        console.error("Questionnaire error:", error);
        showStatus(questionnaireStatus, error.message || "Error submitting questionnaire. Please try again.", "error");
        disableForm(questionnaireForm, false);
      } finally {
        isSubmitting = false;
      }
    });
  }
  
  // Initialize page
  function init() {
    // Add dynamic styles
    if (!document.getElementById('dynamic-styles')) {
      const style = document.createElement('style');
      style.id = 'dynamic-styles';
      style.textContent = `
        .error-field {
          border-color: #dc3545 !important;
          background-color: #fff8f8 !important;
        }
        .error-field:focus {
          box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-20px); }
        }
        #questionnaire-section, #registration-section, .completion-container {
          transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        }
        .status.info {
          background-color: #cff4fc;
          color: #055160;
          border-left: 4px solid #0dcaf0;
        }
        .completion-container {
          opacity: 0;
          transform: translateY(20px);
        }
        .completion-message {
          font-size: 1.25rem;
          padding: 20px;
          margin: 30px 0;
          text-align: center;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Check for previous registration (uncomment if needed)
    // checkPreviousRegistration();
  }
  
  // Run initialization
  init();
});