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
  const { nickname, number } = data;
  if (!nickname || !number) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: "Nickname and number are required" }) 
    };
  }

  try {
    // Insert registration into database
    const result = await pool.query(
      "INSERT INTO registrations (nickname, number) VALUES ($1, $2) RETURNING id",
      [nickname, number]
    );
    
    // Return success with the generated ID
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Registration successful",
        id: result.rows[0].id
      })
    };
  } catch (error) {
    console.error("Database error:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to save registration"
      })
    };
  }
};