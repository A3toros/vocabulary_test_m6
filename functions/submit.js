const { Pool } = require("pg");

// Create connection to Neon database
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { userId, answers, score } = data;
  if (!userId || !answers || !Array.isArray(answers)) {
    return { statusCode: 400, body: JSON.stringify({ error: "User ID and answers required" }) };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user exists and submission status
    const userRes = await client.query(
      "SELECT submitted, nickname, number, score, answers FROM users WHERE id = $1",
      [userId]
    );

    if (userRes.rows.length === 0) throw new Error("User not found");

    const user = userRes.rows[0];

    if (user.submitted) {
      await client.query('COMMIT');
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Already submitted",
          submitted: true,
          score: user.score,
          answers: user.answers,
          nickname: user.nickname,
          number: user.number
        })
      };
    }

    // Save submission
    await client.query(
      "UPDATE users SET answers=$1, score=$2, submitted=TRUE WHERE id=$3",
      [JSON.stringify(answers), score, userId]
    );

    await client.query('COMMIT');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Submission saved",
        submitted: true,
        score,
        answers,
        nickname: user.nickname,
        number: user.number
      })
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Database error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || "Failed to save submission" }) };
  } finally {
    client.release();
  }
};
