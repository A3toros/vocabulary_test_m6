document.addEventListener('DOMContentLoaded', function() {
  // Get registration form elements
  const registrationForm = document.getElementById('registration-form');
  const registrationStatus = document.getElementById('registration-status');
  const registrationSection = document.getElementById('registration-section');
  const questionnaireSection = document.getElementById('questionnaire-section');
  
  // Get questionnaire form elements
  const questionnaireForm = document.getElementById('questionnaire-form');
  const questionnaireStatus = document.getElementById('questionnaire-status');
  
  // Handle registration form submission
  if (registrationForm) {
    registrationForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      // Get form values
      const nickname = document.getElementById('nickname').value.trim();
      const number = document.getElementById('number').value.trim();
      
      // Validate all fields are filled
      if (!nickname || !number) {
        registrationStatus.textContent = "Please fill in all fields";
        registrationStatus.className = "status error";
        return;
      }
      
      // Disable form during submission
      const submitButton = registrationForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      
      // Show submitting status
      registrationStatus.textContent = "Submitting...";
      registrationStatus.className = "status";
      
      try {
        console.log('Submitting registration data:', { nickname, number });
        
        // Submit registration data to Netlify function
        const response = await fetch("/.netlify/functions/submit-registration", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ 
            nickname: nickname,
            number: number
          })
        });
        
        console.log('Response status:', response.status);
        
        // Parse the JSON response
        const result = await response.json();
        console.log('Response data:', result);
        
        if (!response.ok) {
          throw new Error(result.error || result.details || "Failed to submit registration");
        }
        
        // Store registration ID for later use with questionnaire
        localStorage.setItem('registrationId', result.id);
        console.log('Registration ID saved:', result.id);
        
        // Show success message
        registrationStatus.textContent = "Good luck";
        registrationStatus.className = "status success";
        
        // Show questionnaire after a short delay
        setTimeout(function() {
          registrationSection.style.display = 'none';
          questionnaireSection.style.display = 'block';
        }, 1500);
        
      } catch (error) {
        console.error("Registration error:", error);
        
        // Show detailed error message
        registrationStatus.textContent = error.message || "Error submitting form. Please try again.";
        registrationStatus.className = "status error";
        
        // Re-enable the submit button
        submitButton.disabled = false;
      }
    });
  }
  
  // Handle questionnaire form submission
  if (questionnaireForm) {
    questionnaireForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      // Check if all questions are answered
      const answers = [];
      let allAnswered = true;
      let firstEmptyField = null;
      
      // Validate each question field
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
          answers.push({
            question: 'Question ' + i,
            answer: answer
          });
        }
      }
      
      // Show error if not all questions answered
      if (!allAnswered) {
        questionnaireStatus.textContent = "Please answer all questions";
        questionnaireStatus.className = "status error";
        
        // Focus on first empty field
        if (firstEmptyField) {
          firstEmptyField.focus();
        }
        
        return;
      }
      
      // Disable form during submission
      const submitButton = questionnaireForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      
      // Show submitting status
      questionnaireStatus.textContent = "Submitting...";
      questionnaireStatus.className = "status";
      
      try {
        // Get registration ID
        const registrationId = localStorage.getItem('registrationId');
        
        if (!registrationId) {
          throw new Error("Registration information missing. Please start over.");
        }
        
        console.log('Submitting questionnaire with registration ID:', registrationId);
        console.log('Answers count:', answers.length);
        
        // Submit questionnaire data to Netlify function
        const response = await fetch("/.netlify/functions/submit-questionnaire", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ 
            registrationId: registrationId,
            answers: answers
          })
        });
        
        console.log('Response status:', response.status);
        
        // Parse the JSON response
        const result = await response.json();
        console.log('Response data:', result);
        
        if (!response.ok) {
          throw new Error(result.error || result.details || "Failed to submit questionnaire");
        }
        
        // Show success message
        questionnaireStatus.textContent = "Hope you didn't fail";
        questionnaireStatus.className = "status success";
        
        // Disable all form inputs after successful submission
        questionnaireForm.querySelectorAll('input').forEach(el => {
          el.disabled = true;
        });
        
        // Keep submit button disabled
        submitButton.disabled = true;
        
      } catch (error) {
        console.error("Questionnaire error:", error);
        
        // Show detailed error message
        questionnaireStatus.textContent = error.message || "Error submitting questionnaire. Please try again.";
        questionnaireStatus.className = "status error";
        
        // Re-enable the submit button
        submitButton.disabled = false;
      }
    });
  }
  
  // Check if user should be on questionnaire directly (already registered)
  function checkPreviousRegistration() {
    const registrationId = localStorage.getItem('registrationId');
    
    if (registrationId && registrationSection && questionnaireSection) {
      console.log('Found previous registration ID:', registrationId);
      registrationSection.style.display = 'none';
      questionnaireSection.style.display = 'block';
    }
  }
  
  // Uncomment this if you want users to continue where they left off
  // checkPreviousRegistration();
});