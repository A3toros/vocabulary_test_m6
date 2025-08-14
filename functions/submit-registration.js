const { Pool } = require("pg");

exports.handler = async function(event, context) {
  console.log("Registration function called");
  
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
    console.log("Received data:", JSON.stringify(data));
  } catch (error) {
    console.error("JSON parsing error:", error);
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

  // Log database connection attempt
  console.log("Attempting database connection...");
  console.log("Connection string exists:", !!process.env.NEON_DATABASE_URL);
  
  // Don't log the full connection string as it contains credentials
  if (process.env.NEON_DATABASE_URL) {
    const maskedUrl = process.env.NEON_DATABASE_URL.replace(
      /postgres:\/\/([^:]+):([^@]+)@/,
      "postgres://[USERNAME]:[PASSWORD]@"
    );
    console.log("Using connection string:", maskedUrl);
  }

  // Create connection to Neon database
  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    // Test the connection
    await pool.query("SELECT NOW()");
    console.log("Database connection successful");
    
  } catch (error) {
    console.error("Database connection error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Database connection failed",
        details: error.message
      })
    };
  }

  try {
    // Insert registration into database
    console.log("Inserting registration data...");
    const result = await pool.query(
      "INSERT INTO registrations (nickname, number) VALUES ($1, $2) RETURNING id",
      [nickname, number]
    );
    
    console.log("Registration successful, ID:", result.rows[0].id);
    
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
    console.error("Database query error:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to save registration",
        details: error.message
      })
    };
  } finally {
    if (pool) {
      try {
        // Close the pool
        await pool.end();
        console.log("Database connection pool closed");
      } catch (error) {
        console.error("Error closing pool:", error);
      }
    }
  }
};