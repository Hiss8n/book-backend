import express from "express";
import Book from "../models/Book.js";
import protectRoute from "../middleware/auth_middleware.js";
import cloudinary from "../lib/cloudinary.js";
const router = express.Router();

//add books router - with chunked image upload support

// Chunked image upload endpoint
router.post("/upload-image", protectRoute, async (req, res) => {
  try {
    const { imageChunk, chunkIndex, totalChunks, uploadId } = req.body;

    if (!imageChunk || chunkIndex === undefined || !totalChunks || !uploadId) {
      return res.status(400).json({
        success: false,
        message: "Missing required chunk upload parameters",
      });
    }

    // Store chunks temporarily (you might want to use Redis or file system for production)
    if (!global.imageChunks) {
      global.imageChunks = {};
    }

    if (!global.imageChunks[uploadId]) {
      global.imageChunks[uploadId] = {};
    }

    global.imageChunks[uploadId][chunkIndex] = imageChunk;

    // Check if all chunks are received
    const receivedChunks = Object.keys(global.imageChunks[uploadId]).length;

    if (receivedChunks === totalChunks) {
      // Reconstruct the image
      let completeImage = "";
      for (let i = 0; i < totalChunks; i++) {
        completeImage += global.imageChunks[uploadId][i];
      }

      // Add data URL prefix if not present
      if (!completeImage.startsWith("data:image/")) {
        completeImage = "data:image/jpeg;base64," + completeImage;
      }

      try {
        const uploadResponse = await cloudinary.uploader.upload(completeImage, {
          folder: "bookhub",
          resource_type: "image",
          transformation: [
            { width: 800, height: 600, crop: "limit" },
            { quality: "auto:low" },
          ],
          timeout: 60000, // 60 second timeout
        });

        // Clean up chunks
        delete global.imageChunks[uploadId];

        res.json({
          success: true,
          imageUrl: uploadResponse.secure_url,
          message: "Image uploaded successfully",
        });
      } catch (uploadError) {
        delete global.imageChunks[uploadId];

        res.status(500).json({
          success: false,
          message: "Failed to upload image to cloud storage",
          error: uploadError.message,
        });
      }
    } else {
      // More chunks expected
      res.json({
        success: true,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} received`,
        chunksReceived: receivedChunks,
        totalChunks: totalChunks,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to process image chunk",
      error: error.message,
    });
  }
});

router.post("/", protectRoute, async (req, res) => {
  try {
    const { title, caption, imageUrl, rating } = req.body;

    if (!imageUrl || !title || !caption || !rating) {
      return res.status(400).json({
        success: false,
        message: "Please provide all fields for the book",
      });
    }

    // Validate the imageUrl is from our Cloudinary
    if (
      !imageUrl.includes("cloudinary.com") &&
      !imageUrl.startsWith("data:image/")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid image URL",
      });
    }

    let finalImageUrl = imageUrl;

    // If still base64, upload directly (fallback for small images)
    if (imageUrl.startsWith("data:image/")) {
      const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
        folder: "bookhub",
        resource_type: "image",
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto:low" },
        ],
        timeout: 80000,
      });
      finalImageUrl = uploadResponse.secure_url;
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User authentication failed - user ID not found",
      });
    }

    const newBook = new Book({
      title: title.trim(),
      caption: caption.trim(),
      rating: parseInt(rating),
      image: finalImageUrl,
      user: req.user._id,
    });

    await newBook.save();
    res
      .status(201)
      .json({ success: true, message: "New book has been added." });
  } catch (error) {
    // Handle different types of errors
    let errorMessage = "Can not add a book now, please try again later.";

    if (error.message) {
      errorMessage += ` Error: ${error.message}`;
    } else if (error.http_code) {
      errorMessage += ` Cloudinary error: ${error.http_code}`;
    } else if (error.name) {
      errorMessage += ` ${error.name}`;
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
});

//fetch Bookes route
//pagination=> infinite paginations;
//pagination=> infinite paginations;

router.get("/health", (req, res) => {
  res.send("Api is working");
});

router.get("/", protectRoute, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 5;
    const skip = (page - 1) * limit;

    const books = await Book.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username profileImage");
    const totalBooks = await Book.countDocuments();
    res.send({
      books,
      currentPage: page,
      totalBooks,
      totalPages: Math.ceil(totalBooks / limit),
    });
  } catch (error) {
    console.error("Error in getting books", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error, can not get books, try again please!!!",
    });
  }
});

// Delete a book requests.

router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const bookId = req.params.id;

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User authentication failed - user ID not found",
      });
    }

    const book = await Book.findById(bookId).populate("user", "username _id");

    if (!book)
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });

    //check the book user is the one deleting
    if (book.user._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized, Can not delete the book",
      });
    }
    // delete the image  from cloudinary data base
    if (book.image && book.image.includes("cloudinary")) {
      try {
        const publicId = book.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Failed to delete book image from cloud storage",
          error: error.message,
        });
      }
    }
    await book.deleteOne();

    res.json({ success: true, message: "Book deleted successfully!.😒" });

    res
      .status(404)
      .json({ success: false, message: "Cannot delete now, try again please" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Can not delete,please try again later",
    });
  }
});

///show recommended books  by the logged in user
router.get("/user-books", protectRoute, async (req, res) => {
  try {
    const books = await Book.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(books);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//get single book details
router.get("/:id", async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await Book.findById(bookId).populate(
      "user",
      "username profileImage"
    );

    if (!book) {
      return res
        .status(404)
        .json({ message: "Book not found with the provided ID" });
    }

    res.json({ book });
  } catch (error) {
    res.status(500).json({ message: "Server error, can not get book now" });
  }
});

router.put("/:id", protectRoute, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { title, caption, rating, imageUrl } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User authentication failed - user ID not found",
      });
    }

    // First find the book to verify ownership
    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // Check if the user owns this book
    if (book.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized, you can only update your own books",
      });
    }

    // Prepare update data (only include provided fields)
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (caption !== undefined) updateData.caption = caption.trim();
    if (rating !== undefined) updateData.rating = parseInt(rating);
    if (imageUrl !== undefined) updateData.image = imageUrl;

    // Update the book
    const updatedBook = await Book.findByIdAndUpdate(bookId, updateData, {
      new: true,
      runValidators: true,
    }).populate("user", "username profileImage");

    console.log("Book updated successfully:", updatedBook._id);

    res.json({
      success: true,
      message: "Book updated successfully",
      book: updatedBook,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error, cannot update the book now, try again later",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;
