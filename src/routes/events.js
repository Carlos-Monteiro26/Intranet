//importing routes, database connection, and file uploads
const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../database/db");
const uploadConfig = require("../configs/uploads");
const DiskStorage = require("../providers/DiskStorage");

//Instantiating upload and storage imports.
const upload = multer(uploadConfig.MULTER);
const diskStorage = new DiskStorage();

//Method for event creation
router.post("/", upload.array("event_images", 5), async (req, res, next) => {
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

    //Adding images to the database.
    const event_images = await Promise.all(
      req.files.map(async (file) => {
        return await diskStorage.saveFile(file.filename);
      })
    );

    //Inserting data into the database
    const text =
      "INSERT INTO events (event_name, event_description, event_images) VALUES ($1, $2, $3) RETURNING *";
    const values = [name, description, event_images];

    const createEvent = await db.query(text, values);
    if (!createEvent.rows[0]) {
      return res.status(400).json({ error: "Event not created" });
    }

    return res.status(200).json(createEvent.rows[0]);
  } catch (error) {
    return res.status(500).json(error);
  }
});

//Method to retrieve all events registered in the database.
router.get("/", async (req, res) => {
  try {
    const response = await db.query(
      "SELECT * FROM events ORDER BY event_name ASC"
    );

    return res.status(200).json(response.rows);
  } catch (error) {
    return res.status(500).json(error);
  }
});

//Method to retrieve a specific event registered in the database.
router.get("/:eventId", async (req, res) => {
  try {
    const response = await db.query("SELECT * FROM events WHERE id=$1", [
      req.params.eventId,
    ]);

    if (response.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    return res.status(200).json(response.rows[0]);
  } catch (error) {
    return res.status(500).json(error);
  }
});

//Method to update a specific event in the database by ID
router.put(
  "/:eventId",
  upload.array("newEvent_Images", 5),
  async (req, res, next) => {
    try {
      const eventId = req.params.eventId;
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

      const oldEventImagesQuery = await db.query(
        "SELECT event_images FROM events WHERE id = $1",
        [eventId]
      );

      const oldEventImages = oldEventImagesQuery.rows[0].event_images
        ? oldEventImagesQuery.rows[0].event_images
        : null;

      if (oldEventImages) {
        // Deleting old images.
        await Promise.all(
          oldEventImages.map(async (oldImage) => {
            await diskStorage.deleteFile(oldImage);
          })
        );
      }

      //Adding images to the database
      const newEvent_Images = await Promise.all(
        req.files.map(async (file) => {
          return await diskStorage.saveFile(file.filename);
        })
      );

      ////Inserting data into the database
      const text =
        "UPDATE events SET event_name = $1, event_description = $2, event_images = $3 WHERE id = $4 RETURNING *";
      const values = [name, description, newEvent_Images, eventId];

      const updatedEvent = await db.query(text, values);
      if (!updatedEvent.rows[0]) {
        return res.status(400).json({ error: "Event not updated" });
      }

      return res.status(200).json(updatedEvent.rows[0]);
    } catch (error) {
      return res.status(500).json(error);
    }
  }
);

// Method to delete a specific event and its associated images from the database
router.delete("/:eventId", async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Retrieve the event's data including image paths
    const event = await db.query("SELECT * FROM events WHERE id=$1", [eventId]);

    if (event.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Extract image paths from the event data
    const eventImages = event.rows[0].event_images || [];

    // Delete the event from the database
    await db.query("DELETE FROM events WHERE id=$1", [eventId]);

    // Delete the associated images
    await Promise.all(
      eventImages.map(async (imagePath) => {
        await diskStorage.deleteFile(imagePath);
      })
    );

    return res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;
