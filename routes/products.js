const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();

const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// GET all products
router.get("/", (req, res) => {
    const sql = "SELECT * FROM products";

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Database error",
                error: err.message
            });
        }

        res.json(results);
    });
});

// GET product by ID
router.get("/:id", (req, res) => {
    const sql = "SELECT * FROM products WHERE id = ?";

    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Database error",
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(results[0]);
    });
});

// CREATE product
router.post(
    "/",
    authMiddleware,
    adminMiddleware,

    [
        body("name")
            .trim()
            .notEmpty()
            .withMessage("Product name is required"),

        body("price")
            .isFloat({ min: 0 })
            .withMessage("Price must be a positive number"),

        body("category")
            .trim()
            .notEmpty()
            .withMessage("Category is required")
    ],

    (req, res) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: "Validation failed",
                errors: errors.array()
            });
        }

        const { name, price, category } = req.body;

        const sql = `
            INSERT INTO products (name, price, category)
            VALUES (?, ?, ?)
        `;

        db.query(
            sql,
            [name, price, category],
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        message: "Database error",
                        error: err.message
                    });
                }

                res.status(201).json({
                    message: "Product created successfully",
                    productId: result.insertId
                });
            }
        );
    }
);

// UPDATE product
router.put("/:id", (req, res) => {
    const { name, price, category } = req.body;

    const sql = `
        UPDATE products
        SET name = ?, price = ?, category = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [name, price, category, req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: "Database error",
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Product not found"
                });
            }

            res.json({
                message: "Product updated successfully"
            });
        }
    );
});

// DELETE product
router.delete("/:id", (req, res) => {
    const sql = "DELETE FROM products WHERE id = ?";

    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            return res.status(500).json({
                message: "Database error",
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json({
            message: "Product deleted successfully"
        });
    });
});

module.exports = router;