document.addEventListener('DOMContentLoaded', function() {
  // Get elements
  const registrationForm = document.getElementById('registration-form');
  const registrationStatus = document.getElementById('registration-status');
  const registrationSection = document.getElementById('registration-section');
  const questionnaireSection = document.getElementById('questionnaire-section');
  const questionnaireForm = document.getElementById('questionnaire-form');
  const questionnaireStatus = document.getElementById('questionnaire-status');
  
  // Add event listener for registration form
  if (registrationForm) {
    registrationForm.addEventListener('submit', function(event) {
      event.preventDefault();
      
      // Get form values
      const nickname = document.getElementById('nickname').value.trim();
      const number = document.getElementById('number').value.trim();
      
      // Validate form
      if (!nickname || !number) {
        registrationStatus.textContent = "Please fill in all fields";
        registrationStatus.className = "status error";
        return;
      }
      
      // Show success message
      registrationStatus.textContent = "Good luck";
      registrationStatus.className = "status success";
      
      // Store registration data
      const registrationData = {
        nickname: nickname,
        number: number
      };
      
      // Save to localStorage
      localStorage.setItem('registrationData', JSON.stringify(registrationData));
      
      // Show questionnaire after a short delay
      setTimeout(function() {
        registrationSection.style.display = 'none';
        questionnaireSection.style.display = 'block';
        
        // Scroll to top of questionnaire
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1500);
    });
  }
  
  // Add event listener for questionnaire form
  if (questionnaireForm) {
    questionnaireForm.addEventListener('submit', function(event) {
      event.preventDefault();
      
      // Check if all questions are answered
      const answers = [];
      let allAnswered = true;
      let firstEmptyField = null;
      
      for (let i = 1; i <= 10; i++) {
        const questionField = document.getElementById('question' + i);
        const answer = questionField.value.trim();
        
        if (!answer) {
          allAnswered = false;
          questionField.style.borderColor = '#dc3545';
          
          if (!firstEmptyField) {
            firstEmptyField = questionField;
          }
        } else {
          questionField.style.borderColor = '#ddd';
          answers.push({ question: i, answer: answer });
        }
      }
      
      if (!allAnswered) {
        questionnaireStatus.textContent = "Please answer all questions";
        questionnaireStatus.className = "status error";
        
        // Focus the first empty field
        if (firstEmptyField) {
          firstEmptyField.focus();
        }
        return;
      }
      
      // Show success message
      questionnaireStatus.textContent = "Hope you didn't fail";
      questionnaireStatus.className = "status success";
      
      // Get registration data
      const registrationData = JSON.parse(localStorage.getItem('registrationData') || '{}');
      
      // Combine data
      const submissionData = {
        ...registrationData,
        answers: answers
      };
      
      // Log data (in a real app, you would send this to a server)
      console.log('Submission data:', submissionData);
      
      // Disable form after submission
      const formElements = questionnaireForm.querySelectorAll('input, button');
      formElements.forEach(el => {
        el.disabled = true;
      });
      
      // Optional: Add a reset button to start over
      const resetButton = document.createElement('button');
      resetButton.textContent = 'Start Over';
      resetButton.type = 'button';
      resetButton.style.marginTop = '20px';
      resetButton.style.backgroundColor = '#6c757d';
      
      resetButton.addEventListener('click', function() {
        localStorage.removeItem('registrationData');
        location.reload();
      });
      
      questionnaireForm.appendChild(resetButton);
    });
  }
});