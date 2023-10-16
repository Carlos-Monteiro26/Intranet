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

router.get("/", (req, res) => {
  try {
    db.query("SELECT * FROM users ORDER BY name ASC", (error, response) => {
      if (error) {
        return res.status(500).json(error);
      }

      return res.status(200).json(response.rows);
    });
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.get("/:id", (req, res) => {
  try {
    db.query(
      "SELECT * FROM users WHERE id=$1",
      [req.params.id],
      (error, response) => {
        if (error) {
          return res.status(500).json(error);
        }

        if (response.rows.length === 0) {
          return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json(response.rows);
      }
    );
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, oldPassword, newPassword } = req.body;

    const user = await db.query("SELECT * FROM users WHERE id=$1", [userId]);
    console.log(user.rows[0]);

    if (!user.rows[0]) {
      return res.status(400).json({ error: "User not found" });
    }

    let updatedName = user.rows[0].name;
    let updatedEmail = user.rows[0].email;
    let updatedPassword = user.rows[0].password;

    if (name !== undefined) {
      updatedName = name;

      const queryName = usersQueries.findByName(updatedName);
      const nameAlreadyExists = await db.query(queryName);

      if (
        nameAlreadyExists.rows[0] &&
        nameAlreadyExists.rows[0].id !== userId
      ) {
        return res.status(400).json({ error: "User already exists!" });
      }
    }

    if (email !== undefined) {
      updatedEmail = email;
      const queryEmail = usersQueries.findByEmail(updatedEmail);
      const emailAlreadyExists = await db.query(queryEmail);

      if (
        emailAlreadyExists.rows[0] &&
        emailAlreadyExists.rows[0].id !== userId
      ) {
        return res.status(403).json({ error: "User already exists!" });
      }
    }

    if (oldPassword !== undefined && newPassword !== undefined) {
      const checkOldPassword = await bcrypt.compare(
        oldPassword,
        user.rows[0].password
      );

      console.log(checkOldPassword);

      if (!checkOldPassword) {
        return res.status(401).json({ error: "Old password does not match" });
      }

      if (!newPassword || newPassword.length < 5) {
        return res
          .status(400)
          .json({ error: "New password invalid or not provided!" });
      }

      updatedPassword = await bcrypt.hash(newPassword, saltRounds);
    }

    const text =
      "UPDATE users SET name=$1, email=$2, password=$3 WHERE id=$4 RETURNING *";
    const values = [updatedName, updatedEmail, updatedPassword, userId];

    const updatedUser = await db.query(text, values);
    if (!updatedUser.rows[0]) {
      return res.status(400).json({ error: "User not updated" });
    }

    return res.status(200).json(updatedUser.rows[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

module.exports = router;
