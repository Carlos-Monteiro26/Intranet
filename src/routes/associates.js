//importing routes, database connection, and file uploads
const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../database/db");
const uploadConfig = require("../configs/uploads");
const DiskStorage = require("../providers/DiskStorage");

//Instantiating upload and storage imports.
const diskStorage = new DiskStorage();
const upload = multer(uploadConfig.MULTER);

//Method for associate creation
router.post("/", upload.single("image_path"), async (req, res, next) => {
  try {
    const { name, description } = req.body;

    console.log("name:", name);

    //Checks for inserting correct data into the database.
    if (name.length < 5) {
      return res
        .status(400)
        .json({ error: "Name should have more than 5 characters" });
    }

    if (!description) {
      return res.status(400).json({ error: "Description is mandatory" });
    }

    //Adding the image.
    const image_path = await diskStorage.saveFile(req.file.filename);

    //Inserting data into the database
    const text =
      "INSERT INTO associates (name, description, image_path) VALUES ($1, $2, $3) RETURNING *";
    const values = [name, description, image_path];

    const createAssociate = await db.query(text, values);
    if (!createAssociate.rows[0]) {
      return res.status(400).json({ error: "Associate not created" });
    }

    return res.status(200).json(createAssociate.rows[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//Method to retrieve all associates registered in the database.
router.get("/", async (req, res) => {
  try {
    await db.query(
      "SELECT * FROM associates ORDER BY name ASC",
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

//Method to retrieve a specific associate registered in the database.
router.get("/:associateId", async (req, res) => {
  try {
    await db.query(
      "SELECT * FROM associates WHERE id=$1",
      [req.params.associateId],
      (error, response) => {
        if (error) {
          console.log(error);
          return res.status(500).json(error);
        }

        if (response.rows.length === 0) {
          return res.status(404).json({ error: "Associate not found" });
        }

        return res.status(200).json(response.rows[0]);
      }
    );
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

//Method to update the associate in the database.
router.put(
  "/:associateId",
  upload.single("newImage_path"),
  async (req, res, next) => {
    try {
      const associateId = req.params.associateId;
      const { name, description } = req.body;

      const associate = await db.query("SELECT * FROM associates WHERE id=$1", [
        associateId,
      ]);
      console.log(associate.rows[0]);

      if (!associate.rows[0]) {
        return res.status(400).json({ error: "User not found" });
      }

      //Variables for updating user data, enabling updates for all or individual fields, while preserving unchanged data as original.
      let updatedName = associate.rows[0].name;
      let updatedDescription = associate.rows[0].description;
      let updatedImage_Path = associate.rows[0].image_path;

      //Checks for inserting correct data into the database.
      if (name !== undefined) {
        updatedName = name;

        if (name.length < 5) {
          return res
            .status(400)
            .json({ error: "Name should have more than 5 characters" });
        }
      }

      if (description !== undefined) {
        updatedDescription = description;

        if (!description) {
          return res.status(400).json({ error: "Description is mandatory" });
        }
      }

      if (req.file !== undefined) {
        updatedImage_Path = req.file;

        const oldImagePathQuery = await db.query(
          "SELECT image_path FROM associates WHERE id = $1",
          [associateId]
        );

        const oldImagePath = oldImagePathQuery.rows[0].image_path
          ? oldImagePathQuery.rows[0].image_path
          : null;

        //Deleting the old image
        if (oldImagePath) {
          await diskStorage.deleteFile(oldImagePath);
        }

        //Adding the image
        updatedImage_Path = await diskStorage.saveFile(req.file.filename);
      }

      //Inserting data into the database.
      const text =
        "UPDATE associates SET name = $1, description = $2, image_path = $3 WHERE id = $4 RETURNING *";
      const values = [
        updatedName,
        updatedDescription,
        updatedImage_Path,
        associateId,
      ];

      const updatedAssociate = await db.query(text, values);
      if (!updatedAssociate.rows[0]) {
        return res.status(400).json({ error: "Associate not updated" });
      }

      return res.status(200).json(updatedAssociate.rows[0]);
    } catch (error) {
      console.log(error);
      return res.status(500).json(error);
    }
  }
);

// Method to delete a specific associate and its associated image from the database
router.delete("/:associateId", async (req, res) => {
  try {
    const associateId = req.params.associateId;

    // Retrieve the associate's data including image path
    const associate = await db.query("SELECT * FROM associates WHERE id=$1", [
      associateId,
    ]);

    if (associate.rows.length === 0) {
      return res.status(404).json({ error: "Associate not found" });
    }

    // Extract the image path from the associate data
    const imagePath = associate.rows[0].image_path;

    // Delete the associate from the database
    await db.query("DELETE FROM associates WHERE id=$1", [associateId]);

    // Delete the associated image
    if (imagePath) {
      await diskStorage.deleteFile(imagePath);
    }

    return res.status(200).json({ message: "Associate deleted successfully" });
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;
