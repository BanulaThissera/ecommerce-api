const express = require("express");

const router = express.Router();

const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// GET user's cart
router.get("/", authMiddleware, (req, res) => {

    const sql = `
        SELECT
            cart.id,
            cart.product_id,
            products.name,
            products.price,
            cart.quantity,
            (products.price * cart.quantity) AS total
        FROM cart
        JOIN products ON cart.product_id = products.id
        WHERE cart.user_id = ?
    `;

    db.query(sql, [req.user.id], (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Database error",
                error: err.message
            });
        }

        res.json(results);
    });
});
// ADD PRODUCT TO CART
// POST /api/cart
router.post("/", authMiddleware, (req, res) => {

    const { product_id, quantity } = req.body;

    // Check required fields
    if (!product_id || !quantity) {
        return res.status(400).json({
            message: "Product ID and quantity are required"
        });
    }

    // Check whether product exists
    const productSql = "SELECT id FROM products WHERE id = ?";

    db.query(productSql, [product_id], (err, results) => {

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

        // Check whether product is already in cart
        const cartSql = `
            SELECT id, quantity
            FROM cart
            WHERE user_id = ? AND product_id = ?
        `;

        db.query(
            cartSql,
            [req.user.id, product_id],
            (err, cartResults) => {

                if (err) {
                    return res.status(500).json({
                        message: "Database error",
                        error: err.message
                    });
                }

                // Product already exists
                if (cartResults.length > 0) {

                    const newQuantity =
                        cartResults[0].quantity + quantity;

                    const updateSql = `
                        UPDATE cart
                        SET quantity = ?
                        WHERE id = ?
                    `;

                    db.query(
                        updateSql,
                        [newQuantity, cartResults[0].id],
                        (err) => {

                            if (err) {
                                return res.status(500).json({
                                    message: "Database error",
                                    error: err.message
                                });
                            }

                            res.json({
                                message: "Cart quantity updated",
                                quantity: newQuantity
                            });
                        }
                    );

                } else {

                    // Add new product to cart
                    const insertSql = `
                        INSERT INTO cart
                        (user_id, product_id, quantity)
                        VALUES (?, ?, ?)
                    `;

                    db.query(
                        insertSql,
                        [req.user.id, product_id, quantity],
                        (err, result) => {

                            if (err) {
                                return res.status(500).json({
                                    message: "Database error",
                                    error: err.message
                                });
                            }

                            res.status(201).json({
                                message: "Product added to cart",
                                cartId: result.insertId
                            });
                        }
                    );
                }
            }
        );
    });
});
// UPDATE CART QUANTITY
// PUT /api/cart/:id
router.put("/:id", authMiddleware, (req, res) => {

    const cartId = req.params.id;
    const { quantity } = req.body;

    // Check quantity
    if (!quantity || quantity < 1) {
        return res.status(400).json({
            message: "Quantity must be at least 1"
        });
    }

    // Make sure this cart item belongs to logged-in user
    const checkSql = `
        SELECT id
        FROM cart
        WHERE id = ? AND user_id = ?
    `;

    db.query(
        checkSql,
        [cartId, req.user.id],
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error",
                    error: err.message
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "Cart item not found"
                });
            }

            // Update quantity
            const updateSql = `
                UPDATE cart
                SET quantity = ?
                WHERE id = ? AND user_id = ?
            `;

            db.query(
                updateSql,
                [quantity, cartId, req.user.id],
                (err) => {

                    if (err) {
                        return res.status(500).json({
                            message: "Database error",
                            error: err.message
                        });
                    }

                    res.json({
                        message: "Cart quantity updated successfully",
                        quantity: quantity
                    });
                }
            );
        }
    );
});
// REMOVE PRODUCT FROM CART
// DELETE /api/cart/:id
router.delete("/:id", authMiddleware, (req, res) => {

    const cartId = req.params.id;

    // Delete only user's own cart item
    const sql = `
        DELETE FROM cart
        WHERE id = ? AND user_id = ?
    `;

    db.query(
        sql,
        [cartId, req.user.id],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error",
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Cart item not found"
                });
            }

            res.json({
                message: "Product removed from cart"
            });
        }
    );
});

module.exports = router;