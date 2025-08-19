import { Client } from "pg";

const client = new Client({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { username, password } = JSON.parse(event.body);

  if (!username || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing username or password" }) };
  }

  try {
    await client.connect();
    const res = await client.query(
      "SELECT id, nickname, number, submitted, answers, score FROM users WHERE username=$1 AND password=$2",
      [username, password]
    );

    await client.end();

    if (res.rows.length === 0) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
    }

    const user = res.rows[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: user.id,
        nickname: user.nickname,
        number: user.number,
        submitted: user.submitted,
        answers: user.answers,
        score: user.score
      })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
}
