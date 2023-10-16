const express = require("express");
const router = express.Router();

const multer = require("multer");
const uploadConfig = require("../configs/uploads");

const db = require("../database/db");

const DiskStorage = require("../providers/DiskStorage");

const diskStorage = new DiskStorage();

const upload = multer(uploadConfig.MULTER);

router.post("/", upload.single("image_path"), async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (name.length < 5) {
      return res
        .status(400)
        .json({ error: "Name should have more than 5 characters" });
    }

    if (!description) {
      return res.status(400).json({ error: "Description is mandatory" });
    }

    const image_path = await diskStorage.saveFile(req.file.filename);

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

router.get("/", (req, res) => {
  try {
    db.query("SELECT * FROM companies ORDER BY name ASC", (error, response) => {
      if (error) {
        return res.status(500).json(error);
      }

      return res.status(200).json(response.rows);
    });
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.put(
  "/:companyId",
  upload.single("newImage_path"),
  async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      const { name, description } = req.body;

      if (name.length < 5) {
        return res
          .status(400)
          .json({ error: "Name should have more than 5 characters" });
      }

      if (!description) {
        return res.status(400).json({ error: "Description is mandatory" });
      }

      const oldImagePathQuery = await db.query(
        "SELECT image_path FROM companies WHERE id = $1",
        [companyId]
      );

      const oldImagePath = oldImagePathQuery.rows[0].image_path
        ? oldImagePathQuery.rows[0].image_path
        : null;

      if (oldImagePath) {
        await diskStorage.deleteFile(oldImagePath);
      }

      const newImage_path = await diskStorage.saveFile(req.file.filename);

      const text =
        "UPDATE companies SET name = $1, description = $2, image_path = $3 WHERE id = $4 RETURNING *";
      const values = [name, description, newImage_path, companyId];

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

router.get("/:companyId", async (req, res) => {
  try {
    db.query(
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

module.exports = router;
