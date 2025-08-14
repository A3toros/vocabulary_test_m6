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
  const { registrationId, answers, score } = data;
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
    
    // Get the nickname from the registrations table
    const regCheck = await client.query(
      "SELECT id, nickname FROM registrations WHERE id = $1",
      [registrationId]
    );
    
    if (regCheck.rows.length === 0) {
      throw new Error("Registration not found");
    }
    
    const nickname = regCheck.rows[0].nickname;
    
    // Save the score to the registrations table
    await client.query(
      "UPDATE registrations SET score = $1 WHERE id = $2",
      [score, registrationId]
    );
    
    // Insert each answer with the nickname
    for (const answer of answers) {
      await client.query(
        "INSERT INTO answers (registration_id, question, answer, nickname) VALUES ($1, $2, $3, $4)",
        [registrationId, answer.question, answer.answer, nickname]
      );
    }
    
    await client.query('COMMIT');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Questionnaire submitted successfully",
        score: score
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