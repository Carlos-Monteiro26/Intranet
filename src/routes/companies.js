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

//Method to create a company in the database.
router.post("/", upload.single("image_path"), async (req, res, next) => {
  try {
    const { name, description } = req.body;

    //Checks for inserting correct data into the database.
    if (name.length < 5) {
      return res
        .status(400)
        .json({ error: "Name should have more than 5 characters" });
    }

    if (!description) {
      return res.status(400).json({ error: "Description is mandatory" });
    }

    //Adding the image
    const image_path = await diskStorage.saveFile(req.file.filename);

    //Inserting data into the database
    const text =
      "INSERT INTO companies (name, description, image_path) VALUES ($1, $2, $3) RETURNING *";
    const values = [name, description, image_path];

    const createCompany = await db.query(text, values);
    if (!createCompany.rows[0]) {
      return res.status(400).json({ error: "Company not created" });
    }

    return res.status(200).json(createCompany.rows[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

//Method to retrieve all companies registered in the database
router.get("/", async (req, res) => {
  try {
    await db.query(
      "SELECT * FROM companies ORDER BY name ASC",
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

//Method to retrieve a specific company registered in the database by ID
router.get("/:companyId", async (req, res) => {
  try {
    await db.query(
      "SELECT * FROM companies WHERE id=$1",
      [req.params.companyId],
      (error, response) => {
        if (error) {
          console.log(error);
          return res.status(500).json(error);
        }

        if (response.rows.length === 0) {
          return res.status(404).json({ error: "Company not found" });
        }

        return res.status(200).json(response.rows[0]);
      }
    );
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

//Method to update a specific company in the database by ID.
router.put(
  "/:companyId",
  upload.single("newImage_path"),
  async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      const { name, description } = req.body;

      const company = await db.query("SELECT * FROM companies WHERE id=$1", [
        companyId,
      ]);
      console.log(company.rows[0]);

      if (!company.rows[0]) {
        return res.status(400).json({ error: "User not found" });
      }

      //Variables for updating company data, enabling updates for all or individual fields, while preserving unchanged data as original.
      let updatedName = company.rows[0].name;
      let updatedDescription = company.rows[0].description;
      let updatedImage_Path = company.rows[0].image_path;

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
          "SELECT image_path FROM companies WHERE id = $1",
          [companyId]
        );

        const oldImagePath = oldImagePathQuery.rows[0].image_path
          ? oldImagePathQuery.rows[0].image_path
          : null;

        // Deleting the old image.
        if (oldImagePath) {
          await diskStorage.deleteFile(oldImagePath);
        }

        //Adding the image
        updatedImage_Path = await diskStorage.saveFile(req.file.filename);
      }

      //Inserting data into the database
      const text =
        "UPDATE companies SET name = $1, description = $2, image_path = $3 WHERE id = $4 RETURNING *";
      const values = [
        updatedName,
        updatedDescription,
        updatedImage_Path,
        companyId,
      ];

      const updatedCompany = await db.query(text, values);
      if (!updatedCompany.rows[0]) {
        return res.status(400).json({ error: "Company not updated" });
      }

      return res.status(200).json(updatedCompany.rows[0]);
    } catch (error) {
      console.log(error);
      return res.status(500).json(error);
    }
  }
);

//Method to delete a specific company by ID
router.delete("/:companyId", async (req, res) => {
  try {
    const companyId = req.params.companyId;

    // Check if the company exists
    const company = await db.query("SELECT * FROM companies WHERE id=$1", [
      companyId,
    ]);

    if (!company.rows[0]) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Get the image path for deletion
    const imagePath = company.rows[0].image_path;

    // Delete the company from the database
    await db.query("DELETE FROM companies WHERE id=$1", [companyId]);

    // Delete the associated image
    if (imagePath) {
      await diskStorage.deleteFile(imagePath);
    }

    return res.status(200).json({ message: "Company deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

module.exports = router;
