//Importing Express to handle request routes.
const express = require("express");
const router = express.Router();

// Imported bcrypt for password encryption.
const bcrypt = require("bcrypt");
const saltRounds = 10;

//Importing database data for connection and queries for reuse.
const db = require("../database/db");
const usersQueries = require("../queries/users");

//Method for user creation.
router.post("/", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    //Checks for inserting correct data into the database.
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

    //Encrypting the password for insertion into the database.

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    //Inserting data into the database
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

//Method to retrieve all registered users from the database
router.get("/", async (req, res) => {
  try {
    await db.query(
      "SELECT * FROM users ORDER BY name ASC",
      (error, response) => {
        if (error) {
          return res.status(500).json(error);
        }

        return res.status(200).json(response.rows);
      }
    );
  } catch (error) {
    return res.status(500).json(error);
  }
});

//Method to retrieve a specific user registered in the database by ID.
router.get("/:id", async (req, res) => {
  try {
    await db.query(
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

//Method to update the user in the database.
router.put("/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, oldPassword, newPassword } = req.body;

    const user = await db.query("SELECT * FROM users WHERE id=$1", [userId]);
    console.log(user.rows[0]);

    if (!user.rows[0]) {
      return res.status(400).json({ error: "User not found" });
    }

    //Variables for updating user data, enabling updates for all or individual fields, while preserving unchanged data as original.
    let updatedName = user.rows[0].name;
    let updatedEmail = user.rows[0].email;
    let updatedPassword = user.rows[0].password;

    //Checks for inserting correct data into the database.
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

      if (!checkOldPassword) {
        return res.status(401).json({ error: "Old password does not match" });
      }

      if (!newPassword || newPassword.length < 5) {
        return res
          .status(400)
          .json({ error: "New password invalid or not provided!" });
      }

      //Encrypting the password for insertion into the database
      updatedPassword = await bcrypt.hash(newPassword, saltRounds);
    }

    //Inserting data into the database.
    const text =
      "UPDATE users SET name=$1, email=$2, password=$3 WHERE id=$4 RETURNING *";
    const values = [updatedName, updatedEmail, updatedPassword, userId];

    const updatedUser = await db.query(text, values);
    if (!updatedUser.rows[0]) {
      return res.status(400).json({ error: "User not updated" });
    }

    return res.status(200).json(updatedUser.rows[0]);
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;
