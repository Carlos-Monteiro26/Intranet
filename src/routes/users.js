const express = require("express");
const router = express.Router();

// cripto hash password
const bcrypt = require("bcrypt");
const saltRounds = 10;

const db = require("../database/db");
const usersQueries = require("../queries/users");

router.post("/", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (name.length < 3) {
      return res
        .status(400)
        .json({ error: "Name should have more than 3 characteres!" });
    }

    if (email.length < 5 || !email.includes("@")) {
      return res.status(400).json({ error: "E-mail is invalid!" });
    }

    const query = usersQueries.findByEmail(email);
    const alreadyExists = await db.query(query);

    if (alreadyExists.rows[0]) {
      return res.status(403).json({ error: "User already exists!" });
    }

    if (!password || password.length < 5) {
      return res
        .status(400)
        .json({ error: "Password invalid or not provided!" });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const text =
      "INSERT INTO users(name, email, password) VALUES ($1, $2, $3) RETURNING *";
    const values = [name, email, hashedPassword];

    const createdUser = await db.query(text, values);

    if (!createdUser.rows[0]) {
      return res.status(400).json({ error: "User not created!" });
    }

    return res.status(200).json(createdUser.rows[0]);
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;
