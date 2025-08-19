import { Client } from "pg";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { username, password } = JSON.parse(event.body);

  if (!username || !password) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing username or password" }) };
  }

  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(
      "SELECT id, nickname, number, submitted, answers, score FROM users WHERE username=$1 AND password=$2",
      [username, password]
    );
    await client.end();

    if (res.rows.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, error: "Invalid credentials" })
      };
    }

    const user = res.rows[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          nickname: user.nickname,
          number: user.number,
          submitted: user.submitted,
          answers: user.answers,
          score: user.score
        }
      })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Server error" }) };
  }
}
