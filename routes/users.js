
const express = require("express");

const router = express.Router();

const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");


// GET ALL PRODUCTS
router.get("/", (req, res) => {

    const sql = "SELECT * FROM products";

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Database error",
                error: err.message
            });
        }

        res.json({
            message: "Products retrieved successfully",
            products: results
        });
    });
});


// GET SINGLE PRODUCT
router.get("/:id", (req, res) => {

    const productId = req.params.id;

    const sql = "SELECT * FROM products WHERE id = ?";

    db.query(sql, [productId], (err, results) => {

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

        res.json({
            message: "Product retrieved successfully",
            product: results[0]
        });
    });
});


// CREATE PRODUCT
// Banula + Amandi can create
router.post("/", authMiddleware, (req, res) => {

    const { name, price, category } = req.body;

    if (!name || !price || !category) {
        return res.status(400).json({
            message: "Name, price and category are required"
        });
    }

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
});


// UPDATE PRODUCT
router.put("/:id", authMiddleware, (req, res) => {

    const productId = req.params.id;

    const { name, price, category } = req.body;

    if (!name || !price || !category) {
        return res.status(400).json({
            message: "Name, price and category are required"
        });
    }

    const sql = `
        UPDATE products
        SET name = ?, price = ?, category = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [name, price, category, productId],
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


// DELETE PRODUCT
router.delete("/:id", authMiddleware, (req, res) => {

    const productId = req.params.id;

    const sql = "DELETE FROM products WHERE id = ?";

    db.query(
        sql,
        [productId],
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
                message: "Product deleted successfully"
            });
        }
    );
});


module.exports = router;

