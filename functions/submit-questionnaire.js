const { Pool } = require("pg");

// Create connection to Neon database
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: "Method Not Allowed" }) 
    };
  }

  // Parse the request body
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (error) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: "Invalid JSON" }) 
    };
  }

  // Validate required fields
  const { registrationId, answers } = data;
  if (!registrationId || !answers || !Array.isArray(answers) || answers.length === 0) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: "Registration ID and answers are required" }) 
    };
  }

  // Check if all questions have answers
  for (const answer of answers) {
    if (!answer.question || !answer.answer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "All questions must be answered" })
      };
    }
  }

  // Start a transaction to ensure all answers are saved
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verify that the registration exists
    const regCheck = await client.query(
      "SELECT id FROM registrations WHERE id = $1",
      [registrationId]
    );
    
    if (regCheck.rows.length === 0) {
      throw new Error("Registration not found");
    }
    
    // Insert each answer
    for (const answer of answers) {
      await client.query(
        "INSERT INTO answers (registration_id, question, answer) VALUES ($1, $2, $3)",
        [registrationId, answer.question, answer.answer]
      );
    }
    
    await client.query('COMMIT');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Questionnaire submitted successfully"
      })
    };
  } catch (error) {
    await client.query('ROLLBACK');
    
    console.error("Database error:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Failed to save questionnaire"
      })
    };
  } finally {
    client.release();
  }
};